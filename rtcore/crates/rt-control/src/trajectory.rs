//! A timed joint trajectory — the executable output of the Studio's planner
//! (blended corners + jerk-limited S-curve, see frontend `trajectory.ts`). The Studio
//! samples its smooth profile into dense `(time, positions)` points and sends them over
//! the bus; RT Core stores them here and the controller resamples by time each cycle.
//!
//! Because the Studio already did the smoothing, linear interpolation between the dense
//! points reproduces the smooth motion faithfully and is cheap/deterministic in the loop.

/// One waypoint: positions for every joint at `t` seconds from the trajectory start.
#[derive(Clone, Debug, PartialEq)]
pub struct TrajPoint {
    pub t: f64,
    pub positions: Vec<f64>,
}

/// A time-parameterized joint-space trajectory (must be sorted by `t`, starting at t=0).
#[derive(Clone, Debug, Default, PartialEq)]
pub struct JointTrajectory {
    pub points: Vec<TrajPoint>,
}

impl JointTrajectory {
    pub fn new(points: Vec<TrajPoint>) -> Self {
        JointTrajectory { points }
    }

    pub fn dof(&self) -> usize {
        self.points.first().map(|p| p.positions.len()).unwrap_or(0)
    }

    pub fn duration(&self) -> f64 {
        self.points.last().map(|p| p.t).unwrap_or(0.0)
    }

    pub fn is_empty(&self) -> bool {
        self.points.is_empty()
    }

    /// Joint positions at time `t` (seconds), clamped to `[0, duration]` and linearly
    /// interpolated between the bracketing points.
    pub fn sample(&self, t: f64) -> Vec<f64> {
        if self.points.is_empty() {
            return Vec::new();
        }
        if t <= self.points[0].t {
            return self.points[0].positions.clone();
        }
        let last = self.points.len() - 1;
        if t >= self.points[last].t {
            return self.points[last].positions.clone();
        }
        // find the segment [i, i+1] containing t
        let mut i = 0;
        while i + 1 < self.points.len() && self.points[i + 1].t < t {
            i += 1;
        }
        let a = &self.points[i];
        let b = &self.points[i + 1];
        let span = b.t - a.t;
        let f = if span > 1e-12 { (t - a.t) / span } else { 0.0 };
        a.positions
            .iter()
            .zip(b.positions.iter())
            .map(|(pa, pb)| pa + (pb - pa) * f)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn traj() -> JointTrajectory {
        JointTrajectory::new(vec![
            TrajPoint { t: 0.0, positions: vec![0.0, 0.0] },
            TrajPoint { t: 1.0, positions: vec![1.0, -2.0] },
            TrajPoint { t: 2.0, positions: vec![1.0, 0.0] },
        ])
    }

    #[test]
    fn reports_dof_and_duration() {
        let tj = traj();
        assert_eq!(tj.dof(), 2);
        assert_eq!(tj.duration(), 2.0);
    }

    #[test]
    fn samples_endpoints_and_clamps() {
        let tj = traj();
        assert_eq!(tj.sample(-5.0), vec![0.0, 0.0]);
        assert_eq!(tj.sample(0.0), vec![0.0, 0.0]);
        assert_eq!(tj.sample(2.0), vec![1.0, 0.0]);
        assert_eq!(tj.sample(99.0), vec![1.0, 0.0]);
    }

    #[test]
    fn interpolates_within_a_segment() {
        let tj = traj();
        assert_eq!(tj.sample(0.5), vec![0.5, -1.0]); // halfway on first segment
        assert_eq!(tj.sample(1.5), vec![1.0, -1.0]); // halfway on second segment
    }
}
