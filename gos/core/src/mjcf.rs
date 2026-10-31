//! Robot document to MJCF, MuJoCo's XML. MJCF nests bodies as a tree, so `compile` picks a spanning tree
//! (any joint may be walked backwards) and every remaining joint becomes an equality constraint, which is
//! how MuJoCo holds a loop shut. Body poses follow Studio FK: child_world = parent_world · origin · DOF · childRest,
//! so the exported robot at qpos 0 is the Studio's robot with every joint at 0. tools/test_mjcf.py checks this
//! in real MuJoCo. The base bodies are fixed to the world at their authored pose.

use crate::{compile, BodyIn, GraphIn, JointIn, TreeEdge};
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fmt::Write;

type V3 = [f64; 3];
type Q = [f64; 4];

#[derive(Clone, Copy)]
struct Pose { p: V3, q: Q }

fn qmul(a: Q, b: Q) -> Q {
    [
        a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
        a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
        a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ]
}
fn qinv(q: Q) -> Q { [-q[0], -q[1], -q[2], q[3]] }
fn rot(q: Q, v: V3) -> V3 {
    let r = qmul(qmul(q, [v[0], v[1], v[2], 0.0]), qinv(q));
    [r[0], r[1], r[2]]
}
fn mul(a: Pose, b: Pose) -> Pose {
    let t = rot(a.q, b.p);
    Pose { p: [a.p[0] + t[0], a.p[1] + t[1], a.p[2] + t[2]], q: qmul(a.q, b.q) }
}
fn inv(a: Pose) -> Pose {
    let q = qinv(a.q);
    let t = rot(q, a.p);
    Pose { p: [-t[0], -t[1], -t[2]], q }
}

fn nums<const N: usize>(v: Option<&Value>, default: [f64; N]) -> [f64; N] {
    let mut out = default;
    if let Some(a) = v.and_then(Value::as_array) {
        for (i, x) in a.iter().take(N).enumerate() { if let Some(f) = x.as_f64() { out[i] = f; } }
    }
    out
}
fn pose(o: Option<&Value>) -> Pose {
    Pose { p: nums(o.and_then(|o| o.get("position")), [0.0; 3]), q: nums(o.and_then(|o| o.get("quaternion")), [0.0, 0.0, 0.0, 1.0]) }
}
fn san(s: &str) -> String { s.chars().map(|c| if c.is_ascii_alphanumeric() || c == '_' { c } else { '_' }).collect() }
fn n(v: f64) -> String { if v.abs() < 1e-9 { "0".into() } else { format!("{v:.6}") } }
fn v3(p: V3) -> String { format!("{} {} {}", n(p[0]), n(p[1]), n(p[2])) }
fn quat(q: Q) -> String { format!("{} {} {} {}", n(q[3]), n(q[0]), n(q[1]), n(q[2])) } // MuJoCo is w x y z
fn text<'a>(v: &'a Value, k: &str) -> &'a str { v.get(k).and_then(Value::as_str).unwrap_or("") }

#[derive(Serialize, Clone)]
pub struct MeshOut { pub name: String, #[serde(rename = "assetId")] pub asset_id: String, pub file: String, pub scale: V3 }

#[derive(Serialize)]
pub struct MjcfOut {
    pub xml: String,
    pub meshes: Vec<MeshOut>,
    pub warnings: Vec<String>,
    #[serde(rename = "bodyNames")] pub body_names: BTreeMap<String, String>,
    #[serde(rename = "jointNames")] pub joint_names: BTreeMap<String, String>,
}

/// Two modules repeat body and joint names, and MuJoCo needs them unique.
#[derive(Default)]
struct Names(HashSet<String>);
impl Names {
    fn unique(&mut self, raw: &str) -> String {
        let base = san(raw);
        let mut out = base.clone();
        let mut i = 2;
        while self.0.contains(&out) { out = format!("{base}_{i}"); i += 1; }
        self.0.insert(out.clone());
        out
    }
}

fn geom(b: &Value, meshes: &mut BTreeMap<String, MeshOut>) -> String {
    let g = b.get("visual").and_then(|v| v.get("geometry"));
    let origin = b.get("visual").and_then(|v| v.get("origin"));
    let place = origin.map(|o| { let a = pose(Some(o)); format!(" pos=\"{}\" quat=\"{}\"", v3(a.p), quat(a.q)) }).unwrap_or_default();
    let f = |k: &str, d: f64| g.and_then(|g| g.get(k)).and_then(Value::as_f64).unwrap_or(d);
    match g.map(|g| text(g, "type")).unwrap_or("") {
        "box" => { let s = nums(g.and_then(|g| g.get("size")), [1.0; 3]); format!("<geom type=\"box\" size=\"{} {} {}\"{place}/>", n(s[0] / 2.0), n(s[1] / 2.0), n(s[2] / 2.0)) }
        "sphere" => format!("<geom type=\"sphere\" size=\"{}\"{place}/>", n(f("radius", 0.5))),
        t @ ("cylinder" | "capsule") => format!("<geom type=\"{t}\" size=\"{} {}\"{place}/>", n(f("radius", 0.5)), n(f("length", 1.0) / 2.0)),
        "mesh" => {
            let gv = g.unwrap();
            let asset = gv.get("assetId").and_then(Value::as_str).or(b.get("assetId").and_then(Value::as_str)).unwrap_or("mesh").to_string();
            let scale = nums(gv.get("scale"), [1.0; 3]);
            let key = format!("{}_{}", san(&asset), san(&format!("{}_{}_{}", scale[0], scale[1], scale[2])));
            meshes.entry(key.clone()).or_insert(MeshOut { name: key.clone(), file: format!("meshes/{asset}.stl"), asset_id: asset, scale });
            format!("<geom type=\"mesh\" mesh=\"{key}\"{place}/>")
        }
        _ => format!("<geom type=\"box\" size=\"0.05 0.05 0.05\"{place}/>"),
    }
}

pub fn export(doc: &Value, name: &str) -> Result<MjcfOut, String> {
    let empty = serde_json::Map::new();
    let bodies = doc.get("bodies").and_then(Value::as_object).ok_or("The document has no bodies.")?;
    let joints = doc.get("joints").and_then(Value::as_object).unwrap_or(&empty);
    let graph = GraphIn {
        bodies: bodies.keys().map(|id| BodyIn { id: id.clone() }).collect(),
        joints: joints.iter().map(|(id, j)| JointIn {
            id: id.clone(), kind: text(j, "type").to_string(),
            parent: j.get("parentBodyId").and_then(Value::as_str).map(str::to_string),
            child: j.get("childBodyId").and_then(Value::as_str).map(str::to_string),
            disabled: j.get("state").and_then(|s| s.get("disabled")).and_then(Value::as_bool).unwrap_or(false),
        }).collect(),
        roots: vec![],
    };
    let compiled = compile(&graph);
    let mut warnings = compiled.warnings.clone();
    let mut names = Names::default();
    let mut body_names = BTreeMap::new();
    for (id, b) in bodies { body_names.insert(id.clone(), names.unique(text(b, "name"))); }

    let edge_of: HashMap<&str, &TreeEdge> = compiled.tree.iter().map(|e| (e.child.as_str(), e)).collect();
    let mut kids: HashMap<&str, Vec<&str>> = HashMap::new();
    for e in &compiled.tree { kids.entry(e.parent.as_str()).or_default().push(e.child.as_str()); }

    struct Ctx<'a> {
        bodies: &'a serde_json::Map<String, Value>, joints: &'a serde_json::Map<String, Value>,
        edge_of: &'a HashMap<&'a str, &'a TreeEdge>, kids: &'a HashMap<&'a str, Vec<&'a str>>,
        body_names: &'a BTreeMap<String, String>,
    }
    fn joint_xml(cx: &Ctx, e: &TreeEdge, names: &mut Names, jn: &mut BTreeMap<String, String>) -> String {
        let j = &cx.joints[&e.joint];
        let kind = text(j, "type");
        if kind == "fixed" { return String::new(); }
        let nm = names.unique(text(j, "name"));
        jn.insert(e.joint.clone(), nm.clone());
        let (o, c) = (pose(j.get("origin")), pose(j.get("childRest")));
        let ax = nums(j.get("axis"), [0.0, 0.0, 1.0]);
        // The joint axis is written in the origin frame. MuJoCo wants pivot and axis in the frame of the moving body.
        let (pos, axis) = if e.reversed {
            let a = rot(o.q, ax);
            (o.p, [-a[0], -a[1], -a[2]])
        } else {
            let ci = inv(c);
            (ci.p, rot(ci.q, ax))
        };
        let ty = if kind == "prismatic" { "slide" } else { "hinge" };
        let lim = |k: &str, d: f64| j.get("limit").and_then(|l| l.get(k)).and_then(Value::as_f64).unwrap_or(d);
        let mut range = (lim("lower", -3.14), lim("upper", 3.14));
        if e.reversed { range = (-range.1, -range.0); }
        let ranged = if kind == "revolute" || kind == "prismatic" { format!(" limited=\"true\" range=\"{} {}\"", n(range.0), n(range.1)) } else { String::new() };
        format!("<joint name=\"{nm}\" type=\"{ty}\" pos=\"{}\" axis=\"{}\"{ranged}/>", v3(pos), v3(axis))
    }
    fn body_xml(cx: &Ctx, id: &str, depth: usize, names: &mut Names, jn: &mut BTreeMap<String, String>, meshes: &mut BTreeMap<String, MeshOut>, out: &mut String) {
        let pad = "  ".repeat(depth + 2);
        let b = &cx.bodies[id];
        let e = cx.edge_of.get(id).copied();
        let at = match e {
            Some(e) => {
                let j = &cx.joints[&e.joint];
                let (o, c) = (pose(j.get("origin")), pose(j.get("childRest")));
                if e.reversed { mul(inv(c), inv(o)) } else { mul(o, c) }
            }
            None => pose(b.get("transform")),
        };
        writeln!(out, "{pad}<body name=\"{}\" pos=\"{}\" quat=\"{}\">", cx.body_names[id], v3(at.p), quat(at.q)).unwrap();
        if let Some(e) = e { let jx = joint_xml(cx, e, names, jn); if !jx.is_empty() { writeln!(out, "{pad}  {jx}").unwrap(); } }
        writeln!(out, "{pad}  {}", geom(b, meshes)).unwrap();
        for k in cx.kids.get(id).map(Vec::as_slice).unwrap_or(&[]) { body_xml(cx, k, depth + 1, names, jn, meshes, out); }
        writeln!(out, "{pad}</body>").unwrap();
    }

    let cx = Ctx { bodies, joints, edge_of: &edge_of, kids: &kids, body_names: &body_names };
    let (mut tree, mut joint_names, mut meshes) = (String::new(), BTreeMap::new(), BTreeMap::new());
    for r in &compiled.roots { body_xml(&cx, r, 0, &mut names, &mut joint_names, &mut meshes, &mut tree); }

    // Loop joints become constraints between the two bodies the tree left unjoined.
    let mut eq = vec![];
    for id in &compiled.loops {
        let j = &joints[id];
        let (a, b) = (&body_names[text(j, "parentBodyId")], &body_names[text(j, "childBodyId")]);
        let o = pose(j.get("origin"));
        let nm = text(j, "name");
        match text(j, "type") {
            "fixed" => eq.push(format!("<weld name=\"{}\" body1=\"{a}\" body2=\"{b}\"/>", names.unique(nm))),
            "revolute" | "continuous" => {
                // Two pinned points on the hinge line leave exactly the rotation about that line free.
                let d = rot(o.q, nums(j.get("axis"), [0.0, 0.0, 1.0]));
                eq.push(format!("<connect name=\"{}\" body1=\"{a}\" body2=\"{b}\" anchor=\"{}\"/>", names.unique(nm), v3(o.p)));
                let far = [o.p[0] + d[0] * 0.05, o.p[1] + d[1] * 0.05, o.p[2] + d[2] * 0.05];
                eq.push(format!("<connect name=\"{}\" body1=\"{a}\" body2=\"{b}\" anchor=\"{}\"/>", names.unique(&format!("{nm}_axis")), v3(far)));
            }
            other => {
                eq.push(format!("<connect name=\"{}\" body1=\"{a}\" body2=\"{b}\" anchor=\"{}\"/>", names.unique(nm), v3(o.p)));
                warnings.push(format!("Loop joint {nm} is {other}: exported as a ball connection, which is looser than the real joint."));
            }
        }
    }

    let mut xml = format!("<?xml version=\"1.0\"?>\n<!-- Generated by TETROBOT -->\n<mujoco model=\"{}\">\n  <compiler angle=\"radian\"/>\n", san(name));
    if !meshes.is_empty() {
        xml += "  <asset>\n";
        for m in meshes.values() { writeln!(xml, "    <mesh name=\"{}\" file=\"{}\" scale=\"{}\"/>", m.name, m.file, v3(m.scale)).unwrap(); }
        xml += "  </asset>\n";
    }
    write!(xml, "  <worldbody>\n{tree}  </worldbody>\n").unwrap();
    if !eq.is_empty() {
        xml += "  <equality>\n";
        for e in &eq { writeln!(xml, "    {e}").unwrap(); }
        xml += "  </equality>\n";
    }
    xml += "</mujoco>\n";
    Ok(MjcfOut { xml, meshes: meshes.into_values().collect(), warnings, body_names, joint_names })
}
