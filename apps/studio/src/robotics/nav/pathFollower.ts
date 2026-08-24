/**
 * pathFollower — pure-pursuit local controller (Nav2's controller role). Given the
 * robot's current ground pose and a path of [x,z] waypoints, it picks a lookahead
 * point and returns the desired heading + a forward/turn command. Kinematic: the
 * humanoid "navigate" gait consumes heading error to steer while it walks.
 */
export interface Pose2D { x: number; z: number; yaw: number; } // yaw: 0 = +Z, CCW
export interface FollowCmd { done: boolean; headingErr: number; forward: number; target: [number, number]; dist: number; }

const TWO_PI = Math.PI * 2;
const wrap = (a: number) => { a %= TWO_PI; if (a > Math.PI) a -= TWO_PI; if (a < -Math.PI) a += TWO_PI; return a; };

export function follow(path: number[][], pose: Pose2D, lookahead = 0.45, goalTol = 0.18): FollowCmd {
  if (!path.length) return { done: true, headingErr: 0, forward: 0, target: [pose.x, pose.z], dist: 0 };
  const goal = path[path.length - 1];
  const distGoal = Math.hypot(goal[0] - pose.x, goal[1] - pose.z);
  if (distGoal < goalTol) return { done: true, headingErr: 0, forward: 0, target: goal as [number, number], dist: distGoal };

  // Lookahead: first waypoint farther than `lookahead`, else the goal.
  let target = goal;
  for (const wp of path) {
    if (Math.hypot(wp[0] - pose.x, wp[1] - pose.z) >= lookahead) { target = wp; break; }
  }
  // Desired heading: yaw measured from +Z, CCW positive (atan2(dx, dz)).
  const desired = Math.atan2(target[0] - pose.x, target[1] - pose.z);
  const headingErr = wrap(desired - pose.yaw);
  // Slow down when we must turn hard.
  const forward = Math.max(0, Math.cos(headingErr));
  return { done: false, headingErr, forward, target: target as [number, number], dist: distGoal };
}
