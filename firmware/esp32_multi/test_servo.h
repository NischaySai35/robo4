// test_servo.h — the pretend ST3215 for the laptop tests (test_sync.cpp, test_group.cpp). Laptop only.
// Position mode: goes towards its goal at the asked speed, speeding up and braking at `acc` so it stops exactly on the
// goal, never faster than `cap` (a load makes it slower) and never past `wall` (a hard stop). It counts how often it
// had to brake to a near stop mid-move (the old squeak).
#pragma once
#include <cmath>
#include <algorithm>

struct Servo {
  double pos, vel = 0, cap = 1e9, wall = 1e9; int wallDir = 0;
  int stops = 0; bool movedOnce = false;
  void tick(int goal, double speed, double acc, double dt) {
    double err = goal - pos, dir = err > 0 ? 1 : -1;
    double vmax = std::min(speed, cap);
    double vstop = sqrt(2 * acc * fabs(err));                    // fastest it may go and still stop on the goal
    double want = std::min(vmax, vstop) * dir;
    if (fabs(err) < 0.5) want = 0;
    double dv = want - vel, lim = acc * dt;
    vel += dv > lim ? lim : (dv < -lim ? -lim : dv);
    double was = fabs(vel);
    pos += vel * dt;
    if (wallDir && (pos - wall) * wallDir > 0) { pos = wall; vel = 0; }
    if (was > 100) movedOnce = true;
    if (movedOnce && was < 20 && fabs(err) > 30) stops++;
  }
};
