// Shared types for the ROBO4 module firmware.
//
// These live in a header rather than in the .ino on purpose: the Arduino IDE
// auto-generates function prototypes and injects them ABOVE the sketch body, so any
// function whose signature mentions a struct declared inside the .ino fails to compile
// with "'ServoState' does not name a type". Types declared in an included header are
// visible to those generated prototypes.
#pragma once

#include <Arduino.h>

#define MAX_SERVOS  12
#define MAG_COUNT   2
#define CFG_VER     2

// Persistent per-module configuration (stored as one blob in NVS).
struct Cfg {
  uint16_t ver;
  char     host[24];
  char     ssid[3][33];
  char     pass[3][65];
  uint32_t baud;
  uint8_t  servoCount;
  uint8_t  ids[MAX_SERVOS];
  char     labels[MAX_SERVOS][14];
  int16_t  minDeg[MAX_SERVOS];
  int16_t  maxDeg[MAX_SERVOS];
  uint8_t  magSafeHold;
};

struct MagnetState {
  uint8_t       pct;        // last commanded power %
  unsigned long lastCmdMs;  // when it was commanded (drives the safety taper)
};

struct ServoState {
  uint8_t  id;
  uint8_t  hwMode;
  bool     torqueOn;
  uint8_t  mode;            // 0=pos 1=cw 2=ccw 3=wave
  float    targetDeg;
  uint16_t targetRaw;
  int      speedScale;
  uint16_t speedRaw;
  uint8_t  acc;
  int      rawPos, rawSpeed, rawLoad, rawLoadAbs, rawCurrent, rawVoltage, rawTemp;
  bool     moving;
  unsigned long lastCommandMs;
};

// One servo found by the async bus scan.
struct ScanHit {
  uint8_t  id;
  uint32_t baud;
  int      pos, volt, temp, mode;
};
