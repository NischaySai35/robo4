//! GraphIK: move a body toward a target on any graph, holding closed loops shut (RESTRUCTURING 10.7).
//!
//! The joint values of the tree AND of the loop joints are the unknowns. Residuals are the goal error plus,
//! for every loop joint, the full pose mismatch between where the tree puts its child and where the loop
//! joint does. Damped least squares (Levenberg-Marquardt) with a numerical Jacobian, clamped to joint limits.
//! Forward kinematics follows Studio FK exactly: child = parent · origin · DOF(value) · childRest.

use crate::{compile, BodyIn, GraphIn, JointIn};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

type V3 = [f64; 3];
type Q = [f64; 4];
#[derive(Clone, Copy)]
struct Pose { p: V3, q: Q }

fn qmul(a: Q, b: Q) -> Q {
    [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
     a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]
}
fn qinv(q: Q) -> Q { [-q[0], -q[1], -q[2], q[3]] }
fn rot(q: Q, v: V3) -> V3 { let r = qmul(qmul(q, [v[0], v[1], v[2], 0.0]), qinv(q)); [r[0], r[1], r[2]] }
fn mul(a: Pose, b: Pose) -> Pose { let t = rot(a.q, b.p); Pose { p: [a.p[0] + t[0], a.p[1] + t[1], a.p[2] + t[2]], q: qmul(a.q, b.q) } }
fn inv(a: Pose) -> Pose { let q = qinv(a.q); let t = rot(q, a.p); Pose { p: [-t[0], -t[1], -t[2]], q } }
fn nums<const N: usize>(v: Option<&Value>, d: [f64; N]) -> [f64; N] {
    let mut o = d;
    if let Some(a) = v.and_then(Value::as_array) { for (i, x) in a.iter().take(N).enumerate() { if let Some(f) = x.as_f64() { o[i] = f; } } }
    o
}
fn pose(o: Option<&Value>) -> Pose { Pose { p: nums(o.and_then(|o| o.get("position")), [0.0; 3]), q: nums(o.and_then(|o| o.get("quaternion")), [0.0, 0.0, 0.0, 1.0]) } }

struct J { kind: String, origin: Pose, rest: Pose, axis: V3, lo: f64, hi: f64, parent: String, child: String }
impl J {
    fn dof(&self, v: f64) -> Pose {
        match self.kind.as_str() {
            "fixed" => Pose { p: [0.0; 3], q: [0.0, 0.0, 0.0, 1.0] },
            "prismatic" => Pose { p: [self.axis[0] * v, self.axis[1] * v, self.axis[2] * v], q: [0.0, 0.0, 0.0, 1.0] },
            _ => { let (s, c) = (v / 2.0).sin_cos(); let n = (self.axis.iter().map(|a| a * a).sum::<f64>()).sqrt().max(1e-12);
                   Pose { p: [0.0; 3], q: [self.axis[0] / n * s, self.axis[1] / n * s, self.axis[2] / n * s, c] } }
        }
    }
    /// child pose from parent pose
    fn forward(&self, parent: Pose, v: f64) -> Pose { mul(mul(mul(parent, self.origin), self.dof(v)), self.rest) }
    fn backward(&self, child: Pose, v: f64) -> Pose { mul(mul(mul(child, inv(self.rest)), inv(self.dof(v))), inv(self.origin)) }
}

#[derive(Deserialize)]
pub struct Request {
    pub doc: Value,
    pub tip: String,
    pub target: V3,
    #[serde(default)] pub root: Option<String>,
    #[serde(default = "iters")] pub iterations: usize,
    #[serde(default = "tol")] pub tolerance: f64,
}
fn iters() -> usize { 200 }
fn tol() -> f64 { 0.001 }

#[derive(Serialize)]
pub struct Reply { pub values: HashMap<String, f64>, pub ok: bool, pub goal_error_m: f64, pub closure_error_m: f64, pub iterations: usize, pub message: String }

pub fn solve(r: &Request) -> Result<Reply, String> {
    let empty = serde_json::Map::new();
    let bodies = r.doc.get("bodies").and_then(Value::as_object).ok_or("The document has no bodies.")?;
    let joints_v = r.doc.get("joints").and_then(Value::as_object).unwrap_or(&empty);
    if !bodies.contains_key(&r.tip) { return Err(format!("No body with id {} in the document.", r.tip)); }
    let mut js: HashMap<String, J> = HashMap::new();
    let mut start: HashMap<String, f64> = HashMap::new();
    for (id, j) in joints_v {
        if j.get("state").and_then(|s| s.get("disabled")).and_then(Value::as_bool).unwrap_or(false) { continue; }
        let (Some(p), Some(c)) = (j.get("parentBodyId").and_then(Value::as_str), j.get("childBodyId").and_then(Value::as_str)) else { continue };
        let lim = |k: &str, d: f64| j.get("limit").and_then(|l| l.get(k)).and_then(Value::as_f64).unwrap_or(d);
        let kind = j.get("type").and_then(Value::as_str).unwrap_or("revolute").to_string();
        let (lo, hi) = if kind == "revolute" || kind == "prismatic" { (lim("lower", -3.14), lim("upper", 3.14)) } else { (f64::NEG_INFINITY, f64::INFINITY) };
        start.insert(id.clone(), j.get("state").and_then(|s| s.get("value")).and_then(Value::as_f64).unwrap_or(0.0));
        js.insert(id.clone(), J { kind, origin: pose(j.get("origin")), rest: pose(j.get("childRest")), axis: nums(j.get("axis"), [0.0, 0.0, 1.0]), lo, hi, parent: p.into(), child: c.into() });
    }
    let graph = compile(&GraphIn {
        bodies: bodies.keys().map(|id| BodyIn { id: id.clone() }).collect(),
        joints: js.iter().map(|(id, j)| JointIn { id: id.clone(), kind: j.kind.clone(), parent: Some(j.parent.clone()), child: Some(j.child.clone()), disabled: false }).collect(),
        roots: r.root.iter().cloned().collect(),
    });
    let part = graph.parts.iter().find(|p| p.contains(&r.tip)).cloned().unwrap_or_default();
    let root = graph.roots.iter().find(|x| part.contains(x)).cloned().ok_or("The tip body is not part of any connected robot.")?;
    let tree: Vec<_> = graph.tree.iter().filter(|e| part.contains(&e.child)).collect();
    let loops: Vec<&String> = graph.loops.iter().filter(|l| part.contains(&js[*l].parent)).collect();
    let vars: Vec<String> = { let mut v: Vec<_> = tree.iter().map(|e| e.joint.clone()).chain(loops.iter().map(|l| (*l).clone())).filter(|id| js[id].kind != "fixed").collect(); v.sort(); v };
    let base = pose(bodies[&root].get("transform"));

    let world = |q: &HashMap<String, f64>| {
        let mut w: HashMap<&str, Pose> = HashMap::from([(root.as_str(), base)]);
        for e in &tree {
            let j = &js[&e.joint];
            let v = q[&e.joint];
            let p = w[e.parent.as_str()];
            w.insert(e.child.as_str(), if e.reversed { j.backward(p, v) } else { j.forward(p, v) });
        }
        w
    };
    // Loops are weighted: holding the robot together matters more than reaching the goal.
    const LOOP_W: f64 = 10.0;
    let residual = |q: &HashMap<String, f64>| -> (Vec<f64>, f64, f64) {
        let w = world(q);
        let t = w[r.tip.as_str()].p;
        let mut res = vec![t[0] - r.target[0], t[1] - r.target[1], t[2] - r.target[2]];
        let goal = (res[0] * res[0] + res[1] * res[1] + res[2] * res[2]).sqrt();
        let mut closure: f64 = 0.0;
        for l in &loops {
            let j = &js[*l];
            let pred = j.forward(w[j.parent.as_str()], q[*l]);
            let act = w[j.child.as_str()];
            let d = [pred.p[0] - act.p[0], pred.p[1] - act.p[1], pred.p[2] - act.p[2]];
            closure = closure.max((d[0] * d[0] + d[1] * d[1] + d[2] * d[2]).sqrt());
            let dq = qmul(qinv(act.q), pred.q);
            let s = if dq[3] < 0.0 { -1.0 } else { 1.0 };
            // A 0.1 m lever turns orientation error into metres, so both parts weigh comparably.
            res.extend(d.iter().map(|x| x * LOOP_W));
            res.extend([dq[0], dq[1], dq[2]].iter().map(|x| x * s * 2.0 * 0.1 * LOOP_W));
        }
        (res, goal, closure)
    };

    let mut q = start.clone();
    let mut lambda = 1e-3;
    let (mut res, mut goal, mut closure) = residual(&q);
    let mut it = 0;
    while it < r.iterations && !(goal < r.tolerance && closure < r.tolerance) {
        it += 1;
        let n = vars.len();
        let m = res.len();
        let mut jac = vec![vec![0.0; n]; m];
        for (k, id) in vars.iter().enumerate() {
            let mut qq = q.clone();
            *qq.get_mut(id).unwrap() += 1e-6;
            let (r2, _, _) = residual(&qq);
            for i in 0..m { jac[i][k] = (r2[i] - res[i]) / 1e-6; }
        }
        // (JᵀJ + λ·diag) δ = -Jᵀr
        let mut a = vec![vec![0.0; n]; n];
        let mut b = vec![0.0; n];
        for i in 0..n {
            for k in 0..n { a[i][k] = (0..m).map(|t| jac[t][i] * jac[t][k]).sum(); }
            b[i] = -(0..m).map(|t| jac[t][i] * res[t]).sum::<f64>();
        }
        let cost: f64 = res.iter().map(|x| x * x).sum();
        let mut improved = false;
        for _ in 0..8 {
            let mut aa = a.clone();
            for i in 0..n { aa[i][i] += lambda * (1.0 + a[i][i]); }
            let Some(delta) = solve_linear(aa, b.clone()) else { lambda *= 10.0; continue };
            let mut qn = q.clone();
            for (k, id) in vars.iter().enumerate() { let j = &js[id]; let v = qn[id] + delta[k].clamp(-0.3, 0.3); *qn.get_mut(id).unwrap() = v.clamp(j.lo, j.hi); }
            let (rn, gn, cn) = residual(&qn);
            if rn.iter().map(|x| x * x).sum::<f64>() < cost {
                q = qn; res = rn; goal = gn; closure = cn; lambda = (lambda * 0.3).max(1e-9); improved = true; break;
            }
            lambda *= 10.0;
        }
        if !improved { break; }
    }
    let ok = goal < r.tolerance && closure < r.tolerance;
    let message = if ok { "Reached the goal with every loop closed.".into() }
        else if closure >= r.tolerance { format!("Loops stay open by {:.1} mm: this pose can't close them. Move the goal or unlock a connector.", closure * 1000.0) }
        else { format!("Stopped {:.1} mm from the goal: it may be out of reach, or a joint limit blocks it.", goal * 1000.0) };
    Ok(Reply { values: vars.iter().map(|id| (id.clone(), q[id])).collect(), ok, goal_error_m: goal, closure_error_m: closure, iterations: it, message })
}

fn solve_linear(mut a: Vec<Vec<f64>>, mut b: Vec<f64>) -> Option<Vec<f64>> {
    let n = b.len();
    for c in 0..n {
        let p = (c..n).max_by(|&x, &y| a[x][c].abs().total_cmp(&a[y][c].abs()))?;
        if a[p][c].abs() < 1e-14 { return None; }
        a.swap(c, p); b.swap(c, p);
        for r in c + 1..n {
            let f = a[r][c] / a[c][c];
            for k in c..n { a[r][k] -= f * a[c][k]; }
            b[r] -= f * b[c];
        }
    }
    let mut x = vec![0.0; n];
    for r in (0..n).rev() { x[r] = (b[r] - (r + 1..n).map(|k| a[r][k] * x[k]).sum::<f64>()) / a[r][r]; }
    Some(x)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn joint(p: &str, c: &str, x: f64, y: f64) -> Value {
        json!({"type": "revolute", "parentBodyId": p, "childBodyId": c, "axis": [0, 0, 1], "origin": {"position": [x, y, 0]}, "childRest": {"position": [0, 0, 0]}, "limit": {"lower": -2, "upper": 2}, "state": {"value": 0}})
    }
    fn body(x: f64, y: f64) -> Value { json!({"transform": {"position": [x, y, 0]}}) }

    #[test]
    fn a_chain_reaches_a_reachable_goal() {
        let doc = json!({"bodies": {"a": body(0., 0.), "b": body(0.2, 0.), "c": body(0.4, 0.)}, "joints": {"ab": joint("a", "b", 0.2, 0.), "bc": joint("b", "c", 0.2, 0.)}});
        let r = solve(&Request { doc, tip: "c".into(), target: [0.2 + 0.2 * 0.5f64.cos(), 0.2 * 0.5f64.sin(), 0.0], root: None, iterations: 200, tolerance: 1e-4 }).unwrap();
        // c sits at joint bc, so only ab moves it: the goal is on the circle it can reach.
        assert!(r.ok, "{}", r.message);
    }

    #[test]
    fn a_ring_moves_while_staying_closed() {
        let doc = json!({"bodies": {"a": body(0., 0.), "b": body(0.2, 0.), "c": body(0.2, 0.2), "d": body(0., 0.2)},
            "joints": {"ab": joint("a", "b", 0.2, 0.), "bc": joint("b", "c", 0., 0.2), "cd": joint("c", "d", -0.2, 0.), "da": joint("d", "a", 0., -0.2)}});
        let r = solve(&Request { doc, tip: "c".into(), target: [0.2 - 0.2 * 0.3f64.sin(), 0.2 * 0.3f64.cos(), 0.0], root: None, iterations: 300, tolerance: 1e-4 }).unwrap();
        // A parallelogram: c can only move on a circle around b, so the goal is on that circle.
        assert!(r.closure_error_m < 1e-4, "closure {}", r.closure_error_m);
        assert!(r.goal_error_m < 1e-3, "goal {} {}", r.goal_error_m, r.message);
    }

    #[test]
    fn an_unreachable_goal_says_so() {
        let doc = json!({"bodies": {"a": body(0., 0.), "b": body(0.2, 0.)}, "joints": {"ab": joint("a", "b", 0.2, 0.)}});
        let r = solve(&Request { doc, tip: "b".into(), target: [5.0, 0.0, 0.0], root: None, iterations: 50, tolerance: 1e-3 }).unwrap();
        assert!(!r.ok && r.message.contains("out of reach"));
    }
}
