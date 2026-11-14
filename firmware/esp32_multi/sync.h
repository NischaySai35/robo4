// sync.h — synchronised motion for one pose (Nischay, 5 Nov 2026): every joint of the module starts together, stays
// at the same share of its own path the whole way, and finishes together, even when one joint is slowed by a load.
//
// Pure logic, no Arduino calls, so test_sync.cpp checks it on the laptop with pretend servos.
//
// How:
//   One shared PROGRESS s (0..1) for the whole pose. Joint i belongs at  from_i + (to_i - from_i) * ease(s).
//   Every read (FAST_MS) the firmware passes where each joint really is. Each joint's own progress is worked out from
//   that; the slowest one says how far behind the module is. The clock runs at full speed (the pose's time T) while
//   the slowest is within lagOk, slower the further it lags, but never slower than minRate: the clock never stops,
//   so no joint ever waits for another one (no deadlock). Every joint is slowed with it, so the shape stays right.
//
//   Each joint gets a goal a little AHEAD of where it belongs, with the path's speed. A servo re-plans its own move
//   (speed up, cruise, brake) on every new goal; with the goal always further than its braking distance it never
//   brakes mid-pose, it just flows (the old 50 Hz stream put the goal on the joint: fifty start-stops a second).
//
//   A joint that makes no progress for stallS while the module waits on it: STALLED, the pose stops (never hangs).
//   Several modules (groupsync.h): peerS = the slowest other module's clock; being ahead of it slows this clock the
//   same way a lagging joint does. It never stalls the pose (a silent module simply drops out of peerS).
//   Joints that move less than minMoveRaw are sent straight to their target and not waited for.
#pragma once
#include <stdint.h>
#include <math.h>
#include <stdlib.h>
#define SYNC_PI 3.14159265f

#ifndef SYNC_MAX
#define SYNC_MAX 12
#endif

struct SyncCfg {
  float    lagOk;        // progress (0..1): the slowest may lag this much and the clock still runs at full speed
  float    lagMax;       // at this lag the clock runs at minRate
  float    minRate;      // the slowest the clock ever runs (share of full speed). 0 = waits; stallS ends a wait that never moves
  float    leadS;        // the goal is this far ahead along the path (seconds at the path's speed)
  float    accRaw;       // the servo's acceleration (steps/s^2) for the braking distance; the firmware sends it too
  float    catchGain;    // extra speed per step a joint is behind where it belongs (1/s)
  float    vMaxRaw;      // fastest any joint is asked to go (steps/s)
  float    vMinRaw;      // slowest a moving joint is asked to go, so the ends of the ease still finish
  float    stallS;       // the slowest joint gained nothing this long: stalled
  float    stallStep;    // progress it must gain to count as moving
  float    endWaitS;     // after the clock reached 1: wait this long for everyone to arrive, then move on anyway
  uint16_t doneTolRaw;   // this close to the target = arrived (12 = ~1 deg)
  uint16_t minMoveRaw;   // moves shorter than this are not synchronised (23 = ~2 deg)
};

enum SyncState : uint8_t { SY_IDLE = 0, SY_RUN, SY_DONE, SY_LATE, SY_STALLED };

// A joint this close behind its place on the path (steps, 6 = ~0.5 deg) is NOT lagging. Without it, at the slow ends of
// the ease a 1-2 step error reads as a big lag in time (easeInv is steep there) and the clock crawled: a 10 deg, 2 s
// frame took 3.2 s on mod1/mod2 (11 Nov 2026).
static constexpr float SYNC_LAG_TOL_RAW = 6.0f;

struct SyncOut { int16_t goal; uint16_t speed; };   // raw steps, steps/s; written to every joint each step

struct SyncMove {
  uint8_t  n = 0;
  int16_t  from[SYNC_MAX], to[SYNC_MAX];
  bool     track[SYNC_MAX];
  float    T = 1, s = 0;           // planned seconds, shared progress
  bool     sine = true;
  SyncState state = SY_IDLE;
  float    endT = 0;               // time spent waiting after s reached 1
  float    best = 0, stallT = 0;   // the slowest joint's progress, and how long it has not gained
  int8_t   laggard = -1;           // the joint the module is waiting on (-1 = nobody)
  float    lag = 0, worstLag = 0;  // now, and the worst in this pose (0..1)
  float    elapsed = 0;
  float    peerS = 2;              // the slowest other module's clock on this pose (groupsync.h); 2 = alone
  float    peerLag = 0;            // how far this module's clock is ahead of it now

  float ease(float u) const { return sine ? 0.5f - 0.5f * cosf(SYNC_PI * u) : u; }
  float easeInv(float y) const { if (y <= 0) return 0; if (y >= 1) return 1; return sine ? acosf(1 - 2 * y) / SYNC_PI : y; }
  float slope(float u) const { return sine ? 0.5f * SYNC_PI * sinf(SYNC_PI * u) : 1.0f; }   // d ease / d u

  // from = where each joint is now, to = its target, T = the pose's time in seconds (already long enough for the
  // speed limit: the firmware's frame planner works that out).
  void begin(const SyncCfg& c, uint8_t count, const int16_t* f, const int16_t* t, float seconds, bool sineOn) {
    n = count > SYNC_MAX ? SYNC_MAX : count; T = seconds > 0.05f ? seconds : 0.05f; sine = sineOn;
    s = 0; endT = 0; best = 0; stallT = 0; laggard = -1; lag = 0; worstLag = 0; elapsed = 0; state = SY_RUN;
    for (uint8_t i = 0; i < n; i++) { from[i] = f[i]; to[i] = t[i]; track[i] = abs(t[i] - f[i]) >= c.minMoveRaw; }
  }

  // One step: pos = every joint's fresh reading (raw, < 0 = no reading this time), dt in seconds.
  // Fills out[] for every joint; returns the state.
  SyncState step(const SyncCfg& c, float dt, const int* pos, SyncOut* out) {
    if (state != SY_RUN) {                      // finished / stopped: a stalled pose holds where it is, never runs on
      for (uint8_t i = 0; i < n; i++) { out[i].goal = (state == SY_STALLED && pos[i] >= 0) ? (int16_t)pos[i] : to[i]; out[i].speed = (uint16_t)c.vMinRaw; }
      return state;
    }
    elapsed += dt;
    // where is everyone, as progress on the shared clock
    float slow = 2; int8_t who = -1; bool allThere = true;
    for (uint8_t i = 0; i < n; i++) {
      if (pos[i] >= 0 && abs(pos[i] - to[i]) > c.doneTolRaw) allThere = false;
      if (!track[i] || pos[i] < 0) continue;
      const float Di = (float)(to[i] - from[i]);
      const float behindRaw = (from[i] + Di * ease(s) - pos[i]) * (Di > 0 ? 1.0f : -1.0f);
      float u = behindRaw <= SYNC_LAG_TOL_RAW ? s : easeInv((float)(pos[i] - from[i]) / Di);
      if (u < slow) { slow = u; who = (int8_t)i; }
    }
    if (who < 0) slow = s;                                   // nothing to wait on (all small, or no readings)
    lag = s - slow; if (lag < 0) lag = 0;
    laggard = lag > c.lagOk ? who : -1;
    if (lag > worstLag && s < 1) worstLag = lag;

    // the clock: full speed while nobody lags, slower the more the slowest lags, never stopped. Another module of the
    // group counts like one more joint: ahead of its clock = slower (the slowest module itself never waits).
    peerLag = peerS < 2 ? s - peerS : 0; if (peerLag < 0) peerLag = 0;
    float lagAll = lag > peerLag ? lag : peerLag;
    float rate = 1;
    if (lagAll > c.lagOk) rate = lagAll >= c.lagMax ? c.minRate : 1 - (1 - c.minRate) * (lagAll - c.lagOk) / (c.lagMax - c.lagOk);
    if (s < 1) { s += rate * dt / T; if (s > 1) s = 1; }

    // stalled: the module waits on a joint that gains nothing
    if (slow > best + c.stallStep) { best = slow; stallT = 0; }
    else if (laggard >= 0) {
      stallT += dt;
      if (stallT >= c.stallS) {                 // every joint holds where it IS (13 Nov 2026: out[] was left unfilled here
        state = SY_STALLED;                     // and the firmware sent leftover memory to every joint - the "weird crash")
        for (uint8_t i = 0; i < n; i++) { out[i].goal = pos[i] >= 0 ? (int16_t)pos[i] : from[i]; out[i].speed = (uint16_t)c.vMinRaw; }
        return state;
      }
    }
    else stallT = 0;

    if (s >= 1) {
      if (allThere) { state = SY_DONE; }
      else { endT += dt; if (endT >= c.endWaitS) state = SY_LATE; }
    }

    // goals: a little ahead along each path, at the path's speed (+ a push for a joint behind its place)
    for (uint8_t i = 0; i < n; i++) {
      float D = (float)(to[i] - from[i]);
      if (!track[i]) { out[i].goal = to[i]; out[i].speed = (uint16_t)c.vMinRaw; continue; }
      float dir = D > 0 ? 1.0f : -1.0f;
      float place = from[i] + D * ease(s);
      float vPath = fabsf(D) * slope(s) * rate / T;           // the path's speed now (steps/s)
      float v = vPath;
      float behind = pos[i] >= 0 ? (place - pos[i]) * dir : 0;
      if (behind > 0) v += c.catchGain * behind;
      // the floor that lets the ends of the ease finish, scaled to this joint's path: a 5 deg move must not run ahead
      // of a 60 deg one just because of the floor (measured in test_sync: 15 % ahead with one floor for all)
      float vMin = fabsf(D) / T; if (vMin > c.vMinRaw) vMin = c.vMinRaw; if (vMin < 5) vMin = 5;
      if (v < vMin) v = vMin;
      if (v > c.vMaxRaw) v = c.vMaxRaw;
      float brake = v * v / (2 * c.accRaw);
      float ahead = vPath * c.leadS; if (ahead < 1.5f * brake) ahead = 1.5f * brake; if (ahead < 2) ahead = 2;
      float g = place + dir * ahead;
      if ((g - to[i]) * dir > 0 || s >= 1) g = to[i];          // never past the target
      // never far ahead of where the joint REALLY is (13 Nov 2026: B1 stuck under load, its goal ran 80 deg ahead; when
      // the load let go it sprinted there and crashed). Enough lead to brake from its speed, no more.
      if (pos[i] >= 0) {
        float maxLead = 1.5f * brake + 24; if (maxLead < 60) maxLead = 60;
        if ((g - pos[i]) * dir > maxLead) g = pos[i] + dir * maxLead;
      }
      out[i].goal = (int16_t)lroundf(g); out[i].speed = (uint16_t)lroundf(v);
    }
    return state;
  }
};
