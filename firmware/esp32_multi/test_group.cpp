// test_group.cpp — checks groupsync.h + sync.h: several pretend modules play one animation over a pretend radio
// (delays, lost messages, a module that dies), no ESP32 and no motors.
//   python -m ziglang c++ -std=c++17 -O1 -w test_group.cpp -o test_group && ./test_group
// The module loop below mirrors the firmware (esp32_multi.ino: syncTick, animTick, groupTick).
#ifndef ARDUINO   // laptop test only: the sketch build compiles every .cpp in this folder
#include "sync.h"
#include "groupsync.h"
#include "test_servo.h"
#include <cstdio>
#include <vector>
#include <deque>
#include <random>

static const SyncCfg CFG = {0.02f, 0.08f, 0.15f, 0.20f, 5000.0f, 4.0f, 2048.0f, 40.0f, 1.5f, 0.004f, 0.8f, 12, 23};
static int fails = 0;
#define CHECK(c, ...) do { if (!(c)) { fails++; printf("  FAIL: "); } else printf("  ok:   "); printf(__VA_ARGS__); printf("\n"); } while (0)

static const int NJ = 3, NF = 3;
static const double FR[NF][NJ] = {{220, 150, 200}, {160, 210, 170}, {180, 180, 180}};   // degrees, same for every module
static const float  TF = 1.0f;                                  // seconds per frame
static const uint32_t TICK = 10, SYNC_MS = 30, PLACE_MS = 50;   // firmware: FAST_MS ~30, GROUP_PLACE_MS 50
static int16_t raw(double d) { return (int16_t)lround(d * 4096 / 360); }

struct Mod {
  uint8_t num = 0; Group g; SyncMove mv; Servo sv[NJ]; int goal[NJ]; double speed[NJ];
  bool playing = false, finished = false, dead = false, frameDone = false, halted = false, deaf = false;
  uint32_t haltAt = 0; uint8_t haltWho = 0; bool haltAbsent = false, haltBarrier = false;
  uint16_t step = 0; uint32_t syncAt = 0, placeAt = 0, startMs = 0, endMs = 0, deadAt = 0;
  uint32_t frameStart[NF + 1] = {0};
  void begin(uint32_t now) {
    int16_t f[NJ], t[NJ];
    for (int j = 0; j < NJ; j++) { f[j] = (int16_t)lround(sv[j].pos); t[j] = raw(FR[step][j]); goal[j] = f[j]; speed[j] = 40; }
    mv.begin(CFG, NJ, f, t, TF, true); frameDone = false; frameStart[step] = now; syncAt = now;
  }
  void start(uint32_t now) { if (playing || finished || halted) return; playing = true; startMs = now; step = 0; g.startPlay(now); begin(now); }
  void halt(uint32_t now, uint8_t who) { playing = false; halted = true; haltAt = now; haltWho = who; g.stopPlay(); }
};

struct Air { uint32_t at; int to; GroupMsg m; };
struct Result { uint32_t startSpread, frameSpread, total; float worstGap; bool allDone, hung; std::vector<Mod> mods; };

// caps: deg/s per module (0 = free). loss: share of radio messages lost. dieAt: module 2 goes silent at that ms.
// loseGoFor / loseGoCount: that module misses the first GO messages. stopAt: module 2 stops (its guard) at that ms and
// every STOP it says is lost. deaf2: module 2 never hears GO. named: the upload names every module (expect).
static Result play(int n, const double* caps, double loss, uint32_t dieAt = 0, int loseGoFor = -1, int loseGoCount = 0,
                   uint32_t stopAt = 0, bool deaf2 = false, bool named = true) {
  std::mt19937 rng(7); std::uniform_real_distribution<double> U(0, 1);
  std::vector<Mod> M(n);
  for (int i = 0; i < n; i++) {
    M[i].num = (uint8_t)(i + 1); M[i].g.reset(0xBEEF, named ? ((1u << (n + 1)) - 2) : 0); M[i].g.me = M[i].num;
    for (int j = 0; j < NJ; j++) { M[i].sv[j].pos = raw(180); if (caps[i] > 0) M[i].sv[j].cap = caps[i] * 4096 / 360; }
  }
  if (dieAt) M[1].deadAt = dieAt;
  if (deaf2) M[1].deaf = true;
  std::deque<Air> air; int goLost = 0;
  auto send = [&](int from, const GroupMsg& m, uint32_t now) {
    for (int to = 0; to < n; to++) {
      if (to == from) continue;
      if (m.kind == GK_GO && to == loseGoFor && goLost < loseGoCount) { goLost++; continue; }
      if (U(rng) < loss) continue;
      air.push_back({now + 2 + (uint32_t)(U(rng) * 6), to, m});    // 2..8 ms on the air
    }
  };
  // the laptop asks module 1 to play: it says GO three times, 15 ms apart (firmware: GROUP_GO_REPEAT), and starts
  M[0].start(0);
  for (uint32_t k = 0; k < 3; k++) send(0, Group::msg(0xBEEF, GK_GO, 1, 0), k * 15);

  float worstGap = 0; uint32_t now = 0; const uint32_t CAP = 60000;
  for (; now < CAP; now += TICK) {
    for (auto it = air.begin(); it != air.end();) {            // deliver what has arrived
      if (it->at > now) { ++it; continue; }
      Mod& r = M[it->to];
      if (!r.dead) {
        if (it->m.kind == GK_GO && it->m.group == r.g.id) { if (!r.deaf) r.start(now); }
        else if (it->m.kind == GK_STOP && it->m.group == r.g.id) { if (r.playing) r.halt(now, it->m.mod); }
        else r.g.heard(it->m, now);
      }
      it = air.erase(it);
    }
    for (int i = 0; i < n; i++) {
      Mod& m = M[i];
      if (m.deadAt && now >= m.deadAt) m.dead = true;
      if (stopAt && i == 1 && m.playing && now >= stopAt) { m.halt(now, 0); }   // its STOP: all lost
      if (m.dead || !m.playing) continue;
      bool absent = false;                                                   // groupTick: a partner missing?
      if (uint8_t w = m.g.missingNow(now, &absent)) {
        m.halt(now, w); m.haltAbsent = absent;
        for (uint32_t k = 0; k < 3; k++) send(i, Group::msg(m.g.id, GK_STOP, m.num, m.step), now + k * 15);
        continue;
      }
      if (now - m.syncAt >= SYNC_MS && m.mv.state == SY_RUN) {             // syncTick
        float dt = (now - m.syncAt) / 1000.0f; m.syncAt = now;
        int pos[NJ]; SyncOut out[NJ];
        for (int j = 0; j < NJ; j++) pos[j] = (int)lround(m.sv[j].pos);
        m.mv.peerS = m.g.peerS(now, m.step);
        m.mv.step(CFG, dt, pos, out);
        for (int j = 0; j < NJ; j++) { m.goal[j] = out[j].goal; m.speed[j] = out[j].speed; }
      }
      for (int j = 0; j < NJ; j++) m.sv[j].tick(m.goal[j], m.speed[j], CFG.accRaw, TICK / 1000.0);
      if (m.mv.state != SY_RUN) {                                           // animTick: frame over, wait for the group
        m.frameDone = true;
        if (m.g.mayAdvance(now, m.step)) {
          if (m.g.lastTimedOut) {                                           // the firmware stops the group then
            m.halt(now, m.g.lastWaitingOn); m.haltBarrier = true;
            for (uint32_t k = 0; k < 3; k++) send(i, Group::msg(m.g.id, GK_STOP, m.num, m.step), now + k * 15);
            continue;
          }
          if (m.step + 1 < NF) { m.step++; m.begin(now); }
          else { m.playing = false; m.finished = true; m.endMs = now; m.frameStart[NF] = now; m.g.stopPlay(); }
        }
      }
      if (m.finished) {                                                    // done: said 3 times (firmware grpSay)
        for (uint32_t k = 0; k < 3; k++) send(i, Group::msg(m.g.id, GK_PLACE, m.num, m.step, 1, true, false), now + k * 15);
      } else if (now - m.placeAt >= PLACE_MS) {                             // groupTick: say where we are
        m.placeAt = now;
        send(i, Group::msg(m.g.id, GK_PLACE, m.num, m.step, m.mv.s, m.frameDone, m.playing), now);
      }
    }
    for (int a = 0; a < n; a++) for (int b = a + 1; b < n; b++) {         // gap between modules on the same frame
      Mod &A = M[a], &B = M[b];
      if (A.dead || B.dead || !A.playing || !B.playing || A.step != B.step) continue;
      if (A.mv.state == SY_RUN && B.mv.state == SY_RUN) worstGap = std::max(worstGap, fabsf(A.mv.s - B.mv.s));
    }
    bool busy = false;
    for (auto& m : M) if (!m.dead && !m.finished && !m.halted && (m.playing || now < 5000)) busy = true;
    if (!busy) break;
  }
  Result r{}; r.mods = M; r.worstGap = worstGap; r.hung = now >= CAP; r.allDone = true;
  uint32_t s0 = 1u << 31, s1 = 0, fs = 0, total = 0;
  for (auto& m : M) {
    if (m.dead) continue;
    if (!m.finished) r.allDone = false;
    s0 = std::min(s0, m.startMs); s1 = std::max(s1, m.startMs); total = std::max(total, m.endMs);
  }
  for (int f = 1; f <= NF; f++) {                                // when each module started the next frame (or ended)
    uint32_t lo = 1u << 31, hi = 0;
    for (auto& m : M) if (!m.dead) { lo = std::min(lo, m.frameStart[f]); hi = std::max(hi, m.frameStart[f]); }
    fs = std::max(fs, hi - lo);
  }
  r.startSpread = s1 - s0; r.frameSpread = fs; r.total = total;
  return r;
}

int main() {
  printf("1. two equal modules, perfect radio\n");
  { double c[] = {0, 0}; Result r = play(2, c, 0);
    CHECK(r.allDone && !r.hung, "both finished (%u ms for %d frames of %.1f s)", r.total, NF, TF);
    CHECK(r.startSpread <= 10, "started together: %u ms apart", r.startSpread);
    CHECK(r.frameSpread <= 60, "every next frame started together: worst %u ms apart", r.frameSpread);
    CHECK(r.worstGap < 0.05f, "in step while moving: worst gap %.1f %% of a frame", r.worstGap * 100); }

  printf("2. module 2 is loaded (its joints manage only 25 deg/s): module 1 waits for it\n");
  { double c[] = {0, 25}; Result r = play(2, c, 0);
    CHECK(r.allDone && !r.hung, "both finished (%u ms; slower than %d ms is expected)", r.total, (int)(NF * TF * 1000));
    CHECK(r.frameSpread <= 80, "frames still start together: worst %u ms apart", r.frameSpread);
    CHECK(r.worstGap < 0.12f, "module 1 stays with module 2: worst gap %.1f %%", r.worstGap * 100); }

  printf("3. bad radio: 30 %% of messages lost, 2-8 ms delay, module 2 loaded\n");
  { double c[] = {0, 25}; Result r = play(2, c, 0.30);
    CHECK(r.allDone && !r.hung, "both finished, no hang (%u ms)", r.total);
    CHECK(r.frameSpread <= 120, "frames start together: worst %u ms apart", r.frameSpread);
    CHECK(r.worstGap < 0.15f, "in step: worst gap %.1f %%", r.worstGap * 100); }

  printf("4. module 2 switched off mid-animation (t = 1.5 s): module 1 stops and holds (never pushes on alone)\n");
  { double c[] = {0, 0}; Result r = play(2, c, 0, 1500);
    const Mod& a = r.mods[0];
    CHECK(!r.hung && a.halted && !a.finished && a.haltWho == 2, "module 1 stopped because of module 2");
    CHECK(a.haltAt >= 1500 + 900 && a.haltAt <= 1500 + 1200, "about 1 s after module 2 went silent (at %u ms)", a.haltAt); }

  printf("5. module 2 missed the first two GO messages\n");
  { double c[] = {0, 0}; Result r = play(2, c, 0, 0, 1, 2);
    CHECK(r.allDone && !r.hung, "both finished (%u ms)", r.total);
    CHECK(r.startSpread <= 40, "module 2 started only %u ms late (the third GO)", r.startSpread);
    CHECK(r.frameSpread <= 60, "and the frames line up again: worst %u ms apart", r.frameSpread); }

  printf("6. three modules, the middle one loaded, 15 %% loss\n");
  { double c[] = {0, 30, 0}; Result r = play(3, c, 0.15);
    CHECK(r.allDone && !r.hung, "all three finished (%u ms)", r.total);
    CHECK(r.frameSpread <= 100, "frames start together: worst %u ms apart", r.frameSpread);
    CHECK(r.worstGap < 0.15f, "in step: worst gap %.1f %%", r.worstGap * 100); }

  printf("7. module 2 is switched off before play (never starts): module 1 stops instead of playing alone\n");
  { double c[] = {0, 0}; Result r = play(2, c, 0, 0, -1, 0, 0, true);
    const Mod& a = r.mods[0];
    CHECK(!r.hung && a.halted && a.haltAbsent && a.haltWho == 2, "module 1 stopped: module 2 never started");
    CHECK(a.haltAt >= 2500 && a.haltAt <= 2600, "after %u ms (the 2.5 s it gives a late start)", a.haltAt); }

  printf("8. module 2 stops (its guard) and every STOP it says is lost: module 1 still stops\n");
  { double c[] = {0, 0}; Result r = play(2, c, 0, 0, -1, 0, 1500);
    const Mod& a = r.mods[0];
    CHECK(!r.hung && a.halted && a.haltWho == 2 && a.haltAt <= 1500 + 1200, "module 1 stopped at %u ms", a.haltAt); }

  printf("9. three modules, module 2 switched off, 15 %% loss: modules 1 AND 3 stop\n");
  { double c[] = {0, 0, 0}; Result r = play(3, c, 0.15, 1500);
    CHECK(!r.hung && r.mods[0].halted && r.mods[2].halted, "both others stopped (at %u and %u ms)", r.mods[0].haltAt, r.mods[2].haltAt); }

  printf("10. module 2 still talking but never finishes frame 1: after 3 s at the frame end the group stops\n");
  { Group g; g.reset(0xBEEF, (1u << 1) | (1u << 2)); g.me = 1; g.startPlay(1000);
    bool early = false;
    for (uint32_t t = 1000; t < 4000; t += 50) {                        // module 2 says "frame 0, not done" every 50 ms
      g.heard(Group::msg(0xBEEF, GK_PLACE, 2, 0, 0.5f, false, true), t);
      if (t >= 1100 && g.mayAdvance(t, 0)) { early = true; break; }    // we finished frame 0 at 1100 ms
      if (g.missingNow(t)) { early = true; break; }                    // talking = not missing
    }
    CHECK(!early, "waited (module 2 talks, so it is not missing)");
    g.heard(Group::msg(0xBEEF, GK_PLACE, 2, 0, 0.5f, false, true), 4100);
    const bool go = g.mayAdvance(4100, 0);
    CHECK(go && g.lastTimedOut && g.lastWaitingOn == 2, "then gave up after %lu ms on module %u: the firmware stops the group", (unsigned long)g.lastWaitMs, g.lastWaitingOn); }

  printf("11. older laptop code (the upload names nobody): a module that never starts is not waited for\n");
  { double c[] = {0, 0}; Result r = play(2, c, 0, 0, -1, 0, 0, true, false);
    CHECK(!r.hung && r.mods[0].finished, "module 1 played (as before), %u ms", r.mods[0].endMs); }

  printf(fails ? "\n%d check(s) FAILED\n" : "\nall checks passed\n", fails);
  return fails ? 1 : 0;
}
#endif
