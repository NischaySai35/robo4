//! Transform graph: frames joined by measured or modelled transforms, where more than one path may join two
//! frames. ROS's tf2 is a tree and can't hold this. Every extra path is checked, and the disagreement
//! is reported: for a ring of modules that is the loop-closure error, the flex and slop of the real robot.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

#[derive(Deserialize)]
pub struct Edge { pub parent: String, pub child: String, #[serde(default)] pub p: [f64; 3], #[serde(default = "identity")] pub q: [f64; 4] }
fn identity() -> [f64; 4] { [0.0, 0.0, 0.0, 1.0] }

#[derive(Deserialize)]
pub struct Query { pub edges: Vec<Edge>, pub from: String, pub to: String }

#[derive(Serialize, Debug)]
pub struct LoopError { pub parent: String, pub child: String, pub position_m: f64, pub angle_rad: f64 }

#[derive(Serialize, Debug)]
pub struct Answer { pub p: [f64; 3], pub q: [f64; 4], pub path: Vec<String>, pub loops: Vec<LoopError>, pub worst_position_m: f64 }

type Q = [f64; 4];
fn qmul(a: Q, b: Q) -> Q {
    [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
     a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]
}
fn qinv(q: Q) -> Q { [-q[0], -q[1], -q[2], q[3]] }
fn rot(q: Q, v: [f64; 3]) -> [f64; 3] { let r = qmul(qmul(q, [v[0], v[1], v[2], 0.0]), qinv(q)); [r[0], r[1], r[2]] }
#[derive(Clone, Copy)]
struct Pose { p: [f64; 3], q: Q }
fn mul(a: Pose, b: Pose) -> Pose { let t = rot(a.q, b.p); Pose { p: [a.p[0] + t[0], a.p[1] + t[1], a.p[2] + t[2]], q: qmul(a.q, b.q) } }
fn inv(a: Pose) -> Pose { let q = qinv(a.q); let t = rot(q, a.p); Pose { p: [-t[0], -t[1], -t[2]], q } }

pub fn query(input: &Query) -> Result<Answer, String> {
    let mut adj: HashMap<&str, Vec<(usize, bool)>> = HashMap::new();
    for (i, e) in input.edges.iter().enumerate() {
        adj.entry(&e.parent).or_default().push((i, false));
        adj.entry(&e.child).or_default().push((i, true));
    }
    if !adj.contains_key(input.from.as_str()) { return Err(format!("No frame named {}.", input.from)); }
    if !adj.contains_key(input.to.as_str()) { return Err(format!("No frame named {}.", input.to)); }
    let mut pose: HashMap<&str, Pose> = HashMap::from([(input.from.as_str(), Pose { p: [0.0; 3], q: identity() })]);
    let mut came: HashMap<&str, &str> = HashMap::new();
    let mut used = vec![false; input.edges.len()];
    let mut queue = VecDeque::from([input.from.as_str()]);
    while let Some(cur) = queue.pop_front() {
        for &(i, backwards) in &adj[cur] {
            let e = &input.edges[i];
            let next = if backwards { e.parent.as_str() } else { e.child.as_str() };
            if pose.contains_key(next) { continue; }
            used[i] = true;
            let t = Pose { p: e.p, q: e.q };
            pose.insert(next, mul(pose[cur], if backwards { inv(t) } else { t }));
            came.insert(next, cur);
            queue.push_back(next);
        }
    }
    let Some(&target) = pose.get(input.to.as_str()) else {
        return Err(format!("{} and {} are not connected by any chain of transforms.", input.from, input.to));
    };
    let mut path = vec![input.to.clone()];
    while let Some(&prev) = came.get(path.last().unwrap().as_str()) { path.push(prev.to_string()); }
    path.reverse();
    let mut loops = vec![];
    for (i, e) in input.edges.iter().enumerate() {
        let (Some(&a), Some(&b)) = (pose.get(e.parent.as_str()), pose.get(e.child.as_str())) else { continue };
        if used[i] { continue; }
        let via_edge = mul(a, Pose { p: e.p, q: e.q });
        let d = [via_edge.p[0] - b.p[0], via_edge.p[1] - b.p[1], via_edge.p[2] - b.p[2]];
        let dq = qmul(qinv(b.q), via_edge.q);
        loops.push(LoopError { parent: e.parent.clone(), child: e.child.clone(), position_m: (d[0] * d[0] + d[1] * d[1] + d[2] * d[2]).sqrt(), angle_rad: 2.0 * dq[3].abs().min(1.0).acos() });
    }
    let worst_position_m = loops.iter().map(|l| l.position_m).fold(0.0, f64::max);
    Ok(Answer { p: target.p, q: target.q, path, loops, worst_position_m })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn e(a: &str, b: &str, x: f64, y: f64) -> Edge { Edge { parent: a.into(), child: b.into(), p: [x, y, 0.0], q: identity() } }

    #[test]
    fn closed_square_has_no_mismatch() {
        let r = query(&Query { edges: vec![e("a", "b", 1.0, 0.0), e("b", "c", 0.0, 1.0), e("c", "d", -1.0, 0.0), e("d", "a", 0.0, -1.0)], from: "a".into(), to: "c".into() }).unwrap();
        assert!((r.p[0] - 1.0).abs() < 1e-12 && (r.p[1] - 1.0).abs() < 1e-12);
        assert_eq!(r.loops.len(), 1);
        assert!(r.worst_position_m < 1e-12);
    }

    #[test]
    fn a_ring_that_does_not_close_reports_the_gap() {
        let r = query(&Query { edges: vec![e("a", "b", 1.0, 0.0), e("b", "c", 0.0, 1.0), e("c", "d", -1.0, 0.0), e("d", "a", 0.0, -0.97)], from: "a".into(), to: "d".into() }).unwrap();
        assert!((r.worst_position_m - 0.03).abs() < 1e-9, "{}", r.worst_position_m);
    }

    #[test]
    fn a_chain_can_be_read_backwards() {
        let r = query(&Query { edges: vec![e("a", "b", 1.0, 0.0), e("b", "c", 1.0, 0.0)], from: "c".into(), to: "a".into() }).unwrap();
        assert!((r.p[0] + 2.0).abs() < 1e-12);
        assert_eq!(r.path, ["c", "b", "a"]);
    }

    #[test]
    fn unknown_and_unconnected_frames_say_so() {
        let edges = || vec![e("a", "b", 1.0, 0.0), e("x", "y", 1.0, 0.0)];
        assert!(query(&Query { edges: edges(), from: "a".into(), to: "nope".into() }).unwrap_err().contains("No frame"));
        assert!(query(&Query { edges: edges(), from: "a".into(), to: "y".into() }).unwrap_err().contains("not connected"));
    }
}
