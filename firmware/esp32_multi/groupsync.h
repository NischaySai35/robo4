// groupsync.h — several modules play one animation in step (Nischay, 9 Nov 2026: "both boards should start at the
// same time, and at every motion stay in sync; if one is slower the other adjusts; no deadlock").
//
// Pure logic, no Arduino calls, so test_group.cpp checks it on the laptop with pretend modules and a lossy radio.
// REUSE-CHECKED: group|peer|together|barrier -> sync.h keeps the joints of ONE module in step (shared progress clock,
// the slowest joint slows the clock); nothing coordinated modules. This extends that clock across modules: another
// module's clock counts like one more joint to wait for. The radio is the existing ESP-NOW link (r4now::GRP frames).
//
// How:
//   Every module of a group has the same animation (each its own joints), uploaded with the same group number.
//   START  The laptop asks ONE module to play; it sends GO over the radio (3 times, 15 ms apart) and starts. Every
//          module that has the group's animation starts when it hears GO: one radio frame reaches all of them at once.
//   MOVE   Each module sends its place (step = which frame of which pass, s = its clock 0..1) 20 times a second.
//          A module whose clock is AHEAD of the slowest fresh peer runs its clock slower (sync.h rate rule, peerS).
//   FRAME  A module that finished a frame starts the next only when every fresh peer has finished it too.
//   STOP   A module that stops (laptop, stall, guard) says STOP; the others stop as well.
//
// No deadlock, by construction:
//   - Nobody waits on the slowest module, so it always moves; everyone else only waits for it.
//   - The clock never stops (sync.h minRate > 0); waiting only makes it slower.
//   - A peer heard nothing from for staleMs, or that is not playing, is not waited for.
//
// Safety (Nischay, 10 Nov 2026: "what if one module suddenly goes off?"): docked modules must never push on without a
// partner, so a missing partner STOPS the group (everyone holds where they are) instead of being left behind:
//   - a partner that was playing and is silent for goneMs (switched off, crashed, its STOP lost) -> missingNow();
//   - a partner the upload named (expect) that has not started joinMs after our start -> missingNow();
//   - the wait at a frame end longer than barrierMaxMs -> mayAdvance() says lastTimedOut; the firmware stops then.
//   A module that finished the whole animation says so (PLACE, playing = 0), so it is not taken for a lost one.
#pragma once
#include <stdint.h>
#include <string.h>

#ifndef GROUP_MAX
#define GROUP_MAX 8          // modules in one group (one radio broadcast reaches them all)
#endif

enum GroupKind : uint8_t { GK_GO = 1, GK_PLACE = 2, GK_STOP = 3 };

// One radio message (r4now::GRP payload), 12 bytes. Little-endian on both ends (ESP32 and the laptop test).
struct GroupMsg {
  uint32_t group;            // which upload this belongs to (0 = none)
  uint8_t  kind;             // GroupKind
  uint8_t  mod;              // sender's module number (mod3 -> 3)
  uint16_t step;             // GO: the frame to start from; PLACE: pass * frames + frame
  uint16_t s;                // PLACE: clock 0..10000
  uint8_t  flags;            // PLACE: bit0 = this frame finished (waiting at its end), bit1 = playing
  uint8_t  pad;
};

struct GroupPeer { uint8_t mod; uint32_t seenMs; uint16_t step; float s; bool done, playing; };

struct Group {
  uint32_t id = 0;              // group number of the loaded animation (0 = playing alone)
  uint8_t  me = 0;              // this module's number
  uint32_t staleMs = 400;       // a peer silent this long is not waited for
  uint32_t barrierMaxMs = 3000; // the longest wait at a frame end (then the firmware stops the group)
  uint32_t goneMs = 1000;       // a playing partner silent this long = gone (20 place messages missed)
  uint32_t joinMs = 2500;       // a named partner not playing this long after our start = never started
  uint32_t expect = 0;          // bit k = module k is in this group (from the upload; 0 = not told: older laptop code)
  uint32_t playT0 = 0;          // when we started playing
  bool     inPlay = false;      // we are playing (startPlay .. stopPlay)
  uint8_t  lastWaitingOn = 0;   // who the last frame-end wait was for (for the log)
  GroupPeer peer[GROUP_MAX];
  uint8_t  np = 0;
  uint32_t waitT0 = 0;          // when the current frame-end wait began (0 = not waiting)
  uint32_t lastWaitMs = 0;      // how long the last frame-end wait took
  bool     lastTimedOut = false;
  uint8_t  waitingOn = 0;       // module number we wait for now (0 = nobody)

  void reset(uint32_t gid, uint32_t members = 0) { id = gid; expect = members; np = 0; waitT0 = 0; lastWaitMs = 0; lastTimedOut = false; waitingOn = 0; playT0 = 0; inPlay = false; }
  // We start playing: what the partners said before belongs to an earlier run.
  void startPlay(uint32_t now) { np = 0; waitT0 = 0; waitingOn = 0; lastTimedOut = false; playT0 = now; inPlay = true; }
  void stopPlay() { inPlay = false; waitT0 = 0; waitingOn = 0; }

  // A partner that should be playing with us and is not (0 = everyone fine). absent: it never started.
  uint8_t missingNow(uint32_t now, bool* absent = nullptr) const {
    if (!id || !inPlay) return 0;
    for (uint8_t i = 0; i < np; i++)
      if (peer[i].playing && now - peer[i].seenMs >= goneMs) { if (absent) *absent = false; return peer[i].mod; }
    if (expect && now - playT0 >= joinMs)
      for (uint8_t k = 1; k < 32; k++) {
        if (!(expect >> k & 1) || k == me) continue;
        bool heardIt = false;
        for (uint8_t i = 0; i < np; i++) if (peer[i].mod == k) heardIt = true;
        if (!heardIt) { if (absent) *absent = true; return k; }
      }
    return 0;
  }
  // A fresh partner already playing (we started late: missed GO). 0 = none.
  uint8_t aheadOfUs(uint32_t now) const {
    for (uint8_t i = 0; i < np; i++) if (fresh(peer[i], now)) return peer[i].mod;
    return 0;
  }
  // "1.3" -> bits 1 and 3 (the upload's mods=)
  static uint32_t members(const char* list) {
    uint32_t b = 0; int v = 0; bool any = false;
    for (const char* c = list; ; c++) {
      if (*c >= '0' && *c <= '9') { v = v * 10 + (*c - '0'); any = true; }
      else { if (any && v > 0 && v < 32) b |= 1u << v; v = 0; any = false; if (!*c) break; }
    }
    return b;
  }
  bool on() const { return id != 0; }

  static GroupMsg msg(uint32_t gid, uint8_t kind, uint8_t mod, uint16_t step, float s = 0, bool done = false, bool playing = false) {
    GroupMsg m; memset(&m, 0, sizeof m);
    m.group = gid; m.kind = kind; m.mod = mod; m.step = step;
    float c = s < 0 ? 0 : (s > 1 ? 1 : s); m.s = (uint16_t)(c * 10000 + 0.5f);
    m.flags = (done ? 1 : 0) | (playing ? 2 : 0);
    return m;
  }

  // A PLACE message from another module of our group.
  void heard(const GroupMsg& m, uint32_t now) {
    if (!id || m.group != id || m.mod == me || m.kind != GK_PLACE) return;
    int k = -1;
    for (uint8_t i = 0; i < np; i++) if (peer[i].mod == m.mod) k = i;
    if (k < 0) { if (np >= GROUP_MAX) return; k = np++; peer[k].mod = m.mod; }
    GroupPeer& p = peer[k];
    p.seenMs = now; p.step = m.step; p.s = m.s / 10000.0f; p.done = m.flags & 1; p.playing = m.flags & 2;
  }

  bool fresh(const GroupPeer& p, uint32_t now) const { return p.playing && now - p.seenMs < staleMs; }

  // The slowest fresh peer's clock on OUR step: 2 = nobody to wait for. A peer still on an earlier step counts as 0
  // (it is a whole frame behind); one already past our step does not hold us back.
  // T (s, the frame's planned time): a peer's clock is moved on by the age of its message (sent every 50 ms), so two
  // modules in step do not each see the other "behind" and slow each other down (11 Nov 2026: frames 60 % too long).
  float peerS(uint32_t now, uint16_t step, float T = 0) const {
    float lo = 2;
    for (uint8_t i = 0; i < np; i++) {
      const GroupPeer& p = peer[i];
      if (!fresh(p, now) || p.step > step) continue;
      float v = p.step < step ? 0.0f : (p.done ? 1.0f : p.s);
      if (T > 0 && p.step == step && !p.done) { v += (float)(now - p.seenMs) / 1000.0f / T; if (v > 1) v = 1; }
      if (v < lo) lo = v;
    }
    return lo;
  }

  // The first fresh peer that has not finished `step` yet (0 = none).
  uint8_t notDone(uint32_t now, uint16_t step) const {
    for (uint8_t i = 0; i < np; i++) {
      const GroupPeer& p = peer[i];
      if (!fresh(p, now)) continue;
      if (p.step < step || (p.step == step && !p.done)) return p.mod;
    }
    return 0;
  }

  // At the end of `step` (its moves done and its pause over): true = start the next frame now.
  bool mayAdvance(uint32_t now, uint16_t step) {
    if (!id) return true;
    if (!waitT0) waitT0 = now ? now : 1;
    waitingOn = notDone(now, step);
    const bool timedOut = now - waitT0 >= barrierMaxMs;
    if (waitingOn && !timedOut) return false;
    lastWaitMs = now - waitT0; lastTimedOut = waitingOn != 0; lastWaitingOn = waitingOn; waitT0 = 0; waitingOn = 0;
    return true;
  }
  bool waiting() const { return waitT0 != 0; }
};
