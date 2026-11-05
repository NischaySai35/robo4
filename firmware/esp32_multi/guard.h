// guard.h — the overload guard for one joint (Nischay, 4 Nov 2026): never keep pushing into a hit, never drop limp.
//
// Pure logic, no Arduino calls, so test_guard.cpp checks it on the laptop with made-up readings. The firmware feeds it
// every fresh read (each FAST_MS) and does what the returned Action says.
//
// What a joint does:
//   OK      normal. It remembers its last EASY point (load under `calm`) while it moves.
//   trip    load >= loadTrip or current >= currTrip for tripMs -> it stops pushing: the target goes back towards the
//           easy point (at most backoffRaw, so a stale easy point never means a big jump) and the strength drops.
//   GIVING  if the load stays high anyway (something heavy, gravity), strength is lowered step by step and the target
//           follows the joint, so gravity brings it back slowly; if it sinks faster than yieldRawPerS the strength goes
//           up a little again (a brake). Never limp.
//   HELD    once the load is under `calm` it holds where it is at reduced strength (holdTorque, or a bit more if
//           holding needs it, never above calm).
//   Moves further in the direction that hit are refused; moves away are allowed at once, and after `clearMs` of low
//   load while moving away the joint is back to OK at full (ceiling) strength. clear() does the same at once.
//   HOT     temperature >= hotC: held gently, every move refused until it is under coolC. warmC..hotC: weaker ceiling.
#pragma once
#include <stdint.h>
#include <stdlib.h>

struct GuardCfg {
  uint16_t loadTrip;      // 0.1 % of full torque: 750 = 75 %
  uint16_t currTripmA;    // 1300 mA
  uint16_t calm;          // 0.1 %: "safe again" below this (500 = 50 %)
  uint16_t tripMs;        // must stay over the limit this long (start-up current spikes are shorter)
  uint16_t ceiling;       // 0.1 %: the most this joint may ever push (written to the servo's torque limit)
  uint16_t holdTorque;    // 0.1 %: strength while held after a hit (300 = 30 %)
  uint16_t backoffRaw;    // furthest a trip steps back towards the easy point (encoder units, 0.088 deg each)
  uint16_t yieldRawPerS;  // fastest it may sink while giving way (114 = 10 deg/s)
  uint16_t stepDown;      // 0.1 % per tick while giving way
  uint16_t stepUp;        // 0.1 % per tick when sinking too fast (the brake)
  uint16_t clearMs;       // low load this long while moving away = back to normal
  uint16_t calmMs;        // held, and the load safe this long (the object was put down) = back to normal by itself
  uint16_t hotMs;         // too hot this long before it counts: one garbled read said 145 C on mod1 (4 Nov)
  uint8_t  warmC, hotC, coolC;
};

enum GuardState : uint8_t { G_OK = 0, G_GIVING = 1, G_HELD = 2, G_HOT = 3 };
enum GuardEvent : uint8_t { GE_NONE = 0, GE_TRIP_LOAD, GE_TRIP_CURRENT, GE_SETTLED, GE_CLEARED, GE_HOT, GE_COOL };

struct GuardAction {
  bool     setTarget = false; int16_t target = 0;   // raw encoder units
  bool     setTorque = false; uint16_t torque = 0;  // 0.1 %
  GuardEvent event = GE_NONE;
};

struct Guard {
  GuardState state = G_OK;
  int16_t  easyRaw = -1, prevRaw = -1, hitRaw = -1;
  int8_t   blockDir = 0;           // +1 / -1: the direction that hit; moves that way are refused
  uint32_t overSince = 0, calmSince = 0, prevMs = 0, hotSince = 0;
  bool     hit = false;            // held after a real hit (not only after heat)
  uint16_t torque = 0;             // the strength last written (0.1 %)
  uint16_t tripLoad = 0, tripmA = 0;
  bool     leaving = false;        // a move away from the hit was accepted

  static int8_t sgn(int v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }

  uint16_t ceilingFor(const GuardCfg& c, int tempC) const {
    if (tempC >= c.warmC && tempC < c.hotC) return (uint16_t)(c.ceiling * 7 / 10);   // warm: 30 % weaker
    return c.ceiling;
  }

  // One fresh read. load is signed 0.1 %, curr in mA, target = where the joint is being sent (raw).
  GuardAction step(const GuardCfg& c, uint32_t now, int pos, int load, int currmA, int target, int tempC, bool torqueOn) {
    GuardAction a;
    int al = abs(load);
    uint32_t dt = prevMs ? now - prevMs : 0;
    int speed = (dt && prevRaw >= 0) ? (int)((int32_t)abs(pos - prevRaw) * 1000 / (int32_t)dt) : 0;  // raw/s
    prevRaw = (int16_t)pos; prevMs = now;
    if (!torqueOn) { state = G_OK; easyRaw = (int16_t)pos; overSince = 0; leaving = false; torque = 0; return a; }
    if (torque == 0) { torque = ceilingFor(c, tempC); a.setTorque = true; a.torque = torque; }

    // heat first: it overrides everything. Real heat builds over seconds, so it must last hotMs to count.
    if (tempC >= c.hotC) { if (!hotSince) hotSince = now ? now : 1; } else hotSince = 0;
    if (state != G_HOT && hotSince && now - hotSince >= c.hotMs) {
      state = G_HOT; a.event = GE_HOT; a.setTarget = true; a.target = (int16_t)pos;
      torque = c.holdTorque; a.setTorque = true; a.torque = torque; return a;
    }
    if (state == G_HOT) {
      if (tempC <= c.coolC) {                                  // cooled: back to normal, or held if it had hit something
        a.event = GE_COOL;
        if (hit) { state = G_HELD; } else { clearNow(c, tempC, a); }
      }
      return a;
    }

    if (state == G_OK) {
      uint16_t ceil = ceilingFor(c, tempC);
      if (torque != ceil) { torque = ceil; a.setTorque = true; a.torque = torque; }
      if (al < c.calm) easyRaw = (int16_t)pos;
      // with a strength ceiling under loadTrip the reading can never reach it: pushing at the ceiling counts too
      bool overL = al >= c.loadTrip || (torque && al * 100 >= torque * 95), overC = currmA >= c.currTripmA;
      if (!overL && !overC) { overSince = 0; return a; }
      if (!overSince) { overSince = now ? now : 1; return a; }
      if (now - overSince < c.tripMs) return a;
      // TRIP: stop pushing, step back towards the last easy point, drop the strength
      state = G_GIVING; overSince = 0; leaving = false; hit = true; calmSince = 0;
      tripLoad = (uint16_t)al; tripmA = (uint16_t)currmA; hitRaw = (int16_t)pos;
      int d = sgn(target - pos); blockDir = (int8_t)(d ? d : sgn(load));
      int back = easyRaw >= 0 ? easyRaw - pos : 0;
      if (back > c.backoffRaw) back = c.backoffRaw;
      if (back < -(int)c.backoffRaw) back = -(int)c.backoffRaw;
      a.setTarget = true; a.target = (int16_t)(pos + back);
      torque = c.loadTrip < ceil ? c.loadTrip : ceil; a.setTorque = true; a.torque = torque;
      a.event = overC && !overL ? GE_TRIP_CURRENT : GE_TRIP_LOAD;
      return a;
    }

    // The load reading cannot go above the strength allowed, so a joint pushing at its full allowed strength is still
    // overloaded even if that number is under calm.
    bool high = al >= c.calm || (torque && al * 10 >= torque * 9);
    if (state == G_GIVING) {
      if (!high && speed < c.yieldRawPerS / 4) {              // safe and still: hold here
        state = G_HELD; a.event = GE_SETTLED; a.setTarget = true; a.target = (int16_t)pos;
        uint16_t need = (uint16_t)(al * 13 / 10);
        torque = need < c.holdTorque ? c.holdTorque : (need > c.calm ? c.calm : need);
        a.setTorque = true; a.torque = torque; return a;
      }
      if (high) {                                              // still too much: give way a little more
        a.setTarget = true; a.target = (int16_t)pos;           // follow the joint: never push back into it
        uint16_t t = speed > c.yieldRawPerS ? (uint16_t)(torque + c.stepUp)               // sinking too fast: brake
                                            : (uint16_t)(torque > c.holdTorque + c.stepDown ? torque - c.stepDown : c.holdTorque);
        if (t > c.loadTrip) t = c.loadTrip;
        if (t != torque) { torque = t; a.setTorque = true; a.torque = torque; }
      }
      return a;
    }

    // G_HELD: waiting for a move away (leaving) or clear()
    if (high && !leaving) {                                    // the load came back (more weight): give way again
      state = G_GIVING; calmSince = 0; a.setTarget = true; a.target = (int16_t)pos; return a;
    }
    // back to normal by itself once the load has been safe for a while: calmMs when just holding (the object was put
    // down, it stopped pressing), clearMs while moving away from a hit
    if (!high) { if (!calmSince) calmSince = now ? now : 1; } else calmSince = 0;
    if (calmSince && now - calmSince >= (leaving ? c.clearMs : c.calmMs)) { clearNow(c, tempC, a); a.event = GE_CLEARED; }
    return a;
  }

  // A move was asked for. Returns false (refused) if it pushes further the way that hit, or the joint is hot.
  bool allow(int pos, int newTarget) {
    if (state == G_OK) return true;
    if (state == G_HOT) return false;
    int d = sgn(newTarget - pos);
    if (blockDir && d == blockDir) return false;
    if (d) { leaving = true; calmSince = 0; }
    return true;
  }

  void clearNow(const GuardCfg& c, int tempC, GuardAction& a) {
    state = G_OK; blockDir = 0; leaving = false; calmSince = 0; overSince = 0; hit = false;
    torque = ceilingFor(c, tempC); a.setTorque = true; a.torque = torque;
  }
};
