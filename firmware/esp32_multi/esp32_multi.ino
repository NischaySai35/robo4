/*
   ROBO4 — per-MODULE firmware v2 (ESP32-C3 + up to 12 × ST3215 servos + 2 electromagnets)

   What v2 adds over esp32/firmware.ino:
     1. Wi-Fi that never gives up   — event-driven, non-blocking, escalating backoff,
                                      3 stored networks, radio re-init after long outages,
                                      SoftAP fallback so the board is ALWAYS reachable.
     2. mDNS <host>.local + a real web UI at http://mod1.local/ (served from PROGMEM).
     3. Wireless code upload, three ways:
          - ArduinoOTA  → Arduino IDE "network port", normal Upload button, no cable
          - POST /api/ota      → drag a .bin into the web page (or curl it)
          - GET  /api/ota/url  → board pulls the .bin from your laptop's HTTP server
                                 (one command flashes mod1..modN, see tools/flash-all.ps1)
     4. Runtime config in NVS  — hostname, servo IDs, labels, per-joint limits, bus baud.
        The SAME binary runs on every module; nothing is hardcoded per board any more.
     5. Servo discovery + tooling, so testing no longer needs a re-flash:
          /api/scan          which IDs exist (optionally sweeping every baud rate)
          /api/servo/setid   change a servo's ID       /api/servo/setbaud
          /api/servo/center  zero-offset calibration   /api/servo/ofs
          /api/servo/read|write  raw register peek/poke (any test, no re-flash)
          /api/identify      wiggle one servo so you can see which one it physically is
     6. /api/log — the serial log in a ring buffer, readable over Wi-Fi. No USB needed to debug.

   BOARD SETTINGS (Arduino IDE) — required for OTA:
     Board: "ESP32C3 Dev Module"   USB CDC On Boot: Enabled
     Partition Scheme: "Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)"  <- has ota_0 + ota_1
     (any scheme with two app partitions works; "Huge APP" has only one and OTA will fail)
   The FIRST upload must still go over USB. Every upload after that can be wireless.

   Existing endpoints (/api/telemetry, /api/command, /api/batch, /api/magnet, /) keep the
   exact same shapes the React app already consumes — telemetry only gains extra fields.

   Servo bus: GPIO5 half-duplex UART (UART_MODE_RS485_HALF_DUPLEX — required for correct reads)
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <Update.h>
#include <HTTPUpdate.h>
#include <Preferences.h>
#include <SCServo.h>
#include <esp_system.h>
#include <math.h>
#include <stdarg.h>
#include "types.h"
#include "webui.h"

#ifndef UART_MODE_RS485_HALF_DUPLEX
#define UART_MODE_RS485_HALF_DUPLEX 4
#endif

// Defined further down with the sequence player; estopAll() needs it before then.
void animStop();

#define FW_VERSION "0.0.0"

// ── Factory defaults (only used the very first boot; after that NVS wins) ─────
#define DEF_SSID  "GNXS-2.4G-6809B0"
#define DEF_PASS  "B43D086809B0"
#define DEF_HOST  "mod1"

#define AP_PASS   "robo4robo4"   // SoftAP fallback password
#define OTA_PASS  "robo4ota"     // ArduinoOTA / espota password
#define OTA_PORT  3232           // ArduinoOTA UDP port (Arduino IDE network port)

// ── Hardware ─────────────────────────────────────────────────────────────────
#define SERVO_PIN   5
const uint8_t MAG_IN1[MAG_COUNT] = { 6, 8 };
const uint8_t MAG_IN2[MAG_COUNT] = { 7, 9 };
constexpr uint32_t MAG_PWM_FREQ    = 20000;
constexpr uint8_t  MAG_PWM_RES     = 8;
constexpr uint32_t MAG_GRAB_MAX_MS = 4000;

// ST3215 / SMS-STS register map (numeric so we don't depend on library constants)
#define REG_ID        5
#define REG_BAUD      6
#define REG_MIN_ANGLE 9
#define REG_MAX_ANGLE 11
#define REG_OFS       31
#define REG_MODE      33
#define REG_TORQUE    40
#define REG_LOCK      55
#define REG_POS       56

static const uint32_t BAUD_TABLE[8] =
  { 1000000, 500000, 250000, 128000, 115200, 76800, 57600, 38400 };

// ── Persistent config ────────────────────────────────────────────────────────
Cfg cfg;
Preferences prefs;

void cfgDefaults() {
  memset(&cfg, 0, sizeof(cfg));
  cfg.ver = CFG_VER;
  strlcpy(cfg.host, DEF_HOST, sizeof(cfg.host));
  strlcpy(cfg.ssid[0], DEF_SSID, sizeof(cfg.ssid[0]));
  strlcpy(cfg.pass[0], DEF_PASS, sizeof(cfg.pass[0]));
  cfg.baud = 1000000;
  // No servos until a scan finds some. This used to assume seven, ids 1..7, so a board with
  // (say) ids 1,5,6,12 came up showing seven sliders — four of them for servos that are not
  // there and three real ones missing entirely. Discovery is the honest source of truth, and
  // it is one button press. Only a FRESH board sees this; a configured one keeps its NVS.
  cfg.servoCount = 0;
  cfg.magSafeHold = 40;
}

void cfgLoad() {
  prefs.begin("robo4", false);
  size_t n = prefs.getBytesLength("cfg");
  if (n == sizeof(Cfg)) {
    prefs.getBytes("cfg", &cfg, sizeof(Cfg));
    if (cfg.ver == CFG_VER && cfg.servoCount <= MAX_SERVOS) return;
  }
  cfgDefaults();
}

void cfgSave() {
  cfg.ver = CFG_VER;
  prefs.putBytes("cfg", &cfg, sizeof(Cfg));
}

// ── Crash breadcrumb (survives a reset; readable over Wi-Fi) ─────────────────
//
// This board can only be reached over the network — no USB — so a serial monitor is not an
// option and the log ring is RAM that dies with the reset. RTC_NOINIT memory is neither
// zeroed at boot nor cleared by a watchdog/panic reset, so the last thing the firmware was
// doing survives into the next boot and can be read at /api/health and /api/log.
//
// Paired with esp_reset_reason(), that answers the question that actually matters: did it
// PANIC (a crash), get killed by a WATCHDOG (something blocked too long), or BROWNOUT (the
// supply sagged — six servos energising at once is exactly when that happens). Those three
// have completely different fixes, and guessing between them from the browser side is how
// the last two attempts went wrong.
#define BC_MAGIC 0x0B00B1E5UL
RTC_NOINIT_ATTR static uint32_t bcMagic;
RTC_NOINIT_ATTR static char     bcText[72];
RTC_NOINIT_ATTR static uint32_t bcAtMs;

// What the PREVIOUS boot was doing when it died, captured before we overwrite it.
String prevCrumb = "";
String resetWhy  = "";
uint32_t prevCrumbMs = 0;

void bc(const char* fmt, ...) {
  va_list ap; va_start(ap, fmt);
  vsnprintf(bcText, sizeof(bcText), fmt, ap);
  va_end(ap);
  bcAtMs   = millis();
  bcMagic  = BC_MAGIC;
}

const char* resetReasonName(esp_reset_reason_t r) {
  switch (r) {
    case ESP_RST_POWERON:  return "power-on";
    case ESP_RST_EXT:      return "external reset pin";
    case ESP_RST_SW:       return "software restart";
    case ESP_RST_PANIC:    return "PANIC (crash)";
    case ESP_RST_INT_WDT:  return "INTERRUPT WATCHDOG";
    case ESP_RST_TASK_WDT: return "TASK WATCHDOG (something blocked)";
    case ESP_RST_WDT:      return "other watchdog";
    case ESP_RST_BROWNOUT: return "BROWNOUT (supply sagged)";
    case ESP_RST_DEEPSLEEP:return "deep sleep wake";
    default:               return "unknown";
  }
}

// Call once, first thing in setup(), before anything can overwrite the breadcrumb.
void captureLastBoot() {
  resetWhy = resetReasonName(esp_reset_reason());
  if (bcMagic == BC_MAGIC && bcText[0]) {
    bcText[sizeof(bcText) - 1] = 0;
    prevCrumb   = String(bcText);
    prevCrumbMs = bcAtMs;
  }
  bcMagic = 0;
  bcText[0] = 0;
}

// ── Log ring (readable over Wi-Fi at /api/log) ───────────────────────────────
#define LOG_LINES 70
String  logBuf[LOG_LINES];
uint8_t logHead = 0, logCount = 0;

void lg(const char* fmt, ...) {
  char b[180];
  va_list ap; va_start(ap, fmt);
  vsnprintf(b, sizeof(b), fmt, ap);
  va_end(ap);
  Serial.println(b);
  char stamp[16];
  snprintf(stamp, sizeof(stamp), "[%7lu] ", millis());
  logBuf[logHead] = String(stamp) + b;
  logHead = (logHead + 1) % LOG_LINES;
  if (logCount < LOG_LINES) logCount++;
}

// ── Magnets ──────────────────────────────────────────────────────────────────
MagnetState magnets[MAG_COUNT] = { {0, 0}, {0, 0} };

void setMagnet(uint8_t ch, int pct) {
  if (ch >= MAG_COUNT) return;
  pct = constrain(pct, 0, 100);
  magnets[ch].pct = (uint8_t)pct;
  magnets[ch].lastCmdMs = millis();
  uint32_t duty = (uint32_t)lroundf((pct / 100.0f) * ((1u << MAG_PWM_RES) - 1));
  ledcWrite(MAG_IN1[ch], duty);
  ledcWrite(MAG_IN2[ch], 0);
}

// ── Servos ───────────────────────────────────────────────────────────────────
SafeSMS   st;   // SMS_STS with bounded, yielding bus reads — see types.h
WebServer server(80);

ServoState servos[MAX_SERVOS];
uint8_t    nServos = 0;

constexpr uint16_t FAST_MS         = 60;
constexpr uint16_t SLOW_MS         = 250;
constexpr uint8_t  POS_MODE        = 0;
// ── Holding-stiffness tuning (ST3215 EPROM/SRAM registers) ───────────────────
// Steady-state position error under load is set by the servo's own position loop, not by
// anything this firmware sends. Three registers govern it:
//   * DEAD BAND (26/27) - error inside this is simply ignored. 1 raw unit = 0.088 deg.
//   * Kp (21) - proportional stiffness. Higher pushes harder for a given error, so the
//     equilibrium the load settles at is a smaller error.
//   * Ki (23) - integral. This is the one that actually drives a SUSTAINED error to zero;
//     with Ki = 0 a constant load always leaves a constant offset, no matter how high Kp is.
// Kd damps the extra Kp/Ki so the joint settles instead of hunting. TORQUE LIMIT (48) caps
// how hard it may push at all - if that is low, nothing else matters.
//
// These are starting points, not measured optimums: the right gains depend on the arm's
// inertia and gearing, which cannot be known from here. They are exposed at /api/servo/tune
// so they can be adjusted against the real mechanism.
// Hold freedom. 1 raw unit = 360/4096 = 0.088 deg, so the default is +/-0.09 deg — as tight
// as the encoder allows. Measured on this arm it holds without hunting, so tight is the right
// default here; widen it per-joint if one starts buzzing. Runtime-adjustable via
// /api/servo/deadband, stored under its own NVS key so changing it cannot disturb the
// saved servo list the way growing Cfg would.
constexpr uint8_t  TUNE_DEADBAND_DEFAULT = 1;
uint8_t            deadbandUnits         = TUNE_DEADBAND_DEFAULT;
constexpr float    DEG_PER_UNIT          = 360.0f / 4096.0f;
constexpr uint8_t  TUNE_KP         = 48;     // ST3215 default is 32
constexpr uint8_t  TUNE_KD         = 24;     // damping for the raised Kp/Ki
constexpr uint8_t  TUNE_KI         = 4;      // >0 is what removes steady-state droop
constexpr uint16_t TUNE_TORQUE_MAX = 1000;   // full scale
constexpr uint8_t  REG_KP = 21, REG_KD = 22, REG_KI = 23;
constexpr uint8_t  REG_CW_DEAD = 26, REG_CCW_DEAD = 27;
constexpr uint8_t  REG_TORQUE_LIMIT = 48;

constexpr uint8_t  POS_ACC_DEFAULT = 40;

unsigned long lastFast = 0, lastSlow = 0;
uint8_t       slowIdx = 0;
bool          otaBusy = false;      // pause the servo bus while flashing

// Bounded: "drain until empty" never empties on a floating half-duplex line, which is
// the same trap that hung the board during a bus scan (see SafeSMS in types.h).
static inline void flushBus() {
  const unsigned long start = millis();
  while (Serial1.available()) { Serial1.read(); if (millis() - start > 20) break; }
}
static inline float clampF(float v, float lo, float hi) { return v < lo ? lo : v > hi ? hi : v; }
static inline uint16_t angleToRaw(float d) { d = clampF(d, 0, 360); return (uint16_t)lroundf((d / 360.0f) * 4095.0f); }
static inline float rawToAngle(uint16_t r) { return (r / 4095.0f) * 360.0f; }
static inline uint16_t speedScaleToRaw(int s) {
  s = constrain(s, 1, 10);
  return (uint16_t)lroundf(340.0f + ((s - 1) / 9.0f) * (3400.0f - 340.0f));
}
static inline int slotOf(uint8_t id) {
  for (uint8_t i = 0; i < nServos; i++) if (servos[i].id == id) return i;
  return -1;
}
static inline ServoState* byId(uint8_t id) { int s = slotOf(id); return s < 0 ? nullptr : &servos[s]; }

void limitsFor(uint8_t slot, float& lo, float& hi) {
  lo = cfg.minDeg[slot]; hi = cfg.maxDeg[slot];
  if (hi <= lo) { lo = 0; hi = 360; }
}

void busBegin(uint32_t baud) {
  // Only tear the UART down when the rate actually changes. In a normal session this runs
  // ONCE, at boot; the bus scan was the first thing that ever re-entered it, and a scan at
  // the already-configured baud (the default, box unticked) was doing a pointless
  // end()/begin()/setMode() cycle on a live half-duplex RS485 port for no gain. Skipping the
  // no-op removes that from the common path entirely — and re-init is now only reached by an
  // explicit multi-baud sweep.
  static uint32_t curBaud = 0;
  if (baud == curBaud) { flushBus(); return; }
  lg("bus re-init %lu -> %lu baud", (unsigned long)curBaud, (unsigned long)baud);
  Serial1.end();
  delay(5);
  Serial1.begin(baud, SERIAL_8N1, SERVO_PIN, SERVO_PIN);
  Serial1.setMode((SerialMode)UART_MODE_RS485_HALF_DUPLEX);
  Serial1.setRxBufferSize(512);
  st.pSerial = &Serial1;
  curBaud = baud;
  flushBus();
}

// Rebuild the runtime servo table from cfg (called at boot and after a config save)
void applyServoConfig() {
  nServos = min(cfg.servoCount, (uint8_t)MAX_SERVOS);
  for (uint8_t i = 0; i < nServos; i++) {
    ServoState& s = servos[i];
    s.id = cfg.ids[i];
    s.hwMode = 255; s.torqueOn = false; s.mode = POS_MODE;
    s.targetDeg = 180.0f; s.targetRaw = angleToRaw(180.0f);
    s.speedScale = 10; s.speedRaw = speedScaleToRaw(10); s.acc = POS_ACC_DEFAULT;
    s.rawPos = s.rawSpeed = s.rawLoad = s.rawLoadAbs = -1;
    s.rawCurrent = s.rawVoltage = s.rawTemp = -1;
    s.moving = false; s.lastCommandMs = 0;
  }
}

template<typename R, typename V>
int readRetry(uint8_t id, R reader, V valid, uint8_t n = 5) {
  for (uint8_t i = 0; i < n; i++) {
    int v = reader(id);
    if (valid(v)) return v;
    flushBus();
    delay(2);
  }
  return -1;
}

void setHwMode(ServoState& sv, uint8_t mode) {
  if (sv.hwMode == mode) return;
  st.writeByte(sv.id, REG_MODE, mode);
  delay(19);
  sv.hwMode = mode;
}
void ensureTorque(ServoState& sv) {
  if (!sv.torqueOn) { st.EnableTorque(sv.id, 1); delay(2); sv.torqueOn = true; }
}
void updateMotionFlag(ServoState& sv) {
  if (sv.mode == POS_MODE)
    sv.moving = sv.rawPos >= 0 ? (abs(sv.rawPos - (int)sv.targetRaw) > 3)
                               : (millis() - sv.lastCommandMs < 2000);
  else
    sv.moving = sv.rawSpeed != -1 ? (abs(sv.rawSpeed) > 5)
                                  : (millis() - sv.lastCommandMs < 2000);
}

void cmdPos(ServoState& sv, float deg, int speedScale, uint8_t acc) {
  int slot = slotOf(sv.id); if (slot < 0) return;
  float lo, hi; limitsFor((uint8_t)slot, lo, hi);
  sv.mode = POS_MODE;
  setHwMode(sv, POS_MODE);
  ensureTorque(sv);
  sv.targetDeg  = clampF(deg, lo, hi);
  sv.targetRaw  = angleToRaw(sv.targetDeg);
  sv.speedScale = constrain(speedScale, 1, 10);
  sv.speedRaw   = speedScaleToRaw(sv.speedScale);
  sv.acc        = (uint8_t)constrain((int)acc, 1, 100);
  sv.lastCommandMs = millis();
  st.WritePosEx(sv.id, sv.targetRaw, sv.speedRaw, sv.acc);
  delay(3);
}
/* Continuous-rotation (CW/CCW/wave) was removed: this module's joints are position-only, so
   a mode that spins a joint past its limits has no meaning here and was one more way to
   drive the hardware somewhere it should not go. The servos stay in POS_MODE for their
   whole life, so the motor-mode constants went with it. */
void cmdStop(ServoState& sv) {
  sv.mode = POS_MODE; sv.lastCommandMs = millis();
  st.EnableTorque(sv.id, 0); delay(2);
  sv.torqueOn = false; sv.moving = false;
  if (sv.rawPos >= 0) { sv.targetRaw = (uint16_t)sv.rawPos; sv.targetDeg = rawToAngle((uint16_t)sv.rawPos); }
}
void cmdTorqueToggle(ServoState& sv) {
  if (sv.torqueOn) { st.EnableTorque(sv.id, 0); delay(2); sv.torqueOn = false; sv.moving = false; }
  else             { st.EnableTorque(sv.id, 1); delay(2); sv.torqueOn = true; }
}
void estopAll() {
  animStop();                          // an E-STOP that leaves a sequence running is not a stop
  for (uint8_t i = 0; i < nServos; i++) cmdStop(servos[i]);
}

/* Write one EPROM byte only if it differs. EPROM has a finite write endurance and this runs
   on every boot, so a blind write would burn the servo's flash for no reason. Returns true
   if it actually changed something. */
bool tuneByteIfDiff(uint8_t id, uint8_t addr, uint8_t want, const char* name) {
  int have = st.readByte(id, addr);
  if (have < 0) { lg("  id%u %s: read failed", id, name); return false; }
  if ((uint8_t)have == want) return false;
  st.writeByte(id, addr, want);
  delay(12);
  lg("  id%u %s: %d -> %u", id, name, have, want);
  return true;
}

/* Make a servo hold its position stiffly. Deadband/gains live in EPROM (needs unlock);
   the torque limit is a RAM register and is written every time, since it costs nothing. */
void tuneServoHolding(ServoState& sv) {
  st.unLockEprom(sv.id); delay(10);
  bool changed = false;
  changed |= tuneByteIfDiff(sv.id, REG_CW_DEAD,  deadbandUnits, "cw deadband");
  changed |= tuneByteIfDiff(sv.id, REG_CCW_DEAD, deadbandUnits, "ccw deadband");
  changed |= tuneByteIfDiff(sv.id, REG_KP, TUNE_KP, "Kp");
  changed |= tuneByteIfDiff(sv.id, REG_KD, TUNE_KD, "Kd");
  changed |= tuneByteIfDiff(sv.id, REG_KI, TUNE_KI, "Ki");
  st.LockEprom(sv.id); delay(10);
  st.writeWord(sv.id, REG_TORQUE_LIMIT, TUNE_TORQUE_MAX);
  delay(6);
  if (!changed) lg("  id%u already tuned", sv.id);
}

void tuneAllServos() {
  lg("tuning hold stiffness (deadband %u units = +/-%s deg, Kp %u, Kd %u, Ki %u, torque %u)",
     deadbandUnits, String(deadbandUnits * DEG_PER_UNIT, 2).c_str(),
     TUNE_KP, TUNE_KD, TUNE_KI, TUNE_TORQUE_MAX);
  for (uint8_t i = 0; i < nServos; i++) { bc("tune id=%u", servos[i].id); tuneServoHolding(servos[i]); yield(); }
  lg("tuning done");
}

/* Enable torque WITHOUT moving. A servo holds whatever goal position is still in its own
   register, so switching torque on after the arm has been posed by hand can snap it back to
   a stale goal. Reading the live position and writing it as the goal FIRST makes torque-on
   a pure "hold exactly here" operation, which is what the button says it does. */
void torqueOnHold(ServoState& sv) {
  // 2 attempts at 30ms, not 5 at the 100ms default: this runs once per servo inside an HTTP
  // handler, so "torque on all" with six servos could block the web server for ~3 SECONDS if
  // any of them were slow to answer — long enough for the browser to time out the request and
  // for the board to look dead. A servo that will not report its position in 60ms simply does
  // not get the hold-in-place write; torque still engages.
  unsigned long saved = st.IOTimeOut;
  st.IOTimeOut = 30;
  int pos = readRetry(sv.id, [](uint8_t i) { return st.ReadPos(i); }, [](int v) { return v >= 0; }, 2);
  st.IOTimeOut = saved;
  if (pos >= 0) {
    sv.rawPos     = pos;
    sv.targetRaw  = (uint16_t)pos;
    sv.targetDeg  = rawToAngle((uint16_t)pos);
    st.WritePosEx(sv.id, (int16_t)pos, speedScaleToRaw(10), POS_ACC_DEFAULT);
    delay(3);
  }
  sv.mode = POS_MODE;
  setHwMode(sv, POS_MODE);
  st.EnableTorque(sv.id, 1); delay(2);
  sv.torqueOn = true;
  sv.lastCommandMs = millis();
}

void torqueOnAll()  { for (uint8_t i = 0; i < nServos; i++) { bc("torqueOn id=%u", servos[i].id); torqueOnHold(servos[i]); yield(); } }
void torqueOffAll() {
  for (uint8_t i = 0; i < nServos; i++) {
    st.EnableTorque(servos[i].id, 0); delay(2);
    servos[i].torqueOn = false;
    servos[i].moving   = false;
    yield();                       // bulk bus loops must not starve the idle task
  }
}

/* Read each servo's real angle and adopt it as the target, so the UI sliders start where the
   arm actually IS. Without this they sit at the 180 default while the servo is somewhere
   else entirely, and the first slider nudge would fling the joint across its range. */
/* BOOT ONLY. Two attempts, not five, and a short timeout: at 100ms x 5 a dozen silent
   servos would stall startup for ~6 seconds. Anything that does not answer twice is simply
   left at its default until the first scan or telemetry pass fills it in. Never call this
   from loop() — see the note in scanFinish. */
void seedTargetsFromHardware() {
  unsigned long saved = st.IOTimeOut;
  st.IOTimeOut = 30;
  for (uint8_t i = 0; i < nServos; i++) {
    ServoState& sv = servos[i];
    int pos = readRetry(sv.id, [](uint8_t id) { return st.ReadPos(id); }, [](int v) { return v >= 0; }, 2);
    yield();
    if (pos < 0) continue;
    sv.rawPos    = pos;
    sv.targetRaw = (uint16_t)pos;
    sv.targetDeg = rawToAngle((uint16_t)pos);
  }
  st.IOTimeOut = saved;
}

// ── Animation sequence ──────────────────────────────────────────────────────
// Uploaded whole, validated whole, then played from RAM by animTick(). A frame is a pose
// plus the time budget to reach it; "sine" spends that budget easing along a raised
// cosine instead of leaving the servo's own profile to do it.
AnimFrame anim[MAX_FRAMES];
uint8_t   animCount   = 0;
bool      animSine    = true;
bool      animLoop    = false;
bool      animPlaying = false;
uint8_t   animIdx     = 0;
uint32_t  animT0      = 0;         // when the current frame started

void animStop() {
  if (animPlaying) lg("anim stopped at frame %u", animIdx + 1);
  animPlaying = false;
}

/*
  Motion profile, one command per frame.

  The obvious implementation — stream interpolated setpoints every 40 ms — is what makes a
  servo judder: each setpoint is a fresh target for the servo's OWN trapezoidal generator,
  so it accelerates hard, arrives early, stops, and waits for the next one. Twenty-five
  start-stops a second, which is what "sine mode" felt like.

  So instead we let the servo do what it is good at, and only choose its parameters. For a
  move of D steps that must take T seconds:

      cruise speed v  =  k * D / T          (steps/s)
      acceleration a  =  k * v / T          (steps/s^2, sent in units of 100)

  with k = 1 for a flat run, and k = 1.5 for the eased one — that spends the first and last
  third of T accelerating and decelerating, which IS the ease-in/ease-out shape, generated
  in the servo's own control loop at its full update rate instead of over Wi-Fi at 25 Hz.

  Each joint gets its own v and a from its own distance, so a joint moving 5 degrees and one
  moving 90 both finish at T — they move together instead of the short one snapping and then
  waiting. Speed is capped by the frame's speed setting; a move that cannot fit in T at that
  cap simply takes longer, which is the honest outcome.
*/
void animSendFrame(uint8_t idx) {
  const AnimFrame& f = anim[idx];
  uint8_t  ids[MAX_SERVOS]; int16_t pos[MAX_SERVOS];
  uint16_t spd[MAX_SERVOS]; uint8_t  acc[MAX_SERVOS];
  uint8_t  n = 0;

  const float T   = max(0.05f, f.timeMs / 1000.0f);
  const float k   = animSine ? 1.5f : 1.0f;
  const uint16_t vCap = speedScaleToRaw(f.speed);

  for (uint8_t i = 0; i < f.n; i++) {
    int slot = slotOf(f.ids[i]);
    if (slot < 0) continue;                       // not a servo on this board
    ServoState& sv = servos[slot];

    float lo, hi; limitsFor((uint8_t)slot, lo, hi);
    float wantDeg = clampF(f.deg10[i] / 10.0f, lo, hi);
    uint16_t wantRaw = angleToRaw(wantDeg);

    // Distance from where the joint actually is, not from where we last told it to be.
    int32_t cur = sv.rawPos >= 0 ? sv.rawPos : (int32_t)sv.targetRaw;
    int32_t D   = labs((int32_t)wantRaw - cur);

    uint16_t v;
    uint8_t  a;
    if (D < 4) {
      // Already there. Give it a gentle speed rather than 0, which some firmware reads
      // as "maximum".
      v = (uint16_t)max<uint16_t>(40, vCap / 8);
      a = 20;
    } else {
      float vf = k * (float)D / T;
      float af = k * vf / T;
      v = (uint16_t)constrain((int)lroundf(vf), 30, (int)vCap);
      // ACC is in units of 100 steps/s^2. Round UP: too little acceleration is what makes
      // a move overrun its time budget.
      a = (uint8_t)constrain((int)ceilf(af / 100.0f), 1, 150);
    }

    setHwMode(sv, POS_MODE);
    ensureTorque(sv);
    sv.mode          = POS_MODE;
    sv.targetDeg     = wantDeg;
    sv.targetRaw     = wantRaw;
    sv.speedScale    = f.speed;
    sv.speedRaw      = v;
    sv.acc           = a;
    sv.lastCommandMs = millis();

    ids[n] = sv.id; pos[n] = (int16_t)wantRaw; spd[n] = v; acc[n] = a;
    n++;
  }

  if (n == 1)     { st.WritePosEx(ids[0], pos[0], spd[0], acc[0]); delay(2); }
  else if (n > 1) { st.SyncWritePosEx(ids, n, pos, spd, acc);      delay(2); }
}

void animBeginFrame(uint8_t i) {
  animIdx = i;
  animT0  = millis();
  animSendFrame(i);
}

void animTick() {
  if (!animPlaying || animCount == 0) return;
  // One command per frame, so there is nothing to do mid-frame but wait for its time to
  // elapse. The servo is running the profile itself at its own update rate.
  if (millis() - animT0 < anim[animIdx].timeMs) return;

  if (animIdx + 1 < animCount) { animBeginFrame(animIdx + 1); return; }
  if (animLoop)                { animBeginFrame(0); return; }
  animPlaying = false;
  lg("anim finished (%u frames)", animCount);
}

// ── Manual home positions ───────────────────────────────────────────────────
// Stored under their own NVS key and keyed by servo id (not slot), so a re-scan that
// reorders or renumbers the servo table cannot shuffle everyone's home onto the wrong
// joint. Unset servos answer 180, which is what the old fixed behaviour did.
struct HomeTable {
  uint16_t ver;
  uint8_t  n;
  uint8_t  ids[MAX_SERVOS];
  int16_t  deg10[MAX_SERVOS];   // tenths of a degree, so 142.5 survives a round trip
};
HomeTable homes = {1, 0, {}, {}};

void homesLoad() {
  if (prefs.getBytesLength("homes") == sizeof(HomeTable)) {
    HomeTable t;
    prefs.getBytes("homes", &t, sizeof(t));
    if (t.ver == 1 && t.n <= MAX_SERVOS) { homes = t; lg("loaded %u home position(s)", t.n); return; }
  }
  homes.ver = 1; homes.n = 0;
}

void homesSave() { prefs.putBytes("homes", &homes, sizeof(homes)); }

float homeFor(uint8_t id) {
  for (uint8_t i = 0; i < homes.n; i++) if (homes.ids[i] == id) return homes.deg10[i] / 10.0f;
  return 180.0f;
}

bool hasHome(uint8_t id) {
  for (uint8_t i = 0; i < homes.n; i++) if (homes.ids[i] == id) return true;
  return false;
}

void setHomeFor(uint8_t id, float deg) {
  int16_t v = (int16_t)lroundf(clampF(deg, 0.0f, 360.0f) * 10.0f);
  for (uint8_t i = 0; i < homes.n; i++) {
    if (homes.ids[i] == id) { homes.deg10[i] = v; return; }
  }
  if (homes.n < MAX_SERVOS) { homes.ids[homes.n] = id; homes.deg10[homes.n] = v; homes.n++; }
}

void clearHomeFor(uint8_t id) {
  for (uint8_t i = 0; i < homes.n; i++) {
    if (homes.ids[i] == id) {
      for (uint8_t k = i; k + 1 < homes.n; k++) { homes.ids[k] = homes.ids[k + 1]; homes.deg10[k] = homes.deg10[k + 1]; }
      homes.n--;
      return;
    }
  }
}

// Send one servo to a target, honouring its configured limits.
void gotoDeg(uint8_t slot, float deg) {
  if (slot >= nServos) return;
  cmdPos(servos[slot], deg, 10, POS_ACC_DEFAULT);
}

void homeAll(bool homeManual = false) {
  uint8_t  ids[MAX_SERVOS]; int16_t pos[MAX_SERVOS];
  uint16_t spd[MAX_SERVOS]; uint8_t  acc[MAX_SERVOS];
  for (uint8_t i = 0; i < nServos; i++) {
    setHwMode(servos[i], POS_MODE);
    ensureTorque(servos[i]);
    float lo, hi; limitsFor(i, lo, hi);
    servos[i].mode = POS_MODE;
    servos[i].targetDeg = clampF(homeManual ? homeFor(servos[i].id) : 180.0f, lo, hi);
    servos[i].targetRaw = angleToRaw(servos[i].targetDeg);
    servos[i].speedScale = 10;
    servos[i].speedRaw = speedScaleToRaw(10);
    servos[i].acc = POS_ACC_DEFAULT;
    servos[i].lastCommandMs = millis();
    ids[i] = servos[i].id; pos[i] = (int16_t)servos[i].targetRaw;
    spd[i] = servos[i].speedRaw; acc[i] = servos[i].acc;
  }
  if (nServos == 1)      { st.WritePosEx(ids[0], pos[0], spd[0], acc[0]); delay(3); }
  else if (nServos > 1)  { st.SyncWritePosEx(ids, nServos, pos, spd, acc); delay(3); }
}

// ── Telemetry reads ──────────────────────────────────────────────────────────
void refreshAllFastSync() {
  bc("telemetry sync (%u servos)", nServos);
  if (nServos == 0) return;
  uint8_t ids[MAX_SERVOS];
  for (uint8_t i = 0; i < nServos; i++) ids[i] = servos[i].id;

  // SCServo 1.0.2 has no syncReadBegin/End (newer forks do) and spells the word
  // decoder "ToWrod" — this uses only what the shipped library actually exposes.
  st.syncReadPacketTx(ids, nServos, SMS_STS_PRESENT_POSITION_L, 2);
  uint8_t rx[2];
  for (uint8_t i = 0; i < nServos; i++) {
    bool got = false;
    if (st.syncReadPacketRx(ids[i], rx) == 2) {
      int pos = st.syncReadRxPacketToWrod(0);        // position is unsigned 0..4095
      if (pos >= 0 && pos <= 4095) { servos[i].rawPos = pos; got = true; }
    }
    if (!got) {                                      // this servo missed its slot — poll it
      int pos = readRetry(ids[i], [](uint8_t id) { return st.ReadPos(id); },
                                  [](int v) { return v >= 0 && v <= 4095; }, 1);
      if (pos >= 0) servos[i].rawPos = pos;
    }
    updateMotionFlag(servos[i]);
  }
}

void refreshSlow(ServoState& sv) {
  int spd  = readRetry(sv.id, [](uint8_t id) { return st.ReadSpeed(id);   }, [](int v) { return v != -1; });
  int load = readRetry(sv.id, [](uint8_t id) { return st.ReadLoad(id);    }, [](int v) { return v != -1; });
  int curr = readRetry(sv.id, [](uint8_t id) { return st.ReadCurrent(id); }, [](int v) { return v >= 0; });
  int volt = readRetry(sv.id, [](uint8_t id) { return st.ReadVoltage(id); }, [](int v) { return v > 0; });
  int temp = readRetry(sv.id, [](uint8_t id) { return st.ReadTemper(id);  }, [](int v) { return v > 0; });
  if (spd  != -1) sv.rawSpeed = spd;
  if (load != -1) { sv.rawLoad = load; sv.rawLoadAbs = abs(load); }
  if (curr >= 0)  sv.rawCurrent = curr;
  if (volt > 0)   sv.rawVoltage = volt;
  if (temp > 0)   sv.rawTemp    = temp;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Wi-Fi: never-give-up state machine
// ─────────────────────────────────────────────────────────────────────────────
bool     mdnsOk       = false;
bool     wantMdns     = false;   // set from the event handler, acted on in loop()
bool     apUp         = false;
bool     otaStarted   = false;   // ArduinoOTA.begin() only works once we have an IP
uint8_t  wSlot        = 255;     // slot currently being tried
uint16_t wFails       = 0;       // consecutive failed attempts
uint32_t wBackoff     = 800;
uint32_t wNextTry     = 0;
uint32_t wDrops       = 0;
uint32_t wConnectedAt = 0;
char     apName[24];

// Slot 3 is virtual: the SSID compiled into this firmware. Saved slots are tried first.
#define WSLOT_DEFAULT 3

const char* ssidFor(uint8_t i) { return i < 3 ? cfg.ssid[i] : DEF_SSID; }
const char* passFor(uint8_t i) { return i < 3 ? cfg.pass[i] : DEF_PASS; }

bool slotUsable(uint8_t i) {
  if (i < 3) return cfg.ssid[i][0] != 0;
  if (i != WSLOT_DEFAULT || DEF_SSID[0] == 0) return false;
  // Pointless to try it twice if a saved slot already holds the same network.
  for (uint8_t k = 0; k < 3; k++) if (strcmp(cfg.ssid[k], DEF_SSID) == 0) return false;
  return true;
}

uint8_t nextSlot() {
  for (uint8_t k = 1; k <= 4; k++) {
    // +k must be OUTSIDE the ternary: with it inside, a fresh boot (wSlot 255) evaluated
    // to slot 3 on every iteration and never looked at the saved slots at all.
    uint8_t i = (uint8_t)(((wSlot == 255 ? 3 : wSlot) + k) % 4);
    if (slotUsable(i)) return i;
  }
  return 255;
}

void startMDNS() {
  if (mdnsOk) return;
  MDNS.end();
  if (MDNS.begin(cfg.host)) {
    MDNS.addService("http", "tcp", 80);
    // Custom service so the laptop app can DISCOVER modules instead of hardcoding names
    MDNS.addService("robo4", "tcp", 80);
    // Casts pin the call to ESPmDNS's char* overload: with -fpermissive (which the
    // ESP32 core enables) the const char* and char* overloads are both viable and the
    // call is otherwise ambiguous.
    MDNS.addServiceTxt((char*)"robo4", (char*)"tcp", (char*)"host", cfg.host);
    MDNS.addServiceTxt((char*)"robo4", (char*)"tcp", (char*)"fw", (char*)FW_VERSION);
    // The Arduino IDE finds "network ports" via the _arduino._tcp record. ArduinoOTA
    // registers it inside begin(), but begin() early-returns once initialised — and our
    // MDNS.end() above wipes it — so re-advertise it here on every (re)start.
    MDNS.enableArduino(OTA_PORT, true);
    mdnsOk = true;
    lg("mDNS up: http://%s.local (OTA port %u)", cfg.host, OTA_PORT);
  } else {
    lg("mDNS begin failed");
  }
}

void stopAP() {
  if (!apUp) return;
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  apUp = false;
  lg("SoftAP down (STA is healthy again)");
}

void startAP() {
  if (apUp) return;
  WiFi.mode(WIFI_AP_STA);              // keep hunting for the real AP while ours is up
  WiFi.softAP(apName, AP_PASS);
  apUp = true;
  lg("SoftAP up: %s / %s -> http://192.168.4.1", apName, AP_PASS);
}

void onWiFiEvent(WiFiEvent_t ev, WiFiEventInfo_t info) {
  switch (ev) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      wConnectedAt = millis();
      wFails = 0; wBackoff = 800;
      wantMdns = true;
      lg("WiFi got IP %s on '%s' rssi %d",
         WiFi.localIP().toString().c_str(), WiFi.SSID().c_str(), WiFi.RSSI());
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      if (mdnsOk) { wDrops++; lg("WiFi lost (reason %d) — retrying", info.wifi_sta_disconnected.reason); }
      mdnsOk = false;
      wNextTry = millis() + 300;       // retry almost immediately after a live drop
      break;
    default: break;
  }
}

void wifiConnectSlot(uint8_t i) {
  wSlot = i;
  lg("WiFi try %s '%s' (attempt %u, backoff %lums)",
     i == WSLOT_DEFAULT ? "compiled default" : "saved slot", ssidFor(i), wFails, wBackoff);
  WiFi.disconnect(false, false);
  WiFi.begin(ssidFor(i), passFor(i));
}

void wifiInit() {
  snprintf(apName, sizeof(apName), "ROBO4-%s", cfg.host);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(cfg.host);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(true);                      // MODEM_SLEEP — keeps the C3 cool
  WiFi.setTxPower(WIFI_POWER_11dBm);
  WiFi.onEvent(onWiFiEvent);
  uint8_t s = nextSlot();
  if (s == 255) { lg("No Wi-Fi credentials stored — raising SoftAP"); startAP(); return; }
  wifiConnectSlot(s);
  wNextTry = millis() + 6000;               // give the first attempt 6 s before rotating
}

// Called every loop iteration. Never blocks, never returns without a plan.
void wifiTick() {
  if (WiFi.status() == WL_CONNECTED) {
    if (wantMdns) { wantMdns = false; mdnsOk = false; startMDNS(); }
    if (!mdnsOk)  startMDNS();
    if (!otaStarted) { ArduinoOTA.begin(); otaStarted = true; lg("ArduinoOTA listening on %s:%u", cfg.host, OTA_PORT); }
    if (apUp && millis() - wConnectedAt > 20000) stopAP();   // link proven stable → drop the AP
    return;
  }

  if ((int32_t)(millis() - wNextTry) < 0) return;

  wFails++;

  // After ~6 failures (≈30 s) put up our own AP so the board is never unreachable.
  if (wFails >= 6 && !apUp) startAP();

  // Every 12th failure, tear the radio down and back up — clears a wedged driver /
  // a router that has stopped answering this MAC.
  if (wFails % 12 == 0) {
    lg("WiFi stuck after %u tries — re-initialising radio", wFails);
    WiFi.disconnect(true, false);
    WiFi.mode(WIFI_OFF);
    delay(80);
    WiFi.mode(apUp ? WIFI_AP_STA : WIFI_STA);
    WiFi.setHostname(cfg.host);
    WiFi.setTxPower(WIFI_POWER_11dBm);
    if (apUp) WiFi.softAP(apName, AP_PASS);
  }

  uint8_t s = nextSlot();
  if (s == 255) { wNextTry = millis() + 10000; return; }     // nothing to try; AP is up
  wifiConnectSlot(s);

  wBackoff = min<uint32_t>(wBackoff * 2, 30000);             // 0.8s → 30s ceiling, then steady
  wNextTry = millis() + wBackoff;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Async servo bus scan (ID discovery, optional baud sweep)
// ─────────────────────────────────────────────────────────────────────────────
struct {
  bool active, done;
  uint8_t from, to, cur;
  uint8_t bIdx, bCount;
  uint8_t nHits;
  ScanHit hits[24];
  unsigned long savedTimeout;
  unsigned long startedMs;
} sc = {false, false, 1, 20, 1, 0, 1, 0, {}, 100, 0};

// A detect pass (adopt=false) only reports what answered; it must not touch cfg.
bool scAdopt = true;

void scanStart(uint8_t from, uint8_t to, bool allBaud) {
  sc.from = max<uint8_t>(1, from);
  sc.to   = min<uint8_t>(253, to);
  if (sc.to < sc.from) sc.to = sc.from;
  sc.cur = sc.from;
  sc.bIdx = 0;
  sc.bCount = allBaud ? 8 : 1;
  sc.nHits = 0;
  sc.active = true; sc.done = false;
  sc.savedTimeout = st.IOTimeOut;
  st.IOTimeOut = 20;                          // a missing ID must fail fast
  sc.startedMs = millis();
  lg("scan %u..%u %s - preparing bus", sc.from, sc.to, allBaud ? "(all bauds)" : "");
  busBegin(allBaud ? BAUD_TABLE[0] : cfg.baud);
  lg("scan running");
}

uint32_t scanBaud() { return sc.bCount == 1 ? cfg.baud : BAUD_TABLE[sc.bIdx]; }

/* Take the servos the scan just found and make them THE servo list: sliders, telemetry and
   batch moves all read from cfg.ids/servoCount, so without this step a scan was purely
   informational — it printed "found id=5" and then the dashboard still showed whatever was
   configured before. Persisted, so a reboot keeps them and only a rescan changes them. */
void adoptScanResults() {
  if (sc.nHits == 0) { lg("scan found nothing — keeping the existing servo list"); return; }

  // A baud sweep can report the same physical servo at more than one rate, and can find
  // servos the bus cannot actually talk to at cfg.baud. Adopt ONE baud: whichever the most
  // hits agree on, switching cfg.baud to it if it differs, so the adopted list is always a
  // set the bus can really reach.
  uint32_t bestBaud = cfg.baud; uint8_t bestCount = 0;
  for (uint8_t i = 0; i < sc.nHits; i++) {
    uint8_t c = 0;
    for (uint8_t k = 0; k < sc.nHits; k++) if (sc.hits[k].baud == sc.hits[i].baud) c++;
    if (c > bestCount) { bestCount = c; bestBaud = sc.hits[i].baud; }
  }
  if (bestBaud != cfg.baud) { lg("adopting baud %lu (was %lu)", (unsigned long)bestBaud, (unsigned long)cfg.baud); cfg.baud = bestBaud; }

  // Snapshot the OLD table before writing into it. Labels and limits are looked up by ID and
  // the found IDs are rarely in their previous slots, so reading cfg.labels[] while rewriting
  // cfg.labels[] would hand slot 2's label to slot 0 as soon as anything moved down.
  uint8_t oldCount = min(cfg.servoCount, (uint8_t)MAX_SERVOS);
  uint8_t oldIds[MAX_SERVOS];
  char    oldLabels[MAX_SERVOS][14];
  int16_t oldMin[MAX_SERVOS], oldMax[MAX_SERVOS];
  for (uint8_t k = 0; k < oldCount; k++) {
    oldIds[k] = cfg.ids[k];
    memcpy(oldLabels[k], cfg.labels[k], sizeof(oldLabels[0]));
    oldMin[k] = cfg.minDeg[k]; oldMax[k] = cfg.maxDeg[k];
  }

  uint8_t n = 0;
  for (uint8_t i = 0; i < sc.nHits && n < MAX_SERVOS; i++) {
    if (sc.hits[i].baud != bestBaud) continue;
    bool dup = false;
    for (uint8_t k = 0; k < n; k++) if (cfg.ids[k] == sc.hits[i].id) dup = true;
    if (dup) continue;                                    // a baud sweep can report an ID twice
    // Keep any label/limits already configured for this ID; only unknown IDs get defaults.
    int prev = -1;
    for (uint8_t k = 0; k < oldCount; k++) if (oldIds[k] == sc.hits[i].id) prev = k;
    cfg.ids[n] = sc.hits[i].id;
    if (prev >= 0) {
      memcpy(cfg.labels[n], oldLabels[prev], sizeof(cfg.labels[0]));
      cfg.minDeg[n] = oldMin[prev]; cfg.maxDeg[n] = oldMax[prev];
    } else {
      snprintf(cfg.labels[n], sizeof(cfg.labels[0]), "id %u", sc.hits[i].id);
      cfg.minDeg[n] = 0; cfg.maxDeg[n] = 360;             // unknown joint: no travel limits
    }
    n++;
  }
  for (uint8_t k = n; k < MAX_SERVOS; k++) { cfg.ids[k] = 0; cfg.labels[k][0] = 0; }
  cfg.servoCount = n;
  cfgSave();
  applyServoConfig();
  busBegin(cfg.baud);

  // Seed each slider from the position the SCAN already read (ScanHit.pos). Re-reading the
  // bus here is what froze the board: readRetry makes 5 attempts at SCServo's 100ms default
  // timeout, so every servo that does not answer costs 500ms, and a dozen of them blocks a
  // single loop() iteration for ~6s — long past the ESP32 task watchdog, which panics and
  // resets. The scan already has the numbers; asking twice was pure cost.
  for (uint8_t k = 0; k < n; k++) {
    for (uint8_t i = 0; i < sc.nHits; i++) {
      if (sc.hits[i].id != cfg.ids[k] || sc.hits[i].baud != bestBaud) continue;
      if (sc.hits[i].pos < 0) break;
      servos[k].rawPos    = sc.hits[i].pos;
      servos[k].targetRaw = (uint16_t)sc.hits[i].pos;
      servos[k].targetDeg = rawToAngle((uint16_t)sc.hits[i].pos);
      break;
    }
  }
  lg("adopted %u servo(s) from scan", n);
}

void scanFinish() {
  sc.active = false; sc.done = true;
  st.IOTimeOut = sc.savedTimeout;
  busBegin(cfg.baud);
  if (scAdopt) adoptScanResults();
  for (uint8_t i = 0; i < nServos; i++) servos[i].hwMode = 255;   // force mode re-write
  // Torque stays OFF after a scan, exactly as after boot: discovering a servo must never
  // energise it. Targets were seeded from the scan's own readings inside adoptScanResults —
  // deliberately NO bus reads here, because everything in this function runs inside loop()
  // and a slow one takes the watchdog with it.
  torqueOffAll();
  tuneAllServos();          // the newly-adopted servos must hold as stiffly as the rest
  lg(scAdopt ? "scan done: %u servo(s) found, torque OFF"
             : "detect done: %u servo(s) answered (nothing adopted)", sc.nHits);
}

void scanStep() {
  if (!sc.active) return;
  // Hard deadline. Even a sweep of every id at every baud is seconds, so anything past this
  // is a stuck bus, and a scan that cannot end is a board that cannot be used.
  if (millis() - sc.startedMs > 45000UL) {
    lg("scan ABORTED - exceeded 45s (stuck bus?), stopping at id %u", sc.cur);
    scanFinish();
    return;
  }
  // One id per loop() iteration, not three. A 20-id sweep took ~0.4s at three-per-pass, so
  // the UI's poll caught a single frame and the scan looked like it never ran. One at a time
  // is still ~20ms per id and keeps handleClient() responsive between every probe.
  for (uint8_t k = 0; k < 1 && sc.active; k++) {
    uint8_t id = sc.cur;
    bc("scan ping id=%u @ %lu", id, (unsigned long)scanBaud());
    if (st.Ping(id) != -1 && sc.nHits < 24) {
      ScanHit& h = sc.hits[sc.nHits++];
      h.id   = id;
      h.baud = scanBaud();
      h.pos  = st.ReadPos(id);
      h.volt = st.ReadVoltage(id);
      h.temp = st.ReadTemper(id);
      h.mode = st.readByte(id, REG_MODE);
      lg("  found servo id=%u baud=%lu pos=%d", id, (unsigned long)h.baud, h.pos);
    }
    if (sc.cur >= sc.to) {
      sc.bIdx++;
      if (sc.bIdx >= sc.bCount) { scanFinish(); return; }
      sc.cur = sc.from;
      busBegin(BAUD_TABLE[sc.bIdx]);
    } else {
      sc.cur++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  JSON / HTTP
// ─────────────────────────────────────────────────────────────────────────────
void setCORS() {
  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  server.sendHeader("Cache-Control",                "no-store, no-cache");
}
void okJson(const String& body) { setCORS(); server.send(200, "application/json", body); }
void okTrue() { okJson(F("{\"ok\":true}")); }
void errJson(int code, const char* msg) {
  setCORS();
  String b = F("{\"ok\":false,\"error\":\""); b += msg; b += F("\"}");
  server.send(code, "application/json", b);
}
// One handler per path for every verb; OPTIONS is answered inline for CORS preflight.
void route(const char* path, void (*fn)()) {
  server.on(path, HTTP_ANY, [fn]() {
    if (server.method() == HTTP_OPTIONS) { setCORS(); server.send(204); return; }
    fn();
  });
}

String buildJSON() {
  String j; j.reserve(3200);
  j += F("{\"ok\":true,\"resetWhy\":\""); j += resetWhy;
  j += F("\",\"lastCrumb\":\""); j += prevCrumb;
  j += F("\",\"lastCrumbMs\":"); j += prevCrumbMs;
  j += F(",\"fw\":\""); j += FW_VERSION;
  j += F("\",\"ms\":");    j += millis();
  j += F(",\"deadbandDeg\":");   j += String(deadbandUnits * DEG_PER_UNIT, 2);
  j += F(",\"deadbandUnits\":"); j += deadbandUnits;
  j += F(",\"heap\":");    j += ESP.getFreeHeap();
  // 0 = this board has NO second OTA partition, so wireless upload cannot work
  j += F(",\"otaSpace\":");   j += ESP.getFreeSketchSpace();
  j += F(",\"sketchSize\":"); j += ESP.getSketchSize();
  j += F(",\"animFrames\":");  j += animCount;
  j += F(",\"animPlaying\":"); j += (animPlaying ? F("true") : F("false"));
  j += F(",\"animIdx\":");     j += animIdx;
  j += F(",\"scanning\":"); j += (sc.active ? F("true") : F("false"));
  j += F(",\"servos\":[");

  for (uint8_t i = 0; i < nServos; i++) {
    const ServoState& sv = servos[i];
    if (i) j += ',';
    j += F("{\"id\":");     j += sv.id;
    j += F(",\"label\":\""); j += cfg.labels[i]; j += '"';
    j += F(",\"name\":\"");  j += cfg.labels[i]; j += '"';
    j += F(",\"min\":");     j += cfg.minDeg[i];
    j += F(",\"max\":");     j += cfg.maxDeg[i];
    j += F(",\"connected\":"); j += (sv.rawPos >= 0 ? F("true") : F("false"));
    const char* m = sv.mode == 0 ? "Position" : sv.mode == 1 ? "CW" : sv.mode == 2 ? "CCW" : "Wave";
    j += F(",\"mode\":\""); j += m; j += '"';
    j += F(",\"torque\":"); j += (sv.torqueOn ? F("true") : F("false"));
    j += F(",\"moving\":"); j += (sv.moving   ? F("true") : F("false"));
    j += F(",\"currentAngle\":");
    if (sv.rawPos >= 0) j += String(rawToAngle((uint16_t)sv.rawPos), 2); else j += F("null");
    j += F(",\"targetAngle\":");
    if (sv.mode == POS_MODE) j += String(sv.targetDeg, 2); else j += F("null");
    j += F(",\"rawPos\":");  j += sv.rawPos;
    j += F(",\"speed\":");   j += sv.rawSpeed;
    j += F(",\"loadRaw\":"); j += sv.rawLoad;
    j += F(",\"loadAbs\":"); j += sv.rawLoadAbs;
    j += F(",\"currentmA\":");
    if (sv.rawCurrent >= 0) j += String(sv.rawCurrent * 6.5f, 1); else j += F("null");
    j += F(",\"voltageV\":");
    if (sv.rawVoltage > 0) j += String(sv.rawVoltage / 10.0f, 1); else j += F("null");
    j += F(",\"tempC\":");
    if (sv.rawTemp > 0) j += sv.rawTemp; else j += F("null");
    j += F(",\"home\":");     j += String(homeFor(sv.id), 1);
    j += F(",\"homeSet\":");  j += (hasHome(sv.id) ? F("true") : F("false"));
    j += F(",\"speedScale\":"); j += sv.speedScale;
    j += F(",\"acc\":");        j += sv.acc;
    j += F(",\"lastCommandAgeMs\":"); j += (millis() - sv.lastCommandMs);
    j += '}';
  }

  j += F("],\"magnets\":[");
  for (uint8_t i = 0; i < MAG_COUNT; i++) {
    if (i) j += ',';
    j += F("{\"ch\":");    j += i;
    j += F(",\"pct\":");   j += magnets[i].pct;
    j += F(",\"ageMs\":"); j += (millis() - magnets[i].lastCmdMs);
    j += '}';
  }

  const bool up = WiFi.status() == WL_CONNECTED;
  j += F("],\"wifi\":{\"connected\":"); j += (up ? F("true") : F("false"));
  j += F(",\"mode\":\"");    j += (up ? "STA" : (apUp ? "AP" : "down"));
  j += F("\",\"ssid\":\"");  j += (up ? WiFi.SSID() : String(apUp ? apName : ""));
  j += F("\",\"ip\":\"");    j += (up ? WiFi.localIP().toString() : WiFi.softAPIP().toString());
  j += F("\",\"rssi\":");    j += (up ? WiFi.RSSI() : 0);
  j += F(",\"drops\":");     j += wDrops;
  j += F(",\"hostname\":\""); j += cfg.host;
  j += F("\"}}");
  return j;
}

void handleUI() {
  setCORS();
  server.sendHeader("Content-Encoding", "identity");
  server.send_P(200, "text/html", WEBUI_HTML);
}
void handleHealth() {
  String b = F("{\"ok\":true,\"device\":\"ROBO4-ESP32\",\"fw\":\"");
  b += FW_VERSION;
  b += F("\",\"ip\":\""); b += WiFi.localIP().toString();
  b += F("\",\"hostname\":\""); b += cfg.host;
  b += F("\",\"otaSpace\":"); b += ESP.getFreeSketchSpace();
  b += F(",\"sketchSize\":"); b += ESP.getSketchSize(); b += '}';
  okJson(b);
}
void handleTelemetry() { okJson(buildJSON()); }
void handleLog() {
  setCORS();
  String s; s.reserve(logCount * 60 + 32);
  uint8_t start = (uint8_t)((logHead + LOG_LINES - logCount) % LOG_LINES);
  for (uint8_t i = 0; i < logCount; i++) { s += logBuf[(start + i) % LOG_LINES]; s += '\n'; }
  server.send(200, "text/plain", s);
}

void handleMagnet() {
  int pct = server.hasArg("pct") ? server.arg("pct").toInt() : 0;
  if (server.hasArg("all") || server.arg("ch") == "all") {
    for (uint8_t i = 0; i < MAG_COUNT; i++) setMagnet(i, pct);
    okJson(F("{\"ok\":true,\"result\":\"all\"}"));
    return;
  }
  if (!server.hasArg("ch")) { errJson(400, "missing ch"); return; }
  int ch = server.arg("ch").toInt();
  if (ch < 0 || ch >= MAG_COUNT) { errJson(404, "bad channel"); return; }
  setMagnet((uint8_t)ch, pct);
  String b = F("{\"ok\":true,\"ch\":"); b += ch; b += F(",\"pct\":"); b += magnets[ch].pct; b += '}';
  okJson(b);
}

void applyCmd(ServoState& sv, const String& cmd) {
  if      (cmd == "stop" || cmd == "estop") cmdStop(sv);
  // Every torque-ON path goes through torqueOnHold so the joint holds exactly where it is
  // rather than snapping to whatever goal was left in the servo's register.
  else if (cmd == "torquetoggle")           { if (sv.torqueOn) cmdTorqueToggle(sv); else torqueOnHold(sv); }
  else if (cmd == "torqueon")  { if (!sv.torqueOn) torqueOnHold(sv); }
  else if (cmd == "torqueoff") { if (sv.torqueOn)  cmdTorqueToggle(sv); }
  else if (cmd == "home")                   cmdPos(sv, 180.0f, 10, POS_ACC_DEFAULT);
}

void handleCommand() {
  if (!server.hasArg("servo") || !server.hasArg("cmd")) { errJson(400, "missing args"); return; }
  String sa = server.arg("servo");
  String cmd = server.arg("cmd"); cmd.toLowerCase();

  if ((sa == "all" || sa == "0") && (cmd == "estop" || cmd == "stop")) {
    estopAll(); okJson(F("{\"ok\":true,\"result\":\"estop_all\"}")); return;
  }
  if (sa == "all") {
    for (uint8_t i = 0; i < nServos; i++) applyCmd(servos[i], cmd);
    okJson(F("{\"ok\":true,\"result\":\"all\"}")); return;
  }
  ServoState* sv = byId((uint8_t)sa.toInt());
  if (!sv) { errJson(404, "servo not found"); return; }
  // Mirrored to USB serial by lg(): if the board stops answering, the monitor's last line
  // names the exact request it was in, which beats guessing from the browser side.
  bc("cmd id=%u %s", sv->id, cmd.c_str());

  float   angle = server.hasArg("angle") ? server.arg("angle").toFloat() : sv->targetDeg;
  int     speed = server.hasArg("speed") ? server.arg("speed").toInt()   : 10;
  uint8_t acc   = (uint8_t)(server.hasArg("acc") ? constrain(server.arg("acc").toInt(), 1, 100)
                                                 : POS_ACC_DEFAULT);
  if (cmd == "pos") { cmdPos(*sv, angle, speed, acc); okTrue(); return; }
  if (cmd == "stop" || cmd == "estop" ||
      cmd == "torquetoggle" || cmd == "torqueon" || cmd == "torqueoff" || cmd == "home") {
    applyCmd(*sv, cmd); okTrue(); return;
  }
  errJson(400, "unknown cmd");
}

void handleBatch() {
  bc("batch move");
  int     spd = server.hasArg("speed") ? constrain(server.arg("speed").toInt(), 1, 10) : 5;
  uint8_t acc = (uint8_t)(server.hasArg("acc") ? constrain(server.arg("acc").toInt(), 1, 100)
                                               : POS_ACC_DEFAULT);
  uint8_t  ids[MAX_SERVOS]; int16_t pos[MAX_SERVOS];
  uint16_t spds[MAX_SERVOS]; uint8_t accs[MAX_SERVOS];
  uint8_t cnt = 0;

  for (uint8_t i = 0; i < nServos; i++) {
    ServoState& sv = servos[i];
    String key = String(sv.id);
    if (!server.hasArg(key)) continue;
    float lo, hi; limitsFor(i, lo, hi);
    sv.mode = POS_MODE;
    setHwMode(sv, POS_MODE);
    ensureTorque(sv);
    sv.targetDeg     = clampF(server.arg(key).toFloat(), lo, hi);
    sv.targetRaw     = angleToRaw(sv.targetDeg);
    sv.speedScale    = spd;
    sv.speedRaw      = speedScaleToRaw(spd);
    sv.acc           = acc;
    sv.lastCommandMs = millis();
    ids[cnt] = sv.id; pos[cnt] = (int16_t)sv.targetRaw;
    spds[cnt] = sv.speedRaw; accs[cnt] = sv.acc;
    cnt++;
  }
  if (cnt == 1)     { st.WritePosEx(ids[0], pos[0], spds[0], accs[0]); delay(3); }
  else if (cnt > 1) { st.SyncWritePosEx(ids, cnt, pos, spds, accs);    delay(3); }
  String b = F("{\"ok\":true,\"sent\":"); b += cnt; b += '}';
  okJson(b);
}

// GET /api/home            all servos -> 180
// GET /api/home?manual=1    all servos -> their stored home (180 where unset)
void handleHome() {
  bool manual = server.hasArg("manual") && server.arg("manual") != "0";
  bc(manual ? "home all (manual)" : "home all -> 180");
  homeAll(manual);
  okTrue();
}

// GET /api/home/manual                 same as /api/home?manual=1
void handleHomeManual() { bc("home all (manual)"); homeAll(true); okTrue(); }

// GET /api/home/set                    capture EVERY servo's current angle as its home
// GET /api/home/set?id=N               just this one
// GET /api/home/set?id=N&deg=142.5     set it to an explicit angle instead
// GET /api/home/set?id=N&clear=1       forget it (back to 180)
void handleHomeSet() {
  bool clear = server.hasArg("clear") && server.arg("clear") != "0";
  String out = F("{\"ok\":true,\"homes\":[");
  uint8_t n = 0;

  for (uint8_t i = 0; i < nServos; i++) {
    ServoState& sv = servos[i];
    if (server.hasArg("id") && server.arg("id") != "all" &&
        (uint8_t)server.arg("id").toInt() != sv.id) continue;

    if (clear) { clearHomeFor(sv.id); }
    else if (server.hasArg("deg")) { setHomeFor(sv.id, server.arg("deg").toFloat()); }
    else {
      // Capture what the joint is ACTUALLY at. A servo that never answered has no angle
      // to capture, so it is skipped rather than silently homed to a stale reading.
      if (sv.rawPos < 0) continue;
      setHomeFor(sv.id, rawToAngle((uint16_t)sv.rawPos));
    }
    if (n++) out += ',';
    out += F("{\"id\":");   out += sv.id;
    out += F(",\"home\":"); out += String(homeFor(sv.id), 1);
    out += '}';
  }
  homesSave();
  bc(clear ? "home positions cleared" : "home positions saved");
  out += F("],\"count\":"); out += n; out += '}';
  okJson(out);
}

// POST /api/anim/load   body:
//   V1 <frameCount> <checksum>
//   <timeMs> <speed> <id>:<deg> <id>:<deg> ...
//   ...
// The header states how many frames to expect and a checksum over the body; a partial or
// mangled upload therefore fails validation instead of being played. Nothing replaces the
// stored sequence until the whole thing parses — a half-received upload leaves the
// previous one intact rather than half-wrecking it.
void handleAnimLoad() {
  if (!server.hasArg("plain")) { errJson(400, "empty body"); return; }
  String body = server.arg("plain");

  int nl = body.indexOf('\n');
  if (nl < 0) { errJson(400, "no header line"); return; }
  String head = body.substring(0, nl);
  head.trim();
  if (!head.startsWith("V1 ")) { errJson(400, "bad header (expected V1)"); return; }

  int sp1 = head.indexOf(' ', 3);
  if (sp1 < 0) { errJson(400, "bad header fields"); return; }
  uint16_t wantCount = (uint16_t)head.substring(3, sp1).toInt();
  uint32_t wantSum   = (uint32_t)strtoul(head.substring(sp1 + 1).c_str(), nullptr, 10);

  String payload = body.substring(nl + 1);
  uint32_t sum = 0;
  for (size_t i = 0; i < payload.length(); i++) sum = (sum * 31u + (uint8_t)payload[i]) & 0xFFFFFFFFu;
  if (sum != wantSum) {
    lg("anim upload rejected: checksum %lu, expected %lu", (unsigned long)sum, (unsigned long)wantSum);
    errJson(400, "checksum mismatch - upload was incomplete or corrupted");
    return;
  }
  if (wantCount == 0 || wantCount > MAX_FRAMES) { errJson(400, "frame count out of range"); return; }

  // Parse into a scratch buffer first; the live sequence is only replaced on full success.
  static AnimFrame tmp[MAX_FRAMES];
  uint8_t got = 0;
  int pos = 0;
  while (pos < (int)payload.length() && got < MAX_FRAMES) {
    int e = payload.indexOf('\n', pos);
    String line = (e < 0) ? payload.substring(pos) : payload.substring(pos, e);
    pos = (e < 0) ? payload.length() : e + 1;
    line.trim();
    if (!line.length()) continue;

    AnimFrame f; f.n = 0;
    int sp = line.indexOf(' ');
    if (sp < 0) { errJson(400, "bad frame line"); return; }
    f.timeMs = (uint16_t)constrain(line.substring(0, sp).toInt(), 0, 60000);
    int sp2 = line.indexOf(' ', sp + 1);
    if (sp2 < 0) { errJson(400, "bad frame line"); return; }
    f.speed = (uint8_t)constrain(line.substring(sp + 1, sp2).toInt(), 1, 10);

    int q = sp2 + 1;
    while (q < (int)line.length() && f.n < MAX_SERVOS) {
      int spc = line.indexOf(' ', q);
      String tok = (spc < 0) ? line.substring(q) : line.substring(q, spc);
      q = (spc < 0) ? line.length() : spc + 1;
      int c = tok.indexOf(':');
      if (c < 0) continue;
      int id = tok.substring(0, c).toInt();
      float dg = tok.substring(c + 1).toFloat();
      if (id < 1 || id > 253) continue;
      f.ids[f.n] = (uint8_t)id;
      f.deg10[f.n] = (int16_t)lroundf(clampF(dg, 0.0f, 360.0f) * 10.0f);
      f.n++;
    }
    tmp[got++] = f;
  }

  if (got != wantCount) {
    String e = "got " + String(got) + " frames, header promised " + String(wantCount);
    lg("anim upload rejected: %s", e.c_str());
    errJson(400, e.c_str());
    return;
  }

  animStop();
  memcpy(anim, tmp, sizeof(AnimFrame) * got);
  animCount = got;
  animSine = !(server.hasArg("sine") && server.arg("sine") == "0");
  animLoop = server.hasArg("loop") && server.arg("loop") != "0";
  lg("anim loaded: %u frames, sine %s, loop %s", animCount,
     animSine ? "on" : "off", animLoop ? "on" : "off");

  String r = F("{\"ok\":true,\"frames\":"); r += animCount;
  r += F(",\"sine\":"); r += (animSine ? F("true") : F("false"));
  r += F(",\"loop\":"); r += (animLoop ? F("true") : F("false"));
  r += '}';
  okJson(r);
}

void handleAnimPlay() {
  if (animCount == 0) { errJson(409, "no sequence loaded"); return; }
  if (server.hasArg("loop")) animLoop = server.arg("loop") != "0";
  uint8_t from = server.hasArg("from") ? (uint8_t)server.arg("from").toInt() : 0;
  if (from >= animCount) from = 0;
  bc("anim play (%u frames)", animCount);
  animPlaying = true;
  animBeginFrame(from);
  okTrue();
}

void handleAnimStop() { animStop(); okTrue(); }

void handleAnimStatus() {
  String r = F("{\"ok\":true,\"frames\":"); r += animCount;
  r += F(",\"playing\":"); r += (animPlaying ? F("true") : F("false"));
  r += F(",\"idx\":");     r += (animPlaying ? animIdx : 0);
  r += F(",\"sine\":");    r += (animSine ? F("true") : F("false"));
  r += F(",\"loop\":");    r += (animLoop ? F("true") : F("false"));
  r += '}';
  okJson(r);
}

// GET /api/servo/deadband                 report the current hold freedom
// GET /api/servo/deadband?deg=1.0         set it (rounded to the nearest 0.088 deg unit)
// Applied to every servo immediately and remembered across reboots. tuneByteIfDiff only
// writes when the value actually changes, so repeated calls do not wear the servo EPROM.
void handleDeadband() {
  if (server.hasArg("deg") || server.hasArg("units")) {
    int units = server.hasArg("units")
              ? server.arg("units").toInt()
              : (int)lroundf(server.arg("deg").toFloat() / DEG_PER_UNIT);
    units = constrain(units, 0, 200);
    deadbandUnits = (uint8_t)units;
    prefs.putUChar("deadband", deadbandUnits);
    lg("hold freedom set to %u units (+/-%s deg)", deadbandUnits,
       String(deadbandUnits * DEG_PER_UNIT, 2).c_str());
    tuneAllServos();
  }
  String r = F("{\"ok\":true,\"units\":"); r += deadbandUnits;
  r += F(",\"deg\":");        r += String(deadbandUnits * DEG_PER_UNIT, 2);
  r += F(",\"degPerUnit\":"); r += String(DEG_PER_UNIT, 4);
  r += '}';
  okJson(r);
}

// GET /api/servo/home?id=N[&to180=1]   send one servo to its home
void handleServoHome() {
  if (!server.hasArg("id")) { errJson(400, "need id"); return; }
  uint8_t id = (uint8_t)server.arg("id").toInt();
  int slot = slotOf(id);
  if (slot < 0) { errJson(404, "servo not in the current list"); return; }
  bool to180 = server.hasArg("to180") && server.arg("to180") != "0";
  float target = to180 ? 180.0f : homeFor(id);
  gotoDeg((uint8_t)slot, target);
  String r = F("{\"ok\":true,\"id\":"); r += id;
  r += F(",\"target\":"); r += String(target, 1); r += '}';
  okJson(r);
}
void handleTune() { bc("tune all"); tuneAllServos(); okTrue(); }
void handleTorqueAll() {
  bool on = !server.hasArg("on") || server.arg("on") != "0";
  bc("torque all %s (%u servos)", on ? "ON" : "OFF", nServos);
  if (on) torqueOnAll(); else torqueOffAll();
  okJson(on ? F("{\"ok\":true,\"torque\":\"on\"}") : F("{\"ok\":true,\"torque\":\"off\"}"));
}

// Wiggle one servo ±8° so you can SEE which physical joint an ID belongs to.
void handleIdentify() {
  if (!server.hasArg("id")) { errJson(400, "missing id"); return; }
  uint8_t id = (uint8_t)server.arg("id").toInt();
  int base = st.ReadPos(id);
  if (base < 0) { errJson(404, "no reply from that id"); return; }
  st.writeByte(id, REG_MODE, POS_MODE); delay(19);
  st.EnableTorque(id, 1); delay(2);
  const int d = 90;                            // ~8° in raw counts
  for (uint8_t k = 0; k < 3; k++) {
    st.WritePosEx(id, constrain(base + d, 0, 4095), 2000, 60); delay(160);
    st.WritePosEx(id, constrain(base - d, 0, 4095), 2000, 60); delay(160);
  }
  st.WritePosEx(id, base, 1500, 40); delay(120);
  ServoState* sv = byId(id);
  if (sv) { sv->hwMode = POS_MODE; sv->torqueOn = true; sv->lastCommandMs = millis(); }
  String b = F("{\"ok\":true,\"id\":"); b += id; b += F(",\"pos\":"); b += base; b += '}';
  okJson(b);
}

// ── Scan endpoints ───────────────────────────────────────────────────────────
void handleScan() {
  if (sc.active) { errJson(409, "scan already running"); return; }
  uint8_t from = server.hasArg("from") ? server.arg("from").toInt() : 1;
  uint8_t to   = server.hasArg("to")   ? server.arg("to").toInt()   : 20;
  bool allBaud = server.hasArg("allbaud") && server.arg("allbaud") != "0";
  // adopt=0 → a read-only detect: report what answers, change nothing.
  scAdopt = !(server.hasArg("adopt") && server.arg("adopt") == "0");
  scanStart(from, to, allBaud);
  okTrue();
}
void handleScanStatus() {
  String j = F("{\"ok\":true,\"active\":");
  j += (sc.active ? F("true") : F("false"));
  j += F(",\"done\":");  j += (sc.done ? F("true") : F("false"));
  j += F(",\"at\":");    j += sc.cur;
  j += F(",\"from\":");  j += sc.from;      // the UI draws one cell per id in this range
  j += F(",\"to\":");    j += sc.to;        // and marks them checked/found as the scan runs
  j += F(",\"pass\":");  j += (sc.bIdx + 1);
  j += F(",\"passes\":");j += sc.bCount;
  j += F(",\"baud\":");  j += scanBaud();
  j += F(",\"adopt\":"); j += (scAdopt ? F("true") : F("false"));
  j += F(",\"canWriteId\":");
  j += ((sc.done && !sc.active && sc.nHits == 1) ? F("true") : F("false"));
  j += F(",\"found\":[");
  for (uint8_t i = 0; i < sc.nHits; i++) {
    const ScanHit& h = sc.hits[i];
    if (i) j += ',';
    j += F("{\"id\":");    j += h.id;
    j += F(",\"baud\":");  j += h.baud;
    j += F(",\"pos\":");   j += h.pos;
    j += F(",\"volt\":");  j += h.volt;
    j += F(",\"temp\":");  j += h.temp;
    j += F(",\"mode\":");  j += h.mode;
    j += '}';
  }
  j += F("]}");
  okJson(j);
}

// ── Servo tooling endpoints ──────────────────────────────────────────────────
void handleSetId() {
  if (!server.hasArg("from") || !server.hasArg("to")) { errJson(400, "need from & to"); return; }
  uint8_t a = (uint8_t)server.arg("from").toInt();
  uint8_t b = (uint8_t)server.arg("to").toInt();
  if (a < 1 || a > 253 || b < 1 || b > 253) { errJson(400, "id out of range 1..253"); return; }

  // The write is addressed to one id, so with unique ids it is safe even on a full bus.
  // What the firmware still refuses, unless forced, is the genuinely dangerous pair:
  // a source the last detect never saw, or a target that is already taken (which would
  // leave two servos colliding on the same id, and scanning cannot tell them apart).
  bool force = server.hasArg("force") && server.arg("force") != "0";
  if (!sc.done || sc.active) { errJson(409, "run a detect first"); return; }
  bool srcSeen = false, dstSeen = false;
  for (uint8_t i = 0; i < sc.nHits; i++) {
    if (sc.hits[i].id == a) srcSeen = true;
    if (sc.hits[i].id == b) dstSeen = true;
  }
  if (!srcSeen && !force) {
    String e = "detect never saw id " + String(a) + " - re-detect, or pass force=1";
    errJson(409, e.c_str());
    return;
  }
  if (dstSeen && !force) {
    String e = "id " + String(b) + " is already on this bus - that would make two servos "
               "share it. Pass force=1 only if you mean it.";
    errJson(409, e.c_str());
    return;
  }
  if (st.Ping(a) == -1) { errJson(404, "no servo answering the current id"); return; }
  st.unLockEprom(a);           delay(10);
  st.writeByte(a, REG_ID, b);  delay(20);
  st.LockEprom(b);             delay(10);
  bool ok = st.Ping(b) != -1;
  // The bus has changed under us: invalidate the detect so the next write needs a new one.
  sc.done = false;
  sc.nHits = 0;
  lg("setid %u -> %u : %s", a, b, ok ? "ok" : "FAILED");
  String r = F("{\"ok\":"); r += (ok ? F("true") : F("false"));
  r += F(",\"from\":"); r += a; r += F(",\"to\":"); r += b; r += '}';
  okJson(r);
}
void handleSetBaud() {
  if (!server.hasArg("id") || !server.hasArg("idx")) { errJson(400, "need id & idx"); return; }
  uint8_t id  = (uint8_t)server.arg("id").toInt();
  uint8_t idx = (uint8_t)constrain(server.arg("idx").toInt(), 0, 7);
  if (st.Ping(id) == -1) { errJson(404, "no reply"); return; }
  st.unLockEprom(id);                 delay(10);
  st.writeByte(id, REG_BAUD, idx);    delay(20);
  st.LockEprom(id);                   delay(10);
  lg("servo %u baud -> %lu (set the bus baud in Config to match)", id, (unsigned long)BAUD_TABLE[idx]);
  String r = F("{\"ok\":true,\"id\":"); r += id;
  r += F(",\"baud\":"); r += BAUD_TABLE[idx];
  r += F(",\"note\":\"set bus baud in Config to match\"}");
  okJson(r);
}
void handleCenter() {
  if (!server.hasArg("id")) { errJson(400, "need id"); return; }
  uint8_t id = (uint8_t)server.arg("id").toInt();
  if (st.Ping(id) == -1) { errJson(404, "no reply"); return; }
  st.CalibrationOfs(id); delay(20);
  int pos = st.ReadPos(id);
  lg("servo %u centred, pos now %d", id, pos);
  String r = F("{\"ok\":true,\"id\":"); r += id; r += F(",\"pos\":"); r += pos; r += '}';
  okJson(r);
}
void handleOfs() {
  if (!server.hasArg("id") || !server.hasArg("val")) { errJson(400, "need id & val"); return; }
  uint8_t id = (uint8_t)server.arg("id").toInt();
  int val = server.arg("val").toInt();
  st.unLockEprom(id);                          delay(10);
  st.writeWord(id, REG_OFS, (uint16_t)val);    delay(20);
  st.LockEprom(id);                            delay(10);
  String r = F("{\"ok\":true,\"id\":"); r += id; r += F(",\"ofs\":"); r += val; r += '}';
  okJson(r);
}
void handleRegRead() {
  if (!server.hasArg("id") || !server.hasArg("addr")) { errJson(400, "need id & addr"); return; }
  uint8_t id   = (uint8_t)server.arg("id").toInt();
  uint8_t addr = (uint8_t)server.arg("addr").toInt();
  uint8_t len  = server.hasArg("len") ? (uint8_t)server.arg("len").toInt() : 2;
  int val = (len == 1) ? st.readByte(id, addr) : st.readWord(id, addr);
  String r = F("{\"ok\":"); r += (val < 0 ? F("false") : F("true"));
  r += F(",\"id\":");   r += id;
  r += F(",\"addr\":"); r += addr;
  r += F(",\"len\":");  r += len;
  r += F(",\"value\":");r += val; r += '}';
  okJson(r);
}
void handleRegWrite() {
  if (!server.hasArg("id") || !server.hasArg("addr") || !server.hasArg("val")) {
    errJson(400, "need id, addr & val"); return;
  }
  uint8_t id   = (uint8_t)server.arg("id").toInt();
  uint8_t addr = (uint8_t)server.arg("addr").toInt();
  uint8_t len  = server.hasArg("len") ? (uint8_t)server.arg("len").toInt() : 2;
  int     val  = server.arg("val").toInt();
  bool unlock  = server.hasArg("unlock") && server.arg("unlock") != "0";
  if (unlock) { st.unLockEprom(id); delay(10); }
  if (len == 1) st.writeByte(id, addr, (uint8_t)val);
  else          st.writeWord(id, addr, (uint16_t)val);
  delay(15);
  if (unlock) { st.LockEprom(id); delay(10); }
  int back = (len == 1) ? st.readByte(id, addr) : st.readWord(id, addr);
  if (byId(id)) byId(id)->hwMode = 255;        // our cached mirror may now be stale
  lg("poke id=%u addr=%u val=%d -> readback %d", id, addr, val, back);
  String r = F("{\"ok\":true,\"id\":"); r += id;
  r += F(",\"addr\":"); r += addr;
  r += F(",\"wrote\":"); r += val;
  r += F(",\"readback\":"); r += back; r += '}';
  okJson(r);
}

// ── Config endpoints ─────────────────────────────────────────────────────────
void handleConfigGet() {
  String j = F("{\"ok\":true,\"host\":\""); j += cfg.host;
  j += F("\",\"baud\":"); j += cfg.baud;
  j += F(",\"magSafeHold\":"); j += cfg.magSafeHold;
  j += F(",\"fw\":\""); j += FW_VERSION;
  j += F("\",\"servos\":[");
  for (uint8_t i = 0; i < nServos; i++) {
    if (i) j += ',';
    j += F("{\"id\":");     j += cfg.ids[i];
    j += F(",\"label\":\""); j += cfg.labels[i];
    j += F("\",\"min\":");  j += cfg.minDeg[i];
    j += F(",\"max\":");    j += cfg.maxDeg[i];
    j += '}';
  }
  j += F("]}");
  okJson(j);
}

// GET /api/config/set?host=mod2&baud=1000000&hold=40&servos=1:J1:0:360|2:J2:80:280|...
void handleConfigSet() {
  bool hostChanged = false;
  if (server.hasArg("host")) {
    String h = server.arg("host"); h.trim();
    if (h.length() && h.length() < sizeof(cfg.host)) {
      hostChanged = h != String(cfg.host);
      strlcpy(cfg.host, h.c_str(), sizeof(cfg.host));
    }
  }
  if (server.hasArg("baud")) {
    uint32_t b = (uint32_t)server.arg("baud").toInt();
    if (b >= 9600 && b <= 1000000) cfg.baud = b;
  }
  if (server.hasArg("hold")) cfg.magSafeHold = (uint8_t)constrain(server.arg("hold").toInt(), 0, 100);

  if (server.hasArg("servos")) {
    String s = server.arg("servos");
    uint8_t n = 0;
    int i = 0;
    while (i < (int)s.length() && n < MAX_SERVOS) {
      int bar = s.indexOf('|', i);
      String rec = (bar < 0) ? s.substring(i) : s.substring(i, bar);
      i = (bar < 0) ? s.length() : bar + 1;
      rec.trim();
      if (!rec.length()) continue;
      int c1 = rec.indexOf(':'), c2 = rec.indexOf(':', c1 + 1), c3 = rec.indexOf(':', c2 + 1);
      if (c1 < 0 || c2 < 0 || c3 < 0) continue;
      int id = rec.substring(0, c1).toInt();
      if (id < 1 || id > 253) continue;
      cfg.ids[n] = (uint8_t)id;
      strlcpy(cfg.labels[n], rec.substring(c1 + 1, c2).c_str(), sizeof(cfg.labels[n]));
      cfg.minDeg[n] = (int16_t)rec.substring(c2 + 1, c3).toInt();
      cfg.maxDeg[n] = (int16_t)rec.substring(c3 + 1).toInt();
      n++;
    }
    cfg.servoCount = n;
  }

  cfgSave();
  applyServoConfig();
  busBegin(cfg.baud);
  if (hostChanged) { mdnsOk = false; startMDNS(); ArduinoOTA.setHostname(cfg.host); }
  lg("config saved: host=%s baud=%lu servos=%u", cfg.host, (unsigned long)cfg.baud, nServos);
  String r = F("{\"ok\":true,\"host\":\""); r += cfg.host;
  r += F("\",\"servos\":"); r += nServos;
  r += F(",\"hostChanged\":"); r += (hostChanged ? F("true") : F("false")); r += '}';
  okJson(r);
}

void handleReboot() { okTrue(); delay(200); ESP.restart(); }

// ── Wi-Fi endpoints ──────────────────────────────────────────────────────────
void handleWifiGet() {
  String j = F("{\"ok\":true,\"apName\":\""); j += apName;
  j += F("\",\"connected\":"); j += (WiFi.status() == WL_CONNECTED ? F("true") : F("false"));
  j += F(",\"drops\":"); j += wDrops;
  j += F(",\"fails\":"); j += wFails;
  j += F(",\"apUp\":");  j += (apUp ? F("true") : F("false"));
  j += F(",\"slots\":[");
  for (uint8_t i = 0; i < 3; i++) { if (i) j += ','; j += '"'; j += cfg.ssid[i]; j += '"'; }
  j += F("]}");
  okJson(j);
}
void handleWifiSet() {
  if (!server.hasArg("slot")) { errJson(400, "need slot"); return; }
  uint8_t s = (uint8_t)constrain(server.arg("slot").toInt(), 0, 2);
  String ssid = server.arg("ssid");
  String pass = server.arg("pass");
  bool force  = server.hasArg("force");
  if (!ssid.length() && !force) { errJson(400, "empty ssid (pass force=1 to clear)"); return; }
  strlcpy(cfg.ssid[s], ssid.c_str(), sizeof(cfg.ssid[s]));
  if (pass.length() || force) strlcpy(cfg.pass[s], pass.c_str(), sizeof(cfg.pass[s]));
  cfgSave();
  lg("wifi slot %u set to '%s'", s, cfg.ssid[s]);
  wFails = 0; wBackoff = 800; wSlot = 255; wNextTry = millis();   // try the new creds at once
  okTrue();
}
void handleWifiReconnect() {
  wFails = 0; wBackoff = 800; wSlot = 255; wNextTry = millis();
  WiFi.disconnect(false, false);
  okTrue();
}
void handleWifiScan() {
  int n = WiFi.scanNetworks();
  String j = F("{\"ok\":true,\"nets\":[");
  for (int i = 0; i < n && i < 24; i++) {
    if (i) j += ',';
    j += F("{\"ssid\":\""); j += WiFi.SSID(i);
    j += F("\",\"rssi\":"); j += WiFi.RSSI(i);
    j += F(",\"ch\":");     j += WiFi.channel(i);
    j += F(",\"open\":");   j += (WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? F("true") : F("false"));
    j += '}';
  }
  j += F("]}");
  WiFi.scanDelete();
  okJson(j);
}

// ─────────────────────────────────────────────────────────────────────────────
//  OTA
// ─────────────────────────────────────────────────────────────────────────────
// Make the machine safe before we stop servicing it: torque off, magnets released,
// radio at full power, CPU at full speed so the flash write is fast and reliable.
void prepareForOta(const char* how) {
  otaBusy = true;
  lg("OTA (%s) starting — de-torquing servos, releasing magnets", how);
  for (uint8_t i = 0; i < MAG_COUNT; i++) setMagnet(i, 0);
  for (uint8_t i = 0; i < nServos; i++) { st.EnableTorque(servos[i].id, 0); delay(2); servos[i].torqueOn = false; }
  WiFi.setSleep(false);
  // Full TX power for the transfer: the 8.5 dBm setting that keeps the C3 cool is the
  // difference between a 1.1 MB upload finishing and stalling on a weak link.
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  setCpuFrequencyMhz(160);
}

bool   otaAccepting = false;   // false once begin() fails — swallow the rest, don't spam
size_t otaExpected  = 0;       // exact byte count the browser promised (?size=), 0 = unknown
size_t otaGot       = 0;       // bytes actually received
uint32_t otaSum     = 2166136261u;  // FNV-1a over the received bytes: proves whether the
                                    // data that arrived is byte-identical to the file

// Undo prepareForOta() when no reboot is coming, so a failed attempt doesn't leave the
// board hot (full CPU, radio sleep off) until someone power-cycles it.
void otaEnd(bool success) {
  if (success) return;
  otaBusy = false;
  setCpuFrequencyMhz(80);
  WiFi.setSleep(true);
  WiFi.setTxPower(WIFI_POWER_11dBm);
}

void handleOtaUpload() {
  HTTPUpload& up = server.upload();
  if (up.status == UPLOAD_FILE_START) {
    prepareForOta("http");
    // The browser sends the file's exact length as ?size=. Telling Update the real size
    // is what makes a truncated transfer fail loudly here instead of being finalised into
    // an image the bootloader then refuses ("Could Not Activate The Firmware").
    otaExpected  = server.hasArg("size") ? (size_t)server.arg("size").toInt() : 0;
    otaGot       = 0;
    otaSum       = 2166136261u;
    otaAccepting = Update.begin(otaExpected ? otaExpected : UPDATE_SIZE_UNKNOWN);
    if (!otaAccepting)
      lg("Update.begin failed: %s (want %u bytes, partition has %u)",
         Update.errorString(), (unsigned)otaExpected, (unsigned)ESP.getFreeSketchSpace());
    else
      lg("OTA receiving %u bytes", (unsigned)otaExpected);
  } else if (up.status == UPLOAD_FILE_WRITE) {
    if (!otaAccepting) return;                       // drain the body silently
    if (Update.write(up.buf, up.currentSize) != up.currentSize) {
      lg("Update.write failed: %s — aborting", Update.errorString());
      otaAccepting = false;
    } else {
      for (size_t i = 0; i < up.currentSize; i++) {
        otaSum ^= up.buf[i];
        otaSum *= 16777619u;
      }
      otaGot += up.currentSize;
    }
  } else if (up.status == UPLOAD_FILE_END) {
    if (!otaAccepting) { otaEnd(false); return; }
    if (otaExpected && otaGot != otaExpected) {      // link died mid-transfer
      lg("OTA truncated: got %u of %u bytes — discarding", (unsigned)otaGot, (unsigned)otaExpected);
      Update.abort();
      otaAccepting = false;
      otaEnd(false);
      return;
    }
    lg("OTA received %u bytes, fnv1a=%08x", (unsigned)otaGot, otaSum);
    if (Update.end(true)) lg("OTA wrote %u bytes — rebooting", (unsigned)otaGot);
    else { lg("OTA failed: %s", Update.errorString()); otaEnd(false); }
  } else if (up.status == UPLOAD_FILE_ABORTED) {
    Update.abort();
    otaEnd(false);
    lg("OTA aborted");
  }
}

void handleOtaDone() {
  bool ok = otaAccepting && !Update.hasError();
  String msg;
  if (ok) {
    msg = "OK";
  } else if (otaExpected && otaGot != otaExpected) {
    msg = "short: received " + String((unsigned)otaGot) + " of " +
          String((unsigned)otaExpected) + " bytes. Nothing was activated - just retry.";
  } else if (ESP.getFreeSketchSpace() == 0) {
    msg = F("no OTA partition on this board — re-flash over USB with a Partition Scheme "
            "whose name contains \"with OTA\" (e.g. Minimal SPIFFS 1.9MB APP with OTA)");
  } else {
    msg = String(Update.errorString()) + " [received " + String((unsigned)otaGot) +
          " of " + String((unsigned)otaExpected) + " bytes, fnv1a=" + String(otaSum, 16) + "]";
  }
  setCORS();
  server.sendHeader("Connection", "close");
  server.send(ok ? 200 : 500, "text/plain", msg);
  if (ok) { delay(400); ESP.restart(); }
  otaEnd(ok);
}

// GET /api/ota/url?u=http://192.168.1.20:8000/firmware.bin  — the board pulls its own update
void handleOtaUrl() {
  if (!server.hasArg("u")) { errJson(400, "need u=<url>"); return; }
  String url = server.arg("u");
  if (otaBusy) { errJson(409, "an update is already in progress"); return; }
  if (ESP.getFreeSketchSpace() == 0) {
    errJson(500, "no OTA partition on this board - re-flash over USB with an OTA scheme");
    return;
  }
  prepareForOta("url");
  setCORS();
  server.send(200, "application/json", "{\"ok\":true,\"pulling\":true}");
  server.client().stop();
  WiFiClient client;
  httpUpdate.rebootOnUpdate(true);
  // The board cannot serve HTTP while this runs (single core, blocking write), so the
  // only feedback possible is the log, read back after it reboots.
  httpUpdate.onProgress([](int cur, int total) {
    static int lastTenth = -1;
    int tenth = total ? (cur * 10 / total) : 0;
    if (tenth != lastTenth) { lastTenth = tenth; lg("pull OTA %d%% (%d/%d bytes)", tenth * 10, cur, total); }
  });
  lg("pulling firmware from %s", url.c_str());
  t_httpUpdate_return r = httpUpdate.update(client, url);
  if (r == HTTP_UPDATE_FAILED)
    lg("pull OTA failed (%d): %s", httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
  otaEnd(false);
}

// Configure only — begin() must wait for an IP, or its UDP bind fails and the
// network port never appears. wifiTick() calls begin() on the first GOT_IP.
void otaConfig() {
  ArduinoOTA.setPort(OTA_PORT);
  ArduinoOTA.setHostname(cfg.host);
  ArduinoOTA.setPassword(OTA_PASS);
  ArduinoOTA.onStart([]() { prepareForOta("arduino-ide"); });
  ArduinoOTA.onProgress([](unsigned p, unsigned t) {
    static uint8_t last = 255;
    uint8_t pct = t ? (uint8_t)(p * 100 / t) : 0;
    if (pct / 10 != last) { last = pct / 10; Serial.printf("OTA %u%%\n", pct); }
  });
  ArduinoOTA.onEnd([]()   { lg("ArduinoOTA done — rebooting"); });
  ArduinoOTA.onError([](ota_error_t e) { lg("ArduinoOTA error %u", e); otaBusy = false; });
}

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  captureLastBoot();          // must be first: nothing may overwrite the breadcrumb
  Serial.begin(115200);
  delay(300);
  cfgLoad();
  homesLoad();
  deadbandUnits = prefs.getUChar("deadband", TUNE_DEADBAND_DEFAULT);
  applyServoConfig();
  lg("ROBO4 fw %s booting as '%s' (%u servos, bus %lu baud)",
     FW_VERSION, cfg.host, nServos, (unsigned long)cfg.baud);

  setCpuFrequencyMhz(80);              // heat; bumped to 160 automatically during OTA

  busBegin(cfg.baud);
  for (uint8_t i = 0; i < MAG_COUNT; i++) {
    ledcAttach(MAG_IN1[i], MAG_PWM_FREQ, MAG_PWM_RES);
    ledcAttach(MAG_IN2[i], MAG_PWM_FREQ, MAG_PWM_RES);
    setMagnet(i, 0);
  }

  wifiInit();                          // non-blocking: the server is up in milliseconds
  otaConfig();                         // begin() happens in wifiTick once we have an IP

  route("/",                    handleUI);          // the web page
  route("/api/health",          handleHealth);
  route("/api/telemetry",       handleTelemetry);
  route("/api/command",         handleCommand);
  route("/api/batch",           handleBatch);
  route("/api/magnet",          handleMagnet);
  route("/api/home",            handleHome);
  route("/api/home/manual",     handleHomeManual);
  route("/api/anim/load",       handleAnimLoad);
  route("/api/anim/play",       handleAnimPlay);
  route("/api/anim/stop",       handleAnimStop);
  route("/api/anim/status",     handleAnimStatus);
  route("/api/home/set",        handleHomeSet);
  route("/api/servo/home",      handleServoHome);
  route("/api/servo/deadband",  handleDeadband);
  route("/api/torque",          handleTorqueAll);
  route("/api/servo/tune",      handleTune);
  route("/api/identify",        handleIdentify);
  route("/api/log",             handleLog);
  route("/api/scan",            handleScan);
  route("/api/scan/status",     handleScanStatus);
  route("/api/servo/setid",     handleSetId);
  route("/api/servo/setbaud",   handleSetBaud);
  route("/api/servo/center",    handleCenter);
  route("/api/servo/ofs",       handleOfs);
  route("/api/servo/read",      handleRegRead);
  route("/api/servo/write",     handleRegWrite);
  route("/api/config",          handleConfigGet);
  route("/api/config/set",      handleConfigSet);
  route("/api/reboot",          handleReboot);
  route("/api/wifi",            handleWifiGet);
  route("/api/wifi/set",        handleWifiSet);
  route("/api/wifi/reconnect",  handleWifiReconnect);
  route("/api/wifi/scan",       handleWifiScan);
  route("/api/ota/url",         handleOtaUrl);
  server.on("/api/ota", HTTP_POST, handleOtaDone, handleOtaUpload);
  server.on("/api/ota", HTTP_OPTIONS, []() { setCORS(); server.send(204); });
  server.onNotFound([]() {
    setCORS();
    if (server.method() == HTTP_OPTIONS) server.send(204);
    else server.send(404, "application/json", "{\"ok\":false,\"error\":\"not found\"}");
  });
  server.begin();
  lg("HTTP server up — http://%s.local/ (UI) and /api/*", cfg.host);
  // Front and centre in the log, because this is the only post-mortem available on a board
  // with no USB access.
  lg("last reset: %s", resetWhy.c_str());
  if (prevCrumb.length())
    lg("BEFORE THAT RESET the firmware was in: \"%s\" (at %lu ms uptime)",
       prevCrumb.c_str(), (unsigned long)prevCrumbMs);
  else
    lg("no breadcrumb from the previous boot (clean power-on, or it died before one was set)");

  delay(3000);                         // let the servo bus settle after power-up
  flushBus();
  // Boot LIMP, deliberately. This used to call homeAll(), which energised every servo and
  // drove it to 180 the instant the board powered up — a moving arm nobody asked for, before
  // the operator had even opened the page. Now the board comes up torque-off and only READS,
  // so the UI shows the true pose and the arm can be positioned by hand. Torque is an
  // explicit button press, and homing is a separate one.
  torqueOffAll();
  seedTargetsFromHardware();
  tuneAllServos();          // writes only what differs, so this is a no-op after the first boot

  // If manual homes have been saved, the operator has already said where this arm should
  // rest, so go there on power-up. With none saved we stay limp rather than inventing a
  // destination — driving to a hardcoded 180 that nobody chose is the behaviour that used
  // to make the arm lunge at boot.
  if (homes.n > 0) {
    lg("boot: moving to saved manual home (%u joint(s) have one)", homes.n);
    homeAll(true);
  } else {
    lg("boot: no manual home saved — staying limp. Pose the arm and press 'Set current as home'.");
  }
  lg("boot complete — %s, %u servo(s) configured",
     homes.n > 0 ? "moved to manual home" : "torque OFF", nServos);
}

void loop() {
  server.handleClient();
  ArduinoOTA.handle();
  wifiTick();
  if (mdnsOk) { /* ESPmDNS services itself in the background */ }
  delay(1);

  if (otaBusy) return;                 // never touch the servo bus mid-flash

  animTick();                          // the board owns sequence timing, not the browser

  if (sc.active) { scanStep(); return; }   // scan owns the bus until it finishes

  if (millis() - lastFast >= FAST_MS) {
    lastFast = millis();
    refreshAllFastSync();
    server.handleClient();
  }

  if (nServos && millis() - lastSlow >= SLOW_MS) {
    lastSlow = millis();
    refreshSlow(servos[slowIdx]);
    slowIdx = (uint8_t)((slowIdx + 1) % nServos);
    server.handleClient();
  }

  for (uint8_t i = 0; i < MAG_COUNT; i++) {
    if (magnets[i].pct > cfg.magSafeHold && (millis() - magnets[i].lastCmdMs) > MAG_GRAB_MAX_MS) {
      lg("magnet %u tapered to safe hold %u%% (master went quiet)", i, cfg.magSafeHold);
      setMagnet(i, cfg.magSafeHold);
    }
  }

}
