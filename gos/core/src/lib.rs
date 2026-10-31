//! GOS graph core. A robot is a graph, so rings and shapes that change are normal cases.
//!
//! `compile` turns the graph into what solvers and physics need: a spanning tree per connected
//! part, and every remaining joint as a loop constraint. MuJoCo represents loops the same way.
//! Python and the Studio call this one implementation (`ffi.rs`), never a copy of it.

mod ffi;
pub mod mjcf;

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

#[derive(Debug, Clone, Deserialize)]
pub struct BodyIn {
    pub id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JointIn {
    pub id: String,
    #[serde(rename = "type", default)]
    pub kind: String,
    pub parent: Option<String>,
    pub child: Option<String>,
    /// Detached, for example by an animation connection keyframe: not part of the graph right now.
    #[serde(default)]
    pub disabled: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GraphIn {
    pub bodies: Vec<BodyIn>,
    pub joints: Vec<JointIn>,
    /// Which body each part grows from. Any body can be the base, and this can change during motion.
    #[serde(default)]
    pub roots: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TreeEdge {
    pub joint: String,
    pub parent: String,
    pub child: String,
    /// The tree walks this joint from its child to its parent, so its sense flips.
    pub reversed: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Compiled {
    pub roots: Vec<String>,
    pub tree: Vec<TreeEdge>,
    pub loops: Vec<String>,
    /// Bodies held together by fixed joints move as one, in document order.
    pub rigid_groups: Vec<Vec<String>>,
    pub parts: Vec<Vec<String>>,
    pub tree_dof: usize,
    pub warnings: Vec<String>,
}

/// Union-find over body indices. Smaller index wins, so results don't depend on joint order.
struct Sets(Vec<usize>);
impl Sets {
    fn new(n: usize) -> Self { Sets((0..n).collect()) }
    fn find(&mut self, x: usize) -> usize {
        let mut r = x;
        while self.0[r] != r { r = self.0[r]; }
        let mut c = x;
        while self.0[c] != r { let n = self.0[c]; self.0[c] = r; c = n; }
        r
    }
    fn join(&mut self, a: usize, b: usize) {
        let (a, b) = (self.find(a), self.find(b));
        if a != b { self.0[a.max(b)] = a.min(b); }
    }
    fn groups(&mut self) -> Vec<Vec<usize>> {
        let mut by: HashMap<usize, Vec<usize>> = HashMap::new();
        let mut order = vec![];
        for i in 0..self.0.len() {
            let r = self.find(i);
            let e = by.entry(r).or_default();
            if e.is_empty() { order.push(r); }
            e.push(i);
        }
        order.into_iter().map(|r| by.remove(&r).unwrap()).collect()
    }
}

pub fn compile(g: &GraphIn) -> Compiled {
    let index: HashMap<&str, usize> = g.bodies.iter().enumerate().map(|(i, b)| (b.id.as_str(), i)).collect();
    let id = |i: usize| g.bodies[i].id.clone();
    let mut warnings = vec![];
    let mut valid: Vec<(&JointIn, usize, usize)> = vec![];
    for j in &g.joints {
        if j.disabled { continue; }
        let (Some(p), Some(c)) = (j.parent.as_deref(), j.child.as_deref()) else {
            warnings.push(format!("Joint {} is missing a body and was left out.", j.id));
            continue;
        };
        match (index.get(p), index.get(c)) {
            (Some(&a), Some(&b)) if a != b => valid.push((j, a, b)),
            (Some(_), Some(_)) => warnings.push(format!("Joint {} connects body {p} to itself and was left out.", j.id)),
            _ => warnings.push(format!("Joint {} names a body that doesn't exist and was left out.", j.id)),
        }
    }

    let n = g.bodies.len();
    let mut parts = Sets::new(n);
    let mut rigid = Sets::new(n);
    let mut adj: Vec<Vec<(usize, usize, bool)>> = vec![vec![]; n];
    let mut is_child = vec![false; n];
    for (k, &(j, a, b)) in valid.iter().enumerate() {
        parts.join(a, b);
        if j.kind == "fixed" { rigid.join(a, b); }
        adj[a].push((b, k, false));
        adj[b].push((a, k, true));
        is_child[b] = true;
    }

    let mut wanted: HashMap<usize, usize> = HashMap::new();
    let part_groups = parts.groups();
    for r in &g.roots {
        match index.get(r.as_str()) {
            Some(&i) => { let p = parts.find(i); wanted.entry(p).or_insert(i); }
            None => warnings.push(format!("Root {r} isn't a body in this graph and was ignored.")),
        }
    }

    let mut roots = vec![];
    let mut tree = vec![];
    let mut used = vec![false; valid.len()];
    let mut seen = vec![false; n];
    for part in &part_groups {
        // A body that is nobody's child reads naturally as the base. A pure ring has none, so it starts at its first body.
        let root = wanted.get(&parts.find(part[0])).copied()
            .or_else(|| part.iter().copied().find(|&i| !is_child[i]))
            .unwrap_or(part[0]);
        roots.push(id(root));
        seen[root] = true;
        let mut queue = VecDeque::from([root]);
        while let Some(cur) = queue.pop_front() {
            for &(next, k, reversed) in &adj[cur] {
                if used[k] || seen[next] { continue; }
                used[k] = true;
                seen[next] = true;
                tree.push(TreeEdge { joint: valid[k].0.id.clone(), parent: id(cur), child: id(next), reversed });
                queue.push_back(next);
            }
        }
    }

    let loops: Vec<String> = valid.iter().enumerate().filter(|(k, _)| !used[*k]).map(|(_, v)| v.0.id.clone()).collect();
    let tree_dof = tree.iter().filter(|e| valid.iter().any(|v| v.0.id == e.joint && v.0.kind != "fixed")).count();
    let named = |gs: Vec<Vec<usize>>| -> Vec<Vec<String>> { gs.into_iter().map(|g| g.into_iter().map(id).collect()).collect() };
    let rigid_groups = named(rigid.groups().into_iter().filter(|g| g.len() > 1).collect());
    Compiled { roots, tree, loops, rigid_groups, parts: named(part_groups), tree_dof, warnings }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn graph(bodies: &[&str], joints: &[(&str, &str, &str, &str)]) -> GraphIn {
        GraphIn {
            bodies: bodies.iter().map(|b| BodyIn { id: b.to_string() }).collect(),
            joints: joints.iter().map(|(i, k, p, c)| JointIn { id: i.to_string(), kind: k.to_string(), parent: Some(p.to_string()), child: Some(c.to_string()), disabled: false }).collect(),
            roots: vec![],
        }
    }

    #[test]
    fn chain_is_all_tree() {
        let c = compile(&graph(&["a", "b", "c"], &[("1", "revolute", "a", "b"), ("2", "revolute", "b", "c")]));
        assert_eq!(c.roots, ["a"]);
        assert_eq!(c.tree.len(), 2);
        assert!(c.loops.is_empty());
        assert_eq!(c.tree_dof, 2);
    }

    #[test]
    fn pure_ring_keeps_every_body_and_one_loop() {
        let c = compile(&graph(&["a", "b", "c", "d"], &[("1", "revolute", "a", "b"), ("2", "revolute", "b", "c"), ("3", "revolute", "c", "d"), ("4", "revolute", "d", "a")]));
        assert_eq!(c.roots, ["a"], "a ring has no natural base but must still have one");
        assert_eq!(c.tree.len(), 3);
        assert_eq!(c.loops.len(), 1);
        let mut reached: Vec<_> = c.tree.iter().map(|e| e.child.clone()).collect();
        reached.push(c.roots[0].clone());
        reached.sort();
        assert_eq!(reached, ["a", "b", "c", "d"]);
    }

    #[test]
    fn diamond_keeps_closing_joint_as_a_loop() {
        let c = compile(&graph(&["r", "a", "b", "c"], &[("ra", "revolute", "r", "a"), ("rb", "revolute", "r", "b"), ("ac", "revolute", "a", "c"), ("bc", "revolute", "b", "c")]));
        assert_eq!(c.roots, ["r"]);
        assert_eq!(c.loops, ["bc"]);
    }

    #[test]
    fn tree_can_walk_a_joint_backwards_when_the_root_changes() {
        let mut g = graph(&["a", "b", "c"], &[("1", "revolute", "a", "b"), ("2", "revolute", "b", "c")]);
        g.roots = vec!["c".into()];
        let c = compile(&g);
        assert_eq!(c.roots, ["c"]);
        assert!(c.tree.iter().all(|e| e.reversed), "from c, both joints run child to parent");
    }

    #[test]
    fn locks_merge_rigid_groups_and_unlock_splits_them() {
        let bodies = ["a", "b", "c", "d"];
        let free = compile(&graph(&bodies, &[("1", "revolute", "a", "b"), ("3", "revolute", "c", "d")]));
        assert_eq!(free.parts.len(), 2);
        assert!(free.rigid_groups.is_empty());
        let locked = compile(&graph(&bodies, &[("1", "revolute", "a", "b"), ("3", "revolute", "c", "d"), ("lock", "fixed", "b", "c")]));
        assert_eq!(locked.parts.len(), 1);
        assert_eq!(locked.rigid_groups, [["b", "c"]]);
    }

    #[test]
    fn separate_parts_get_separate_roots() {
        let c = compile(&graph(&["a", "b", "x"], &[("1", "revolute", "a", "b")]));
        assert_eq!(c.roots, ["a", "x"]);
    }

    #[test]
    fn bad_joints_are_reported_not_dropped_silently() {
        let mut g = graph(&["a"], &[("self", "revolute", "a", "a"), ("ghost", "revolute", "a", "nope")]);
        g.joints.push(JointIn { id: "off".into(), kind: "revolute".into(), parent: Some("a".into()), child: Some("a".into()), disabled: true });
        let c = compile(&g);
        assert_eq!(c.warnings.len(), 2);
        assert!(c.warnings[0].contains("self") && c.warnings[1].contains("ghost"));
    }

    #[test]
    fn every_joint_is_accounted_for() {
        let g = graph(&["a", "b", "c", "d", "e"], &[("1", "revolute", "a", "b"), ("2", "fixed", "b", "c"), ("3", "revolute", "c", "a"), ("4", "revolute", "c", "d"), ("5", "revolute", "d", "b")]);
        let c = compile(&g);
        assert_eq!(c.tree.len() + c.loops.len(), g.joints.len());
        assert_eq!(c.loops.len(), g.joints.len() - (g.bodies.len() - c.parts.len()), "loops = edges - nodes + parts");
    }
}
