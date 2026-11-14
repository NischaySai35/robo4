/*
   ROBO4 — per-MODULE firmware v2 (ESP32-C3 + up to 12 × ST3215 servos; locks are mechanical)

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

   Existing endpoints (/api/telemetry, /api/command, /api/batch, /) keep the
   exact same shapes the React app already consumes — telemetry only gains extra fields.

   Servo bus: GPIO5 half-duplex UART (UART_MODE_RS485_HALF_DUPLEX — required for correct reads)
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <esp_wifi.h>
#include <esp_netif.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <Update.h>
#include <HTTPUpdate.h>
#include "guard.h"          // overload guard (layer 1), see the Overload guard section
#include "sync.h"           // synchronised motion: every joint at the same share of its path (Sync motion)
#include "groupsync.h"      // several modules play one animation in step (GO / where I am / STOP over ESP-NOW)
#include <esp_now.h>
#include "r4now.h"          // ESP-NOW frame format, shared with the USB dongle (firmware/libraries/R4Now)
#include <Preferences.h>
#include <Wire.h>           // the optional IMU (I2C, Status lights + IMU section)
#include <SCServo.h>
#include <esp_system.h>
#include <esp_sleep.h>         // Battery guard: the final sleep
#include <mbedtls/base64.h>    // firmware pieces over ESP-NOW arrive as base64
#include <driver/gpio.h>
#include <hal/gpio_ll.h>
#include <soc/gpio_struct.h>
#include <math.h>
#include <stdarg.h>
#include "types.h"
#include "webui.h"
String imuName = "none";    // the IMU found at boot (imuDetect, Status lights + IMU section). Below the includes on
                            // purpose: Arduino puts its function prototypes before the first line of code.

#ifndef UART_MODE_RS485_HALF_DUPLEX
#define UART_MODE_RS485_HALF_DUPLEX 4
#endif

// Defined further down with the sequence player; estopAll() needs it before then.
void animStop();
// Peaks while a sequence plays (Nischay 7 Nov: "when an animation completes, log the top 2 servos by current and load").
// Filled from the guard task's regular reads (no extra bus traffic), reset at Play, reported at "anim finished".
uint16_t animPeakmA[MAX_SERVOS], animPeakLoad[MAX_SERVOS];

#define FW_VERSION "0.1.0"

// ── Factory defaults (only used the very first boot; after that NVS wins) ─────
#define DEF_SSID  "GNXS-2.4G-6809B0"
#define DEF_PASS  "B43D086809B0"
#define DEF_HOST  "mod1"

#define AP_PASS   "robo4robo4"   // SoftAP fallback password
#define OTA_PASS  "robo4ota"     // ArduinoOTA / espota password
#define OTA_PORT  3232           // ArduinoOTA UDP port (Arduino IDE network port)

// ── Hardware ─────────────────────────────────────────────────────────────────
#define SERVO_PIN   5

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
  cfg.reserved0 = 0;
}

// ── Module layout (rebuilt hardware) ─────────────────────────────────────────
// 7 DOF + a servo lock at each end = 9 × ST3215 on one bus, symmetric end to end:
//   LOCK1, T1, B1, B2, T2, B3, B4, T3, LOCK2   (T = twist, B = bend), ids 1..9 in that order.
// Bump LAYOUT_REV whenever the physical module changes again: on the next boot (OTA included)
// the servo table is rewritten once and stale manual homes are dropped, while Wi-Fi, host
// and baud in NVS are kept. After that, edits made in the web UI stick as usual.
#define LAYOUT_REV 2
static const char* const LAYOUT_LABELS[] =
  { "LOCK1", "T1 twist", "B1 bend", "B2 bend", "T2 twist", "B3 bend", "B4 bend", "T3 twist", "LOCK2" };
constexpr uint8_t LAYOUT_N = sizeof(LAYOUT_LABELS) / sizeof(LAYOUT_LABELS[0]);

// The module's STRAIGHT pose, per servo, in degrees x10 (ids 1..9, same order as the labels).
// Set by hand on 2026-10-25: the horns are not mounted exactly square, so "all 180" is NOT
// straight and these small offsets are what make the module straight. This is the default
// manual home. A home saved from the web UI (NVS) still wins; this is what a servo falls back
// to when it has none (fresh board, layout change, /api/home/set?clear=1), so the straight
// pose is never lost and never silently becomes 180.
//   LOCK1 176.8 | T1 181.4 | B1 167.9 | B2 179.9 | T2 185.1 | B3 179.7 | B4 176.9 | T3 179.3 | LOCK2 184.1
// mod1's straight pose used to be compiled here (LAYOUT_HOME_DEG10) and applied to EVERY module; each board now keeps
// its own homes in flash (Set current angles as home). mod1's: firmware/backups/mod1-homes-2026-11-04.json

void cfgApplyLayout() {
  // The physical module is confirmed to use 1 Mbaud. An earlier false-positive scan
  // could persist 500 kbaud; reset that stale bus setting with this layout migration.
  cfg.baud = 1000000;
  cfg.servoCount = LAYOUT_N;
  for (uint8_t i = 0; i < MAX_SERVOS; i++) {
    cfg.ids[i] = 0; cfg.labels[i][0] = 0; cfg.minDeg[i] = 0; cfg.maxDeg[i] = 360;
  }
  for (uint8_t i = 0; i < LAYOUT_N; i++) {
    cfg.ids[i] = i + 1;
    strlcpy(cfg.labels[i], LAYOUT_LABELS[i], sizeof(cfg.labels[i]));
  }
}

extern uint8_t speedCapPct;
void cfgLoad() {
  prefs.begin("robo4", false);
  speedCapPct = constrain((int)prefs.getUChar("spdCap", 30), 5, 100);
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

// The servo supply over the last second, for the post-mortem: lowest voltage and highest total current. A brownout
// right after a current spike says "a motor pulled the supply down" (Nischay, 5 Nov 2026).
RTC_NOINIT_ATTR static uint32_t pwMagic;
RTC_NOINIT_ATTR static uint16_t pwVmin10, pwPeakmA;   // this second so far
RTC_NOINIT_ATTR static uint16_t pwLastVmin10, pwLastPeakmA;   // the whole previous second
RTC_NOINIT_ATTR static uint32_t pwWinMs;
uint16_t prevVmin10 = 0, prevPeakmA = 0; bool prevPower = false;
void powerNote(uint16_t v10, uint16_t mA, uint32_t now) {
  if (pwMagic != BC_MAGIC || now - pwWinMs > 1000) {
    if (pwMagic == BC_MAGIC) { pwLastVmin10 = pwVmin10; pwLastPeakmA = pwPeakmA; } else { pwLastVmin10 = v10; pwLastPeakmA = mA; }
    pwVmin10 = 999; pwPeakmA = 0; pwWinMs = now; pwMagic = BC_MAGIC;
  }
  if (v10 && v10 < pwVmin10) pwVmin10 = v10;
  if (mA > pwPeakmA) pwPeakmA = mA;
}

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
  if (pwMagic == BC_MAGIC) {   // the worse of this second and the one before
    prevVmin10 = pwVmin10 < pwLastVmin10 ? pwVmin10 : pwLastVmin10; prevPeakmA = pwPeakmA > pwLastPeakmA ? pwPeakmA : pwLastPeakmA;
    prevPower = prevVmin10 > 0 && prevVmin10 < 999;
  }
  pwMagic = 0;
}

// ── Log ring (readable over Wi-Fi at /api/log) ───────────────────────────────
#define LOG_LINES 70
String  logBuf[LOG_LINES];
uint8_t logHead = 0, logCount = 0;

SemaphoreHandle_t lgMx = nullptr;   // lg() is called from loop() and from the guard task
void logStore(const char* b, TickType_t wait);
void lg(const char* fmt, ...) {
  char b[180];
  va_list ap; va_start(ap, fmt);
  vsnprintf(b, sizeof(b), fmt, ap);
  va_end(ap);
  logStore(b, portMAX_DELAY);
}
// lg() + the same line to the master at once (r4now NOTE), so the laptop hears what happened without reading /api/log
// (GOS: /modules/events). For moments that matter: animation finished, hold, E-STOP, battery.
void nowNote(const char* text);
void note(const char* fmt, ...) {
  char b[180];
  va_list ap; va_start(ap, fmt);
  vsnprintf(b, sizeof(b), fmt, ap);
  va_end(ap);
  logStore(b, portMAX_DELAY);
  nowNote(b);
}
// The Wi-Fi chip's own messages (ESP-IDF log, errors only in this build) into the same log, so /api/log shows why the
// radio did something (5 Nov 2026: the laptop kicks the board every 120.6 s and the board gives no reason). Called on
// the Wi-Fi task: it never waits for the log lock, a line is dropped instead.
vprintf_like_t idfPrevLog = nullptr;
int idfToLog(const char* fmt, va_list ap) {
  char b[180]; va_list c; va_copy(c, ap); int n = vsnprintf(b, sizeof(b), fmt, c); va_end(c);
  size_t k = strlen(b); while (k && (b[k - 1] == 10 || b[k - 1] == 13)) b[--k] = 0;
  if (k) logStore(b, 0);
  return n;
}
void logStore(const char* b, TickType_t wait) {
  if (lgMx && xSemaphoreTake(lgMx, wait) != pdTRUE) return;
  Serial.println(b);
  char stamp[16];
  snprintf(stamp, sizeof(stamp), "[%7lu] ", millis());
  logBuf[logHead] = String(stamp) + b;
  logHead = (logHead + 1) % LOG_LINES;
  if (logCount < LOG_LINES) logCount++;
  if (lgMx) xSemaphoreGive(lgMx);
}

// ── Servos ───────────────────────────────────────────────────────────────────
SafeSMS   st;   // SMS_STS with bounded, yielding bus reads — see types.h
WebServer server(80);

// Where a handler's arguments come from: the web request, or a request that came over ESP-NOW (section ESP-NOW link).
// Every handler reads rq.arg()/rq.hasArg(), so both paths run the same code. A radio request is "path?a=1&b=2", and
// its optional body (after a newline) is the "plain" argument, as WebServer gives a POST body.
struct ReqArgs {
  static const uint8_t MAX = 24;
  bool radio = false;
  uint8_t n = 0;
  String key[MAX], val[MAX];
  void fromRadio(const String& query, const String* body) {
    radio = true; n = 0;
    int at = 0;
    while (at < (int)query.length() && n < MAX) {
      int amp = query.indexOf('&', at); if (amp < 0) amp = query.length();
      int eq = query.indexOf('=', at);
      if (eq < 0 || eq > amp) { key[n] = urlDecode(query.substring(at, amp)); val[n] = ""; }
      else { key[n] = urlDecode(query.substring(at, eq)); val[n] = urlDecode(query.substring(eq + 1, amp)); }
      if (key[n].length()) n++;
      at = amp + 1;
    }
    if (body && n < MAX) { key[n] = "plain"; val[n] = *body; n++; }
  }
  void fromWeb() { radio = false; n = 0; for (uint8_t i = 0; i < MAX; i++) { key[i] = String(); val[i] = String(); } }
  bool hasArg(const char* k) const {
    if (!radio) return server.hasArg(k);
    for (uint8_t i = 0; i < n; i++) if (key[i] == k) return true;
    return false;
  }
  String arg(const char* k) const {
    if (!radio) return server.arg(k);
    for (uint8_t i = 0; i < n; i++) if (key[i] == k) return val[i];
    return String();
  }
  bool hasArg(const String& k) const { return hasArg(k.c_str()); }
  String arg(const String& k) const { return arg(k.c_str()); }
  static String urlDecode(const String& s) {
    String o; o.reserve(s.length());
    for (int i = 0; i < (int)s.length(); i++) {
      char c = s[i];
      if (c == '+') o += ' ';
      else if (c == '%' && i + 2 < (int)s.length()) { o += (char)strtol(s.substring(i + 1, i + 3).c_str(), nullptr, 16); i += 2; }
      else o += c;
    }
    return o;
  }
} rq;

ServoState servos[MAX_SERVOS];
uint8_t    nServos = 0;

constexpr uint16_t FAST_MS         = 30;    // the guard's reaction depends on this; one bus read of all 9 takes ~3 ms
constexpr uint16_t SLOW_MS         = 25;    // one servo per tick: each one every 9 x 25 = ~225ms
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
// the servo's own protection (EPROM): checked against mod1's servos and the STS memory table, 4 Nov 2026
constexpr uint8_t  REG_MAX_TORQUE = 16, REG_PROT_SWITCH = 19, REG_PROT_CURRENT = 28, REG_PROT_TORQUE = 34,
                   REG_PROT_TIME = 35, REG_OVERLOAD_PCT = 36, REG_OVERCUR_TIME = 38;

constexpr uint8_t  POS_ACC_DEFAULT = 40;

unsigned long lastFast = 0, lastSlow = 0;
uint8_t       slowIdx = 0;
bool          otaBusy = false;      // pause the servo bus while flashing
bool          radioAwake = false;   // radio fully awake now, not napping (radioTick)
// After every power-on the board refuses moves sent from a laptop (/api/batch): a program that was streaming before a
// power cut must not drive the robot the moment it comes back. Only an operator action unlocks it: Turn torque ON, Go to
// manual home, a servo's own buttons, or playing a sequence (Nischay, 4 Nov 2026).
bool          motionLocked = true;
// Last time anything was commanded to move. The radio stays fully awake only while the robot moves (and 2 s after),
// so moving is responsive and standing still is cool (Nischay, 4 Nov 2026: heat).
uint32_t      lastMotionMs = 0;
// The servo bus has two users: the guard task (every FAST_MS: read all, guard, live stream) and the web handlers /
// sequence / scan in loop(). One recursive lock keeps them from talking on the wire at once. Web replies are sent AFTER
// it is released (route()), because a reply over a sleepy Wi-Fi link took 0.5-0.7 s and froze everything (4 Nov 2026).
SemaphoreHandle_t busMx = nullptr;
struct BusLock {
  BusLock()  { if (busMx) xSemaphoreTakeRecursive(busMx, portMAX_DELAY); }
  ~BusLock() { if (busMx) xSemaphoreGiveRecursive(busMx); }
};
uint32_t guardGapMs = 0, guardGapPrev = 0, guardWinAt = 0;   // longest time between two guard passes (5 s windows)
uint32_t guardPassMs = 0, guardPassPrev = 0;                // longest pass itself (read + guard + live)
uint32_t guardWaitMs = 0, guardWaitPrev = 0;                // longest wait for the bus lock
// ESP.getSketchSize() / getFreeSketchSpace() read the flash: ~200 ms, inside every telemetry reply, holding the bus lock
// and so the guard (measured on mod1, 5 Nov). They cannot change while running: read once at boot.
uint32_t sketchSizeBoot = 0, otaSpaceBoot = 0;
uint16_t guardEveryMs = FAST_MS;   // the guard task's period; /api/guard/set?everyMs= (0 = paused, for tests)
uint32_t servoMisses = 0;                                   // servo replies missed in the fast read, since boot
constexpr uint16_t AWAKE_AFTER_MOVE_MS = 2000;

// ── Overload guard (guard.h; Nischay, 4 Nov 2026) ─────────────────────────────
// Layer 1, here: every fresh read (FAST_MS) each joint's load / current / temperature goes through its Guard: stop at a
// hit, step back to the last easy point, hold at reduced strength, give way slowly under a load it cannot hold, never
// limp, refuse moves further into the hit. Layer 2, inside each servo (tuneServoHolding): its own overload and current
// protection set just above these, as a backup if this board stops reacting. Always: a strength ceiling per joint.
struct GuardSettings { uint16_t ver; GuardCfg bend, lock; };
constexpr uint16_t GUARD_VER = 1;
//                        trip  mA  calm ms  ceil hold back yield dn up clear calmMs hotMs warm hot cool
// 5 Nov 2026 (Nischay): bend joints raised to 85 % (was trip 75 %, ceiling 80 %, 1300 mA): B1 needed 80 % / 1.5 A for
// ordinary poses and the guard stopped the animation; 1700 mA ~ 85 % load on B1 plus a margin.
// 7 Nov 2026 (Nischay): bend/twist the SAME as the locks: trip 88 % / 1900 mA, full strength (was 85 % / 1700 mA, ceiling 85 %).
const GuardCfg GUARD_BEND = {880, 1900, 500, 100, 1000, 300, 34, 114, 10, 15, 1000, 500, 2000, 60, 70, 62};
const GuardCfg GUARD_LOCK = {880, 1900, 500, 100, 1000, 300, 34, 114, 10, 15, 1000, 500, 2000, 60, 70, 62};
GuardSettings guardSet = {GUARD_VER, GUARD_BEND, GUARD_LOCK};
Guard guards[MAX_SERVOS];
char  guardMsg[96] = "";             // the last thing the guard did, for the page / GOS / Studio
bool  animPausedByGuard = false;
bool isLockSlot(uint8_t i);
const GuardCfg& guardCfgFor(uint8_t i);
bool guardAllows(uint8_t i, uint16_t raw);

// Bounded: "drain until empty" never empties on a floating half-duplex line, which is
// the same trap that hung the board during a bus scan (see SafeSMS in types.h).
static inline void flushBus() {
  const unsigned long start = millis();
  while (Serial1.available()) { Serial1.read(); if (millis() - start > 20) break; }
}
static inline float clampF(float v, float lo, float hi) { return v < lo ? lo : v > hi ? hi : v; }
static inline uint16_t angleToRaw(float d) { d = clampF(d, 0, 360); return (uint16_t)lroundf((d / 360.0f) * 4095.0f); }
static inline float rawToAngle(uint16_t r) { return (r / 4095.0f) * 360.0f; }

/* TWO ANGLE SCALES, and the firmware is the only place that knows both.
 *
 *   NOMINAL     what everything above the board speaks: the Studio, the sim, the planner, the
 *               brain, animation frames, the web UI. 180 means "this joint is straight", +x means
 *               x degrees one way from straight. They never need to know about horn error.
 *   MECHANICAL  the angle the servo itself reports and is commanded in (0..360 on the horn).
 *
 * The horns are not mounted exactly square, so a straight module is NOT all-180 mechanically; the
 * hand-set straight pose (the manual home, homeFor()) is. The difference per joint is its offset:
 *
 *      mechanical = nominal + (home - 180)          nominal = mechanical - (home - 180)
 *
 * e.g. a joint whose straight pose is 183 mechanically gets +3: told "120" it goes to 123, and when
 * it reads 123 it reports 120. Commands are converted on the way in, readings on the way out.
 * Raw servo-register tools, the identify wiggle, the home table itself and the angle limits
 * written to the servo stay mechanical.
 */
float homeFor(uint8_t id);
float builtinHomeFor(uint8_t id);
/* The offset comes from this board's SAVED home (Set current angles as home, /api/home/set), which
   lives in flash and survives OTA updates; only a joint with no saved home falls back to the BUILT-IN
   straight pose (180, no correction). Until 4 Nov 2026 it always used a compiled pose, so saving a new
   home changed nothing and every module flashed with mod1's .bin got mod1's horn offsets. */
static inline float offsetFor(uint8_t id) { return homeFor(id) - 180.0f; }
static inline uint16_t nomToRaw(uint8_t id, float nominal) { return angleToRaw(nominal + offsetFor(id)); }
static inline float rawToNom(uint8_t id, uint16_t raw) { return rawToAngle(raw) - offsetFor(id); }
static inline uint16_t speedScaleToRaw(int s) {
  s = constrain(s, 1, 10);
  return (uint16_t)lroundf(340.0f + ((s - 1) / 9.0f) * (3400.0f - 340.0f));
}
static inline int slotOf(uint8_t id) {
  for (uint8_t i = 0; i < nServos; i++) if (servos[i].id == id) return i;
  return -1;
}
static inline ServoState* byId(uint8_t id) { int s = slotOf(id); return s < 0 ? nullptr : &servos[s]; }

/* Travel by joint TYPE, in nominal degrees (180 = this joint's manual home), so the limits move with the home by themselves
   (Nischay 12 Nov 2026: bends slid 0..360 on the page and nothing - page, board or servo - stopped a bend past 90):
   bend B1..B4 = home +-90, lock = home +-50 (lock/unlock is +-45), twist = home +-180 (a full turn, no limit). */
#define BEND_TRAVEL 90.0f
#define LOCK_TRAVEL 50.0f
bool isBendSlot(uint8_t i) { return cfg.labels[i][0] == 'B' && cfg.labels[i][1] >= '0' && cfg.labels[i][1] <= '9'; }
void typeLimits(uint8_t slot, float& lo, float& hi) {
  float t = isBendSlot(slot) ? BEND_TRAVEL : strncmp(cfg.labels[slot], "LOCK", 4) == 0 ? LOCK_TRAVEL : 180.0f;
  lo = 180.0f - t; hi = 180.0f + t;
}
void limitsFor(uint8_t slot, float& lo, float& hi) {
  lo = cfg.minDeg[slot]; hi = cfg.maxDeg[slot];
  if (hi <= lo) { lo = 0; hi = 360; }
  float tlo, thi; typeLimits(slot, tlo, thi);        // the Config tab can only narrow a joint further, never widen it
  if (tlo > lo) lo = tlo;
  if (thi < hi) hi = thi;
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
  // The pin is driven only while transmitting and released while servos reply — see
  // SafeSMS::txDrive in types.h for why neither fixed mode works on this one-wire bus.
  // The weak internal pull-up just keeps an idle, released line from floating.
  st.pin = SERVO_PIN;
  gpio_pullup_en((gpio_num_t)SERVO_PIN);
  st.txDrive(false);
  Serial1.setRxBufferSize(512);
  st.pSerial = &Serial1;
  curBaud = baud;
  st.baud = baud;
  flushBus();

}

// Rebuild the runtime servo table from cfg (called at boot and after a config save)
void applyServoConfig() {
  nServos = min(cfg.servoCount, (uint8_t)MAX_SERVOS);
  for (uint8_t i = 0; i < nServos; i++) {
    ServoState& s = servos[i];
    s.id = cfg.ids[i];
    s.hwMode = 255; s.torqueOn = false; s.mode = POS_MODE;
    s.targetDeg = 180.0f; s.targetRaw = nomToRaw(s.id, 180.0f);
    s.speedScale = 10; s.speedRaw = speedScaleToRaw(10); s.acc = POS_ACC_DEFAULT;
    s.rawPos = s.rawSpeed = s.rawLoad = s.rawLoadAbs = -1;
    s.rawCurrent = s.rawVoltage = s.rawTemp = -1;
    s.moving = false; s.lastCommandMs = 0; s.seenMs = 0;
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

// ── Speed cap (13 Nov 2026, Nischay: "no servo, whatever it is, may go above 30 % speed - default, I change it in the Studio's
// ESP-TTL top line") ── EVERY position command of this board goes through posEx / syncPosEx below, so sliders, animations,
// the laptop's Sync stream, home, locks and the guard's retreat are all capped. 100 % = 3400 steps/s (~300 deg/s). Speed 0
// means "as fast as it can" to the servo, so 0 is capped too. Saved on the board (prefs "spdCap"); /api/speedcap?pct=.
uint8_t speedCapPct = 30;
void lockSettleCancel(int slot);
static inline uint16_t capRaw() { return (uint16_t)max(60, 3400 * (int)speedCapPct / 100); }
static inline uint16_t capSpd(uint16_t v) { const uint16_t c = capRaw(); return (v == 0 || v > c) ? c : v; }
int posEx(uint8_t id, int pos, uint16_t spd, uint8_t acc) { return st.WritePosEx(id, (s16)pos, capSpd(spd), acc); }
int syncPosEx(uint8_t* ids, uint8_t n, int16_t* pos, uint16_t* spd, uint8_t* acc) {
  uint16_t c[MAX_SERVOS];
  for (uint8_t i = 0; i < n && i < MAX_SERVOS; i++) c[i] = capSpd(spd[i]);
  st.SyncWritePosEx(ids, n, pos, c, acc); return 1;
}

void cmdPos(ServoState& sv, float deg, int speedScale, uint8_t acc) {
  lockSettleCancel(slotOf(sv.id));   // a new command for a lock replaces its overshoot-and-return
  lastMotionMs = millis();
  int slot = slotOf(sv.id); if (slot < 0) return;
  float lo, hi; limitsFor((uint8_t)slot, lo, hi);
  sv.mode = POS_MODE;
  setHwMode(sv, POS_MODE);
  ensureTorque(sv);
  if (!guardAllows((uint8_t)slot, nomToRaw(sv.id, clampF(deg, lo, hi)))) return;
  sv.targetDeg  = clampF(deg, lo, hi);
  sv.targetRaw  = nomToRaw(sv.id, sv.targetDeg);
  sv.speedScale = constrain(speedScale, 1, 10);
  sv.speedRaw   = speedScaleToRaw(sv.speedScale);
  sv.acc        = (uint8_t)constrain((int)acc, 1, 100);
  sv.lastCommandMs = millis();
  posEx(sv.id, sv.targetRaw, sv.speedRaw, sv.acc);
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
  if (sv.rawPos >= 0) { sv.targetRaw = (uint16_t)sv.rawPos; sv.targetDeg = rawToNom(sv.id, (uint16_t)sv.rawPos); }
}
void cmdTorqueToggle(ServoState& sv) {
  if (sv.torqueOn) { st.EnableTorque(sv.id, 0); delay(2); sv.torqueOn = false; sv.moving = false; }
  else             { st.EnableTorque(sv.id, 1); delay(2); sv.torqueOn = true; }
}
volatile uint32_t ledEstopUntil = 0;   // red light steady until then (Status lights)
void grpDisarm();
void estopAll() {
  animStop();                          // an E-STOP that leaves a sequence running is not a stop
  grpDisarm(); ledEstopUntil = millis() + 3000;
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

/* Same, for a 16-bit EPROM register (the angle limits). */
bool tuneWordIfDiff(uint8_t id, uint8_t addr, uint16_t want, const char* name) {
  int have = st.readWord(id, addr);
  if (have < 0) { lg("  id%u %s: read failed", id, name); return false; }
  if ((uint16_t)have == want) return false;
  st.writeWord(id, addr, want);
  delay(12);
  lg("  id%u %s: %d -> %u", id, name, have, want);
  return true;
}

/* The limits stored INSIDE the servo (raw 0..4095): the joint's travel about its manual home plus SERVO_LIMIT_MARGIN, so the
   board's own clamp always acts first and the servo only catches what the board gets wrong. A full-turn joint (twist), a
   joint with no slot, or a range that would cross the 0/4095 seam keeps 0..4095 (single turn, never 0/0 = multi-turn). */
#define SERVO_LIMIT_MARGIN 5.0f
void servoAngleLimits(uint8_t id, uint16_t& rlo, uint16_t& rhi) {
  rlo = 0; rhi = 4095;
  int slot = slotOf(id); if (slot < 0) return;
  float lo, hi; typeLimits((uint8_t)slot, lo, hi);
  if (hi - lo >= 359.0f) return;
  float a = lo - SERVO_LIMIT_MARGIN + offsetFor(id), b = hi + SERVO_LIMIT_MARGIN + offsetFor(id);   // real servo degrees
  if (a < 1.0f || b > 359.0f || b <= a) { lg("  id%u: travel %.0f..%.0f crosses the servo's 0/360 seam - servo limits left open", id, a, b); return; }
  rlo = angleToRaw(a); rhi = angleToRaw(b);
}
/* After a new manual home: move the servo's own limits with it (EPROM, written only if different). */
void tuneAngleLimits(ServoState& sv) {
  if (st.Ping(sv.id) != sv.id) return;
  uint16_t rlo, rhi; servoAngleLimits(sv.id, rlo, rhi);
  st.unLockEprom(sv.id); delay(10);
  tuneWordIfDiff(sv.id, REG_MIN_ANGLE, rlo, "min angle limit");
  tuneWordIfDiff(sv.id, REG_MAX_ANGLE, rhi, "max angle limit");
  st.LockEprom(sv.id); delay(10);
}

/* Make a servo hold its position stiffly. Deadband/gains live in EPROM (needs unlock);
   the torque limit is a RAM register and is written every time, since it costs nothing. */
bool tuneServoHolding(ServoState& sv) {
  // Not there (unplugged, wrong id, no servos fitted yet): skip it. Without this check each of the ~14 reads below waits
  // for its timeout, and a board with no servos took ~3.5 min to boot (mod2, 11 Nov 2026).
  if (st.Ping(sv.id) != sv.id) { delay(5); if (st.Ping(sv.id) != sv.id) { lg("  id%u: no answer - not tuned", sv.id); return false; } }
  st.unLockEprom(sv.id); delay(10);
  bool changed = false;
  changed |= tuneByteIfDiff(sv.id, REG_CW_DEAD,  deadbandUnits, "cw deadband");
  changed |= tuneByteIfDiff(sv.id, REG_CCW_DEAD, deadbandUnits, "ccw deadband");
  changed |= tuneByteIfDiff(sv.id, REG_KP, TUNE_KP, "Kp");
  changed |= tuneByteIfDiff(sv.id, REG_KD, TUNE_KD, "Kd");
  changed |= tuneByteIfDiff(sv.id, REG_KI, TUNE_KI, "Ki");
  /* SINGLE-TURN position servo: angle limits 0 .. 4095. These servos' limits default to
     whatever they were last set to, and 0/0 puts an STS servo in its multi-turn position mode,
     where "go to 180" from 238 can be done the long way round (down through -360) because the
     goal is taken on an unwrapped scale. Every joint on this module is a single-turn position
     joint (twists +-180 about the 180 home, bends +-95), so pin the range to one turn and the
     servo always takes the direct path. Written only if different, like the rest. */
  { uint16_t rlo, rhi; servoAngleLimits(sv.id, rlo, rhi);     // 12 Nov: the joint's own travel + 5 deg, inside the servo too
    changed |= tuneWordIfDiff(sv.id, REG_MIN_ANGLE, rlo, "min angle limit");
    changed |= tuneWordIfDiff(sv.id, REG_MAX_ANGLE, rhi, "max angle limit"); }
  // Layer 2, the servo's own protection, a little above the board's guard so the board always acts first; this only
  // catches what the board misses (if it ever stops reacting). Factory: 80 % for 2 s, about 2000 mA for 2 s.
  int slot = slotOf(sv.id);
  bool lock = slot >= 0 && isLockSlot((uint8_t)slot);
  const GuardCfg& gc = slot >= 0 ? guardCfgFor((uint8_t)slot) : guardSet.bend;
  changed |= tuneByteIfDiff(sv.id, REG_PROT_SWITCH, 0x2D, "protections on (voltage, heat, current, overload)");
  // Backup for the board's guard: never ABOVE the strength ceiling (it could never fire) and never sooner than the board.
  // 7 Nov 2026: bend/twist were left at 78 % after the board went to 85 % (5 Nov), so the servo cut in BEFORE the board's
  // gentle step-back. Now = the ceiling (85 %) but 0.3 s instead of the board's 0.1 s: the board always acts first.
  changed |= tuneByteIfDiff(sv.id, REG_OVERLOAD_PCT, 92, "overload torque %");   // every joint as the locks (7 Nov)
  changed |= tuneByteIfDiff(sv.id, REG_PROT_TIME, 30, "overload time x10ms");
  changed |= tuneByteIfDiff(sv.id, REG_PROT_TORQUE, 30, "torque after protection %");
  changed |= tuneWordIfDiff(sv.id, REG_PROT_CURRENT, (uint16_t)(2200 / 6.5f), "protection current x6.5mA");
  changed |= tuneByteIfDiff(sv.id, REG_OVERCUR_TIME, 30, "overcurrent time x10ms");
  changed |= tuneWordIfDiff(sv.id, REG_MAX_TORQUE, gc.ceiling, "max torque (power-on ceiling)");
  st.LockEprom(sv.id); delay(10);
  st.writeWord(sv.id, REG_TORQUE_LIMIT, gc.ceiling);   // the strength ceiling, now
  delay(6);
  if (!changed) lg("  id%u already tuned", sv.id);
  return true;
}

uint8_t servosAnswering = 0;   // how many servos answered at boot (tuneAllServos)

void tuneAllServos() {
  lg("tuning hold stiffness (deadband %u units = +/-%s deg, Kp %u, Kd %u, Ki %u, torque %u)",
     deadbandUnits, String(deadbandUnits * DEG_PER_UNIT, 2).c_str(),
     TUNE_KP, TUNE_KD, TUNE_KI, TUNE_TORQUE_MAX);
  servosAnswering = 0;
  for (uint8_t i = 0; i < nServos; i++) { bc("tune id=%u", servos[i].id); if (tuneServoHolding(servos[i])) servosAnswering++; yield(); }
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
    sv.targetDeg  = rawToNom(sv.id, (uint16_t)pos);
    posEx(sv.id, (int16_t)pos, speedScaleToRaw(10), POS_ACC_DEFAULT);
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
    sv.targetDeg = rawToNom(sv.id, (uint16_t)pos);
  }
  st.IOTimeOut = saved;
}

// ── Animation sequence ──────────────────────────────────────────────────────
// Uploaded whole, validated whole, then played from RAM by animTick(). A frame is a pose
// plus the time budget to reach it; "sine" spends that budget easing along a raised
// cosine instead of leaving the servo's own profile to do it.
AnimFrame anim[MAX_FRAMES];
uint8_t   animCount   = 0;
// TIMETABLE play (14 Nov 2026, Nischay: "send it the time frames, once both received them both start, no communication,
// keeps running even when the laptop disconnects; behind or not, it must not stop"). The laptop sends every frame's time
// (the longest any module needs, so all modules get the SAME table) with play?at=&times=. Then frame k starts at exactly
// start + sum(time + pause) of the frames before it, whatever the joints did: no waiting, no "behind" stops, no radio.
bool      animFixed = false;
uint16_t  animFixMs[MAX_FRAMES];
uint32_t  animFrameAt = 0;         // when the current frame started on the timetable
bool      animSine    = true;
bool      animLoop    = false;
bool      animPlaying = false;
bool      animInterrupted = false;   // power was lost while a sequence played (set at boot, cleared by the next play/stop)
uint8_t   animIdx     = 0;
uint32_t  animT0      = 0;         // when the current frame started

// Group play (groupsync.h, 9 Nov 2026): every module of a group got the same animation (its own joints) with the same
// group number; GO over the radio starts them together, and each one's place keeps the others in step.
#define GROUP_PLACE_MS  50        // say where we are this often while playing
#define GROUP_GO_REPEAT 3         // STOP said this many times, 15 ms apart (one may be lost)
// GO is a COUNTDOWN (11 Nov 2026, real test: mod2 missed all 3 GOs and started 0.1-0.6 s late over Wi-Fi). The lead
// says "start in N ms" every 15 ms for GROUP_GO_LEAD_MS; EVERY module (the lead too) starts at that instant, not when a
// message lands, so any one of ~13 messages getting through is enough and the starts agree to a few ms.
#define GROUP_GO_LEAD_MS 200
volatile uint32_t grpStartAt = 0;   // millis() of the agreed start (0 = none); grpStartTask starts it on time
uint8_t grpStartStep = 0;
#define GROUP_ARMED_MS  120000    // after an upload, listen for GO this long (radio kept awake)
Group    grp;
uint16_t grpStep = 0;              // which frame of which pass we play: counts up from the GO's frame
volatile float grpPeerS = 2;       // the slowest other module's clock, for syncTick (guard task); 2 = alone
uint32_t grpArmedUntil = 0, grpPlaceMs = 0, grpSayMs = 0;
uint8_t  grpSayLeft = 0, grpSayKind = 0;
bool     grpQuiet = false;         // animStop() because a peer said STOP: do not say STOP back
uint8_t myModule() { const char* h = cfg.host; while (*h && (*h < '0' || *h > '9')) h++; return (uint8_t)atoi(h); }   // mod3 -> 3
bool grpArmed() { return grp.on() && animCount && (int32_t)(grpArmedUntil - millis()) > 0; }
// E-STOP, HOLD, battery: this module ignores GO until the animation is uploaded again (Nischay 10 Nov: an E-STOPped
// module must not start because another module of its group was played)
void grpDisarm() { grpArmedUntil = 0; grpStartAt = 0; }
uint8_t  animEnd = 0;              // how the last play ended: 0 still / not yet, 1 finished, 2 stopped (laptop reads it)
uint32_t grpFaultUntil = 0;        // a group stop happened (partner missing / stopped): the red light blinks till then
bool     grpDupSaid = false;       // "another module has my number" said once

void grpSay(uint8_t kind);
void groupHalt(const char* fmt, ...);
uint8_t nowHold();
extern bool syncActive;
void animStop() {
  grpStartAt = 0;                                    // a countdown waiting to start is cancelled too
  if (animPlaying) note("anim stopped at frame %u - every joint holds where it is", animIdx + 1);
  // 13 Nov 2026: after a stop the joints kept going to their last goals (a stuck joint's goal far ahead) and crashed.
  // Now every joint freezes where it is (a joint the guard is handling keeps the guard's own target).
  if (animPlaying) { BusLock L; syncActive = false; nowHold(); }
  if (animPlaying) { prefs.putUChar("animRun", 0); animEnd = 2; }   // stopped (the laptop stops the others)
  animPlaying = false; animInterrupted = false;
  grp.stopPlay();
}

/*
  Motion: ONE command per joint per frame; the servo's own profile does the moving.

  Do not stream setpoints at the servo. Every new goal makes the ST3215 re-plan its move from
  scratch (accelerate, cruise, brake), so a 50 Hz stream is fifty start-stops a second: the
  joints squeak, fight and never settle. That was tried and it was bad.

  Instead each joint gets exactly one goal per frame with a speed and acceleration chosen so
  its trapezoid lasts the frame's time T:
      v = D / (T (1 - rf))       cruise velocity (steps/s)
      a = v / (rf T)             acceleration    (steps/s^2; servo ACC unit = 100)
  rf = the share of T spent speeding up (and again slowing down): 1/3 with Sine on (long, soft
  ease-in/out), 0.15 with it off.

  Speed 1..10 is the PEAK joint velocity, speed/10 x ANIM_VMAX (speed 4 = 72 deg/s), and the
  acceleration limit comes with it: reaching that peak takes at least ANIM_RAMP_S. The frame's
  T is the longest of the time you asked for (0 = auto) and what every joint needs under both
  limits, so all joints finish together and nothing is clipped.

  The frame ends when T has passed AND every joint has arrived (or a short timeout), then the
  hold pause runs.
*/
constexpr float    ANIM_VMAX        = 180.0f * 4096.0f / 360.0f;  // steps/s at speed 10
constexpr float    ANIM_RAMP_S      = 0.35f;     // seconds to reach peak speed at the accel limit
constexpr float    ANIM_RF_SINE     = 1.0f / 3.0f;
constexpr float    ANIM_RF_LINEAR   = 0.15f;
constexpr uint32_t ANIM_ARRIVE_TOL  = 12;        // steps (~1 deg) counts as arrived
constexpr uint32_t ANIM_ARRIVE_WAIT = 600;       // ms to wait past the plan before moving on anyway

// Sync motion (sync.h, 5 Nov 2026): instead of one goal per joint per frame, the guard task steers every joint along
// one shared progress clock each FAST_MS, so all joints start, move and finish together; the slowest (a loaded joint)
// slows everyone down. Off = the one-goal-per-frame player below. Remembered across reboots (/api/anim/sync?on=1).
//                            lagOk lagMax minRate leadS accRaw catchGain vMaxRaw vMinRaw stallS stallStep endWaitS tol minMove
// 13 Nov 2026 (Nischay: "if a joint is just slower, let it take more time - do not stop"): minRate 0 = the clock WAITS
// for a joint that is behind (the others hold at their place); stallS 6 s = stop only when it has not moved at all for 6 s.
const SyncCfg SYNC_CFG = {0.02f, 0.08f, 0.0f, 0.20f, 5000.0f, 4.0f, 2048.0f, 40.0f, 6.0f, 0.004f, 0.8f, 12, 23};
// The laptop pauses this module while ANOTHER module is behind (/api/anim/wait?on=1, re-sent every ~0.3 s; lapses by
// itself after 1.5 s so a lost laptop never leaves it paused).
uint32_t animWaitUntil = 0;
bool animWaitHeld() { return animWaitUntil && (int32_t)(animWaitUntil - millis()) > 0; }
SyncCfg syncCfgNow() { SyncCfg c = SYNC_CFG; if (c.vMaxRaw > capRaw()) c.vMaxRaw = capRaw(); return c; }   // + speed cap
const uint8_t SYNC_ACC = 50;       // servo ACC units (100 steps/s^2): = SYNC_CFG.accRaw
bool     animSync   = false;
bool     syncActive = false;
SyncMove syncMv;
int      syncSlot[MAX_SERVOS];
uint32_t syncLastMs = 0;

bool animSyncOn() { return !animFixed && (animSync || grp.on()); }   // timetable play: one command per frame, no shared clock   // a group always plays with Sync motion (the shared clock)

uint32_t animPlanMs    = 0;        // planned duration of the current frame
bool     animStretched = false;    // true when the limits made it longer than requested
bool     animArrived   = false;
uint32_t animArriveT   = 0;

void animSendFrame(uint8_t idx) {
  const AnimFrame& f = anim[idx];
  const float rf   = animSine ? ANIM_RF_SINE : ANIM_RF_LINEAR;
  const float vCap = min(max(1, (int)f.speed) / 10.0f * ANIM_VMAX, (float)capRaw());   // never above the speed cap
  const float aMax = vCap / ANIM_RAMP_S;

  int      slots[MAX_SERVOS];
  uint16_t want[MAX_SERVOS];
  float    D[MAX_SERVOS];
  float    deg[MAX_SERVOS];
  int32_t  curRaw[MAX_SERVOS];
  uint8_t  n = 0;
  float    Tmin = 0.0f;

  for (uint8_t i = 0; i < f.n && n < MAX_SERVOS; i++) {
    int slot = slotOf(f.ids[i]);
    if (slot < 0) continue;                       // not a servo on this board
    ServoState& sv = servos[slot];
    float lo, hi; limitsFor((uint8_t)slot, lo, hi);
    float wantDeg = clampF(f.deg10[i] / 10.0f, lo, hi);
    // Distance from where the joint actually is, not from where we last told it to be.
    int32_t cur = sv.rawPos >= 0 ? sv.rawPos : (int32_t)sv.targetRaw;
    if (!guardAllows((uint8_t)slot, nomToRaw(sv.id, wantDeg))) continue;   // that joint sits this frame out
    slots[n] = slot; deg[n] = wantDeg; want[n] = nomToRaw(sv.id, wantDeg); curRaw[n] = cur;
    D[n] = (float)labs((int32_t)want[n] - cur);
    if (D[n] >= 4.0f) {
      float Tv = D[n] / (vCap * (1.0f - rf));                     // speed limit
      float Ta = sqrtf(D[n] / (rf * (1.0f - rf) * aMax));         // acceleration limit
      Tmin = max(Tmin, max(Tv, Ta));
    }
    n++;
  }

  float Treq = f.timeMs / 1000.0f;                // 0 = auto
  float T = max(max(Treq, Tmin), 0.12f);
  animStretched = f.timeMs > 0 && Tmin > Treq + 0.02f;
  if (animFixed) { T = max(animFixMs[idx] / 1000.0f, 0.12f); animStretched = false; }   // the timetable decides
  animPlanMs = (uint32_t)lroundf(T * 1000.0f);

  uint8_t  ids[MAX_SERVOS]; int16_t pos[MAX_SERVOS];
  uint16_t spd[MAX_SERVOS]; uint8_t  acc[MAX_SERVOS];
  for (uint8_t k = 0; k < n; k++) {
    ServoState& sv = servos[slots[k]];
    uint16_t v; uint8_t a;
    if (D[k] < 4.0f) {                            // already there: a gentle, non-zero speed
      v = 60; a = 10;
    } else {
      float vf = D[k] / (T * (1.0f - rf));
      float af = vf / (rf * T);
      v = (uint16_t)constrain((int)lroundf(vf), 20, (int)vCap);
      a = (uint8_t)constrain((int)ceilf(af / 100.0f), 1, 150);   // round UP: too soft overruns
    }
    setHwMode(sv, POS_MODE);
    ensureTorque(sv);
    sv.mode = POS_MODE; sv.targetDeg = deg[k]; sv.targetRaw = want[k];
    sv.speedScale = f.speed; sv.speedRaw = v; sv.acc = a;
    sv.lastCommandMs = millis();
    ids[k] = sv.id; pos[k] = (int16_t)want[k]; spd[k] = v; acc[k] = a;
  }

  if (animSyncOn() && n > 0) {         // the guard task steers them from its next read (<= FAST_MS)
    int16_t from[MAX_SERVOS], to[MAX_SERVOS];
    for (uint8_t k = 0; k < n; k++) { syncSlot[k] = slots[k]; from[k] = (int16_t)curRaw[k]; to[k] = (int16_t)want[k]; }
    syncMv.begin(syncCfgNow(), n, from, to, T, animSine);
    syncLastMs = millis(); syncActive = true;
    return;
  }
  syncActive = false;
  if (n == 1)     { posEx(ids[0], pos[0], spd[0], acc[0]); delay(2); }
  else if (n > 1) { syncPosEx(ids, n, pos, spd, acc);      delay(2); }
}

// One Sync motion step, in the guard task right after it read every joint (bus held). A joint the guard is holding
// (it hit something) is left to the guard.
void syncTick() {
  if (!syncActive) return;
  if (!animPlaying) { syncActive = false; return; }
  uint32_t now = millis();
  float dt = (now - syncLastMs) / 1000.0f; syncLastMs = now;
  if (dt <= 0) return;
  if (dt > 0.2f) dt = 0.2f;                       // a late pass must not make the clock jump
  int pos[SYNC_MAX]; SyncOut out[SYNC_MAX];
  for (uint8_t k = 0; k < syncMv.n; k++) pos[k] = servos[syncSlot[k]].rawPos;
  syncMv.peerS = animWaitHeld() ? -1.0f : 2.0f;   // the laptop says another module is behind: this clock waits
  SyncState r = syncMv.step(syncCfgNow(), dt, pos, out);
  uint8_t ids[MAX_SERVOS]; int16_t gp[MAX_SERVOS]; uint16_t spd[MAX_SERVOS]; uint8_t acc[MAX_SERVOS]; uint8_t m = 0;
  for (uint8_t k = 0; k < syncMv.n; k++) {
    if (guards[syncSlot[k]].state != G_OK) continue;
    ids[m] = servos[syncSlot[k]].id; gp[m] = out[k].goal; spd[m] = out[k].speed ? out[k].speed : 1; acc[m] = SYNC_ACC; m++;
  }
  if (m == 1) posEx(ids[0], gp[0], spd[0], acc[0]);
  else if (m > 1) syncPosEx(ids, m, gp, spd, acc);
  { static uint32_t waitT0 = 0; static bool said = false;
    if (r == SY_RUN && syncMv.laggard >= 0 && syncMv.lag >= SYNC_CFG.lagMax) {
      if (!waitT0) waitT0 = now ? now : 1;
      if (!said && now - waitT0 > 1000) { said = true; lg("anim: %s is slower - waiting for it (not an error)", cfg.labels[syncSlot[syncMv.laggard]]); }
    } else { waitT0 = 0; said = false; } }
  if (r != SY_RUN) syncActive = false;            // animTick() reads the result and moves on (or stops)
}

void animBeginFrame(uint8_t i) {
  animIdx = i;
  animT0  = millis();
  animArrived = false;
  animSendFrame(i);
}

// True when every joint this frame commanded is at (or within tolerance of) its target.
bool animAllArrived(uint8_t idx) {
  const AnimFrame& f = anim[idx];
  for (uint8_t i = 0; i < f.n; i++) {
    int slot = slotOf(f.ids[i]);
    if (slot < 0) continue;
    const ServoState& sv = servos[slot];
    if (sv.rawPos < 0) continue;                  // no reading: cannot judge, do not stall on it
    if ((uint32_t)labs((int32_t)sv.rawPos - (int32_t)sv.targetRaw) > ANIM_ARRIVE_TOL) return false;
  }
  return true;
}

void animTick() {
  if (!animPlaying || animCount == 0) return;
  uint32_t el = millis() - animT0;
  if (animFixed) {                                  // timetable: the next frame starts on time, whatever the joints did
    const uint32_t end = animFrameAt + animFixMs[animIdx] + anim[animIdx].holdMs;
    if ((int32_t)(millis() - end) < 0) return;
    if (!animAllArrived(animIdx)) lg("anim frame %u: a joint was not quite there - next frame starts on time anyway", animIdx + 1);
    animFrameAt = end;
    goto nextFrame;
  }

  if (!animArrived && animSyncOn()) {
    if (syncMv.state == SY_RUN) return;
    int8_t w = syncMv.laggard; const char* who = (w >= 0) ? cfg.labels[syncSlot[w]] : "a joint";
    if (syncMv.state == SY_STALLED) {
      lg("anim: %s did not move at all for 6 s (stuck at %.1f deg, %.0f%% behind) - stopping", who,
         w >= 0 ? rawToNom(servos[syncSlot[w]].id, (uint16_t)max(0, (int)servos[syncSlot[w]].rawPos)) : 0.0f, syncMv.lag * 100);
      animStop(); return;
    }
    if (syncMv.worstLag > SYNC_CFG.lagOk || syncMv.state == SY_LATE)
      lg("anim frame %u: %.1f s (planned %.1f), worst gap %.0f%%%s", animIdx + 1, syncMv.elapsed, syncMv.T,
         syncMv.worstLag * 100, syncMv.state == SY_LATE ? ", a joint did not quite arrive" : "");
    animArrived = true; animArriveT = millis();
  }
  if (!animArrived) {
    if (el < animPlanMs) return;                  // the servos are running the move themselves
    if (!animAllArrived(animIdx) && el < animPlanMs + ANIM_ARRIVE_WAIT) return;
    animArrived = true;
    animArriveT = millis();
  }
  if (millis() - animArriveT < anim[animIdx].holdMs) return;   // the pause between poses
  if (false && grp.on()) {                                       // 13 Nov: no waiting for other modules (laptop-timed)
    if (!grp.mayAdvance(millis(), grpStep)) return;
    if (grp.lastTimedOut) {
      groupHalt("group: module %u had not finished frame %u after %lu s - every module stops and holds",
                grp.lastWaitingOn, animIdx + 1, (unsigned long)(grp.lastWaitMs / 1000));
      return;
    }
    else if (grp.lastWaitMs > 300) lg("group: waited %lu ms for the others at the end of frame %u", grp.lastWaitMs, animIdx + 1);
  }

  if (animWaitHeld()) return;                                   // another module is behind: do not start the next frame yet
nextFrame:
  if (animIdx + 1 < animCount) { grpStep++; animBeginFrame(animIdx + 1); return; }
  if (animLoop)                { grpStep++; animBeginFrame(0); return; }
  animPlaying = false; prefs.putUChar("animRun", 0);
  if (grp.on()) grp.stopPlay();
  animEnd = 1;                                          // finished on its own (not stopped)
  int a = -1, b = -1;                                   // the two servos that drew the most current
  for (uint8_t i = 0; i < nServos; i++) {
    if (a < 0 || animPeakmA[i] > animPeakmA[a]) { b = a; a = i; }
    else if (b < 0 || animPeakmA[i] > animPeakmA[b]) b = i;
  }
  if (a >= 0 && b >= 0)
    note("anim finished (%u frames) - highest current: %s %u mA (load %u %%), %s %u mA (load %u %%)", animCount,
       cfg.labels[a], animPeakmA[a], animPeakLoad[a] / 10, cfg.labels[b], animPeakmA[b], animPeakLoad[b] / 10);
  else note("anim finished (%u frames)", animCount);
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

/* The module's straight pose as compiled into this firmware (mechanical degrees). */
float builtinHomeFor(uint8_t id) {
  (void)id;
  return 180.0f;   // no saved home = no correction; mod1's own horn offsets are no longer compiled in for every module
}

/* The home saved on this board, else the built-in straight pose. offsetFor() uses it: straight
   (nominal 180) is wherever the operator saved home. */
float homeFor(uint8_t id) {
  for (uint8_t i = 0; i < homes.n; i++) if (homes.ids[i] == id) return homes.deg10[i] / 10.0f;
  return builtinHomeFor(id);
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

// Home for each joint in nominal degrees: 180 = the joint's MANUAL home (its saved hand-set pose; the offset is built in).
// Nischay 11 Nov 2026: the manual home is the default for every joint on every module, the locks too.
// Locks have two states only (Lock section below): UNLOCKED = manual home (180), LOCKED = manual home - 45, moved slowly.
// (Until 11 Nov LOCK1's home was a fixed 225 = open: mod2's hand-set lock homes are the open position itself.)
float homeTargetFor(uint8_t) { return 180.0f; }

// ── Locks (Nischay 11 Nov 2026) ─────────────────────────────────────────────────────────────────────────────────────
// Two states only: unlock = the lock's manual home, lock = manual home +/- LOCK_TURN_DEG, slow. The DIRECTION is not fixed
// (Nischay 11 Nov): it depends on the other module's connector in that dock, so the caller (planner / Studio) sends dir.
// Without dir: -45 (mod1's tested direction, 5 Nov).
#define LOCK_TURN_DEG 45.0f
#define LOCK_SPEED    3          // speed scale 1..10: slow, the fins must slide into the other module's slots
float lockTargetFor(bool locked, int dir = -1) { return locked ? 180.0f + (dir > 0 ? 1 : -1) * LOCK_TURN_DEG : 180.0f; }

// Overshoot and return (13 Nov 2026, Nischay: "the lock was getting stuck - whatever way it turns, turn 3 deg more the same
// way, then come back 3 deg"): every lock / unlock / home of a lock first goes LOCK_OVER_DEG past its target, then, once
// there (or after LOCK_OVER_MS if something blocks it), back to the target slowly. The kick frees a fin that catches.
#define LOCK_OVER_DEG 3.0f
#define LOCK_OVER_MS  4000
struct LockSettle { bool on; float finalDeg; float overDeg; uint32_t t0; };
LockSettle lockSettle[MAX_SERVOS] = {};
void lockSettleCancel(int slot) { if (slot >= 0 && slot < MAX_SERVOS) lockSettle[slot].on = false; }
bool isLockSlot(uint8_t i);
// where to send the lock FIRST (target + 3 deg in the direction of travel); call lockSettleStart after the command
float lockOverTarget(uint8_t i, float finalDeg) {
  const ServoState& sv = servos[i];
  float cur = sv.rawPos >= 0 ? rawToNom(sv.id, (uint16_t)sv.rawPos) : sv.targetDeg;
  float d = finalDeg - cur;
  if (fabsf(d) < 1.0f) return finalDeg;            // already there: no kick
  return finalDeg + (d > 0 ? LOCK_OVER_DEG : -LOCK_OVER_DEG);
}
void lockSettleStart(uint8_t i, float finalDeg, float overDeg) {
  if (fabsf(overDeg - finalDeg) < 0.5f) return;
  lockSettle[i] = {true, finalDeg, overDeg, millis()};
}
void lockSettleTick() {
  for (uint8_t i = 0; i < nServos; i++) {
    LockSettle& L = lockSettle[i];
    if (!L.on) continue;
    const ServoState& sv = servos[i];
    bool there = sv.rawPos >= 0 && fabsf(rawToNom(sv.id, (uint16_t)sv.rawPos) - L.overDeg) < 1.5f;
    if (!there && millis() - L.t0 < LOCK_OVER_MS) continue;
    const float fin = L.finalDeg; L.on = false;
    cmdPos(servos[i], fin, LOCK_SPEED, POS_ACC_DEFAULT);   // back 3 deg to the real target
  }
}

void homeAll(bool homeManual = false, bool raw180 = false) {
  lastMotionMs = millis();
  uint8_t  ids[MAX_SERVOS]; int16_t pos[MAX_SERVOS];
  uint16_t spd[MAX_SERVOS]; uint8_t  acc[MAX_SERVOS];
  uint8_t  n = 0;
  for (uint8_t i = 0; i < nServos; i++) {
    setHwMode(servos[i], POS_MODE);
    ensureTorque(servos[i]);
    float lo, hi; limitsFor(i, lo, hi);
    servos[i].mode = POS_MODE;
    // Straight is nominal 180 for every joint (the offset turns that into the hand-set home), so
    // "home" and "manual home" are now the same place. `homeManual` is kept so old callers work;
    // raw180 asks for the MECHANICAL 180 instead (horn assembly: seat the horn at the true middle).
    // Every joint to its MANUAL home (nominal 180), the locks too (= unlocked). raw180: mechanical 180, for seating horns.
    float want = clampF(raw180 ? 180.0f - offsetFor(servos[i].id) : homeTargetFor(i), lo, hi);   // homeTargetFor: manual home
    (void)homeManual;
    if (isLockSlot(i) && !raw180) { const float over = lockOverTarget(i, want); lockSettleCancel(i); lockSettleStart(i, want, over); want = over; }
    if (!guardAllows(i, nomToRaw(servos[i].id, want))) continue;
    servos[i].targetDeg = want;
    servos[i].targetRaw = nomToRaw(servos[i].id, servos[i].targetDeg);
    servos[i].speedScale = 10;
    servos[i].speedRaw = speedScaleToRaw(10);
    servos[i].acc = POS_ACC_DEFAULT;
    servos[i].lastCommandMs = millis();
    ids[n] = servos[i].id; pos[n] = (int16_t)servos[i].targetRaw;
    spd[n] = servos[i].speedRaw; acc[n] = servos[i].acc; n++;
  }
  if (n == 1)      { posEx(ids[0], pos[0], spd[0], acc[0]); delay(3); }
  else if (n > 1)  { syncPosEx(ids, n, pos, spd, acc); delay(3); }
}

// ── Overload guard: apply what it decides ───────────────────────────────────
bool isLockSlot(uint8_t i) { return strncmp(cfg.labels[i], "LOCK", 4) == 0; }
// a joint held or giving way: keep the radio awake so the page and the laptop see it at once
bool guardBusy() { for (uint8_t i = 0; i < nServos; i++) if (guards[i].state != G_OK) return true; return false; }
const GuardCfg& guardCfgFor(uint8_t i) { return isLockSlot(i) ? guardSet.lock : guardSet.bend; }
const char* guardName(GuardState g) { return g == G_GIVING ? "giving" : g == G_HELD ? "held" : g == G_HOT ? "hot" : "ok"; }

void guardApply(uint8_t i, const GuardAction& a) {
  ServoState& sv = servos[i];
  if (a.setTorque) { st.writeWord(sv.id, REG_TORQUE_LIMIT, a.torque); delay(2); }
  if (a.setTarget) {
    uint16_t t = (uint16_t)constrain((int)a.target, 0, 4095);
    sv.targetRaw = t; sv.targetDeg = rawToNom(sv.id, t);
    posEx(sv.id, t, speedScaleToRaw(3), 20); delay(2);     // gently: this is a retreat, not a move
  }
  if (!a.event) return;
  const Guard& g = guards[i];
  switch (a.event) {
    case GE_TRIP_LOAD: case GE_TRIP_CURRENT:
      snprintf(guardMsg, sizeof(guardMsg), "%s hit: %u%% load, %u mA at %.1f deg - stopped, holding gently",
               cfg.labels[i], g.tripLoad / 10, g.tripmA, rawToNom(sv.id, (uint16_t)max(0, (int)g.hitRaw)));
      if (animPlaying) { animStop(); animPausedByGuard = true; }
      break;
    case GE_SETTLED: snprintf(guardMsg, sizeof(guardMsg), "%s holding at %.1f deg, load safe again", cfg.labels[i], sv.targetDeg); break;
    case GE_CLEARED: snprintf(guardMsg, sizeof(guardMsg), "%s back to normal", cfg.labels[i]); break;
    case GE_HOT:     snprintf(guardMsg, sizeof(guardMsg), "%s too hot (%d C): holding gently, moves refused", cfg.labels[i], sv.rawTemp); break;
    case GE_COOL:    snprintf(guardMsg, sizeof(guardMsg), "%s cooled down", cfg.labels[i]); break;
    default: break;
  }
  lg("guard: %s", guardMsg);
}

void guardTick(uint8_t i) {
  ServoState& sv = servos[i];
  if (sv.rawPos < 0 || sv.mode != POS_MODE) return;
  int mA = sv.rawCurrent >= 0 ? (int)(sv.rawCurrent * 6.5f) : 0;
  GuardAction a = guards[i].step(guardCfgFor(i), millis(), sv.rawPos, sv.rawLoad, mA, (int)sv.targetRaw, sv.rawTemp, sv.torqueOn);
  guardApply(i, a);
}

// May this joint be sent to `raw`? A refused move is logged once and simply not sent.
bool guardAllows(uint8_t i, uint16_t raw) {
  const ServoState& sv = servos[i];
  if (sv.rawPos < 0) return true;
  if (guards[i].allow(sv.rawPos, raw)) return true;
  snprintf(guardMsg, sizeof(guardMsg), "%s: move refused - %s", cfg.labels[i],
           guards[i].state == G_HOT ? "too hot" : "it would push further into what it hit (move it the other way, or Clear)");
  return false;
}

void guardClear(int id) {   // id < 0: every joint
  for (uint8_t i = 0; i < nServos; i++) {
    if (id >= 0 && servos[i].id != id) continue;
    if (guards[i].state == G_OK) continue;
    GuardAction a; guards[i].clearNow(guardCfgFor(i), servos[i].rawTemp, a);
    a.setTarget = servos[i].rawPos >= 0; a.target = (int16_t)servos[i].rawPos;   // stay exactly where it is now
    guardApply(i, a);
  }
  snprintf(guardMsg, sizeof(guardMsg), "cleared: back to normal where they are");
  lg("guard: cleared %s", id < 0 ? "all" : "one joint");
}

// ── Telemetry reads ──────────────────────────────────────────────────────────
// A servo that stopped answering (unplugged, cable cut) keeps its last numbers in RAM; this says whether they are live.
#define SERVO_GONE_MS 1000
bool servoSeen(const ServoState& sv) { return sv.rawPos >= 0 && sv.seenMs && millis() - sv.seenMs < SERVO_GONE_MS; }

void refreshAllFastSync() {
  bc("telemetry sync (%u servos)", nServos);
  if (nServos == 0) return;
  uint8_t ids[MAX_SERVOS];
  for (uint8_t i = 0; i < nServos; i++) ids[i] = servos[i].id;

  // SCServo 1.0.2 has no syncReadBegin/End (newer forks do) and spells the word
  // decoder "ToWrod" — this uses only what the shipped library actually exposes.
  // syncReadPacketTx does no flushing of its own: without the bracket, stale bytes and the
  // request's own echo sat in front of the replies and slots got each other's positions.
  // 9 replies at 1 Mbaud arrive within ~3 ms. A missing or garbled reply used to wait the full default timeout (~100 ms)
  // and then poll that servo again: two misses made the guard 0.2 s late (mod1, 4 Nov). Give up after 5 ms instead;
  // that servo's next read is only FAST_MS away.
  unsigned long savedTo = st.IOTimeOut;
  st.IOTimeOut = 5;
  st.beginTx();
  // registers 56..70 in one go: position, speed, load, voltage, temperature, status, moving, current. The guard needs
  // load and current every read, not one servo per SLOW_MS (that was each servo every ~225 ms).
  st.syncReadPacketTx(ids, nServos, SMS_STS_PRESENT_POSITION_L, 15);
  st.endTx();
  uint8_t rx[15];
  for (uint8_t i = 0; i < nServos; i++) {
    bool got = false;
    if (st.syncReadPacketRx(ids[i], rx) == 15) {
      int pos = rx[0] | (rx[1] << 8);                // position is unsigned 0..4095
      if (pos >= 0 && pos <= 4095) { servos[i].rawPos = pos; servos[i].seenMs = millis(); got = true; }
      int ld = (rx[4] | (rx[5] << 8)) & 0x3FF; if (rx[5] & 0x04) ld = -ld;   // load: bit 10 is the sign
      int cu = (rx[13] | (rx[14] << 8)) & 0x7FFF;                           // current, 6.5 mA units
      servos[i].rawLoad = ld; servos[i].rawLoadAbs = abs(ld); servos[i].rawCurrent = cu;
      if (animPlaying && cu * 6.5f < 6000) {       // an ST3215 never draws 6 A: bigger is a garbled read (it said 65535 mA)
        const uint16_t mA = (uint16_t)(cu * 6.5f);
        if (mA > animPeakmA[i]) animPeakmA[i] = mA;
        if ((uint16_t)abs(ld) > animPeakLoad[i]) animPeakLoad[i] = (uint16_t)abs(ld);
      }
      if (rx[7] > 0 && rx[7] < 150) servos[i].rawTemp = rx[7];
      if (rx[6] > 0 && rx[6] < 200) servos[i].rawVoltage = rx[6];
    }
    if (!got) servoMisses++;                          // missed its slot: keep the last reading, try again next pass
    // A limp joint has no goal of its own: keep its target on the measured position, so a
    // stale target (a phantom read, an old slider value) can never linger and "Turn torque
    // ON" or a nudge always starts from where the arm actually is.
    if (got && !servos[i].torqueOn) {
      servos[i].targetRaw = (uint16_t)servos[i].rawPos;
      servos[i].targetDeg = rawToNom(servos[i].id, (uint16_t)servos[i].rawPos);
    }
    updateMotionFlag(servos[i]);
  }
  st.IOTimeOut = savedTo;
  flushBus();                                      // nothing half-read may sit in front of the next request
  for (uint8_t i = 0; i < nServos; i++) guardTick(i);   // after the whole read: writes never cut into the replies
}

void refreshSlow(ServoState& sv) {
  // ONE read of registers 56..70 (position, speed, load, volt, temp, ..., current) instead of
  // five separate reads with five retries each. That made a pass ~5 bus round-trips per servo
  // and, at one servo per 250ms, left every servo's mA/V/degC up to 2+ seconds stale. The
  // values below are decoded from the cached block (id -1 = "use the last FeedBack").
  unsigned long saved = st.IOTimeOut;
  st.IOTimeOut = 15;
  int ok = st.FeedBack(sv.id);
  if (ok < 0) { flushBus(); ok = st.FeedBack(sv.id); }
  st.IOTimeOut = saved;
  if (ok < 0) return;
  sv.seenMs = millis();
  int spd  = st.ReadSpeed(-1);
  int load = st.ReadLoad(-1);
  int curr = st.ReadCurrent(-1);
  int volt = st.ReadVoltage(-1);
  int temp = st.ReadTemper(-1);
  sv.rawSpeed = spd;
  sv.rawLoad = load; sv.rawLoadAbs = abs(load);
  if (curr >= 0)              sv.rawCurrent = curr;
  if (volt > 0 && volt < 200) sv.rawVoltage = volt;
  if (temp > 0 && temp < 150) sv.rawTemp    = temp;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Wi-Fi: never-give-up state machine, reconnect target < 2 s
// ─────────────────────────────────────────────────────────────────────────────
// Slot 0 is meant for the laptop's own network (tools/robo4-net.ps1); the router is the
// fallback. Three things keep a drop under 2 s:
//   1. The laptop broadcasts a heartbeat every 200 ms. Missing it for HB_LOST_MS means the
//      link is dead — the radio alone only notices after its beacon timeout (>= 3 s).
//   2. Rejoining a network we were just on reuses its channel + BSSID (skips the ~1.6 s
//      all-channel scan) and, on a heartbeat network, the last lease as a static IP: right
//      after a module leaves, the laptop's DHCP takes 1-7 s to hand out an address again.
//      With a static IP GOT_IP can fire before the radio has joined, so "link up" is the
//      CONNECTED event instead, and a reused address that gets no heartbeat in
//      STATIC_VERIFY_MS is dropped for a fresh DHCP lease.
//   3. A live drop retries the SAME network at once; only repeated failures rotate slots.
bool     mdnsOk       = false;
bool     wantMdns     = false;   // set from the event handler, acted on in loop()
bool     wantFastSave = false;   // GOT_IP seen — remember channel/BSSID/lease from loop()
bool     apUp         = false;
bool     otaStarted   = false;   // ArduinoOTA.begin() only works once we have an IP
uint8_t  wSlot        = 255;     // slot currently being tried
uint16_t wFails       = 0;       // consecutive failed attempts
uint16_t wSameTries   = 0;       // attempts on wSlot since it last changed
bool     wHbRejoin    = false;   // this rejoin came from a heartbeat gap on a good link: stay on that network longer
uint32_t loopMaxMs = 0, loopMaxPrev = 0, loopWinAt = 0;   // slowest loop() pass, this and the last 5 s window
uint32_t wBackoff     = 800;
uint32_t wNextTry     = 0;
extern bool wifiParked;          // master-first: off the router while the master is heard (wifiParkTick, below)
uint32_t wAttemptAt   = 0;
uint32_t wDrops       = 0;
uint32_t wConnectedAt = 0;
bool     wUp          = false;   // had an IP; a loss after this counts as an outage
bool     wHinted      = false;   // current attempt uses the remembered channel/BSSID
bool     wStatic      = false;   // current attempt reuses the remembered lease as a static IP
volatile bool wAssoc  = false;   // current attempt has associated (IP may still be pending)
volatile uint32_t wAssocAt = 0;
uint32_t wDhcpKickAt  = 0;
uint8_t  wReturnSlot  = 255;     // trial switch to a preferred slot: where to go back if it fails
uint32_t wLostAt      = 0;       // when the current outage began (0 = none)
uint32_t wLastGapMs   = 0;
uint32_t wMaxGapMs    = 0;
uint32_t wPrefScanAt  = 0;
bool     wPrefScanning = false;
char     apName[24];

// Per slot. Channel + router (BSSID) are also kept in flash (fjLoad/fjStore), so the first join after a power-on goes
// straight to the right channel (~1-2 s) instead of a full scan (mod2, 11 Nov: 13 s). The DHCP lease stays RAM only.
struct FastJoin {
  bool ok; uint8_t bssid[6]; int32_t ch;      // where the network was
  bool lease; IPAddress ip, gw, mask, dns;    // the last DHCP lease on it
  bool hb;                                    // it carries the laptop heartbeat
};
FastJoin fj[4];

#define HB_PORT    4210
// MIN_MODEM sleep wakes only for DTIM beacons — ~0.9 s apart on the laptop's network, so the
// 200 ms heartbeat arrived ~0.9 s apart, too coarse to notice a dead link in time.
// MAX_MODEM wakes every LISTEN_INTERVAL beacons instead (it ignores DTIM); 1 = every
// beacon (~0.1 s): still modem sleep, a little warmer, far cooler than no sleep at all.
#define ROBO_WIFI_PS    WIFI_PS_MAX_MODEM
#define LISTEN_INTERVAL 1
#define HB_LOST_MS      700
#define HB_LOST_LINKED_MS 4000   // radio still connected with a good signal: a hiccup, wait longer (4 Nov 2026). 5 Nov: 2 s left
                                 // on the laptop's 2-minute 2 s pause and made a 2.1-2.8 s outage; a dead network still shows within
                                 // 3 s as beacon loss (esp_wifi_set_inactive_time) or a kick, so 4 s costs nothing
#define HINT_JOIN_MS    700      // fast rejoin not associated by then -> full scan
#define DHCP_KICK_MS    1200     // associated but no IP by then -> ask DHCP again
#define STATIC_VERIFY_MS 1500    // reused address, no heartbeat by then -> fresh DHCP lease
WiFiUDP  hbUdp;
bool     hbOpen   = false;
bool     hbSeen   = false;       // heartbeats arrived since the last (re)connect
uint32_t hbLastMs = 0;
uint32_t hbCount  = 0;
uint32_t hbLosses = 0;

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

// The link is usable: an IP from DHCP, or (static reuse) the radio has joined.
void wifiLinkUp() {
  wConnectedAt = millis();
  wFails = 0; wBackoff = 800; wSameTries = 0; wReturnSlot = 255; wHbRejoin = false;
  if (wLostAt) {
    wLastGapMs = wConnectedAt - wLostAt;
    if (wLastGapMs > wMaxGapMs) wMaxGapMs = wLastGapMs;
    wLostAt = 0;
  }
  wUp = true;
  wantMdns = true; wantFastSave = true;
  hbSeen = false; hbLastMs = wConnectedAt;
  lg("WiFi up %s on '%s' ch %d rssi %d%s, gap %lu ms",
     WiFi.localIP().toString().c_str(), WiFi.SSID().c_str(), WiFi.channel(), WiFi.RSSI(),
     wStatic ? " (fast rejoin, reused address)" : wHinted ? " (fast rejoin)" : "", wLastGapMs);
}

void onWiFiEvent(WiFiEvent_t ev, WiFiEventInfo_t info) {
  switch (ev) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      if (!wStatic) wifiLinkUp();        // static: this can fire before the join — wait for CONNECTED
      break;
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      wAssoc = true; wAssocAt = millis();
      if (wStatic) wifiLinkUp();
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      wAssoc = false;
      if (wifiParked) { wUp = false; mdnsOk = false; break; }   // we left on purpose (master heard): no retry
      if (wUp) { wUp = false; if (!wLostAt) wLostAt = millis(); }
      if (mdnsOk) { wDrops++; lg("WiFi lost (reason %d) — retrying", info.wifi_sta_disconnected.reason); }
      mdnsOk = false;
      // Retry at once — but our own disconnect() at the start of an attempt lands here
      // too (within a few ms), and must not abort the attempt it belongs to. Right after
      // we left, the laptop often accepts the rejoin and kicks it ~0.1 s later; that one
      // must retry immediately, so the window is short.
      if (millis() - wAttemptAt > 50) wNextTry = millis();
      break;
    default: break;
  }
}

// First two tries on a slot: remembered channel/BSSID (+ lease on a heartbeat network).
// Third: full scan + DHCP.
// MASTER FIRST (Nischay 12 Nov 2026: "why are they using my home router? they should work purely through the master"):
// the master (ESP-NOW dongle) heard steadily for WIFI_PARK_AFTER_MS -> leave the router and stay on its channel, radio only
// (also cooler: no router beacons / TCP waking the radio). The master silent for WIFI_UNPARK_AFTER_MS -> join Wi-Fi again, so
// a module without a master (or a master unplugged) is never unreachable. Uploads and the web page go over the radio too.
#define WIFI_PARK_AFTER_MS   30000      // master heard steadily this long -> off the router
#define WIFI_UNPARK_AFTER_MS  5000      // master silent this long -> back on Wi-Fi as the backup
bool wifiParked = false;
uint32_t masterSteadySince = 0;
extern bool nowHbSeen; extern uint32_t nowHbMs;
bool nowLinked();
bool wifiParkTick() {                                 // true = parked: wifiTick has nothing to do
  const uint32_t now = millis();
  if (otaBusy) return wifiParked;
  if (nowLinked()) { if (!masterSteadySince) masterSteadySince = now; } else masterSteadySince = 0;
  if (!wifiParked && masterSteadySince && now - masterSteadySince > WIFI_PARK_AFTER_MS && WiFi.status() == WL_CONNECTED) {
    uint8_t ch = 0; wifi_second_chan_t sc; esp_wifi_get_channel(&ch, &sc);
    wifiParked = true;
    lg("master is steady: left Wi-Fi '%s', now radio only (channel %u)", WiFi.SSID().c_str(), ch);
    WiFi.disconnect(false, false);                    // keep STA mode on: ESP-NOW lives on it
    esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);  // and stay on the master's channel
    return true;
  }
  if (wifiParked && (!nowHbSeen || now - nowHbMs > WIFI_UNPARK_AFTER_MS)) {
    wifiParked = false;
    lg("master gone %u s: joining Wi-Fi again as backup", WIFI_UNPARK_AFTER_MS / 1000);
    wNextTry = now;
  }
  return wifiParked;
}

void wifiConnectSlot(uint8_t i) {
  if (i > WSLOT_DEFAULT) return;
  // The radio refuses to connect while a scan runs; drop any background scan first.
  if (wPrefScanning || WiFi.scanComplete() == WIFI_SCAN_RUNNING) { esp_wifi_scan_stop(); WiFi.scanDelete(); }
  wPrefScanning = false;
  if (i != wSlot) wSameTries = 0;
  wSlot = i;
  const FastJoin& f = fj[i];
  // Twice: right after we leave, the laptop sometimes refuses the first rejoin for ~1 s,
  // and a scan would only find it on the same channel ~1 s later anyway.
  wHinted = f.ok && wSameTries < 2;
  wStatic = wHinted && f.lease && f.hb;
  wSameTries++;
  wAttemptAt = millis();
  lg("WiFi try %s '%s' (%s, attempt %u)",
     i == WSLOT_DEFAULT ? "compiled default" : "saved slot", ssidFor(i),
     wStatic ? "fast rejoin, reused address" : wHinted ? "fast rejoin" : "full scan", wFails);
  WiFi.disconnect(false, false);
  wAssoc = false;
  // Must be set before begin(): begin() only starts DHCP when no static IP is configured.
  if (wStatic) WiFi.config(f.ip, f.gw, f.mask, f.dns);
  else         WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE);
  // begin() without connecting, so the listen interval can be set before the join.
  WiFi.begin(ssidFor(i), passFor(i), wHinted ? f.ch : 0, wHinted ? f.bssid : nullptr, false);
  wifi_config_t c;
  if (esp_wifi_get_config(WIFI_IF_STA, &c) == ESP_OK) {
    c.sta.listen_interval = LISTEN_INTERVAL;
    esp_wifi_set_config(WIFI_IF_STA, &c);
  }
  esp_wifi_connect();
  // A failure usually reports itself sooner (DISCONNECTED pulls wNextTry in); this is
  // the cap for an attempt that just goes quiet. Spaced out once nothing works at all.
  // A fast rejoin that has not associated by HINT_JOIN_MS is cut short in wifiTick().
  wNextTry = millis() + (wHinted ? 2000 : 4000) + (wFails > 12 ? 2000 : 0);
}

// radio send power in quarter-dBm (60 = 15 dBm). 12 Nov (Nischay: test 8.5 .. 19.5 dBm on every module): /api/radio?tx=8.5
// changes it LIVE, not saved - a restart goes back to 11.
uint8_t txQ4 = 44;   // 12 Nov (Nischay, after the 8.5..19.5 test: power barely mattered): 11 dBm, coolest
void wifiRadioTuning() {
  WiFi.setHostname(cfg.host);
  WiFi.setTxPower((wifi_power_t)txQ4);   // 12 Nov: default 15 dBm (Nischay); /api/radio?tx= changes it live
  esp_wifi_set_inactive_time(WIFI_IF_STA, 3);   // beacon-loss timeout: 6 s default, 3 s minimum
}

void wifiInit() {
  snprintf(apName, sizeof(apName), "ROBO4-%s", cfg.host);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);             // wifiTick() decides what to rejoin, and how fast
  WiFi.setSleep(ROBO_WIFI_PS);                   // modem sleep — keeps the C3 cool
  wifiRadioTuning();
  WiFi.onEvent(onWiFiEvent);
  fjLoad();
  uint8_t s = nextSlot();
  if (s == 255) { lg("No Wi-Fi credentials stored — raising SoftAP"); startAP(); return; }
  wifiConnectSlot(s);
}

void hbPoll() {
  if (!hbOpen) hbOpen = hbUdp.begin(HB_PORT);
  while (hbUdp.parsePacket() > 0) {
    uint8_t b[16];
    int n = hbUdp.read(b, sizeof(b));
    if (n >= 4 && memcmp(b, "R4HB", 4) == 0) {
      hbLastMs = millis(); hbSeen = true; hbCount++;
      if (wSlot <= WSLOT_DEFAULT) fj[wSlot].hb = true;
    }
  }
}

// ── Live mode (GOS) ───────────────────────────────────────────────────────────
// A web request costs 0.3-2 s here: modem sleep plus a new TCP connection each time. While a program on the laptop
// keeps sending "R4LV" to LIVE_PORT (GOS does, twice a second), fresh servo reads are pushed back to it as small UDP
// packets: {"t":ms,"a":[[id,deg],...]}, deg as in /api/telemetry currentAngle (null if unread). While the robot moves
// that is every read (~16 a second, radio awake: radioTick); standing still, every 4th (~4 a second, radio in modem
// sleep, which sending does not need). No asking for LIVE_HOLD_MS -> pushing stops. Commands still go through the web
// API, which confirms each one.
#define LIVE_PORT    4211
#define LIVE_HOLD_MS 2500     // modem sleep can delay an incoming R4LV by a beacon or two
WiFiUDP   liveUdp;
bool      liveOpen  = false;
bool      liveAwake = false;
uint32_t  liveUntil = 0;
IPAddress liveIp;
uint16_t  livePort  = 0;
uint32_t  liveSent  = 0;

void livePoll() {
  if (WiFi.status() != WL_CONNECTED) { if (liveOpen) { liveUdp.stop(); liveOpen = false; } return; }
  if (!liveOpen) liveOpen = liveUdp.begin(LIVE_PORT);
  while (liveUdp.parsePacket() > 0) {
    uint8_t b[8];
    int n = liveUdp.read(b, sizeof(b));
    if (n >= 4 && memcmp(b, "R4LV", 4) == 0) {
      liveIp = liveUdp.remoteIP(); livePort = liveUdp.remotePort(); liveUntil = millis() + LIVE_HOLD_MS;
    }
  }
  bool want = livePort && (int32_t)(liveUntil - millis()) > 0;
  if (want == liveAwake) return;
  liveAwake = want;
  lg(want ? "live mode on (%s): angles pushed" : "live mode off (%s)", liveIp.toString().c_str());
}

// Radio fully awake only while the robot moves: commands answered at once and angles streamed fast. Standing still
// (even while a laptop watches in live mode) it stays in modem sleep: sending still works, it just stays cool.
bool radioHold  = false;   // /api/radio?awake=1: keep the radio awake for a Wi-Fi test (not saved; a reboot clears it)
bool guardBusy();
bool nowLinked();          // ESP-NOW link section
bool nowAwake();
bool nowPeeking();
void nowStop();
String nowJson();
bool moving() { return animPlaying || millis() - lastMotionMs < AWAKE_AFTER_MOVE_MS || guardBusy(); }
// Laptop in use = awake, full power (12 Nov 2026, Nischay: "I just want uninterrupted comm" - mod1.local / mod2.local and the
// Studio dropped while the module stood still: a napping radio at 11 dBm missed most frames, -90 dBm at the dongle, a 42 KB
// page took 4 s). Measured with the radio held awake: page 4 s -> 0.3-1 s, bridge requests 0/7 -> 27/27. The nap and 11 dBm
// come back only when nobody (web request or ESP-NOW master) has talked to the module for LAPTOP_AWAKE_MS.
#define LAPTOP_AWAKE_MS 30000
uint32_t lastHttpMs = 0;                            // set by setCORS(): every web reply goes through it
uint32_t nowAnyReqMs = 0;                           // any ESP-NOW request, read or command (eventWatch: laptop activity)
extern bool nowHbSeen; extern uint32_t nowHbMs;
bool laptopActive() {
  uint32_t now = millis();
  return (lastHttpMs && now - lastHttpMs < LAPTOP_AWAKE_MS) || (nowHbSeen && now - nowHbMs < LAPTOP_AWAKE_MS);
}
void radioTick() {
  if (otaBusy) return;                              // OTA owns the radio settings while it runs
  bool want = moving() || radioHold || nowAwake() || nowPeeking() || grpArmed();   // ESP-NOW: awake while commanded (heat), see ESP-NOW link; a group upload waits for GO
  // (12 Nov: 'awake while the laptop talks' made the chips hot - Nischay: back to how it was. The drops were the stuck dongle.)
  if (want == radioAwake) return;
  radioAwake = want;
  // Power stays 11 dBm: at 19.5 dBm mod2's board garbled big frames (12 Nov: its 42 KB page stalled at 38 KB, mod1 fine) -
  // awake is what fixed the drops, not power.
  if (want) WiFi.setSleep(false); else WiFi.setSleep(ROBO_WIFI_PS);
}

void okJson(const String& body);
// GET /api/radio            -> {"hold":false,"awake":false}
// GET /api/radio?awake=1|0  -> hold the radio awake (1) or back to normal sleep when still (0). Moves nothing.
extern uint8_t nowRate; void nowApplyRate(const uint8_t* mac); extern bool nowUp, nowPeerSet; extern uint8_t nowPeer[6];
void handleRadio() {
  if (rq.hasArg("awake")) { radioHold = rq.arg("awake") == "1"; radioTick(); }
  if (rq.hasArg("lr") && nowUp) {   // 0 normal, 1 LR 500k, 2 LR 250k (see nowApplyRate)
    nowRate = (uint8_t)constrain(rq.arg("lr").toInt(), 0, 2);
    const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff}; nowApplyRate(all); if (nowPeerSet) nowApplyRate(nowPeer);
    lg("radio speed set to %s (test, until restart)", nowRate == 2 ? "Long Range 250 kbps" : nowRate == 1 ? "Long Range 500 kbps" : "normal 1 Mbps");
  }
  if (rq.hasArg("tx")) {   // dBm, 2 .. 21 (the chip rounds to its own steps)
    float d = rq.arg("tx").toFloat(); if (d < 2) d = 2; if (d > 21) d = 21;
    txQ4 = (uint8_t)(d * 4 + 0.5f); WiFi.setTxPower((wifi_power_t)txQ4);
    lg("radio power set to %.1f dBm (test, until restart)", txQ4 / 4.0f);
  }
  String b = F("{\"ok\":true,\"hold\":"); b += radioHold ? "true" : "false";
  b += F(",\"awake\":"); b += radioAwake ? "true" : "false";
  { int8_t q = 0; esp_wifi_get_max_tx_power(&q); b += F(",\"txDbm\":"); b += String(q / 4.0f, 2); }
  b += F(",\"lr\":"); b += nowRate;
  b += '}';
  okJson(b);
}

uint8_t liveTick = 0;
void liveSend() {
  if (!liveAwake) return;
  liveTick++;
  if (moving() ? (liveTick % 2) : (liveTick % 8)) return;   // FAST_MS 30: still every 8th read (~4 a second), moving every 2nd (~16)
  char buf[24 + MAX_SERVOS * 18]; int k = snprintf(buf, sizeof(buf), "{\"t\":%lu,\"a\":[", (unsigned long)millis());
  for (uint8_t i = 0; i < nServos && k < (int)sizeof(buf) - 24; i++) {
    const ServoState& sv = servos[i];
    if (sv.rawPos >= 0) k += snprintf(buf + k, sizeof(buf) - k, "%s[%u,%.2f]", i ? "," : "", sv.id, rawToNom(sv.id, (uint16_t)sv.rawPos));
    else                k += snprintf(buf + k, sizeof(buf) - k, "%s[%u,null]", i ? "," : "", sv.id);
  }
  k += snprintf(buf + k, sizeof(buf) - k, "]}");
  liveUdp.beginPacket(liveIp, livePort); liveUdp.write((const uint8_t*)buf, k); liveUdp.endPacket();
  liveSent++;
}

// Flash copy of a slot's channel + router, tied to the network name: a renamed slot just misses once and scans.
uint32_t fjNameHash(const char* s) { uint32_t h = 2166136261u; while (*s) { h ^= (uint8_t)*s++; h *= 16777619u; } return h; }
struct FjFlash { uint32_t name; uint8_t bssid[6]; uint8_t ch; };
void fjLoad() {
  for (uint8_t i = 0; i <= WSLOT_DEFAULT && i < 4; i++) {
    char k[6]; snprintf(k, sizeof k, "fj%u", i);
    FjFlash f;
    if (prefs.getBytes(k, &f, sizeof f) != sizeof f || f.name != fjNameHash(ssidFor(i)) || !f.ch || f.ch > 14) continue;
    memcpy(fj[i].bssid, f.bssid, 6); fj[i].ch = f.ch; fj[i].ok = true;
  }
}
void fjStore(uint8_t i) {
  char k[6]; snprintf(k, sizeof k, "fj%u", i);
  FjFlash f = {}, old = {};
  f.name = fjNameHash(ssidFor(i)); memcpy(f.bssid, fj[i].bssid, 6); f.ch = (uint8_t)fj[i].ch;
  if (prefs.getBytes(k, &old, sizeof old) == sizeof old && !memcmp(&old, &f, sizeof f)) return;   // unchanged: no flash write
  prefs.putBytes(k, &f, sizeof f);
}

void saveFastJoin() {
  wantFastSave = false;
  hbUdp.stop(); hbOpen = false;             // rebind on the fresh interface
  liveUdp.stop(); liveOpen = false;
  if (wSlot > WSLOT_DEFAULT) return;
  FastJoin& f = fj[wSlot];
  const uint8_t* b = WiFi.BSSID();
  if (!b) return;
  memcpy(f.bssid, b, 6);
  f.ch = WiFi.channel();
  f.ok = true;
  fjStore(wSlot);
  if (!wStatic) {                           // a real DHCP lease — keep it for the next rejoin
    f.ip = WiFi.localIP(); f.gw = WiFi.gatewayIP(); f.mask = WiFi.subnetMask(); f.dns = WiFi.dnsIP();
    f.lease = f.ip != INADDR_NONE;
  }
}

// On a fallback slot: every 10 s look (async, SSID-filtered) for a better slot; switch when seen.
// NOT while the ESP-NOW master is heard (12 Nov 2026): each look hopped the radio off channel and a seen-but-unjoinable
// preferred network dropped the router too, every 10 s -> both modules flickered offline on the dongle. With the master
// heard, Wi-Fi is only for uploads, so the current network is good enough (same rule as the heartbeat rejoin below).
#define PREF_QUIET_MS 30000                 // master heard this recently = stay put (a napping radio can miss a few beats)
void preferredCheck() {
  if (wSlot > WSLOT_DEFAULT) return;        // a reconnect was just requested; not on a slot
  if (!wPrefScanning && nowHbSeen && millis() - nowHbMs < PREF_QUIET_MS) return;
  uint8_t p = 255;
  for (uint8_t i = 0; i < wSlot && i <= WSLOT_DEFAULT; i++) if (slotUsable(i)) { p = i; break; }
  if (p == 255 || strcmp(ssidFor(p), ssidFor(wSlot)) == 0) { wPrefScanning = false; return; }
  if (wPrefScanning) {
    int16_t n = WiFi.scanComplete();
    if (n == WIFI_SCAN_RUNNING) return;
    wPrefScanning = false;
    if (n > 0) {
      // Join on the channel/BSSID the scan just saw; one try, then straight back.
      FastJoin& f = fj[p];
      memcpy(f.bssid, WiFi.BSSID((uint8_t)0), 6); f.ch = WiFi.channel((uint8_t)0); f.ok = true;
      WiFi.scanDelete();
      lg("preferred '%s' is back on ch %d — switching", ssidFor(p), f.ch);
      wReturnSlot = wSlot;
      wifiConnectSlot(p);
      return;
    }
    WiFi.scanDelete();
    return;
  }
  if (millis() - wPrefScanAt < 10000) return;
  wPrefScanAt = millis();
  wPrefScanning = WiFi.scanNetworks(true, false, false, 100, 0, ssidFor(p)) == WIFI_SCAN_RUNNING;
}

// Called every loop iteration. Never blocks, never returns without a plan.
void wifiTick() {
  if (wifiParkTick()) return;
  if (wUp && wAssoc) {
    if (wantFastSave) saveFastJoin();
    hbPoll();
    // A reused address the laptop doesn't route (lease gone, handed to someone else):
    // no heartbeat arrives. Drop it and rejoin with a fresh DHCP lease.
    if (wStatic && !hbSeen && millis() - wConnectedAt > STATIC_VERIFY_MS) {
      lg("no heartbeat on the reused address — asking DHCP");
      fj[wSlot].lease = false;
      wUp = false; wLostAt = wConnectedAt; mdnsOk = false;
      wifiConnectSlot(wSlot);
      return;
    }
    if (wantMdns) { wantMdns = false; mdnsOk = false; startMDNS(); }
    if (!mdnsOk)  startMDNS();
    if (!otaStarted) { ArduinoOTA.begin(); otaStarted = true; lg("ArduinoOTA listening on %s:%u", cfg.host, OTA_PORT); }
    if (apUp && millis() - wConnectedAt > 20000) stopAP();   // link proven stable → drop the AP
    // The laptop went quiet: the link is dead even though the radio hasn't noticed yet.
    // Under heavy servo load the heartbeat went missing for ~0.7 s at a time while the radio stayed connected (motor
    // noise / supply dip, mod1 4 Nov): rejoining on that turned a hiccup into a 0.8-6 s outage. Linked with a good signal,
    // give it HB_LOST_LINKED_MS.
    bool linked = WiFi.status() == WL_CONNECTED && WiFi.RSSI() > -80;
    // Heard over ESP-NOW: the laptop is there, and Wi-Fi is only for uploads now. A rejoin could also hop channels
    // and cut the ESP-NOW link, so a missing Wi-Fi heartbeat does not count while ESP-NOW is linked.
    if (hbSeen && !otaBusy && !nowLinked() && wSlot <= WSLOT_DEFAULT && millis() - hbLastMs > (linked ? HB_LOST_LINKED_MS : HB_LOST_MS)) {
      hbLosses++; hbSeen = false;
      wUp = false; wLostAt = hbLastMs; mdnsOk = false; wHbRejoin = true;
      int vMin = 999, mA = 0;
      for (uint8_t i = 0; i < nServos; i++) { if (servos[i].rawVoltage > 0 && servos[i].rawVoltage < vMin) vMin = servos[i].rawVoltage; if (servos[i].rawCurrent > 0) mA += (int)(servos[i].rawCurrent * 6.5f); }
      lg("heartbeat silent %lu ms — rejoining '%s' (rssi %d, loop max %lu ms, servos %d.%d V, %d mA)", millis() - hbLastMs, ssidFor(wSlot),
         (int)WiFi.RSSI(), (unsigned long)loopMaxMs, vMin / 10, vMin % 10, mA);
      wifiConnectSlot(wSlot);
      return;
    }
    preferredCheck();
    return;
  }

  // A fast rejoin either associates almost at once or not at all (the AP moved, or still
  // holds our old session) — don't sit out the full window, go scan.
  if (wHinted && !wAssoc && millis() - wAttemptAt > HINT_JOIN_MS) wNextTry = millis();

  // Joined but no address: right after we left, the laptop's DHCP can ignore the first
  // DISCOVER and lwIP only resends ~2 s later. Its normal answer takes ~1 s, so restart
  // the client only after DHCP_KICK_MS — kicking sooner aborts answers that were coming.
  if (!wStatic && wAssoc && millis() - wAssocAt > DHCP_KICK_MS && millis() - wDhcpKickAt > DHCP_KICK_MS) {
    wDhcpKickAt = millis();
    esp_netif_t* n = esp_netif_get_handle_from_ifkey("WIFI_STA_DEF");
    if (n) { esp_netif_dhcpc_stop(n); esp_netif_dhcpc_start(n); }
  }

  if ((int32_t)(millis() - wNextTry) < 0) return;

  wFails++;

  // After ~12 failures (≈30 s) put up our own AP so the board is never unreachable.
  if (wFails >= 12 && !apUp) startAP();

  // Every 24th failure, tear the radio down and back up — clears a wedged driver /
  // a router that has stopped answering this MAC.
  if (wFails % 24 == 0) {
    lg("WiFi stuck after %u tries — re-initialising radio", wFails);
    nowStop();                               // ESP-NOW must be stopped before the driver; nowPoll() restarts it
    WiFi.disconnect(true, false);
    WiFi.mode(WIFI_OFF);
    delay(80);
    WiFi.mode(apUp ? WIFI_AP_STA : WIFI_STA);
    wifiRadioTuning();
    if (apUp) WiFi.softAP(apName, AP_PASS);
  }

  // A trial switch that failed: back to the network we came from, fast.
  if (wReturnSlot <= WSLOT_DEFAULT) {
    uint8_t r = wReturnSlot; wReturnSlot = 255;
    lg("switch failed — back to '%s'", ssidFor(r));
    wSameTries = 0; wSlot = 255;            // so the return is a fast rejoin
    wifiConnectSlot(r);
    return;
  }

  // Same network three times (fast rejoin x2, then full scan) before moving to the next slot.
  // a heartbeat gap on a good link is a short dip, not a lost network: 6 tries before the house Wi-Fi, not 3
  uint8_t s = (wSlot <= WSLOT_DEFAULT && wSameTries < (wHbRejoin ? 6 : 3) && slotUsable(wSlot)) ? wSlot : nextSlot();
  if (s == 255) { wNextTry = millis() + 10000; return; }     // nothing to try; AP is up
  wifiConnectSlot(s);
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

  // MERGE (11 Nov 2026): every servo already configured stays (name, limits, order), even if this scan missed it -
  // a loose cable or a servo being renumbered must not wipe the module's list. Only ids not in the list are added.
  // Removing a servo is an explicit /api/config/set.
  uint8_t n = oldCount, added = 0;
  for (uint8_t i = 0; i < sc.nHits && n < MAX_SERVOS; i++) {
    if (sc.hits[i].baud != bestBaud) continue;
    bool dup = false;
    for (uint8_t k = 0; k < n; k++) if (cfg.ids[k] == sc.hits[i].id) dup = true;
    if (dup) continue;                                    // a baud sweep can report an ID twice
    // Keep any label/limits already configured for this ID; only unknown IDs get defaults.
    int prev = -1;
    for (uint8_t k = 0; k < oldCount; k++) if (oldIds[k] == sc.hits[i].id) prev = k;
    if (prev >= 0) continue;                              // already in the list, kept as it is
    cfg.ids[n] = sc.hits[i].id;
    snprintf(cfg.labels[n], sizeof(cfg.labels[0]), "id %u", sc.hits[i].id);
    cfg.minDeg[n] = 0; cfg.maxDeg[n] = 360;               // unknown joint: no travel limits
    n++; added++;
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
      servos[k].targetDeg = rawToNom(servos[k].id, (uint16_t)sc.hits[i].pos);
      break;
    }
  }
  lg("scan: %u servo(s) in the list, %u new added (configured ones are never removed by a scan)", n, added);
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
    // Present = answers a ping OR a position read. Ping alone missed real servos: ids 1 and 2
    // on this bus never answered a scan ping while answering every position read, so the
    // scan reported 7 of 9. The checksummed register reads below are the real test anyway.
    bool alive = st.Ping(id) == id;
    if (!alive) alive = readRetry(id, [](uint8_t i) { return st.ReadPos(i); },
                                      [](int v) { return v >= 0 && v <= 4095; }, 2) >= 0;
    if (alive && sc.nHits < 24) {
      // Ping alone is not enough on this one-wire half-duplex bus: stale/echoed bytes
      // have produced apparent replies for every probed ID. Require valid, checksummed
      // reads from several independent registers before counting or adopting a servo.
      ScanHit h;
      h.id   = id;
      h.baud = scanBaud();
      // Each register gets a few tries: one dropped reply must not hide a real servo (that
      // rejected every servo on the bus when all four reads had to succeed first time).
      h.pos  = readRetry(id, [](uint8_t i) { return st.ReadPos(i); },
                             [](int v) { return v >= 0 && v <= 4095; }, 3);
      h.volt = readRetry(id, [](uint8_t i) { return st.ReadVoltage(i); },
                             [](int v) { return v >= 40 && v <= 160; }, 3);
      h.temp = readRetry(id, [](uint8_t i) { return st.ReadTemper(i); },
                             [](int v) { return v >= 0 && v <= 125; }, 3);
      h.mode = readRetry(id, [](uint8_t i) { return st.readByte(i, REG_MODE); },
                             [](int v) { return v >= 0 && v <= 3; }, 3);
      // Position plus one more independent register, each a checksummed reply in range.
      const bool validFeedback = h.pos >= 0 && (h.volt >= 0 || h.temp >= 0);
      if (validFeedback) {
        sc.hits[sc.nHits++] = h;
        lg("  found servo id=%u baud=%lu pos=%d volt=%d temp=%d mode=%d",
           id, (unsigned long)h.baud, h.pos, h.volt, h.temp, h.mode);
      } else {
        lg("  rejected id=%u: invalid feedback pos=%d volt=%d temp=%d mode=%d",
           id, h.pos, h.volt, h.temp, h.mode);
      }
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
  lastHttpMs = millis();                            // the laptop is talking to us: keep the radio awake (radioTick)
  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  server.sendHeader("Cache-Control",                "no-store, no-cache");
}
bool replyDefer = false; int replyCode = 0; String replyType, replyBody;
void reply(int code, const char* type, const String& body) {
  if (replyDefer) { replyCode = code; replyType = type; replyBody = body; return; }
  setCORS(); server.send(code, type, body);
}
void okJson(const String& body) { reply(200, "application/json", body); }
void okTrue() { okJson(F("{\"ok\":true}")); }
void errJson(int code, const char* msg) {
  String b = F("{\"ok\":false,\"error\":\""); b += msg; b += F("\"}");
  reply(code, "application/json", b);
}
// One handler per path for every verb; OPTIONS is answered inline for CORS preflight.
// bus=false: the handler never touches the servo bus and sends by itself (the page, the log, the OTA pull).
// radio=false: the handler writes to the web connection itself (the page, the OTA pull), so it is web-only.
struct Route { const char* path; void (*fn)(); bool bus, radio; };
Route    routes[56];
uint8_t  nRoutes = 0;
void route(const char* path, void (*fn)(), bool bus = true, bool radio = true) {
  if (nRoutes < sizeof(routes) / sizeof(routes[0])) routes[nRoutes++] = {path, fn, bus, radio};
  server.on(path, HTTP_ANY, [fn, bus]() {
    rq.fromWeb();
    if (server.method() == HTTP_OPTIONS) { setCORS(); server.send(204); return; }
    if (!bus) { fn(); return; }
    { BusLock L; replyDefer = true; replyCode = 0; fn(); replyDefer = false; }
    if (replyCode) { setCORS(); server.send(replyCode, replyType.c_str(), replyBody); replyBody = String(); }
  });
}

String buildJSON() {
  String j; j.reserve(6144);   // 12 Nov: the reply is ~4.6 KB; growing past 3200 piecewise failed on a fragmented heap and cut parts out ("espnow":} = broken JSON, the Studio showed the module offline)
  j += F("{\"ok\":true,\"resetWhy\":\""); j += resetWhy;
  j += F("\",\"lastCrumb\":\""); j += prevCrumb;
  j += F("\",\"lastCrumbMs\":"); j += prevCrumbMs;
  j += F(",\"fw\":\""); j += FW_VERSION;
  j += F("\",\"ms\":");    j += millis();
  j += F(",\"deadbandDeg\":");   j += String(deadbandUnits * DEG_PER_UNIT, 2);
  j += F(",\"deadbandUnits\":"); j += deadbandUnits;
  j += F(",\"heap\":");    j += ESP.getFreeHeap();
  // 0 = this board has NO second OTA partition, so wireless upload cannot work
  j += F(",\"otaSpace\":");   j += otaSpaceBoot;
  j += F(",\"sketchSize\":"); j += sketchSizeBoot;
  j += F(",\"animFrames\":");  j += animCount;
  j += F(",\"animPlaying\":"); j += (animPlaying ? F("true") : F("false"));
  j += F(",\"animInterrupted\":"); j += (animInterrupted ? F("true") : F("false"));
  j += F(",\"motionLocked\":"); j += (motionLocked ? F("true") : F("false"));
  j += F(",\"guardMsg\":\""); j += guardMsg; j += '"';
  j += F(",\"loopMaxMs\":"); j += (loopMaxMs > loopMaxPrev ? loopMaxMs : loopMaxPrev);
  j += F(",\"guardGapMs\":"); j += (guardGapMs > guardGapPrev ? guardGapMs : guardGapPrev);   // should stay near FAST_MS
  j += F(",\"guardPassMs\":"); j += (guardPassMs > guardPassPrev ? guardPassMs : guardPassPrev);
  j += F(",\"guardWaitMs\":"); j += (guardWaitMs > guardWaitPrev ? guardWaitMs : guardWaitPrev);
  j += F(",\"servoMisses\":"); j += servoMisses;
  j += F(",\"chipC\":"); j += String(temperatureRead(), 1);
  j += F(",\"animIdx\":");     j += animIdx;
  j += F(",\"animPlanMs\":");  j += animPlanMs;
  j += F(",\"animStretched\":"); j += (animStretched ? F("true") : F("false"));
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
    { float lo, hi; limitsFor(i, lo, hi); j += F(",\"lo\":"); j += String(lo, 1); j += F(",\"hi\":"); j += String(hi, 1); }   // travel in force (nominal)
    j += F(",\"connected\":"); j += (servoSeen(sv) ? F("true") : F("false"));
    const char* m = sv.mode == 0 ? "Position" : sv.mode == 1 ? "CW" : sv.mode == 2 ? "CCW" : "Wave";
    j += F(",\"mode\":\""); j += m; j += '"';
    j += F(",\"torque\":"); j += (sv.torqueOn ? F("true") : F("false"));
    j += F(",\"moving\":"); j += (sv.moving   ? F("true") : F("false"));
    j += F(",\"currentAngle\":");
    if (sv.rawPos >= 0) j += String(rawToNom(sv.id, (uint16_t)sv.rawPos), 2); else j += F("null");
    j += F(",\"mechAngle\":");
    if (sv.rawPos >= 0) j += String(rawToAngle((uint16_t)sv.rawPos), 2); else j += F("null");
    j += F(",\"offset\":"); j += String(offsetFor(sv.id), 1);
    j += F(",\"targetAngle\":");
    if (sv.mode == POS_MODE) j += String(sv.targetDeg, 2); else j += F("null");
    j += F(",\"rawPos\":");  j += sv.rawPos;
    j += F(",\"speed\":");   j += sv.rawSpeed;
    j += F(",\"loadRaw\":"); j += sv.rawLoad;
    j += F(",\"loadAbs\":"); j += sv.rawLoadAbs;
    j += F(",\"guard\":\""); j += guardName(guards[i].state); j += '"';
    j += F(",\"torqueLimit\":"); j += guards[i].torque;
    j += F(",\"currentmA\":");
    if (sv.rawCurrent >= 0) j += String(sv.rawCurrent * 6.5f, 1); else j += F("null");
    j += F(",\"voltageV\":");
    if (sv.rawVoltage > 0) j += String(sv.rawVoltage / 10.0f, 1); else j += F("null");
    j += F(",\"tempC\":");
    if (sv.rawTemp > 0) j += sv.rawTemp; else j += F("null");
    j += F(",\"home\":");     j += String(homeFor(sv.id), 1);
    j += F(",\"homeSet\":");  j += (hasHome(sv.id) ? F("true") : F("false"));
    j += F(",\"homeAt\":");   j += String(homeTargetFor(i), 1);   // where "home" sends it (locks: open)
    j += F(",\"speedScale\":"); j += sv.speedScale;
    j += F(",\"acc\":");        j += sv.acc;
    j += F(",\"lastCommandAgeMs\":"); j += (millis() - sv.lastCommandMs);
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
  j += F("\",\"channel\":"); j += (up ? WiFi.channel() : 0);
  j += F(",\"hbAgeMs\":");   j += (hbSeen ? (long)(millis() - hbLastMs) : -1L);
  j += F(",\"lastGapMs\":"); j += wLastGapMs;
  j += F(",\"maxGapMs\":");  j += wMaxGapMs;
  j += F("},\"espnow\":"); j += nowJson();
  j += F(",\"peers\":"); j += peersJson();
  j += '}';
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
  b += F("\",\"otaSpace\":"); b += otaSpaceBoot;
  b += F(",\"sketchSize\":"); b += sketchSizeBoot;
  b += F(",\"live\":"); b += LIVE_PORT;      // live mode: GOS asks here for pushed angles
  b += F(",\"liveOn\":"); b += (liveAwake ? F("true") : F("false"));
  b += F(",\"radioAwake\":"); b += (radioAwake ? F("true") : F("false"));
  b += F(",\"imu\":\""); b += imuName; b += '"';
  b += F(",\"chipC\":"); b += String(temperatureRead(), 1); b += '}';
  okJson(b);
}
void handleTelemetry() { okJson(buildJSON()); }
void handleLog() {
  String s; s.reserve(logCount * 60 + 32);
  uint8_t start = (uint8_t)((logHead + LOG_LINES - logCount) % LOG_LINES);
  // ?after=<ms>: only lines stamped later (the Studio's Debug Log follows the board with it). The board's uptime is the
  // first line, so a restart (uptime went back) is visible to the reader.
  bool since = rq.hasArg("after"); uint32_t after = since ? strtoul(rq.arg("after").c_str(), nullptr, 10) : 0;
  if (since) { s += F("uptime "); s += millis(); s += '\n'; }
  for (uint8_t i = 0; i < logCount; i++) {
    const String& l = logBuf[(start + i) % LOG_LINES];
    if (since && strtoul(l.c_str() + 1, nullptr, 10) <= after) continue;
    s += l; s += '\n';
  }
  reply(200, "text/plain", s);
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
  if (!rq.hasArg("servo") || !rq.hasArg("cmd")) { errJson(400, "missing args"); return; }
  String sa = rq.arg("servo");
  String cmd = rq.arg("cmd"); cmd.toLowerCase();

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
  if (cmd != "pos") lg("%s: %s (from the laptop)", cfg.labels[slotOf(sv->id)], cmd.c_str());   // slider moves: too many to log

  float   angle = rq.hasArg("angle") ? rq.arg("angle").toFloat() : sv->targetDeg;
  int     speed = rq.hasArg("speed") ? rq.arg("speed").toInt()   : 10;
  uint8_t acc   = (uint8_t)(rq.hasArg("acc") ? constrain(rq.arg("acc").toInt(), 1, 100)
                                                 : POS_ACC_DEFAULT);
  if (cmd == "pos" || cmd == "torqueon" || cmd == "torquetoggle" || cmd == "home") motionLocked = false;
  if (cmd == "pos") { cmdPos(*sv, angle, speed, acc); okTrue(); return; }
  if (cmd == "stop" || cmd == "estop" ||
      cmd == "torquetoggle" || cmd == "torqueon" || cmd == "torqueoff" || cmd == "home") {
    applyCmd(*sv, cmd); okTrue(); return;
  }
  errJson(400, "unknown cmd");
}

void handleBatch() {
  if (!motionLocked) lastMotionMs = millis();
  if (motionLocked) { errJson(423, "locked after power-on: nothing moves until you press Turn torque ON, Go to manual home or a servo's own button"); return; }
  bc("batch move"); lg("move: several joints at once (from the laptop)");
  int     spd = rq.hasArg("speed") ? constrain(rq.arg("speed").toInt(), 1, 10) : 5;
  uint8_t acc = (uint8_t)(rq.hasArg("acc") ? constrain(rq.arg("acc").toInt(), 1, 100)
                                               : POS_ACC_DEFAULT);
  // dt=<ms> = a live stream (Sync): steps arrive this far apart. Each joint then gets its OWN speed, sized so it covers the
  // distance from where it really is in ~1.6 steps: still moving when the next step lands, so no dash-and-stop per step and
  // all joints arrive together (12 Nov 2026, Nischay: Sync "moves like frames"). Without dt: speed 1..10 as before.
  int streamMs = rq.hasArg("dt") ? constrain(rq.arg("dt").toInt(), 20, 500) : 0;
  uint8_t  ids[MAX_SERVOS]; int16_t pos[MAX_SERVOS];
  uint16_t spds[MAX_SERVOS]; uint8_t accs[MAX_SERVOS];
  uint8_t cnt = 0, refused = 0;

  for (uint8_t i = 0; i < nServos; i++) {
    ServoState& sv = servos[i];
    String key = String(sv.id);
    if (!rq.hasArg(key)) continue;
    float lo, hi; limitsFor(i, lo, hi);
    if (!guardAllows(i, nomToRaw(sv.id, clampF(rq.arg(key).toFloat(), lo, hi)))) { refused++; continue; }
    sv.mode = POS_MODE;
    setHwMode(sv, POS_MODE);
    ensureTorque(sv);
    sv.targetDeg     = clampF(rq.arg(key).toFloat(), lo, hi);
    sv.targetRaw     = nomToRaw(sv.id, sv.targetDeg);
    sv.speedScale    = spd;
    sv.speedRaw      = speedScaleToRaw(spd);
    sv.acc           = acc;
    if (streamMs) {
      int32_t cur = sv.rawPos >= 0 ? sv.rawPos : (int32_t)sv.targetRaw;
      float v = fabsf((float)sv.targetRaw - (float)cur) / (streamMs / 1000.0f * 1.6f);   // encoder units / s
      sv.speedRaw = (uint16_t)constrain((int)lroundf(v), 40, 3400);
      sv.acc = 100;                                   // quick speed changes: the stream itself is the smooth path
    }
    sv.lastCommandMs = millis();
    ids[cnt] = sv.id; pos[cnt] = (int16_t)sv.targetRaw;
    spds[cnt] = sv.speedRaw; accs[cnt] = sv.acc;
    cnt++;
  }
  if (cnt == 1)     { posEx(ids[0], pos[0], spds[0], accs[0]); delay(3); }
  else if (cnt > 1) { syncPosEx(ids, cnt, pos, spds, accs);    delay(3); }
  String b = F("{\"ok\":true,\"sent\":"); b += cnt;
  if (refused) { b += F(",\"refused\":"); b += refused; b += F(",\"why\":\""); b += guardMsg; b += '"'; }
  b += '}';
  okJson(b);
}

// GET /api/home[?raw=1]    all servos -> straight (nominal 180); raw=1: mechanical 180
// GET /api/home?manual=1    all servos -> their stored home (the built-in straight pose where unset)
// Everything above the board speaks NOMINAL angles (180 = straight), so "home" is the straight
// pose whichever way it is asked for. ?raw=1 sends every joint to the MECHANICAL 180 instead
// (seating a horn at the true middle of the servo's travel).
void handleHome() {
  bool manual = rq.hasArg("manual") && rq.arg("manual") != "0";
  bool raw = rq.hasArg("raw") && rq.arg("raw") != "0";
  bc(raw ? "home all -> mechanical 180" : "home all -> straight (nominal 180)");
  lg(raw ? "home: every joint to mechanical 180" : "home: every joint to its manual home");
  homeAll(manual, raw);
  motionLocked = false;
  okTrue();
}

// GET /api/home/manual                 same as /api/home?manual=1
void handleHomeManual() { bc("home all -> straight (nominal 180)"); lg("home: every joint to its manual home"); homeAll(true); motionLocked = false; okTrue(); }

// GET /api/home/set                    capture EVERY servo's current angle as its home
// GET /api/home/set?id=N               just this one
// GET /api/home/set?id=N&deg=142.5     set it to an explicit angle instead
// GET /api/home/set?id=N&clear=1       forget it (no correction until a home is saved again)
void handleHomeSet() {
  bool clear = rq.hasArg("clear") && rq.arg("clear") != "0";
  String out = F("{\"ok\":true,\"homes\":[");
  uint8_t n = 0;

  for (uint8_t i = 0; i < nServos; i++) {
    ServoState& sv = servos[i];
    if (rq.hasArg("id") && rq.arg("id") != "all" &&
        (uint8_t)rq.arg("id").toInt() != sv.id) continue;

    if (clear) { clearHomeFor(sv.id); }
    else if (rq.hasArg("deg")) { setHomeFor(sv.id, rq.arg("deg").toFloat()); }
    else {
      // Capture what the joint is ACTUALLY at. A servo that never answered has no angle
      // to capture, so it is skipped rather than silently homed to a stale reading.
      if (sv.rawPos < 0) continue;
      setHomeFor(sv.id, rawToAngle((uint16_t)sv.rawPos));   // the home is MECHANICAL: where the horn really is
    }
    // the offset just changed, so the nominal view of where the joint is/was sent has moved
    sv.targetDeg = rawToNom(sv.id, sv.targetRaw);
    tuneAngleLimits(sv);                              // the servo's own travel limits follow the new home
    if (n++) out += ',';
    out += F("{\"id\":");   out += sv.id;
    out += F(",\"home\":"); out += String(homeFor(sv.id), 1);
    out += '}';
  }
  homesSave();
  bc(clear ? "home positions cleared" : "home positions saved"); lg(clear ? "home positions cleared" : "home positions saved (current pose = manual home)");
  out += F("],\"count\":"); out += n; out += '}';
  okJson(out);
}

// POST /api/anim/load   body:
//   V2 <frameCount> <checksum>          (V1 is accepted too: no hold column)
//   <timeMs> <speed> <holdMs> <id>:<deg> <id>:<deg> ...
//   timeMs 0 = auto. speed is a velocity cap. holdMs pauses after arrival.
//   ...
// The header states how many frames to expect and a checksum over the body; a partial or
// mangled upload therefore fails validation instead of being played. Nothing replaces the
// stored sequence until the whole thing parses — a half-received upload leaves the
// previous one intact rather than half-wrecking it.
void handleAnimLoad() {
  if (!rq.hasArg("plain")) { errJson(400, "empty body"); return; }
  String body = rq.arg("plain");

  int nl = body.indexOf('\n');
  if (nl < 0) { errJson(400, "no header line"); return; }
  String head = body.substring(0, nl);
  head.trim();
  const bool v2 = head.startsWith("V2 ");
  if (!v2 && !head.startsWith("V1 ")) { errJson(400, "bad header (expected V1 or V2)"); return; }

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
    f.holdMs = 0;
    int q = sp2 + 1;
    if (v2) {
      int sp3 = line.indexOf(' ', sp2 + 1);
      if (sp3 < 0) { errJson(400, "bad frame line"); return; }
      f.holdMs = (uint16_t)constrain(line.substring(sp2 + 1, sp3).toInt(), 0, 60000);
      q = sp3 + 1;
    }
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
  animSine = !(rq.hasArg("sine") && rq.arg("sine") == "0");
  if (rq.hasArg("sync")) { animSync = rq.arg("sync") == "1"; prefs.putBool("animSync", animSync); }
  animLoop = rq.hasArg("loop") && rq.arg("loop") != "0";
  // mods=1.2.3: who is in the group, so a module that never starts is noticed (older laptop code: not given)
  grp.reset(rq.hasArg("group") ? (uint32_t)strtoul(rq.arg("group").c_str(), nullptr, 10) : 0,
            rq.hasArg("mods") ? Group::members(rq.arg("mods").c_str()) : 0);
  grp.me = myModule(); grpPeerS = 2;
  grpArmedUntil = millis() + GROUP_ARMED_MS;
  lg("anim loaded: %u frames, sine %s, loop %s%s", animCount,
     animSine ? "on" : "off", animLoop ? "on" : "off", grp.on() ? ", group play (laptop starts all at one instant)" : "");

  animFixed = false;
  String r = F("{\"ok\":true,\"frames\":"); r += animCount;
  r += F(",\"sine\":"); r += (animSine ? F("true") : F("false"));
  r += F(",\"loop\":"); r += (animLoop ? F("true") : F("false"));
  r += F(",\"needMs\":["); animNeeds(r); r += ']';
  r += '}';
  okJson(r);
}

// Every frame's time on THIS module (the same rule as animSendFrame), each from the pose before it (frame 1 from where the
// joints are now). The laptop takes the longest per frame over all modules -> one timetable (play?times=).
void animNeeds(String& r) {
  const float rf = animSine ? ANIM_RF_SINE : ANIM_RF_LINEAR;
  int32_t at[MAX_SERVOS];
  for (uint8_t i = 0; i < nServos; i++) at[i] = servos[i].rawPos >= 0 ? servos[i].rawPos : (int32_t)servos[i].targetRaw;
  for (uint8_t k = 0; k < animCount; k++) {
    const AnimFrame& f = anim[k];
    const float vCap = min(max(1, (int)f.speed) / 10.0f * ANIM_VMAX, (float)capRaw()), aMax = vCap / ANIM_RAMP_S;
    float Tmin = 0;
    for (uint8_t i = 0; i < f.n; i++) {
      int slot = slotOf(f.ids[i]); if (slot < 0) continue;
      float lo, hi; limitsFor((uint8_t)slot, lo, hi);
      int32_t want = nomToRaw(servos[slot].id, clampF(f.deg10[i] / 10.0f, lo, hi));
      float D = (float)labs(want - at[slot]); at[slot] = want;
      if (D >= 4.0f) Tmin = max(Tmin, max(D / (vCap * (1.0f - rf)), sqrtf(D / (rf * (1.0f - rf) * aMax))));
    }
    float T = max(max(f.timeMs / 1000.0f, Tmin), 0.12f);
    if (k) r += ',';
    r += (uint32_t)lroundf(T * 1000.0f);
  }
}

// Start playing from frame `from` (the laptop's play, or a GO from the module the laptop asked).
void animStart(uint8_t from) {
  if (from >= animCount) from = 0;
  bc("anim play (%u frames%s)", animCount, grp.on() ? ", group" : "");
  memset(animPeakmA, 0, sizeof animPeakmA); memset(animPeakLoad, 0, sizeof animPeakLoad);
  animPlaying = true; animInterrupted = false; motionLocked = false; animEnd = 0; animFrameAt = millis();
  prefs.putUChar("animRun", 1);         // remembered across a power cut, so the next boot can say it was interrupted
  grpStep = from; grpPeerS = 2; grpPlaceMs = 0;
  if (grp.on()) grp.startPlay(millis());   // what partners said before belongs to an earlier run
  animBeginFrame(from);
}

void groupTick();
// GET /api/anim/play?from=0&loop=0. In a group the laptop asks ONE module: it says GO to the others and starts with them.
void handleAnimPlay() {
  if (animCount == 0) { errJson(409, "no sequence loaded"); return; }
  if (rq.hasArg("loop")) animLoop = rq.arg("loop") != "0";
  uint8_t from = rq.hasArg("from") ? (uint8_t)rq.arg("from").toInt() : 0;
  if (from >= animCount) from = 0;
  animFixed = false;
  if (rq.hasArg("times")) {             // the timetable: one time (ms) per frame, the same for every module
    String t = rq.arg("times"); uint8_t k = 0; int i = 0;
    while (i < (int)t.length() && k < MAX_FRAMES) {
      int j = t.indexOf('.', i); if (j < 0) j = t.length();
      animFixMs[k++] = (uint16_t)constrain(t.substring(i, j).toInt(), 120, 60000); i = j + 1;
    }
    if (k != animCount) { errJson(409, "timetable does not match the uploaded frames - upload again"); return; }
    animFixed = true;
  }
  if (rq.hasArg("at")) {                // timed start: `at` = the instant in THIS module's millis() (from /api/clock)
    const uint32_t at = (uint32_t)strtoul(rq.arg("at").c_str(), nullptr, 10);
    const int32_t in = (int32_t)(at - millis());
    if (in < 20 || in > 10000) { errJson(409, in < 20 ? "start time already passed - nothing started" : "start time too far"); return; }
    if (animPlaying) animStop();
    grpStep = from; grpStartStep = from; grpStartAt = at; animEnd = 0;
    lg("anim: starting in %ld ms (same instant as the other modules, set by the laptop)%s", (long)in, animFixed ? " - fixed timetable, runs on its own" : "");
    String r = F("{\"ok\":true,\"startsInMs\":"); r += in; r += '}';
    okJson(r);
    return;
  }
  animStart(from);
  okTrue();
}

// GET /api/anim/stop[?why=text]: the laptop says why (13 Nov: "the log did not say why it stopped")
void handleAnimStop() {
  if (animPlaying || grpStartAt) note("anim stopped by the laptop: %s", rq.hasArg("why") ? rq.arg("why").c_str() : "Stop pressed");
  animStop(); okTrue();
}
// GET /api/anim/wait?on=1|0: pause / go on (another module is behind). on=1 lasts 1.5 s; the laptop repeats it.
void handleAnimWait() {
  const bool on = rq.hasArg("on") && rq.arg("on") != "0";
  if (on && !animWaitHeld() && animPlaying) lg("anim: waiting - another module is behind");
  animWaitUntil = on ? millis() + 1500 : 0;
  okTrue();
}
// GET /api/clock -> {"ok":true,"ms":<millis()>}: the laptop reads every module's clock to give them one start instant
void handleClock() { String r = F("{\"ok\":true,\"ms\":"); r += (uint32_t)millis(); r += '}'; okJson(r); }

// GET /api/hold -> {"ok":true,"held":N}: stop every joint where it is and hold (torque stays on), like the master's
// HOLD. For the laptop's stop-all when the master is not plugged in (gos robot stop goes over Wi-Fi then).
uint8_t nowHold();
void handleHold() {
  animStop(); grpDisarm();
  const uint8_t held = nowHold();
  note("HOLD from the laptop (Wi-Fi) - %u joint(s) stopped where they were, holding", held);
  String r = F("{\"ok\":true,\"held\":"); r += held; r += '}';
  okJson(r);
}

// GET /api/anim/sync          -> {"sync":true|false}
// GET /api/anim/sync?on=1|0   Sync motion on/off, remembered across reboots (takes effect from the next frame)
void handleAnimSync() {
  if (rq.hasArg("on")) { animSync = rq.arg("on") == "1"; prefs.putBool("animSync", animSync); lg("Sync motion %s", animSync ? "on" : "off"); }
  String r = F("{\"ok\":true,\"sync\":"); r += animSync ? F("true") : F("false"); r += '}';
  okJson(r);
}

void handleAnimStatus() {
  String r = F("{\"ok\":true,\"frames\":"); r += animCount;
  r += F(",\"playing\":"); r += (animPlaying ? F("true") : F("false"));
  r += F(",\"idx\":");     r += (animPlaying ? animIdx : 0);
  r += F(",\"sine\":");    r += (animSine ? F("true") : F("false"));
  r += F(",\"sync\":");    r += (animSync ? F("true") : F("false"));
  if (animSyncOn() && animPlaying) {
    // behind: one of OUR joints is behind and this module waits for it -> the laptop pauses the other modules
    r += F(",\"behind\":"); r += (syncMv.laggard >= 0 && syncMv.lag >= SYNC_CFG.lagMax) ? F("true") : F("false");
    r += F(",\"held\":");   r += animWaitHeld() ? F("true") : F("false");
    r += F(",\"progress\":"); r += String(syncMv.s, 3);
    r += F(",\"gap\":");      r += String(syncMv.lag, 3);
    r += F(",\"waitingOn\":\""); r += syncMv.laggard >= 0 ? cfg.labels[syncSlot[syncMv.laggard]] : ""; r += '"';
  }
  r += F(",\"loop\":");    r += (animLoop ? F("true") : F("false"));
  r += F(",\"ended\":");   r += animEnd;                          // 1 finished, 2 stopped
  r += F(",\"startAt\":"); r += (uint32_t)grpStartAt;            // a timed start still waiting (0 = none)
  if (grp.on()) {
    r += F(",\"group\":"); r += grp.id;
    r += F(",\"armed\":"); r += (grpArmed() ? F("true") : F("false"));
    r += F(",\"peers\":"); r += grp.np;
    r += F(",\"waitingFor\":"); r += grp.waitingOn;   // module number we wait for at a frame end (0 = nobody)
  }
  r += '}';
  okJson(r);
}

// GET /api/servo/deadband                 report the current hold freedom
// GET /api/servo/deadband?deg=1.0         set it (rounded to the nearest 0.088 deg unit)
// Applied to every servo immediately and remembered across reboots. tuneByteIfDiff only
// writes when the value actually changes, so repeated calls do not wear the servo EPROM.
void handleDeadband() {
  if (rq.hasArg("deg") || rq.hasArg("units")) {
    int units = rq.hasArg("units")
              ? rq.arg("units").toInt()
              : (int)lroundf(rq.arg("deg").toFloat() / DEG_PER_UNIT);
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

// GET /api/servo/home?id=N[&raw=1]   send one servo to straight (nominal 180); raw=1: mechanical 180
void handleServoHome() {
  if (!rq.hasArg("id")) { errJson(400, "need id"); return; }
  uint8_t id = (uint8_t)rq.arg("id").toInt();
  int slot = slotOf(id);
  if (slot < 0) { errJson(404, "servo not in the current list"); return; }
  // nominal 180 IS the straight pose, so "180" and "home" are the same place now; raw=1 is the
  // mechanical 180 (nominal 180 minus this joint's offset)
  bool raw = rq.hasArg("raw") && rq.arg("raw") != "0";
  float target = raw ? 180.0f - offsetFor(id) : homeTargetFor((uint8_t)slot);   // locks: open
  gotoDeg((uint8_t)slot, target);
  motionLocked = false;
  String r = F("{\"ok\":true,\"id\":"); r += id;
  r += F(",\"target\":"); r += String(target, 1); r += '}';
  okJson(r);
}
void handleTune() { bc("tune all"); lg("servos re-tuned"); tuneAllServos(); okTrue(); }

// GET /api/lock?do=lock|unlock[&id=N][&dir=1|-1]   both locks (or servo N), slowly: unlock = manual home,
//                                                  lock = home + dir x 45 (dir from the dock, default -1)
// GET /api/speedcap            -> {"ok":true,"pct":30}
// GET /api/speedcap?pct=N      -> every servo of this board at most N % speed from now on (5..100, saved)
void handleSpeedCap() {
  if (rq.hasArg("pct")) {
    speedCapPct = (uint8_t)constrain(rq.arg("pct").toInt(), 5, 100);
    prefs.putUChar("spdCap", speedCapPct);
    lg("speed limit set to %u %% for every servo", speedCapPct);
  }
  String r = F("{\"ok\":true,\"pct\":"); r += speedCapPct; r += '}'; okJson(r);
}

void handleLock() {
  const String what = rq.arg("do");
  if (what != "lock" && what != "unlock") { errJson(400, "need do=lock or do=unlock"); return; }
  const bool locked = what == "lock";
  const int only = rq.hasArg("id") ? rq.arg("id").toInt() : -1;
  const int dir = rq.hasArg("dir") && rq.arg("dir").toInt() > 0 ? 1 : -1;
  String r = F("{\"ok\":true,\"do\":\""); r += what; r += F("\",\"locks\":[");
  uint8_t n = 0;
  for (uint8_t i = 0; i < nServos; i++) {
    if (!isLockSlot(i) || (only >= 0 && servos[i].id != only)) continue;
    { const float fin = lockTargetFor(locked, dir), over = lockOverTarget(i, fin);
      cmdPos(servos[i], over, LOCK_SPEED, POS_ACC_DEFAULT); lockSettleStart(i, fin, over); }
    if (n++) r += ',';
    r += F("{\"id\":"); r += servos[i].id; r += F(",\"label\":\""); r += cfg.labels[i];
    r += F("\",\"target\":"); r += String(servos[i].targetDeg, 1); r += '}';
  }
  if (!n) { errJson(404, only >= 0 ? "that servo is not a lock" : "no lock servos (labels LOCK1/LOCK2) on this module"); return; }
  motionLocked = false;
  lg("%s: %u lock(s) -> %s", locked ? "LOCK" : "UNLOCK", n, !locked ? "manual home" : dir > 0 ? "manual home + 45" : "manual home - 45");
  r += "]}"; okJson(r);
}
// GET /api/guard            settings and every joint's guard state
// GET /api/guard/clear?id=N  (or id=all) back to normal where it is now
void handleGuard() {
  auto c = [](const GuardCfg& g) {
    String o = F("{\"loadTrip\":"); o += g.loadTrip; o += F(",\"currTripmA\":"); o += g.currTripmA; o += F(",\"calm\":"); o += g.calm;
    o += F(",\"tripMs\":"); o += g.tripMs; o += F(",\"ceiling\":"); o += g.ceiling; o += F(",\"holdTorque\":"); o += g.holdTorque;
    o += F(",\"warmC\":"); o += g.warmC; o += F(",\"hotC\":"); o += g.hotC; o += '}'; return o; };
  String r = F("{\"ok\":true,\"bend\":"); r += c(guardSet.bend); r += F(",\"lock\":"); r += c(guardSet.lock);
  r += F(",\"msg\":\""); r += guardMsg; r += F("\",\"joints\":[");
  for (uint8_t i = 0; i < nServos; i++) {
    if (i) r += ',';
    r += F("{\"id\":"); r += servos[i].id; r += F(",\"state\":\""); r += guardName(guards[i].state);
    r += F("\",\"torque\":"); r += guards[i].torque; r += F(",\"blockDir\":"); r += guards[i].blockDir; r += '}';
  }
  r += "]}"; okJson(r);
}
void handleGuardSet() {
  if (rq.hasArg("everyMs")) guardEveryMs = (uint16_t)constrain(rq.arg("everyMs").toInt(), 0, 500);
  String r = F("{\"ok\":true,\"everyMs\":"); r += guardEveryMs; r += '}'; okJson(r);
}
void handleGuardClear() {
  String a = rq.hasArg("id") ? rq.arg("id") : String("all");
  guardClear(a == "all" ? -1 : a.toInt());
  okTrue();
}

void handleTorqueAll() {
  bool on = !rq.hasArg("on") || rq.arg("on") != "0";
  bc("torque all %s (%u servos)", on ? "ON" : "OFF", nServos); lg("torque %s on all %u servos", on ? "ON (holding)" : "OFF (limp)", nServos);
  if (on) { torqueOnAll(); motionLocked = false; } else torqueOffAll();
  okJson(on ? F("{\"ok\":true,\"torque\":\"on\"}") : F("{\"ok\":true,\"torque\":\"off\"}"));
}

// Wiggle one servo ±8° so you can SEE which physical joint an ID belongs to.
void handleIdentify() {
  if (!rq.hasArg("id")) { errJson(400, "missing id"); return; }
  uint8_t id = (uint8_t)rq.arg("id").toInt();
  // A single dropped reply used to abort identify ("no reply") with nothing moving. Retry,
  // then fall back to the position telemetry last saw for this id.
  int base = readRetry(id, [](uint8_t i) { return st.ReadPos(i); },
                           [](int v) { return v >= 0 && v <= 4095; }, 4);
  if (base < 0) { ServoState* s0 = byId(id); if (s0 && s0->rawPos >= 0) base = s0->rawPos; }
  if (base < 0) { errJson(404, "no reply from that id"); return; }
  st.writeByte(id, REG_MODE, POS_MODE); delay(19);
  st.EnableTorque(id, 1); delay(2);
  const int d = 90;                            // ~8° in raw counts
  for (uint8_t k = 0; k < 3; k++) {
    posEx(id, constrain(base + d, 0, 4095), 2000, 60); delay(160);
    posEx(id, constrain(base - d, 0, 4095), 2000, 60); delay(160);
  }
  posEx(id, base, 1500, 40); delay(120);
  ServoState* sv = byId(id);
  if (sv) { sv->hwMode = POS_MODE; sv->torqueOn = true; sv->lastCommandMs = millis(); }
  String b = F("{\"ok\":true,\"id\":"); b += id; b += F(",\"pos\":"); b += base; b += '}';
  okJson(b);
}

// ── Raw bus capture (diagnostics) ────────────────────────────────────────────
// GET /api/bus/raw?id=N[&n=3] — sends a plain "read position" frame to one id and records
// every byte that comes back for 6ms, with its arrival time in microseconds after TX
// finished. Shows directly whether our own request echoes, when the servo answers, and
// whether the reply is intact: no library parsing in between.
void handleBusRaw() {
  if (!rq.hasArg("id")) { errJson(400, "missing id"); return; }
  const uint8_t id = (uint8_t)rq.arg("id").toInt();
  const int trials = rq.hasArg("n") ? constrain(rq.arg("n").toInt(), 1, 8) : 3;
  // &ping=1 sends a PING (FF FF id 02 01 chk) instead of the position read.
  const bool ping = rq.hasArg("ping") && rq.arg("ping") != "0";
  uint8_t pkt[8] = { 0xFF, 0xFF, id, 4, 2, 56, 2, 0 };
  int plen = 8;
  if (ping) { pkt[3] = 2; pkt[4] = 1; plen = 6; }
  uint8_t sum = 0; for (int i = 2; i < plen - 1; i++) sum += pkt[i]; pkt[plen - 1] = ~sum;
  String j = F("{\"ok\":true,\"id\":"); j += id; j += F(",\"baud\":"); j += cfg.baud;
  j += F(",\"sent\":\"");
  for (int i = 0; i < plen; i++) { char h[4]; snprintf(h, sizeof(h), "%02X ", pkt[i]); j += h; }
  j += F("\",\"trials\":[");
  for (int t = 0; t < trials; t++) {
    flushBus();
    st.txDrive(true);
    Serial1.write(pkt, plen);
    Serial1.flush();
    st.txDrive(false);
    const unsigned long t0 = micros();
    uint8_t b[48]; unsigned long at[48]; int n = 0;
    while (micros() - t0 < 6000UL && n < 48) {
      const int c = Serial1.read();
      if (c != -1) { b[n] = (uint8_t)c; at[n] = micros() - t0; n++; }
    }
    if (t) j += ',';
    j += F("{\"n\":"); j += n; j += F(",\"bytes\":\"");
    for (int i = 0; i < n; i++) { char h[16]; snprintf(h, sizeof(h), "%02X@%lu ", b[i], at[i]); j += h; }
    j += F("\"}");
    delay(5);
  }
  j += F("]}");
  okJson(j);
}

// ── Scan endpoints ───────────────────────────────────────────────────────────
void handleScan() {
  if (sc.active) { errJson(409, "scan already running"); return; }
  uint8_t from = rq.hasArg("from") ? rq.arg("from").toInt() : 1;
  uint8_t to   = rq.hasArg("to")   ? rq.arg("to").toInt()   : 20;
  bool allBaud = rq.hasArg("allbaud") && rq.arg("allbaud") != "0";
  // adopt=0 → a read-only detect: report what answers, change nothing.
  scAdopt = !(rq.hasArg("adopt") && rq.arg("adopt") == "0");
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
  if (!rq.hasArg("from") || !rq.hasArg("to")) { errJson(400, "need from & to"); return; }
  uint8_t a = (uint8_t)rq.arg("from").toInt();
  uint8_t b = (uint8_t)rq.arg("to").toInt();
  if (a < 1 || a > 253 || b < 1 || b > 253) { errJson(400, "id out of range 1..253"); return; }

  // The write is addressed to one id, so with unique ids it is safe even on a full bus.
  // What the firmware still refuses, unless forced, is the genuinely dangerous pair:
  // a source the last detect never saw, or a target that is already taken (which would
  // leave two servos colliding on the same id, and scanning cannot tell them apart).
  bool force = rq.hasArg("force") && rq.arg("force") != "0";
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
  if (!rq.hasArg("id") || !rq.hasArg("idx")) { errJson(400, "need id & idx"); return; }
  uint8_t id  = (uint8_t)rq.arg("id").toInt();
  uint8_t idx = (uint8_t)constrain(rq.arg("idx").toInt(), 0, 7);
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
  if (!rq.hasArg("id")) { errJson(400, "need id"); return; }
  uint8_t id = (uint8_t)rq.arg("id").toInt();
  if (st.Ping(id) == -1) { errJson(404, "no reply"); return; }
  st.CalibrationOfs(id); delay(20);
  int pos = st.ReadPos(id);
  lg("servo %u centred, pos now %d", id, pos);
  String r = F("{\"ok\":true,\"id\":"); r += id; r += F(",\"pos\":"); r += pos; r += '}';
  okJson(r);
}
void handleOfs() {
  if (!rq.hasArg("id") || !rq.hasArg("val")) { errJson(400, "need id & val"); return; }
  uint8_t id = (uint8_t)rq.arg("id").toInt();
  int val = rq.arg("val").toInt();
  st.unLockEprom(id);                          delay(10);
  st.writeWord(id, REG_OFS, (uint16_t)val);    delay(20);
  st.LockEprom(id);                            delay(10);
  String r = F("{\"ok\":true,\"id\":"); r += id; r += F(",\"ofs\":"); r += val; r += '}';
  okJson(r);
}
void handleRegRead() {
  if (!rq.hasArg("id") || !rq.hasArg("addr")) { errJson(400, "need id & addr"); return; }
  uint8_t id   = (uint8_t)rq.arg("id").toInt();
  uint8_t addr = (uint8_t)rq.arg("addr").toInt();
  uint8_t len  = rq.hasArg("len") ? (uint8_t)rq.arg("len").toInt() : 2;
  int val = (len == 1) ? st.readByte(id, addr) : st.readWord(id, addr);
  String r = F("{\"ok\":"); r += (val < 0 ? F("false") : F("true"));
  r += F(",\"id\":");   r += id;
  r += F(",\"addr\":"); r += addr;
  r += F(",\"len\":");  r += len;
  r += F(",\"value\":");r += val; r += '}';
  okJson(r);
}
void handleRegWrite() {
  if (!rq.hasArg("id") || !rq.hasArg("addr") || !rq.hasArg("val")) {
    errJson(400, "need id, addr & val"); return;
  }
  uint8_t id   = (uint8_t)rq.arg("id").toInt();
  uint8_t addr = (uint8_t)rq.arg("addr").toInt();
  uint8_t len  = rq.hasArg("len") ? (uint8_t)rq.arg("len").toInt() : 2;
  int     val  = rq.arg("val").toInt();
  bool unlock  = rq.hasArg("unlock") && rq.arg("unlock") != "0";
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
  if (rq.hasArg("host")) {
    String h = rq.arg("host"); h.trim();
    if (h.length() && h.length() < sizeof(cfg.host)) {
      hostChanged = h != String(cfg.host);
      strlcpy(cfg.host, h.c_str(), sizeof(cfg.host));
    }
  }
  if (rq.hasArg("baud")) {
    uint32_t b = (uint32_t)rq.arg("baud").toInt();
    if (b >= 9600 && b <= 1000000) cfg.baud = b;
  }

  if (rq.hasArg("servos")) {
    String s = rq.arg("servos");
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
  j += F(",\"slot\":");  j += (wSlot <= WSLOT_DEFAULT ? (int)wSlot : -1);
  j += F(",\"channel\":"); j += (WiFi.status() == WL_CONNECTED ? WiFi.channel() : 0);
  j += F(",\"hb\":{\"seen\":"); j += (hbSeen ? F("true") : F("false"));
  j += F(",\"ageMs\":");   j += (hbSeen ? (long)(millis() - hbLastMs) : -1L);
  j += F(",\"count\":");   j += hbCount;
  j += F(",\"losses\":");  j += hbLosses;
  j += F("},\"lastGapMs\":"); j += wLastGapMs;
  j += F(",\"maxGapMs\":"); j += wMaxGapMs;
  j += F(",\"slots\":[");
  for (uint8_t i = 0; i < 3; i++) { if (i) j += ','; j += '"'; j += cfg.ssid[i]; j += '"'; }
  j += F("]}");
  okJson(j);
}
void handleWifiSet() {
  if (!rq.hasArg("slot")) { errJson(400, "need slot"); return; }
  uint8_t s = (uint8_t)constrain(rq.arg("slot").toInt(), 0, 2);
  String ssid = rq.arg("ssid");
  String pass = rq.arg("pass");
  bool force  = rq.hasArg("force");
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
// Make the machine safe before we stop servicing it: torque off,
// radio at full power, CPU at full speed so the flash write is fast and reliable.
extern uint32_t otaRadioMs;
void prepareForOta(const char* how) {
  otaBusy = true;
  otaRadioMs = millis();             // 12 Nov: the stall watch (otaRadioTick) covers EVERY update, from its very start
  prefs.putUChar("otaBoot", 1);      // the boot after an update stays limp (setup): an update never moves a motor
  lg("OTA (%s) starting — de-torquing servos", how);
  { BusLock L; for (uint8_t i = 0; i < nServos; i++) { st.EnableTorque(servos[i].id, 0); delay(2); servos[i].torqueOn = false; } }
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
  if (Update.isRunning()) Update.abort();   // 12 Nov: a failed/cut upload left Update "running" -> every later begin refused ("No Error") until a reboot
  otaBusy = false;
  prefs.putUChar("otaBoot", 0);
  setCpuFrequencyMhz(80);
  WiFi.setSleep(ROBO_WIFI_PS);
  WiFi.setTxPower((wifi_power_t)txQ4);   // 12 Nov: default 15 dBm (Nischay); /api/radio?tx= changes it live
}

void handleOtaUpload() {
  HTTPUpload& up = server.upload();
  if (up.status == UPLOAD_FILE_START) {
    prepareForOta("http");
    // The browser sends the file's exact length as ?size=. Telling Update the real size
    // is what makes a truncated transfer fail loudly here instead of being finalised into
    // an image the bootloader then refuses ("Could Not Activate The Firmware").
    otaExpected  = rq.hasArg("size") ? (size_t)rq.arg("size").toInt() : 0;
    otaGot       = 0;
    otaSum       = 2166136261u;
    otaAccepting = Update.begin(otaExpected ? otaExpected : UPDATE_SIZE_UNKNOWN);
    if (!otaAccepting)
      lg("Update.begin failed: %s (want %u bytes, partition has %u)",
         Update.errorString(), (unsigned)otaExpected, (unsigned)ESP.getFreeSketchSpace());
    else
      lg("OTA receiving %u bytes", (unsigned)otaExpected);
  } else if (up.status == UPLOAD_FILE_WRITE) {
    otaRadioMs = millis();
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
  if (!rq.hasArg("u")) { errJson(400, "need u=<url>"); return; }
  String url = rq.arg("u");
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

// ── The web page and firmware updates over ESP-NOW (7 Nov 2026, Nischay: "why not over ESP-NOW too?") ───────────────
// The laptop's bridge (gos/espnow.py) fetches the page in pieces (/api/page) and caches it, and uploads firmware in
// 2 KB pieces (/api/ota/begin -> part -> finish), base64 in the request body. Same safety as the Wi-Fi upload: servos
// limp first (prepareForOta), size and FNV-1a checked, the new firmware only becomes active after the last piece.
// A stalled radio upload (no piece for RADIO_OTA_STALL_MS) is dropped and the old firmware keeps running.
#define RADIO_OTA_STALL_MS 20000
uint32_t otaRadioMs = 0, otaRestartAt = 0, otaWantSum = 0;
uint32_t pageSum = 0;

// GET /api/page?info=1 -> {"size":N,"sum":"fnv1a hex"};  /api/page?off=K&len=M -> those bytes of the page
void handlePage() {
  const size_t size = sizeof(WEBUI_HTML) - 1;
  if (rq.hasArg("info")) {
    if (!pageSum) { uint32_t h = 2166136261u; for (size_t i = 0; i < size; i++) { h ^= (uint8_t)WEBUI_HTML[i]; h *= 16777619u; } pageSum = h; }
    String b = F("{\"ok\":true,\"size\":"); b += (unsigned)size; b += F(",\"sum\":\""); b += String(pageSum, 16); b += F("\"}");
    okJson(b); return;
  }
  size_t off = (size_t)rq.arg("off").toInt(), len = (size_t)rq.arg("len").toInt();
  if (off > size) off = size;
  if (len == 0 || len > 6000) len = 6000;
  if (off + len > size) len = size - off;
  String b; b.reserve(len); b.concat(WEBUI_HTML + off, len);
  reply(200, "text/html", b);
}

// GET /api/ota/begin?size=N&sum=<fnv1a hex>
void handleOtaBegin() {
  if (otaBusy) { errJson(409, "an update is already in progress"); return; }
  const size_t size = (size_t)rq.arg("size").toInt();
  if (!size) { errJson(400, "need size="); return; }
  if (ESP.getFreeSketchSpace() == 0) { errJson(500, "no OTA partition on this board - re-flash over USB with an OTA scheme"); return; }
  prepareForOta("radio");
  otaExpected = size; otaGot = 0; otaSum = 2166136261u;
  otaWantSum = (uint32_t)strtoul(rq.arg("sum").c_str(), nullptr, 16);
  otaAccepting = Update.begin(size);
  if (!otaAccepting) {
    lg("Update.begin failed: %s (want %u bytes)", Update.errorString(), (unsigned)size);
    otaEnd(false); errJson(500, Update.errorString()); return;
  }
  otaRadioMs = millis();
  lg("OTA over ESP-NOW: receiving %u bytes", (unsigned)size);
  okJson(F("{\"ok\":true,\"got\":0}"));
}

// POST /api/ota/part?off=K  body: base64 of the next piece. Pieces come in order; a resend of one already written is fine.
void handleOtaPart() {
  if (!otaBusy || !otaAccepting) { errJson(409, "no update in progress"); return; }
  const size_t off = (size_t)rq.arg("off").toInt();
  String ack = F("{\"ok\":true,\"got\":");
  if (off < otaGot) { ack += (unsigned)otaGot; ack += '}'; okJson(ack); return; }      // already have it
  if (off > otaGot) { String b = F("{\"ok\":false,\"error\":\"out of order\",\"got\":"); b += (unsigned)otaGot; b += '}'; reply(409, "application/json", b); return; }
  const String& in = rq.arg("plain");
  static uint8_t buf[3072];
  size_t n = 0;
  if (mbedtls_base64_decode(buf, sizeof buf, &n, (const unsigned char*)in.c_str(), in.length()) != 0 || n == 0) { errJson(400, "bad base64"); return; }
  if (Update.write(buf, n) != n) {
    lg("Update.write failed: %s - aborting", Update.errorString());
    Update.abort(); otaAccepting = false; otaEnd(false); errJson(500, Update.errorString()); return;
  }
  for (size_t i = 0; i < n; i++) { otaSum ^= buf[i]; otaSum *= 16777619u; }
  otaGot += n; otaRadioMs = millis();
  ack += (unsigned)otaGot; ack += '}'; okJson(ack);
}

// GET /api/ota/finish -> checks size and sum, activates the new firmware, restarts 0.6 s later (after this answer)
void handleOtaFinish() {
  if (!otaBusy || !otaAccepting) { errJson(409, "no update in progress"); return; }
  if (otaGot != otaExpected || (otaWantSum && otaSum != otaWantSum)) {
    lg("OTA over ESP-NOW: got %u of %u bytes, fnv1a %08x (want %08x) - discarded, old firmware stays", (unsigned)otaGot, (unsigned)otaExpected, otaSum, otaWantSum);
    Update.abort(); otaAccepting = false; otaEnd(false); errJson(500, "size or checksum wrong: nothing activated, just retry"); return;
  }
  if (!Update.end(true)) { lg("OTA failed: %s", Update.errorString()); otaEnd(false); errJson(500, Update.errorString()); return; }
  lg("OTA over ESP-NOW wrote %u bytes, fnv1a %08x - restarting", (unsigned)otaGot, otaSum);
  otaRestartAt = millis() + 600;
  okJson(F("{\"ok\":true,\"restarting\":true}"));
}

void otaRadioTick() {
  if (otaRestartAt && (int32_t)(millis() - otaRestartAt) > 0) ESP.restart();
  // 12 Nov: an update that stops getting pieces (radio OR web; the laptop gave up, the link broke) is dropped after 20 s.
  // Before, a web upload cut off at the start left the module answering "updating firmware" until a power cycle.
  if (otaBusy && !otaRestartAt && otaRadioMs && millis() - otaRadioMs > RADIO_OTA_STALL_MS) {
    lg("update stopped arriving (%u of %u bytes) - dropped, old firmware stays", (unsigned)otaGot, (unsigned)otaExpected);
    otaAccepting = false; otaRadioMs = 0; otaEnd(false);   // otaEnd aborts Update if it is running
  }
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
// Its own task, above loop(): every FAST_MS read all servos, run the guard on each, push live angles. A web reply or a
// Wi-Fi reconnect in loop() can no longer make the guard late.
void guardTask(void*) {
  TickType_t last = xTaskGetTickCount();
  uint32_t prev = 0;
  for (;;) {
    vTaskDelayUntil(&last, pdMS_TO_TICKS(guardEveryMs ? guardEveryMs : FAST_MS));
    uint32_t now = millis();
    if (prev && now - prev > guardGapMs) guardGapMs = now - prev;
    if (now - guardWinAt > 5000) { guardGapPrev = guardGapMs; guardGapMs = 0; guardPassPrev = guardPassMs; guardPassMs = 0; guardWaitPrev = guardWaitMs; guardWaitMs = 0; guardWinAt = now; }
    prev = now;
    if (otaBusy || sc.active || nServos == 0 || guardEveryMs == 0) continue;
    uint32_t tw = millis(), t0, took, missed;
    {
      BusLock L;
      t0 = millis();
      if (t0 - tw > guardWaitMs) guardWaitMs = t0 - tw;
      const uint32_t missBefore = servoMisses;
      refreshAllFastSync();                // guardTick() for every joint at its end
      missed = servoMisses - missBefore;
      { int vMin = 999, mA = 0;
        for (uint8_t i = 0; i < nServos; i++) { if (servos[i].rawVoltage > 0 && servos[i].rawVoltage < vMin) vMin = servos[i].rawVoltage; if (servos[i].rawCurrent > 0) mA += (int)(servos[i].rawCurrent * 6.5f); }
        powerNote(vMin < 999 ? (uint16_t)vMin : 0, (uint16_t)(mA > 65535 ? 65535 : mA), millis()); }
      syncTick();                          // Sync motion: steer every joint from these fresh readings
      liveSend();
      took = millis() - t0;
      if (took > guardPassMs) guardPassMs = took;
    }
    // 7 Nov 2026: a new board with NO servos attached hung for good. Every read waited its full time, a pass took longer
    // than the period, vTaskDelayUntil then never waited, and this task (priority 2) held the bus all the time: loop()
    // never ran again (no web page, no ESP-NOW, ping only). Now: after a long pass, rest as long as it took (loop() gets
    // at least half the time); nobody answered at all (no servos, or their power off) -> look again in 0.5 s.
    if (missed >= nServos) { vTaskDelay(pdMS_TO_TICKS(500)); last = xTaskGetTickCount(); }
    else if (took >= (uint32_t)(guardEveryMs ? guardEveryMs : FAST_MS)) { vTaskDelay(pdMS_TO_TICKS(took)); last = xTaskGetTickCount(); }
  }
}

// ── ESP-NOW link ─────────────────────────────────────────────────────────────
// The laptop's USB dongle (firmware/espnow_dongle; laptop side gos/python/gos/espnow.py) reaches the board with no
// access point in between: no joining, no DHCP, no hotspot kicks. It uses the Wi-Fi network's channel (the laptop
// finds it). Wi-Fi stays for firmware uploads and the web page.
// - Requests run through the SAME handlers as the web API (route table + rq), one at a time, here in loop().
// - The answer carries the request's number, so it is also the acknowledgement; the laptop resends until it has it.
//   A repeat of the request just answered gets the saved answer again: nothing runs twice (torque toggles!).
// - HELLO (name, address, channel) every second, and at once on the first heartbeat after a silence.
// - While the laptop's heartbeat is heard the radio stays awake: in modem sleep it misses most frames (radioTick).
// - Heartbeat silent NOW_HOLD_MS while the laptop was driving moves: each joint still on its way stops where it is
//   and holds, torque on. Never limp, never a new move. A sequence the board plays by itself keeps playing.
// - Heat (6 Nov, Nischay: "too hot"): the radio stays awake only while the laptop gives commands (moves, torque, play...)
//   and NOW_AWAKE_MS after; reads (telemetry, health, log) do not count. Otherwise it naps like before ESP-NOW and
//   listens NOW_PEEK_MS after each hello; the laptop sends what waits for us the moment it hears that hello (<= 1 s).
//   Driving keeps it awake, so the hold on silence is unaffected.
// - Several requests may be in flight: the last NOW_CACHE answers are kept, so a resend never runs anything twice.
#define NOW_HELLO_MS 1000
#define NOW_AWAKE_MS 30000   // radio awake this long after the last command
#define NOW_PEEK_MS     80   // napping: listen this long after each hello
#define NOW_CACHE        8    // answers kept for resends (4 was too few: a big answer retried at 20 % loss got pushed out, test_now 7)
#define NOW_RAN         32    // request numbers kept: a repeat whose answer is gone gets 'already done', never a second run
#define NOW_LINK_MS  1500    // a heartbeat this recent = linked over ESP-NOW (the laptop sends one every 100 ms)
#define NOW_HOLD_MS   800    // silent this long while driving -> hold (heartbeat is acked + retried by the radio)
#define NOW_DRIVE_MS 3000    // a laptop move this recent = the laptop is driving

struct NowIn { uint8_t mac[6]; int8_t rssi; uint8_t len; uint8_t data[r4now::FRAME_MAX]; };
// Other modules this one hears (their broadcast hellos), for master.local's mesh map (12 Nov 2026)
struct Peer { uint8_t mac[6]; char name[16]; int8_t rssi; uint32_t at; };
Peer peers[8];
void peerHeard(const uint8_t* mac, int8_t rssi, const uint8_t* p, int n) {
  char name[16] = "";
  for (int i = 0; i + 5 < n; i++) if (memcmp(p + i, "name=", 5) == 0) {          // "name=mod2 ip=..."
    int k = 0; for (int j = i + 5; j < n && p[j] != ' ' && k < 15; j++) name[k++] = (char)p[j]; name[k] = 0; break;
  }
  if (!name[0]) return;
  int slot = -1, oldest = 0;
  for (int i = 0; i < 8; i++) {
    if (memcmp(peers[i].mac, mac, 6) == 0) { slot = i; break; }
    if (peers[i].at < peers[oldest].at) oldest = i;
  }
  if (slot < 0) slot = oldest;
  Peer& q = peers[slot]; memcpy(q.mac, mac, 6); strncpy(q.name, name, 15); q.name[15] = 0;
  q.rssi = q.at && millis() - q.at < 10000 ? (int8_t)((q.rssi * 3 + rssi) / 4) : rssi;   // smoothed
  q.at = millis();
}
String peersJson() {
  String j = "["; bool first = true;
  for (int i = 0; i < 8; i++) {
    if (!peers[i].at || millis() - peers[i].at > 15000) continue;
    if (!first) j += ','; first = false;
    j += F("{\"name\":\""); j += peers[i].name; j += F("\",\"rssi\":"); j += peers[i].rssi;
    j += F(",\"ageMs\":"); j += millis() - peers[i].at; j += '}';
  }
  return j + "]";
}
QueueHandle_t    nowQ = nullptr;
r4now::Assembly* nowAsm = nullptr;      // 7.7 KB, made once
bool     nowUp = false, nowPeerSet = false, nowHbSeen = false, nowHeld = false, nowHeldSilent = false;
uint8_t  nowPeer[6] = {0};
uint32_t nowHbMs = 0, nowHelloMs = 0, nowMoveMs = 0, nowActiveMs = 0, nowPeekUntil = 0;
bool     bootDone = false;                // set at the end of setup(); ESP-NOW runs before that (hello, heartbeat)
uint32_t nowReqs = 0, nowRepeats = 0, nowDrops = 0, nowHolds = 0;
struct NowDone { uint16_t seq; bool used; uint32_t at; String answer; };
NowDone  nowDone[NOW_CACHE];
uint8_t  nowDoneNext = 0;
// A number counts as "already run" only for NOW_SAME_MS: resends happen within the master's 2.5 s; an older match is a
// NEW request from a restarted laptop program that counts from somewhere else (7 Nov: one was answered "already done").
#define NOW_SAME_MS 10000
uint16_t nowRan[NOW_RAN]; uint32_t nowRanAt[NOW_RAN]; uint8_t nowRanN = 0, nowRanNext = 0;
bool nowAlreadyRan(uint16_t seq) { for (uint8_t i = 0; i < nowRanN; i++) if (nowRan[i] == seq && millis() - nowRanAt[i] < NOW_SAME_MS) return true; return false; }

bool nowLinked() { return nowHbSeen && millis() - nowHbMs < NOW_LINK_MS; }
bool nowAwake()  { return nowLinked() && nowActiveMs && millis() - nowActiveMs < NOW_AWAKE_MS; }
bool nowPeeking() { return (int32_t)(nowPeekUntil - millis()) > 0; }
int  nowFind(uint16_t seq) { for (uint8_t i = 0; i < NOW_CACHE; i++) if (nowDone[i].used && nowDone[i].seq == seq && millis() - nowDone[i].at < NOW_SAME_MS) return i; return -1; }
// Reads do not keep the radio awake (the Studio polls all the time); everything else is a command.
bool nowIsRead(const String& p) {
  return p == "/api/telemetry" || p == "/api/health" || p == "/api/log" || p == "/api/anim/status" || p == "/api/guard" ||
         p == "/api/config" || p == "/api/wifi" || p == "/api/scan/status" || p == "/api/servo/read" || p == "/api/radio" || p == "/api/speedcap" || p == "/api/clock";
}

void nowOnRecv(const esp_now_recv_info_t* info, const uint8_t* data, int len) {   // Wi-Fi task: just queue it
  if (!nowQ || len <= 0 || len > r4now::FRAME_MAX) return;
  NowIn m; memcpy(m.mac, info->src_addr, 6); m.rssi = info->rx_ctrl ? (int8_t)info->rx_ctrl->rssi : 0; m.len = (uint8_t)len; memcpy(m.data, data, len);
  if (xQueueSend(nowQ, &m, 0) != pdTRUE) nowDrops++;
}

// Radio speed for ESP-NOW (12 Nov 2026, Nischay via Gemini: Espressif "Long Range" mode). 0 = normal 1 Mbps, 1 = LR 500 kbps,
// 2 = LR 250 kbps: slower, but heard at a weaker signal (about 5-8 dB more reach). Every board ACCEPTS all three at all
// times (LR is switched on in the radio's protocol list), so switching one sender never cuts a link. Live, not saved:
// /api/radio?lr=0|1|2 - a restart goes back to the default (1).
uint8_t nowRate = 1;   // 12 Nov (Nischay): Long Range 500 kbps by default - more reach on the weak links
void nowApplyRate(const uint8_t* mac) {
  esp_now_rate_config_t c = {};
  c.phymode = nowRate ? WIFI_PHY_MODE_LR : WIFI_PHY_MODE_11B;
  c.rate = nowRate == 2 ? WIFI_PHY_RATE_LORA_250K : nowRate == 1 ? WIFI_PHY_RATE_LORA_500K : WIFI_PHY_RATE_1M_L;
  esp_now_set_peer_rate_config(mac, &c);
}
void nowInit() {
  if (!nowQ) nowQ = xQueueCreate(40, sizeof(NowIn));
  if (!nowAsm) nowAsm = new r4now::Assembly();
  if (esp_now_init() != ESP_OK) return;              // Wi-Fi not started yet: nowPoll() tries again
  esp_now_register_recv_cb(nowOnRecv);
  esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N | WIFI_PROTOCOL_LR);   // hear LR too
  esp_now_peer_info_t p = {}; memset(p.peer_addr, 0xff, 6); p.ifidx = WIFI_IF_STA;
  esp_now_add_peer(&p);
  nowApplyRate(p.peer_addr);
  nowPeerSet = false;
  nowUp = true;
}

void nowStop() {                                     // before the Wi-Fi driver is switched off
  if (nowUp) esp_now_deinit();
  nowUp = false; nowPeerSet = false;
}

void nowSendRaw(const uint8_t* mac, uint8_t type, uint16_t seq, const uint8_t* msg, int len) {
  uint8_t f[r4now::FRAME_MAX];
  const int cnt = r4now::fragsFor(len);
  if (cnt > r4now::FRAG_MAX) return;
  for (int i = 0; i < cnt; i++) {
    int n = r4now::build(f, type, seq, msg, len, i);
    for (int t = 0; esp_now_send(mac, f, n) == ESP_ERR_ESPNOW_NO_MEM && t < 20; t++) delay(1);
  }
}
void nowSend(const uint8_t* mac, uint8_t type, uint16_t seq, const String& msg) {
  nowSendRaw(mac, type, seq, (const uint8_t*)msg.c_str(), msg.length());
}
void nowNote(const char* text) {                     // see note(): to the master we talk to, else everyone
  if (!nowUp) return;
  static const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
  static uint16_t seq = 0;
  nowSendRaw(nowPeerSet ? nowPeer : all, r4now::NOTE, ++seq, (const uint8_t*)text, strlen(text));
}

// ── Group play over the radio (groupsync.h) ──────────────────────────────────
// Broadcast to every module on the channel (the broadcast peer is added in nowInit). Runs in loop().
static const uint8_t NOW_ALL[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
void grpSay(uint8_t kind) { grpSayKind = kind; grpSayLeft = GROUP_GO_REPEAT; grpSayMs = 0; }
// 13 Nov 2026 (Nischay: "no module-to-module comm - it is the weakest link; both talk only via the master"): group messages go
// to the MASTER only (acked + retried by the radio), and the master hands a copy to every other module. No master = no group
// radio; the laptop then starts / stops each module itself.
// 13 Nov 2026 (Nischay: "just start both at the same time - the laptop takes care of it, no module-to-module, not even via
// the master or router"): group play sends and hears NOTHING on the radio. The laptop gives every module the same start
// instant in its own clock (/api/clock + /api/anim/play?at=), each then plays alone; the laptop stops all if one stops.
void groupSend(const GroupMsg&) {}
void groupTick() {
  grpPeerS = 2;                         // nobody to slow down for
  return;
  if (!grp.on()) return;
  const uint32_t now = millis();
  grpPeerS = grp.peerS(now, grpStep, animPlaying ? syncMv.T : 0);
  if (animPlaying) {                    // a partner switched off / out of range / never started: stop, never push on alone
    bool absent = false;
    if (uint8_t w = grp.missingNow(now, &absent)) {
      groupHalt(absent ? "group: module %u never started (off, or without this animation) - every module stops and holds"
                       : "group: module %u went silent while playing (switched off? out of range?) - every module stops and holds", w);
      return;
    }
  }
  if (grpSayLeft && (grpSayMs == 0 || now - grpSayMs >= 15)) {   // GO / STOP, a few times (a lost one costs 15 ms)
    if (grpSayKind == GK_GO) {                       // GO = countdown: the time left rides in the message, until the start
      const int32_t left = grpStartAt ? (int32_t)(grpStartAt - now) : 0;
      if (left <= 0) grpSayLeft = 0;
      else { GroupMsg m = Group::msg(grp.id, GK_GO, grp.me, grpStep); m.s = (uint16_t)left; groupSend(m); grpSayMs = now ? now : 1; }
    } else { groupSend(Group::msg(grp.id, grpSayKind, grp.me, grpStep)); grpSayMs = now ? now : 1; grpSayLeft--; }
  }
  if (animPlaying && (grpPlaceMs == 0 || now - grpPlaceMs >= GROUP_PLACE_MS)) {   // where we are: the others keep in step
    grpPlaceMs = now ? now : 1;
    const bool done = grp.waiting() || animArrived;
    groupSend(Group::msg(grp.id, GK_PLACE, grp.me, grpStep, syncMv.s, done, true));
  }
}
// The group stops: every joint where it is, held (docked modules must not push on without a partner). Says STOP to the
// others (unless grpQuiet: we are stopping because of their STOP). Red light blinks 10 s.
// Starts a counted-down GO at its instant (1 ms ticks): loop() can be tens of ms late, this task is not.
void grpStartTask(void*) {
  for (;;) {
    const uint32_t at = grpStartAt;
    if (at && (int32_t)(millis() - at) >= 0) {
      grpStartAt = 0;
      if (!animPlaying && !otaBusy && animCount) { BusLock L; animStart(grpStartStep); }
    }
    vTaskDelay(1);
  }
}

void groupHalt(const char* fmt, ...) {
  char b[180];
  va_list ap; va_start(ap, fmt); vsnprintf(b, sizeof(b), fmt, ap); va_end(ap);
  note("%s", b);
  grpFaultUntil = millis() + 10000;
  animStop();
  { BusLock L; nowHold(); }
}
void groupHeard(const GroupMsg& m, const uint8_t* mac) {
  return;                               // 13 Nov: no group radio (laptop-timed start only)
  if (m.mod && m.mod == myModule()) {                // another board with our number: group play cannot tell us apart
    if (!grpDupSaid) {
      grpDupSaid = true;
      note("group: another module (%02x:%02x:%02x:%02x:%02x:%02x) is also called %s - give every module its own number",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5], cfg.host);
    }
    return;
  }
  if (!grp.on() || m.group != grp.id) return;
  if (m.kind == GK_GO) {
    if (animPlaying || !grpArmed() || otaBusy) return;
    const uint8_t step = (uint8_t)(m.step < animCount ? m.step : 0);
    if (m.s == 0) {                                  // an older lead (no countdown): start now
      lg("group: GO from module %u", m.mod);
      { BusLock L; animStart(step); }
      return;
    }
    const bool first = grpStartAt == 0;
    grpStartStep = step; grpStartAt = millis() + m.s;   // every repeat refines the instant (the time left, as sent)
    if (first) lg("group: GO from module %u - starting in %u ms with it", m.mod, m.s);
  } else if (m.kind == GK_STOP) {
    if (!animPlaying) return;
    grpQuiet = true; groupHalt("group: module %u stopped - stopping too, holding", m.mod); grpQuiet = false;
  } else grp.heard(m, millis());
}

void nowHello(const uint8_t* mac, bool peek = true) {
  uint8_t ch = 0; wifi_second_chan_t sc; esp_wifi_get_channel(&ch, &sc);
  String s; s.reserve(96);
  s += F("name="); s += cfg.host;
  s += F(" ip=");  s += WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : String("-");
  s += F(" fw=");  s += FW_VERSION;
  s += F(" up=");  s += millis();
  s += F(" ch=");  s += ch;
  const bool awake = nowAwake() || moving() || radioHold;
  s += F(" awake="); s += awake ? '1' : '0';
  int v10 = 0; for (uint8_t i = 0; i < nServos; i++) if (servos[i].rawVoltage > v10) v10 = servos[i].rawVoltage;
  if (v10 > 0) { s += F(" bat="); s += v10 / 10; s += '.'; s += v10 % 10; }     // volts, the highest servo reading
  s += F(" held="); s += nowHeld ? '1' : '0';
  s += F(" anim="); s += animPlaying ? '1' : '0';
  if (!awake && peek) { nowPeekUntil = millis() + NOW_PEEK_MS; radioTick(); }   // napping: listen a moment for what waits
  nowSend(mac, r4now::HELLO, 0, s);
  nowHelloMs = millis();
}

void nowSetPeer(const uint8_t* mac) {
  if (nowPeerSet && memcmp(mac, nowPeer, 6) == 0) return;
  if (nowPeerSet) esp_now_del_peer(nowPeer);
  memcpy(nowPeer, mac, 6);
  esp_now_peer_info_t p = {}; memcpy(p.peer_addr, mac, 6); p.ifidx = WIFI_IF_STA; p.channel = 0;
  esp_err_t e = esp_now_add_peer(&p);
  nowPeerSet = e == ESP_OK || e == ESP_ERR_ESPNOW_EXIST;
  if (nowPeerSet) nowApplyRate(mac);
}

void nowRun(uint16_t seq, const uint8_t* msg, int len) {
  String all; all.concat((const char*)msg, len);
  const int nl = all.indexOf('\n');
  const String target = nl < 0 ? all : all.substring(0, nl);
  const String body = nl < 0 ? String() : all.substring(nl + 1);
  const int q = target.indexOf('?');
  const String path = q < 0 ? target : target.substring(0, q);
  const Route* r = nullptr;
  for (uint8_t i = 0; i < nRoutes; i++) if (path == routes[i].path) { r = &routes[i]; break; }
  nowReqs++; nowAnyReqMs = millis();                 // any request = the laptop program is there (reads too)
  if (!nowIsRead(path)) nowActiveMs = millis();
  String ans;
  if (!bootDone) ans = F("503\n{\"ok\":false,\"error\":\"starting: servos not read yet, ask again in a moment\"}");
  else if (otaBusy && !path.startsWith("/api/ota/")) ans = F("503\n{\"ok\":false,\"error\":\"updating firmware\"}");
  else if (!r)        ans = F("404\n{\"ok\":false,\"error\":\"not found\"}");
  else if (!r->radio) ans = F("501\n{\"ok\":false,\"error\":\"Wi-Fi only: use the board's address\"}");
  else {
    if (path == "/api/batch" || (path == "/api/command" && target.indexOf("cmd=pos") >= 0)) nowMoveMs = millis();
    rq.fromRadio(q < 0 ? String() : target.substring(q + 1), nl < 0 ? nullptr : &body);
    replyDefer = true; replyCode = 0;
    if (r->bus) { BusLock L; r->fn(); } else r->fn();
    replyDefer = false;
    rq.fromWeb();
    ans = String(replyCode ? replyCode : 500); ans += '\n'; ans += replyBody;
    replyBody = String();
  }
  NowDone& d = nowDone[nowDoneNext]; nowDoneNext = (nowDoneNext + 1) % NOW_CACHE;
  d.seq = seq; d.used = true; d.at = millis(); d.answer = ans;
  nowRan[nowRanNext] = seq; nowRanAt[nowRanNext] = millis(); nowRanNext = (nowRanNext + 1) % NOW_RAN; if (nowRanN < NOW_RAN) nowRanN++;
  nowSend(nowPeer, r4now::RESP, seq, ans);
  radioTick();                                       // a command wakes the radio now, not at the end of loop()
}

// Each joint still on its way stops where it is now (plus the little it coasts), torque on. Returns how many.
uint8_t nowHold() {
  uint8_t held = 0;
  for (uint8_t i = 0; i < nServos; i++) {
    ServoState& sv = servos[i];
    if (!sv.torqueOn || sv.rawPos < 0 || sv.mode != POS_MODE || guards[i].state != G_OK) continue;
    int left = (int)sv.targetRaw - sv.rawPos;
    if (abs(left) < 8) continue;                     // already there (8 steps = 0.7 deg)
    int coast = abs(sv.rawSpeed) / 16;               // ~60 ms of travel: no snap back against its own motion
    if (coast > abs(left)) coast = abs(left);
    uint16_t stop = (uint16_t)(sv.rawPos + (left > 0 ? coast : -coast));
    sv.targetRaw = stop; sv.targetDeg = rawToNom(sv.id, stop); sv.lastCommandMs = millis();
    posEx(sv.id, (int16_t)stop, sv.speedRaw ? sv.speedRaw : speedScaleToRaw(10), POS_ACC_DEFAULT);
    delay(2);
    held++;
  }
  return held;
}

void nowPoll() {
  if (!nowUp) { if (WiFi.getMode() != WIFI_OFF) nowInit(); if (!nowUp) return; }
  NowIn m;
  while (xQueueReceive(nowQ, &m, 0) == pdTRUE) {
    r4now::Head h; const uint8_t* p; int n;
    if (!r4now::parse(m.data, m.len, h, p, n)) continue;
    if (h.type == r4now::HB) {
      const bool fresh = !nowLinked();
      nowSetPeer(m.mac);                             // only the laptop's dongle sends heartbeats
      nowHbMs = millis(); nowHbSeen = true;
      if (nowHeld) { if (nowHeldSilent) lg("ESP-NOW: the master is heard again"); nowHeld = false; nowHeldSilent = false; }
      if (fresh) nowHello(nowPeer);
    } else if (h.type == r4now::HOLD || h.type == r4now::ESTOP) {   // from the dongle: laptop program gone, or its button
      static uint16_t lastSeq = 0; static uint8_t lastType = 0; static uint32_t lastMs = 0;
      if (h.seq == lastSeq && h.type == lastType && millis() - lastMs < 2000) continue;   // sent to us and to everyone: once
      lastSeq = h.seq; lastType = h.type; lastMs = millis();
      if (h.type == r4now::ESTOP) {                  // the master's button held 2 s, or the laptop's stop --limp
        { BusLock L; estopAll(); }
        note("ESP-NOW: E-STOP from the master - all servos limp");
      } else if (!otaBusy) {
        animStop();
        uint8_t held; { BusLock L; held = nowHold(); }
        nowHeld = true; nowHolds++; grpDisarm();
        note("ESP-NOW: HOLD from the master - %u joint(s) stopped where they were, holding", held);
      }
    } else if (h.type == r4now::GRP) {                // another module of a group (broadcast)
      // only what the MASTER passes on: a module heard directly is ignored (13 Nov: master-only, no doubled, late copies)
      if (n == (int)sizeof(GroupMsg) && h.cnt == 1 && nowPeerSet && memcmp(m.mac, nowPeer, 6) == 0) { GroupMsg g; memcpy(&g, p, sizeof g); groupHeard(g, m.mac); }
    } else if (h.type == r4now::HELLO) {             // another module's broadcast hello: who we hear, how strongly
      if (!nowPeerSet || memcmp(m.mac, nowPeer, 6) != 0) peerHeard(m.mac, m.rssi, p, n);
    } else if (h.type == r4now::REQ) {
      nowSetPeer(m.mac);
      nowHbMs = millis(); nowHbSeen = true;          // a request is the laptop too
      const int done = nowFind(h.seq);
      if (done >= 0) {                               // a resend of a request already answered: the saved answer again
        if (h.idx == h.cnt - 1) { nowRepeats++; nowSend(nowPeer, r4now::RESP, h.seq, nowDone[done].answer); }
        continue;
      }
      if (nowAlreadyRan(h.seq)) {                    // ran long ago, answer no longer kept: say so, never run again
        if (h.idx == h.cnt - 1) { nowRepeats++; nowSend(nowPeer, r4now::RESP, h.seq, F("208\n{\"ok\":true,\"note\":\"already done; its answer was lost on the way\"}")); }
        continue;
      }
      if (h.cnt == 1) nowRun(h.seq, p, n);           // one frame: run it, and leave a half-built long request alone
      else if (nowAsm->add(h, p, n)) { nowRun(h.seq, nowAsm->buf, nowAsm->len); nowAsm->reset(); }
    }
  }
  const uint32_t now = millis();
  if (now - nowHelloMs > NOW_HELLO_MS) {             // not linked: say it to everyone, so a searching laptop finds us
    static const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
    nowHello(nowLinked() && nowPeerSet ? nowPeer : all);
  }
  static uint32_t meshAt = 0;                         // + a broadcast hello every 3 s: the other modules learn they hear us
  if (nowLinked() && now - meshAt > 3000) {           // (one small frame, no listening window: no extra heat)
    meshAt = now; static const uint8_t all2[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
    nowHello(all2, false);
  }
  if (nowHbSeen && !nowHeld && !otaBusy && now - nowHbMs > NOW_HOLD_MS && nowMoveMs && now - nowMoveMs < NOW_DRIVE_MS + NOW_HOLD_MS) {
    nowHeld = true; nowHeldSilent = true; nowHolds++; grpDisarm();
    uint8_t held; { BusLock L; held = nowHold(); }
    note("ESP-NOW: master silent %lu ms while driving - %u joint(s) stopped where they were, holding", (unsigned long)(now - nowHbMs), held);
  }
}

// ── Battery guard (Nischay, 7 Nov 2026: "save the battery") ─────────────────────────────────────────────────────────
// The 3S battery at 10.3 V or lower for BATT_HOLD_MS (BATT_HOLD_LOADED_MS while the motors draw over 1 A: a heavy move
// dips the supply for a moment without the battery being empty) -> the module switches itself off:
//   1. the log says why; 2. the master hears "dying=battery" (it tells the laptop); 3. a playing sequence stops;
//   4. every servo's torque off (no motor current); 5. radio off; 6. the chip sleeps for good, no wake-up source:
//   only switching the module off and on (after charging) starts it again. The next boot logs the reason.
// The voltage is the HIGHEST of the servos' readings: one garbled low read cannot trip it.
// What software cannot do: cut the battery completely. The servos' own electronics and the board's regulator stay
// connected and draw a little; zero needs a switch on the battery line (a MOSFET the ESP drives, or a BMS cut-off).
#define BATT_CUT_V10         103     // 10.3 V (Nischay, 7 Nov)
#define BATT_HOLD_MS        5000
#define BATT_HOLD_LOADED_MS 20000
#define BATT_SANE_V10        60      // below 6.0 V is not a 3S battery, it is a bad read (a servo just plugged in, a garbled
                                     // reply): mod2 read 0.1 V once at boot and started the switch-off countdown (11 Nov)
uint32_t battLowSince = 0;

void battShutdown(int v10, int mA) {
  lg("BATTERY EMPTY: %d.%d V (%d mA) for %u s - stopping every servo and switching off to save the battery. Charge it, then switch the module off and on.",
     v10 / 10, v10 % 10, mA, (unsigned)(millis() - battLowSince) / 1000);
  prefs.putUShort("battCut", (uint16_t)v10);
  grpDisarm();
  if (nowUp) {                                       // tell the master (and through it the laptop), a few times
    static const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
    String s = F("name="); s += cfg.host; s += F(" dying=battery v="); s += v10 / 10; s += '.'; s += v10 % 10;
    for (int i = 0; i < 3; i++) { nowSend(nowPeerSet ? nowPeer : all, r4now::HELLO, 0, s); if (nowPeerSet) nowSend(all, r4now::HELLO, 0, s); delay(30); }
  }
  animStop();
  { BusLock L; torqueOffAll(); }
  delay(200);                                        // the log line and the radio frames go out
  nowStop();
  WiFi.disconnect(true, false);
  WiFi.mode(WIFI_OFF);
  esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
  esp_deep_sleep_start();                            // never returns
}

void battTick() {
  static uint32_t at = 0;
  if (millis() - at < 500) return;
  at = millis();
  if (otaBusy || nServos == 0) { battLowSince = 0; return; }
  int vMax = 0, mA = 0;
  for (uint8_t i = 0; i < nServos; i++) {
    if (!servoSeen(servos[i])) continue;              // an unplugged servo's last reading is not the battery now
    if (servos[i].rawVoltage > vMax && servos[i].rawVoltage <= 200) vMax = servos[i].rawVoltage;   // > 20 V: also garbage
    if (servos[i].rawCurrent > 0) mA += (int)(servos[i].rawCurrent * 6.5f);
  }
  if (vMax < BATT_SANE_V10 || vMax > BATT_CUT_V10) { // no believable reading (servo power off, bad read) or fine
    if (battLowSince) note("battery back above %d.%d V - not switching off", BATT_CUT_V10 / 10, BATT_CUT_V10 % 10);
    battLowSince = 0; return;
  }
  if (!battLowSince) {
    battLowSince = millis();
    note("battery low: %d.%d V - the module switches itself off in %u s unless it recovers", vMax / 10, vMax % 10,
       (unsigned)(mA > 1000 ? BATT_HOLD_LOADED_MS : BATT_HOLD_MS) / 1000);
  }
  if (millis() - battLowSince >= (uint32_t)(mA > 1000 ? BATT_HOLD_LOADED_MS : BATT_HOLD_MS)) battShutdown(vMax, mA);
}

String nowJson() {
  String j = F("{\"linked\":"); j += nowLinked() ? F("true") : F("false");
  j += F(",\"awake\":");    j += nowAwake() ? F("true") : F("false");
  j += F(",\"hbAgeMs\":");  j += nowHbSeen ? (long)(millis() - nowHbMs) : -1L;
  j += F(",\"requests\":"); j += nowReqs;
  j += F(",\"repeats\":");  j += nowRepeats;
  j += F(",\"dropped\":");  j += nowDrops;
  j += F(",\"holds\":");    j += nowHolds;
  j += '}';
  return j;
}

// ── Status lights + IMU (Nischay, 10 Nov 2026: new board layout) ─────────────────────────────────────────────────────
// Red LED on GPIO 6, green on GPIO 7 (each pin -> resistor -> LED -> GND). Own small task, so they blink even while
// setup() or a request is busy.
//   power-on        both blink 2 s, then green blinks SLOWLY until it can be reached (Wi-Fi up or the master heard),
//                   then green steady = ready (11 Nov: steady green while Wi-Fi still searched looked "all ok")
//   moving          green blinks: an animation, a GO, Play, home, joint moves, the Sync button streaming (until ~2 s
//                   after the last move command)
//   warning         red blinks: a joint over load / too hot (overload guard), battery low, link cut (master silent
//                   while driving, or neither the master nor Wi-Fi for 20 s), a group stop (partner missing / stopped)
//   warning while moving: green off, red blinks
//   E-STOP          red steady 3 s, green off
//   firmware update red and green take turns (do not switch off)
// REUSE-CHECKED: led|LED|digitalWrite|blink -> no lights existed on the module (the master's LED is its own sketch).
#define LED_RED_PIN    6
#define LED_GREEN_PIN  7
#define LED_ON         HIGH
#define LED_BLINK_MS   250
// The optional IMU. Nischay asked for SDA 21 / SCL 22, but the ESP32-C3 has no GPIO 22 (its pins end at 21): SCL is on
// 20, the free pin next to it (USB serial does not use it). Change these two if the PCB is wired differently.
#define IMU_SDA_PIN    21
#define IMU_SCL_PIN    20
uint32_t ledBootUntil = 0;

bool ledLinkCut() {
  if (nowHeldSilent) return true;                     // the master went silent while we were driving
  if (millis() < 20000) return false;                 // starting up: Wi-Fi and the master take a few seconds
  return !nowLinked() && WiFi.status() != WL_CONNECTED;
}
bool ledWarning() {
  return guardBusy() || battLowSince || ledLinkCut() || (int32_t)(grpFaultUntil - millis()) > 0 ||
         (animPlaying && syncMv.state == SY_STALLED);
}
bool ledReady() { return bootDone && (WiFi.status() == WL_CONNECTED || nowLinked()); }
bool ledMoving() { return animPlaying || millis() - lastMotionMs < AWAKE_AFTER_MOVE_MS; }

// Every change that matters goes to the log, with its reason (Nischay 12 Nov 2026: "important things must be in the logs -
// master / laptop detected, disconnected, why the red light is on"). Called from loop() every 250 ms; logs CHANGES only.
void eventWatch() {
  static uint32_t at = 0; const uint32_t now = millis();
  if (now - at < 250 || !bootDone) return; at = now;
  static int8_t master = -1, laptop = -1, warnGuard = -1, warnBatt = -1, warnCut = -1, warnGrp = -1, warnSync = -1;
  static uint32_t masterLostAt = 0, laptopQuietAt = 0;
  const bool m = nowLinked();
  if (m != master) {
    if (m && master == 0) lg("CONNECTED to the master again (was gone %lu s)", (unsigned long)((now - masterLostAt) / 1000));
    else if (m) lg("CONNECTED to the master (radio)");
    else if (master == 1) { masterLostAt = now; lg("LOST the master (%s)", WiFi.status() == WL_CONNECTED ? "Wi-Fi still works" : "no Wi-Fi either"); }
    master = m;
  }
  const uint32_t last = max(lastHttpMs, nowHbSeen ? nowHbMs : 0u);
  const bool l = (lastHttpMs || nowAnyReqMs) && now - max(lastHttpMs, nowAnyReqMs) < 15000;   // the laptop program asked anything (radio or Wi-Fi) in the last 15 s
  if (l != laptop) {
    if (l && laptop == 0) lg("laptop is talking to me again");
    else if (l) lg("laptop CONNECTED");
    else if (laptop == 1) { laptopQuietAt = now; lg("laptop stopped talking to me (15 s)"); }
    laptop = l;
  }
  (void)last;
  auto edge = [](int8_t& was, bool on, const char* what) { if (was != -1 && on != (bool)was) lg(on ? "RED LIGHT ON: %s" : "red light off: %s is fine again", what); was = on; };
  edge(warnGuard, guardBusy(), "a joint is overloaded or too hot");
  edge(warnBatt, battLowSince != 0, "battery low");
  edge(warnCut, ledLinkCut(), "no connection (no master and no Wi-Fi)");
  edge(warnGrp, (int32_t)(grpFaultUntil - now) > 0, "group stopped (another module is missing)");
  edge(warnSync, animPlaying && syncMv.state == SY_STALLED, "move is stuck");
}

void ledTask(void*) {
  for (;;) {
    const uint32_t now = millis();
    const bool on = (now / LED_BLINK_MS) & 1;
    bool r, g;
    if ((int32_t)(ledBootUntil - now) > 0)          { r = on; g = on; }
    else if (otaBusy)                                { r = on; g = !on; }
    else if ((int32_t)(ledEstopUntil - now) > 0)     { r = true; g = false; }
    else {
      const bool warn = ledWarning();
      r = warn && on;
      g = ledMoving() ? (!warn && on) : ledReady() ? true : ((now / 1000) & 1);   // slow blink: not reachable yet
    }
    digitalWrite(LED_RED_PIN, r ? LED_ON : !LED_ON);
    digitalWrite(LED_GREEN_PIN, g ? LED_ON : !LED_ON);
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}
void ledInit() {
  pinMode(LED_RED_PIN, OUTPUT); pinMode(LED_GREEN_PIN, OUTPUT);
  ledBootUntil = millis() + 2000;
  xTaskCreate(ledTask, "leds", 2048, nullptr, 1, nullptr);
}

// Which IMU answers on I2C (address 0x68 / 0x69, its WHO_AM_I register): its name, or "none". Detection only for now.
void imuDetect() {
  Wire.begin(IMU_SDA_PIN, IMU_SCL_PIN, 400000);
  Wire.setTimeOut(20);
  const uint8_t addrs[2] = {0x68, 0x69};
  for (uint8_t a : addrs) {
    Wire.beginTransmission(a); Wire.write(0x75);
    if (Wire.endTransmission(false) != 0) continue;
    if (Wire.requestFrom(a, (uint8_t)1) != 1) continue;
    const uint8_t who = Wire.read();
    const char* n = who == 0x68 ? "MPU-6050" : who == 0x70 ? "MPU-6500" : who == 0x71 ? "MPU-9250" : who == 0x73 ? "MPU-9255"
                  : who == 0x12 ? "ICM-20602" : who == 0x98 ? "ICM-20689" : who == 0x47 ? "ICM-42688" : "unknown IMU";
    char b[48]; snprintf(b, sizeof b, "%s (0x%02x, id 0x%02x)", n, a, who);
    imuName = b;
    lg("IMU: %s on SDA %d / SCL %d", b, IMU_SDA_PIN, IMU_SCL_PIN);
    return;
  }
  Wire.end();                                          // nothing there: leave the pins alone
  lg("no IMU (nothing answers on SDA %d / SCL %d)", IMU_SDA_PIN, IMU_SCL_PIN);
}

void setup() {
  captureLastBoot();          // must be first: nothing may overwrite the breadcrumb
  ledInit();                  // both lights blink 2 s, then green (Status lights)
  busMx = xSemaphoreCreateRecursiveMutex();
  sketchSizeBoot = ESP.getSketchSize(); otaSpaceBoot = ESP.getFreeSketchSpace();
  lgMx  = xSemaphoreCreateMutex();
  idfPrevLog = esp_log_set_vprintf(idfToLog);
  Serial.begin(115200);
  delay(300);
  cfgLoad();
  homesLoad();
  if (prefs.getUChar("layout", 0) != LAYOUT_REV) {
    cfgApplyLayout();
    cfgSave();
    homes.n = 0; homesSave();          // old homes were for the old joints; don't drive to them
    prefs.putUChar("layout", LAYOUT_REV);
    lg("layout rev %u applied: %u servos, manual homes cleared", LAYOUT_REV, LAYOUT_N);
  }
  deadbandUnits = prefs.getUChar("deadband", TUNE_DEADBAND_DEFAULT);
  animSync = prefs.getBool("animSync", false);
  applyServoConfig();
  lg("ROBO4 fw %s booting as '%s' (%u servos, bus %lu baud)",
     FW_VERSION, cfg.host, nServos, (unsigned long)cfg.baud);

  setCpuFrequencyMhz(80);              // heat; bumped to 160 automatically during OTA

  busBegin(cfg.baud);
  imuDetect();                         // "no IMU" or which one (Status lights + IMU)

  wifiInit();                          // non-blocking: the server is up in milliseconds
  otaConfig();                         // begin() happens in wifiTick once we have an IP

  route("/",                    handleUI, false, false);   // the web page (Wi-Fi only)
  route("/api/health",          handleHealth);
  route("/api/telemetry",       handleTelemetry);
  route("/api/command",         handleCommand);
  route("/api/batch",           handleBatch);
  route("/api/home",            handleHome);
  route("/api/lock",            handleLock);
  route("/api/speedcap",        handleSpeedCap);   // every servo's top speed, % (default 30)
  route("/api/home/manual",     handleHomeManual);
  route("/api/anim/load",       handleAnimLoad);
  route("/api/anim/play",       handleAnimPlay);
  route("/api/anim/stop",       handleAnimStop);
  route("/api/clock",           handleClock);
  route("/api/anim/wait",       handleAnimWait);
  route("/api/hold",            handleHold);
  route("/api/anim/status",     handleAnimStatus);
  route("/api/anim/sync",       handleAnimSync);
  route("/api/home/set",        handleHomeSet);
  route("/api/servo/home",      handleServoHome);
  route("/api/servo/deadband",  handleDeadband);
  route("/api/torque",          handleTorqueAll);
  route("/api/guard",           handleGuard);
  route("/api/guard/clear",     handleGuardClear);
  route("/api/guard/set",       handleGuardSet);
  route("/api/servo/tune",      handleTune);
  route("/api/identify",        handleIdentify);
  route("/api/log",             handleLog, false);
  route("/api/bus/raw",         handleBusRaw);
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
  route("/api/radio",           handleRadio, false);   // radio sleep on/off for Wi-Fi tests
  route("/api/ota/url",         handleOtaUrl, false, false);
  route("/api/page",            handlePage, false);          // the web page in pieces (ESP-NOW)
  route("/api/ota/begin",       handleOtaBegin, false);      // firmware update over ESP-NOW
  route("/api/ota/part",        handleOtaPart, false);
  route("/api/ota/finish",      handleOtaFinish, false);
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
  if (prevPower)
    lg("supply in its last second: servos down to %u.%u V, up to %u mA in total%s", prevVmin10 / 10, prevVmin10 % 10, prevPeakmA,
       resetWhy.startsWith("BROWNOUT") && prevPeakmA > 2500 ? " - a motor current spike pulled the supply down" : "");
  else if (resetWhy == "power-on")
    lg("it was switched off or lost power completely (battery unplugged, switch, or a total supply drop)");

  // let the servo bus settle after power-up; meanwhile ESP-NOW already runs, so the master hears this module ~1 s after
  // power-on instead of ~4 s (Nischay 9 Nov: "detected in a fraction of a second"). Requests get "starting" until boot ends.
  nowInit();
  { const uint32_t t = millis(); while (millis() - t < 3000) { nowPoll(); delay(5); } }
  flushBus();
  // Boot LIMP, deliberately. This used to call homeAll(), which energised every servo and
  // drove it to 180 the instant the board powered up — a moving arm nobody asked for, before
  // the operator had even opened the page. Now the board comes up torque-off and only READS,
  // so the UI shows the true pose and the arm can be positioned by hand. Torque is an
  // explicit button press, and homing is a separate one.
  torqueOffAll();
  seedTargetsFromHardware();
  tuneAllServos();          // writes only what differs, so this is a no-op after the first boot

  // Power-on is ALWAYS limp (Nischay, 4 Nov 2026): after a power cut, a reset or an update the board only
  // reads where every joint is and waits. Torque on, Go to manual home, continue: the operator decides.
  // (It used to drive to the saved home at full speed the moment power came back.)
  prefs.putUChar("otaBoot", 0);
  animInterrupted = prefs.getUChar("animRun", 0) != 0;
  if (animInterrupted) { prefs.putUChar("animRun", 0); lg("boot: a sequence was playing when power was lost - it does NOT resume"); }
  { uint16_t cut = prefs.getUShort("battCut", 0);
    if (cut) { lg("last shutdown: the battery was empty (%u.%u V) - the module switched itself off", cut / 10, cut % 10); prefs.remove("battCut"); } }
  bootDone = true;
  if (servosAnswering == nServos)
    lg("boot complete - torque OFF, nothing moved, all %u servos answered. Waiting for the operator.", nServos);
  else
    lg("boot complete - torque OFF, nothing moved, %u of %u servos answered%s. Waiting for the operator.",
       servosAnswering, nServos, servosAnswering ? " - check the missing ones" : " (no servos connected?)");
  // priority 2, just above loop() (1). Tried 19 (above the TCP/IP task): web replies then took ~6 s and ping ~1 s
  // (mod1, 5 Nov). The 0.2 s late guard was the flash-size reads holding the lock, not the priority.
  xTaskCreate(guardTask, "guard", 6144, nullptr, 2, nullptr);
  xTaskCreate(grpStartTask, "grpstart", 3072, nullptr, 3, nullptr);   // group GO countdown: starts on the agreed ms
}

void loop() {
  static uint32_t t0 = 0;
  uint32_t tn = millis();
  if (t0) { uint32_t d = tn - t0; if (d > loopMaxMs) loopMaxMs = d; }
  t0 = tn;
  if (tn - loopWinAt > 5000) { loopMaxPrev = loopMaxMs; loopMaxMs = 0; loopWinAt = tn; }
  server.handleClient();
  ArduinoOTA.handle();
  wifiTick();
  eventWatch();
  nowPoll();                            // ESP-NOW requests run here, between web requests (same handlers)
  groupTick();                          // group play: GO / where we are / STOP to the other modules
  battTick();                           // 10.2 V: switch off to save the battery (Battery guard)
  { BusLock L; livePoll(); }            // its UDP socket is shared with the guard task's liveSend()
  radioTick();
  if (mdnsOk) { /* ESPmDNS services itself in the background */ }
  delay(1);

  otaRadioTick();                       // ESP-NOW update: restart after it, or drop a stalled one
  if (otaBusy) return;                 // never touch the servo bus mid-flash

  { BusLock L; animTick(); lockSettleTick(); }           // the board owns sequence timing, not the browser

  if (sc.active) { BusLock L; scanStep(); return; }   // scan owns the bus until it finishes

  // the fast read, the guard and the live stream run in guardTask(), so nothing here can hold them up

  if (nServos && millis() - lastSlow >= SLOW_MS) {
    lastSlow = millis();
    { BusLock L; refreshSlow(servos[slowIdx]); }
    slowIdx = (uint8_t)((slowIdx + 1) % nServos);
    server.handleClient();
  }

}
