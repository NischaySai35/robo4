# TETROBOT Autonomy Stack — native, self-contained (no ROS)

Everything runs **inside TETROBOT** — no ROS, no middleware, no external servers.
The robot model, FK/IK, physics, planning, perception, learning and behaviours are
all native TypeScript over the same document. This is a deliberate alternative to
the ROS stack, not a wrapper around it.

| Capability | Native implementation |
|---|---|
| Manipulation planning | Joint-space **RRT** + shortcut smoothing + **real self/world collision** (`robotics/planning`, `robotics/collision`) |
| Navigation | Occupancy/costmap + **A\*** global + **pure-pursuit** follower + steer-walk (`robotics/nav`) |
| Perception / mapping | Simulated **LiDAR** (scene raycast) → **occupancy map** built from scans (`robotics/sensors`, `robotics/nav`) |
| Sensors | LiDAR, IMU (root orientation), joint encoders (FK) |
| Actuators / drivers | Model joints = actuators; existing ESP32 + ST3215 driver layer |
| Learning / training | Gym-style env + **Evolution-Strategies** trainer (`robotics/rl`) |
| Task orchestration | Native **Behaviour-Tree** engine (`robotics/behavior`) |
| World / sim | The Three.js + Rapier scene with an obstacle environment |

## Done (in app now)
- RRT motion planning with real AABB self/world collision checking + execution.
- A* navigation on an obstacle costmap **or** a LiDAR-built map; humanoid steer-walks the path.
- LiDAR scan + occupancy mapping (build the map from sensor returns, plan on it).
- Evolution-Strategies RL trainer on a reach task — return improves per generation, then runs the learned policy.
- Behaviour-Tree engine + a looping patrol mission (pick → plan → navigate → scan).
- Sensors readout (LiDAR / IMU / encoders).

## Next phases (all native, no ROS)
1. **Perception+**: ray-traced depth camera, multi-scan SLAM-style map fusion, costmap inflation layers, recovery behaviours.
2. **Planning+**: RRT\*/PRM, time-parameterised (trapezoidal/spline) trajectories, Cartesian & dual-arm planning, OBB/convex-hull collision.
3. **Locomotion+**: footstep planner + ZMP/capture-point balance for physically-stable bipedal walking over the physics engine.
4. **Learning+**: neural-net policies (tiny MLP) trained with policy-gradient/ES, domain randomisation, vectorised rollouts, checkpoint/replay.
5. **HAL/drivers**: unified driver interface, sim↔real switch over the existing ST3215/ESP32 link, teleop.
6. **Authoring**: visual Behaviour-Tree editor, mission timeline, skill library from JS Macros.
