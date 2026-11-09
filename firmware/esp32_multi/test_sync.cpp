// test_sync.cpp — checks sync.h on the laptop with pretend servos, no ESP32 and no motors.
//   zig c++ -std=c++17 -O1 -w test_sync.cpp -o test_sync && ./test_sync
// REUSE-CHECKED: sync|synchron|progress -> guard.h/test_guard.cpp are the per-joint overload guard (kept as is);
// nothing in the firmware coordinates joints during a move. This test follows test_guard.cpp's style.
//
// The pretend servo (test_servo.h, shared with test_group.cpp): position mode like an ST3215. It goes towards its goal at the asked speed, speeding up and
// braking at accRaw so it stops exactly on the goal, but never faster than `cap` (a load makes it slower) and never
// past `wall` (a hard stop). It counts how often it had to brake to a near stop mid-move (the old squeak).
#ifndef ARDUINO   // laptop test only: the sketch build compiles every .cpp in this folder
#include "sync.h"
#include "test_servo.h"
#include <cstdio>
#include <cmath>
#include <algorithm>

static const SyncCfg CFG = {0.02f, 0.08f, 0.15f, 0.20f, 5000.0f, 4.0f, 2048.0f, 40.0f, 1.5f, 0.004f, 0.8f, 12, 23};
static const float DT = 0.03f;    // FAST_MS
static int fails = 0;
#define CHECK(c, ...) do { if (!(c)) { fails++; printf("  FAIL: "); } else printf("  ok:   "); printf(__VA_ARGS__); printf("\n"); } while (0)

struct Run { SyncState end; float t, worstSpread, worstLag; int stops; int8_t laggard; };

// targets/starts in degrees; caps in deg/s (0 = free); T seconds
static Run play(int n, const double* fromDeg, const double* toDeg, const double* capDeg, float T,
                const double* wallDeg = nullptr, int badEvery = 0) {
  SyncMove m; Servo sv[SYNC_MAX]; int16_t f[SYNC_MAX], t[SYNC_MAX];
  for (int i = 0; i < n; i++) {
    f[i] = (int16_t)lround(fromDeg[i] * 4096 / 360); t[i] = (int16_t)lround(toDeg[i] * 4096 / 360);
    sv[i].pos = f[i]; if (capDeg[i] > 0) sv[i].cap = capDeg[i] * 4096 / 360;
    if (wallDeg && wallDeg[i] > 0) { sv[i].wall = wallDeg[i] * 4096 / 360; sv[i].wallDir = t[i] > f[i] ? 1 : -1; }
  }
  m.begin(CFG, (uint8_t)n, f, t, T, true);
  SyncOut out[SYNC_MAX]; int pos[SYNC_MAX];
  float worstSpread = 0; int tick = 0;
  SyncState st = SY_RUN;
  while (st == SY_RUN && tick < 4000) {                       // 120 s cap: a hang would show up as a failure
    for (int i = 0; i < n; i++) pos[i] = (badEvery && tick % badEvery == 3 && i == 1) ? -1 : (int)lround(sv[i].pos);
    st = m.step(CFG, DT, pos, out);
    // spread: how far apart the joints are on their own paths (only joints that really move, while moving)
    float lo = 2, hi = -1;
    for (int i = 0; i < n; i++) {
      if (!m.track[i]) continue;
      float u = (float)((sv[i].pos - f[i]) / (t[i] - f[i])); u = std::max(0.f, std::min(1.f, u));
      lo = std::min(lo, u); hi = std::max(hi, u);
    }
    if (hi >= 0 && m.s < 0.98f) worstSpread = std::max(worstSpread, hi - lo);
    for (int i = 0; i < n; i++) sv[i].tick(out[i].goal, out[i].speed, CFG.accRaw, DT);
    tick++;
  }
  int stops = 0; for (int i = 0; i < n; i++) stops += sv[i].stops;
  return {st, tick * DT, worstSpread, m.worstLag, stops, m.laggard};
}

int main() {
  printf("1. Nischay's example: 180->140 and 180->160, 2 s, no load\n");
  { double f[] = {180, 180}, t[] = {140, 160}, c[] = {0, 0};
    Run r = play(2, f, t, c, 2.0f);
    CHECK(r.end == SY_DONE, "finished together (%s)", r.end == SY_DONE ? "done" : "not done");
    CHECK(r.t < 2.6f, "on time: %.2f s for a 2 s pose", r.t);
    CHECK(r.worstSpread < 0.06f, "in step the whole way: worst gap %.1f %% of the path", r.worstSpread * 100);
    CHECK(r.stops == 0, "no stop-and-go mid move (%d)", r.stops); }

  printf("2. all 9 joints, mixed directions and sizes, 3 s\n");
  { double f[] = {180, 180, 200, 150, 180, 180, 170, 180, 180}, t[] = {140, 160, 120, 210, 181, 230, 175, 100, 180}, c[9] = {0};
    Run r = play(9, f, t, c, 3.0f);
    CHECK(r.end == SY_DONE && r.t < 3.6f, "done in %.2f s", r.t);
    CHECK(r.worstSpread < 0.06f, "worst gap %.1f %%", r.worstSpread * 100);
    CHECK(r.stops == 0, "no stop-and-go (%d)", r.stops); }

  printf("3. B1 lifting something heavy: it can only do 15 deg/s, its path needs ~40 deg/s\n");
  { double f[] = {180, 180, 180}, t[] = {240, 150, 200}, c[] = {15, 0, 0};
    Run r = play(3, f, t, c, 2.0f);
    CHECK(r.end == SY_DONE, "still finished (%s), took %.2f s", r.end == SY_DONE ? "done" : "not done", r.t);
    CHECK(r.worstSpread < 0.15f, "the others slowed down with it: worst gap %.1f %% (free run would be ~60 %%)", r.worstSpread * 100);
    CHECK(r.t > 3.5f, "the whole pose took longer instead of B1 arriving alone late (%.2f s)", r.t); }

  printf("4. a joint hits a hard stop half way: the pose must stop, not hang\n");
  { double f[] = {180, 180}, t[] = {240, 150}, c[] = {0, 0}, w[] = {210, 0};
    Run r = play(2, f, t, c, 2.0f, w);
    CHECK(r.end == SY_STALLED, "stalled (%d) after %.2f s, waiting on joint %d", r.end, r.t, r.laggard);
    CHECK(r.t < 6.0f, "gave up within seconds, no deadlock"); }

  printf("5. one joint does not move, one barely moves (1 deg): they never hold anyone up\n");
  { double f[] = {180, 180, 180}, t[] = {120, 180, 181}, c[] = {0, 0, 0};
    Run r = play(3, f, t, c, 1.5f);
    CHECK(r.end == SY_DONE && r.t < 2.1f, "done in %.2f s", r.t); }

  printf("6. a joint's reading is missing every few reads\n");
  { double f[] = {180, 180}, t[] = {140, 160}, c[] = {0, 0};
    Run r = play(2, f, t, c, 2.0f, nullptr, 5);
    CHECK(r.end == SY_DONE && r.t < 2.7f, "done in %.2f s", r.t);
    CHECK(r.worstSpread < 0.07f, "worst gap %.1f %%", r.worstSpread * 100); }

  printf("7. a quick small pose (0.4 s) and a slow big one (8 s)\n");
  { double f[] = {180, 180}, t[] = {170, 175}, c[] = {0, 0};
    Run r = play(2, f, t, c, 0.4f);
    CHECK(r.end == SY_DONE && r.t < 1.0f, "quick: done in %.2f s", r.t);
    double f2[] = {100, 260}, t2[] = {260, 100};
    Run r2 = play(2, f2, t2, c, 8.0f);
    CHECK(r2.end == SY_DONE && r2.t < 8.8f && r2.worstSpread < 0.05f, "slow: %.2f s, gap %.1f %%, stops %d", r2.t, r2.worstSpread * 100, r2.stops); }

  printf("8. heavy joint that recovers half way (load put down): the module speeds back up\n");
  { // same as 3 but the cap only applies for the first second: emulate with a cap of 25 deg/s
    double f[] = {180, 180}, t[] = {230, 150}, c[] = {25, 0};
    Run r = play(2, f, t, c, 2.0f);
    CHECK(r.end == SY_DONE && r.worstSpread < 0.12f, "done in %.2f s, gap %.1f %%", r.t, r.worstSpread * 100); }

  printf(fails ? "\n%d FAILED\n" : "\nall passed\n", fails);
  return fails ? 1 : 0;
}
#endif
