//! traj-io — parse the Studio's exported trajectory JSON into a native `JointTrajectory`.
//!
//! This is the RT Core side of the Studio↔RT Core contract. The Studio
//! (`frontend/src/robotics/planning/rtExport.ts`) plans a blended, jerk-limited path,
//! samples it densely, and emits this schema:
//!
//! ```json
//! { "format": "rtcore.trajectory", "version": 1, "dof": 3,
//!   "joints": ["J1","J2","J3"], "dt": 0.05, "duration": 1.0,
//!   "points": [ { "t": 0.0, "positions": [0,0,0] }, ... ] }
//! ```
//!
//! We parse via `serde_json::Value` (no derive) to keep the dependency light and the schema
//! handling explicit. `rt-control` itself stays dependency-free; only this boundary crate
//! pulls in a parser, and only off the hot path (at goal-acceptance time).

use rt_control::trajectory::{JointTrajectory, TrajPoint};
use rt_control::ControllerStatus;
use serde_json::{json, Value};

pub const FORMAT: &str = "rtcore.trajectory";
pub const VERSION: u64 = 1;
pub const STATUS_FORMAT: &str = "rtcore.controller_status";

/// A command the Studio sends IN to RT Core over the telemetry socket.
#[derive(Clone, Debug, PartialEq)]
pub enum Inbound {
    /// Execute a new trajectory (format `rtcore.trajectory`).
    Trajectory(JointTrajectory),
    /// Trip (`true`) or reset (`false`) the e-stop (format `rtcore.command`, cmd `estop`).
    EStop(bool),
    /// Unrecognized / malformed — ignored by the caller.
    Unknown,
}

/// Parse an inbound Studio command. Dispatches on the JSON `format` field; never panics.
pub fn parse_inbound(s: &str) -> Inbound {
    let v: Value = match serde_json::from_str(s) {
        Ok(v) => v,
        Err(_) => return Inbound::Unknown,
    };
    match v.get("format").and_then(Value::as_str) {
        Some(FORMAT) => from_json(s).map(Inbound::Trajectory).unwrap_or(Inbound::Unknown),
        Some("rtcore.command") => match v.get("cmd").and_then(Value::as_str) {
            Some("estop") => Inbound::EStop(v.get("trip").and_then(Value::as_bool).unwrap_or(true)),
            _ => Inbound::Unknown,
        },
        _ => Inbound::Unknown,
    }
}

/// Serialize controller feedback to the JSON the Studio consumes (rtStatus.ts).
/// This is the RT Core → Studio direction of the live-feedback contract.
pub fn status_to_json(s: &ControllerStatus) -> String {
    json!({
        "format": STATUS_FORMAT,
        "version": VERSION,
        "name": s.name,
        "elapsed": s.elapsed,
        "duration": s.duration,
        "fraction": s.fraction,
        "finished": s.finished,
        "error": s.error,
    })
    .to_string()
}

/// Parse a Studio trajectory JSON document into a `JointTrajectory`.
pub fn from_json(s: &str) -> Result<JointTrajectory, String> {
    let v: Value = serde_json::from_str(s).map_err(|e| format!("invalid JSON: {e}"))?;

    match v.get("format").and_then(Value::as_str) {
        Some(FORMAT) => {}
        other => return Err(format!("unexpected format: {other:?} (want {FORMAT:?})")),
    }
    if let Some(ver) = v.get("version").and_then(Value::as_u64) {
        if ver != VERSION {
            return Err(format!("unsupported version {ver} (want {VERSION})"));
        }
    }

    let points = v
        .get("points")
        .and_then(Value::as_array)
        .ok_or("missing `points` array")?;

    let mut out = Vec::with_capacity(points.len());
    let mut prev_t = f64::NEG_INFINITY;
    for (i, p) in points.iter().enumerate() {
        let t = p
            .get("t")
            .and_then(Value::as_f64)
            .ok_or_else(|| format!("point {i}: missing numeric `t`"))?;
        if t < prev_t {
            return Err(format!("point {i}: time {t} is out of order"));
        }
        prev_t = t;
        let positions = p
            .get("positions")
            .and_then(Value::as_array)
            .ok_or_else(|| format!("point {i}: missing `positions` array"))?
            .iter()
            .map(|n| n.as_f64().ok_or_else(|| format!("point {i}: non-numeric position")))
            .collect::<Result<Vec<f64>, String>>()?;
        out.push(TrajPoint { t, positions });
    }
    if out.is_empty() {
        return Err("trajectory has no points".into());
    }
    Ok(JointTrajectory::new(out))
}

#[cfg(test)]
mod tests {
    use super::*;

    // The SAME example asserted on the TS side (rtExport.test.ts) — the shared contract.
    const SAMPLE: &str = r#"{
        "format": "rtcore.trajectory", "version": 1, "dof": 2,
        "joints": ["J1","J2"], "dt": 0.5, "duration": 1.0,
        "points": [
            { "t": 0.0, "positions": [0.0, 0.0] },
            { "t": 0.5, "positions": [0.5, -1.0] },
            { "t": 1.0, "positions": [1.0, 0.0] }
        ]
    }"#;

    #[test]
    fn parses_the_studio_schema() {
        let tj = from_json(SAMPLE).expect("parse");
        assert_eq!(tj.dof(), 2);
        assert_eq!(tj.duration(), 1.0);
        assert_eq!(tj.points.len(), 3);
        // resamples like the controller will
        assert_eq!(tj.sample(0.25), vec![0.25, -0.5]);
        assert_eq!(tj.sample(1.0), vec![1.0, 0.0]);
    }

    #[test]
    fn rejects_wrong_format() {
        let bad = r#"{ "format": "something_else", "points": [] }"#;
        assert!(from_json(bad).is_err());
    }

    #[test]
    fn rejects_out_of_order_points() {
        let bad = r#"{ "format": "rtcore.trajectory", "version": 1,
            "points": [ {"t":1.0,"positions":[0]}, {"t":0.5,"positions":[1]} ] }"#;
        assert!(from_json(bad).unwrap_err().contains("out of order"));
    }

    #[test]
    fn rejects_empty_and_malformed() {
        assert!(from_json("{ not json").is_err());
        assert!(from_json(r#"{ "format":"rtcore.trajectory","points":[] }"#).is_err());
    }

    #[test]
    fn parses_inbound_trajectory_and_estop_commands() {
        match parse_inbound(SAMPLE) {
            Inbound::Trajectory(t) => assert_eq!(t.dof(), 2),
            other => panic!("expected trajectory, got {other:?}"),
        }
        assert_eq!(
            parse_inbound(r#"{"format":"rtcore.command","cmd":"estop","trip":true}"#),
            Inbound::EStop(true)
        );
        assert_eq!(
            parse_inbound(r#"{"format":"rtcore.command","cmd":"estop","trip":false}"#),
            Inbound::EStop(false)
        );
        assert_eq!(parse_inbound("{ not json"), Inbound::Unknown);
        assert_eq!(parse_inbound(r#"{"format":"whatever"}"#), Inbound::Unknown);
    }

    #[test]
    fn serializes_controller_status_to_the_studio_schema() {
        // The SAME example asserted on the TS side (rtStatus.test.ts) — shared contract.
        let s = ControllerStatus {
            name: "arm_traj".into(),
            elapsed: 0.5,
            duration: 1.0,
            fraction: 0.5,
            finished: false,
            error: vec![0.01, -0.02],
        };
        let json = status_to_json(&s);
        let v: Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["format"], "rtcore.controller_status");
        assert_eq!(v["version"], 1);
        assert_eq!(v["name"], "arm_traj");
        assert_eq!(v["fraction"], 0.5);
        assert_eq!(v["finished"], false);
        assert_eq!(v["error"][1], -0.02);
    }
}
