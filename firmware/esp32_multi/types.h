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

#include <SCServo.h>

/**
 * SafeSMS — SMS_STS with the servo-bus reads made impossible to hang on.
 *
 * SCServo's readSCS() resets its timeout EVERY TIME A BYTE ARRIVES, so the loop only ends
 * after IOTimeOut passes with complete silence. The servo bus here is RS485 half-duplex on a
 * SINGLE pin, so the board hears its own transmissions and, when the line is left floating
 * (nothing answering, no servo driving it), the UART produces a continuous stream of framing
 * garbage. Every one of those bytes rearms the timeout, and the read never returns.
 *
 * That is exactly what a bus scan does: it deliberately addresses ids with nothing on them.
 * Symptom was the whole board hanging a fraction of a second after pressing Scan — hard
 * enough to need the physical reset button, because the loop never yields either, so the
 * Wi-Fi and TCP tasks are starved along with everything else.
 *
 * What remains here is ONE thing: an absolute deadline alongside SCServo's inter-byte one.
 * It costs two millis() comparisons and bounds any read no matter what the bus does.
 *
 * An earlier version also called yield() on every poll iteration. That was removed: this is a
 * tight non-blocking poll, so yielding per iteration is a context-switch storm on a
 * single-core part — tens of thousands of them during one 100ms wait — and it was added to
 * support a diagnosis that turned out to be wrong. Slowing every servo read to defend against
 * a hang that cannot happen is a bad trade.
 */
class SafeSMS : public SMS_STS {
 public:
  int readSCS(unsigned char* nDat, int nLen) override {
    const unsigned long start = millis();
    // Generous next to any real reply (10 bytes at 38400 baud is under 3ms) while still
    // bounding the pathological case.
    const unsigned long hardCap = IOTimeOut * 2 + 50;
    unsigned long tBegin = start;
    int size = 0;
    while (true) {
      const int c = pSerial->read();
      if (c != -1) {
        if (nDat) nDat[size] = (unsigned char)c;
        size++;
        tBegin = millis();
      }
      if (size >= nLen) break;
      if (millis() - tBegin > IOTimeOut) break;   // normal: gone quiet
      if (millis() - start > hardCap) break;      // pathological: never goes quiet
    }
    return size;
  }

  void rFlushSCS() override {
    const unsigned long start = millis();
    // Same hazard: "read until empty" never empties on a noisy floating line.
    while (pSerial->read() != -1) {
      if (millis() - start > 20) break;
    }
  }
};

#define MAX_FRAMES 60

/** One pose in an uploaded animation: where to go, and the time budget to get there. */
struct AnimFrame {
  uint16_t timeMs;
  uint8_t  speed;                  // 1..10 cap for this frame
  uint8_t  n;                      // joints in this frame
  uint8_t  ids[MAX_SERVOS];
  int16_t  deg10[MAX_SERVOS];      // tenths of a degree
};
