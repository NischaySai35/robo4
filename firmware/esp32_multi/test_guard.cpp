// test_guard.cpp — checks guard.h on the laptop with a simple pretend joint, no ESP32 and no motors.
//   zig c++ -std=c++17 -O1 -w test_guard.cpp -o test_guard && ./test_guard
// The pretend joint: a position servo that moves towards its target at up to 60 deg/s, can push at most its torque
// limit, and reports load = the push it needs (capped by the limit). Scenarios are Nischay's two examples, plus the
// garbled temperature read seen on mod1 (145 C for one instant, 4 Nov 2026).
#ifndef ARDUINO   // laptop test only: the sketch build compiles every .cpp in this folder
#include "guard.h"
#include <cstdio>
#include <cmath>

// as GUARD_BEND in esp32_multi.ino; reads every 30 ms (FAST_MS)
static const GuardCfg BEND = {750, 1300, 500, 100, 800, 300, 34, 114, 10, 15, 1000, 500, 2000, 60, 70, 62};
static const double DT = 0.03;
static int fails = 0;
#define CHECK(c, ...) do { if (!(c)) { fails++; printf("  FAIL: "); } else printf("  ok:   "); printf(__VA_ARGS__); printf("\n"); } while (0)

struct Joint {
  double pos = 2048, target = 2048; int torque = 700;     // raw units, 0.1 %
  double obstacle = 1e9;                                 // a hard stop at this raw position (moving up)
  double gravity = 0;                                    // 0.1 % of push needed just to hold
  int load = 0, currmA = 0, temp = 40;
  void tick(double dt) {
    double need = gravity, err = target - pos;
    bool pressing = pos >= obstacle && err > 0;
    if (pressing) need += 50 * err;                      // pushing into the stop: the push grows with how far past it
    else need += fabs(err) > 2 ? 150 : 0;                // moving costs a little
    double push = need > torque ? torque : need;
    if (pressing) { }
    else if (gravity > torque) pos -= (gravity - torque) * 0.5 * dt;   // too weak: it sinks, faster the weaker
    else { double v = 683 * dt; pos += err > v ? v : (err < -v ? -v : err); }
    if (pos > obstacle) pos = obstacle;
    load = (int)push; currmA = (int)(push * 1.6);
  }
};

struct Sim {
  Joint j; Guard g; uint32_t now = 1000;
  GuardEvent last = GE_NONE;
  void tick() {
    j.tick(DT); now += (uint32_t)(DT * 1000);
    GuardAction a = g.step(BEND, now, (int)j.pos, j.load, j.currmA, (int)j.target, j.temp, true);
    if (a.setTarget) j.target = a.target;
    if (a.setTorque) j.torque = a.torque;
    if (a.event) last = a.event;
  }
  void run(double secs) { for (int k = 0; k < secs / DT; k++) tick(); }
  uint32_t until(GuardState st, double maxS) { uint32_t t0 = now; while (g.state != st && now - t0 < maxS * 1000) tick(); return now - t0; }
};

int main() {
  printf("example 1: rotating into its own plastic stop\n");
  { Sim s; s.j.obstacle = 2300; s.j.target = 2600;                      // asked to go 26 deg past the stop
    uint32_t press = 0;                                                 // when it starts pressing hard
    for (int k = 0; k < 200 && s.g.state == G_OK; k++) { s.tick(); if (!press && s.j.load >= 665) press = s.now; }
    CHECK(s.g.state != G_OK && s.now - press <= 160, "it stops %u ms after it starts pressing hard", s.now - press);
    s.until(G_HELD, 1.0);
    CHECK(s.g.state == G_HELD, "it holds (state %d)", s.g.state);
    CHECK(s.j.pos <= 2300 && s.j.pos >= 2300 - 40, "at the hit point or just before it (pos %.0f)", s.j.pos);
    CHECK(s.j.torque <= BEND.calm, "at reduced strength (%d)", s.j.torque);
    CHECK(!s.g.allow((int)s.j.pos, 2500), "a move further into the stop is refused");
    uint32_t back = s.until(G_OK, 2.0);
    CHECK(s.g.state == G_OK && back <= 700, "the load stays safe, so it is normal again by itself after %u ms", back);
    CHECK(fabs(s.j.target - s.j.pos) < 40, "and stays where it stopped, no jump back into the stop (target %.0f, pos %.0f)", s.j.target, s.j.pos);
    CHECK(s.j.torque == BEND.ceiling, "full (ceiling) strength again (%d)", s.j.torque);
  }
  printf("example 2: lifting something heavy, the load keeps rising\n");
  { Sim s; s.j.gravity = 600; s.run(0.5);
    CHECK(s.g.state == G_OK, "60 %% is under the 75 %% limit: normal");
    s.j.gravity = 900;                                                  // stretched out horizontal: needs 90 %
    double before = s.j.pos, fastest = 0, prev = s.j.pos;
    for (int k = 0; k < 240; k++) { s.tick(); fastest = fmax(fastest, (prev - s.j.pos) / DT); prev = s.j.pos; }
    CHECK(s.g.state == G_GIVING, "it trips and gives way (state %d)", s.g.state);
    CHECK(s.j.pos < before, "gravity brings it back down (%.0f -> %.0f)", before, s.j.pos);
    CHECK(s.j.torque >= BEND.holdTorque, "never limp: strength at least %d (%d)", BEND.holdTorque, s.j.torque);
    CHECK(fastest <= BEND.yieldRawPerS * 1.5, "slowly: fastest %.0f raw/s (%.1f deg/s)", fastest, fastest * 0.088);
    s.j.gravity = 100;                                                  // the object is put back down
    uint32_t back = s.until(G_OK, 3.0);
    CHECK(s.g.state == G_OK && back <= 900, "object put down: normal again by itself after %u ms", back);
  }
  printf("short start-up spike is ignored\n");
  { Sim s; s.run(0.3);
    s.g.step(BEND, s.now += 30, (int)s.j.pos, 900, 1500, (int)s.j.target, 40, true);   // one bad read
    s.run(0.3);
    CHECK(s.g.state == G_OK, "one 30 ms spike does not trip it");
  }
  printf("a garbled read says 145 C for one instant\n");
  { Sim s; s.run(0.3); s.j.temp = 145; s.run(0.06); s.j.temp = 40; s.run(0.3);
    CHECK(s.g.state == G_OK, "ignored: real heat has to last 2 s (state %d)", s.g.state); }
  printf("really too hot\n");
  { Sim s; s.run(0.3); s.j.temp = 71; s.run(2.2);
    CHECK(s.g.state == G_HOT && !s.g.allow((int)s.j.pos, (int)s.j.pos + 100), "71 C for 2 s: it holds gently and refuses moves");
    s.j.temp = 61; s.run(0.1);
    CHECK(s.g.state == G_OK, "cooled to 61 C: back to normal (state %d)", s.g.state);
  }
  printf(fails ? "\n%d FAILED\n" : "\nall passed\n", fails);
  return fails ? 1 : 0;
}
#endif
