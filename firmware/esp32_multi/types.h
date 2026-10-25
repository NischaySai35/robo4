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
  uint8_t  reserved0;       // was the electromagnet safe-hold %; kept so the NVS blob size (and every saved setting) survives
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
#include <hal/gpio_ll.h>
#include <soc/gpio_struct.h>

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
  uint32_t baud = 1000000;                 // kept in step with the bus by busBegin()
  int8_t   pin  = -1;                      // the shared TX/RX pin, set by busBegin()

  /* WHO DRIVES THE WIRE. One pin, two talkers. Open-drain all the time (ESP32 core 3.3.x's
     default for a shared pin) lets the line rise too slowly at 1 Mbaud and our 1-bits arrive
     as 0s, so servos never see a valid frame. Push-pull all the time fixes that but keeps
     the pin forcing HIGH while a servo replies, and the servo's 0-bits come back as 1s (id 8
     read back as 09, checksums wrong). So: push-pull exactly while we transmit, released
     (open-drain, i.e. high-impedance when idle-high) the moment the last bit has left. */
  void txDrive(bool on) {
    if (pin < 0) return;
    if (on) gpio_ll_od_disable(&GPIO, (uint32_t)pin);
    else    gpio_ll_od_enable(&GPIO, (uint32_t)pin);
  }

  int readSCS(unsigned char* nDat, int nLen) override {
    int size = 0;
    // Bytes the echo filter looked at but that turned out to be the servo's reply come first.
    while (size < nLen && pbHead < pbLen) {
      if (nDat) nDat[size] = pb[pbHead];
      pbHead++; size++;
    }
    if (size >= nLen) return size;
    const unsigned long start = millis();
    // Generous next to any real reply (10 bytes at 38400 baud is under 3ms) while still
    // bounding the pathological case.
    const unsigned long hardCap = IOTimeOut * 2 + 50;
    unsigned long tBegin = start;
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
    txLen = 0; pbLen = pbHead = 0;         // every transaction starts here
    txDrive(false);
    const unsigned long start = millis();
    // Same hazard: "read until empty" never empties on a noisy floating line.
    while (pSerial->read() != -1) {
      if (millis() - start > 20) break;
    }
  }

  /* ECHO. TX and RX share one pin, so the board can hear its own request, and SCServo's
     wFlushSCS() is empty — the echo is then parsed as the servo's reply. A ping's echo even
     carries a valid checksum, so a scan "found" every id it asked about, and a position read
     returned 568 = 0x0238: the "read reg 56, 2 bytes" request bouncing back.

     Whether the echo shows up is not something to guess once and trust: a count-based
     discard that assumed an echo swallowed the servo's real reply whenever there wasn't one.
     So the filter matches CONTENT. After TX completes it reads incoming bytes while they equal
     what was just sent; only a complete byte-for-byte copy is dropped. Anything else — a reply
     that shares the FF FF id header with the request — is handed back to readSCS untouched. */
  int writeSCS(unsigned char* nDat, int nLen) override {
    if (!nDat) return 0;
    for (int i = 0; i < nLen; i++) remember(nDat[i]);
    return SMS_STS::writeSCS(nDat, nLen);
  }
  int writeSCS(unsigned char bDat) override {
    remember(bDat);
    return SMS_STS::writeSCS(bDat);
  }

  void wFlushSCS() override {
    if (txLen == 0) return;
    const int n = txLen > TXMAX ? TXMAX : txLen;
    const bool whole = txLen <= TXMAX;
    txLen = 0;
    pSerial->flush();                      // returns once the last bit has left the UART
    txDrive(false);                        // and hand the wire to whichever servo answers
    // Wait until the echo is complete or provably absent — never on a fixed short timer. The
    // echo reaches the RX buffer late whenever Wi-Fi holds the CPU; a 330us window gave up
    // half-way, the rest of the echo was parsed as the reply (a request and its reply share
    // the same checksum), and telemetry showed 3776.5 mA (= raw 0x0245, "read reg 0x45") and
    // positions of 568 (= 0x0238, "read reg 0x38"). Without an echo the servo's reply arrives
    // and mismatches within a byte or two, so the long ceiling only costs time when nothing
    // at all comes back.
    const unsigned long window = 5000UL + (unsigned long)n * 20000000UL / baud;
    const unsigned long start = micros();
    pbLen = pbHead = 0;
    while (pbLen < n && micros() - start < window) {
      const int c = pSerial->read();
      if (c == -1) continue;
      pb[pbLen++] = (uint8_t)c;
      // An echo can lose 1-bits on a slow line (FF comes back FE) but never gains any, so
      // "no bit we didn't send" is the test, not exact equality.
      if ((uint8_t)c & ~tx[pbLen - 1]) return;     // not our echo: keep it all for readSCS
    }
    // Everything seen matched what we sent: that is our echo (complete, or cut off by the
    // ceiling) — drop it. Only a frame too long to verify is handed back.
    if (whole) pbLen = 0;
  }

  /** Bracket for frames SCServo sends without its own flushes (syncReadPacketTx). */
  void beginTx() { rFlushSCS(); }
  void endTx()   { wFlushSCS(); }

 private:
  static constexpr int TXMAX = 96;
  uint8_t tx[TXMAX]; int txLen = 0;          // bytes sent since the last flush
  uint8_t pb[TXMAX]; int pbLen = 0, pbHead = 0;  // pushback for readSCS
  void remember(uint8_t b) {
    if (txLen == 0) txDrive(true);         // first byte of a frame: take the wire
    if (txLen < TXMAX) tx[txLen] = b;
    txLen++;
  }
};

#define MAX_FRAMES 60

/** One pose in an uploaded animation: where to go, and how long the move should take. */
struct AnimFrame {
  uint16_t timeMs;                 // wanted move time; 0 = AUTO (as fast as the speed cap allows)
  uint16_t holdMs;                 // pause after ARRIVAL before the next frame starts
  uint8_t  speed;                  // 1..10 - a maximum velocity, never a target
  uint8_t  n;                      // joints in this frame
  uint8_t  ids[MAX_SERVOS];
  int16_t  deg10[MAX_SERVOS];      // tenths of a degree
};
