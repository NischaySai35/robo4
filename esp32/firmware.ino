/*
   ROBO4 — ESP32-C3 + 6 × ST3215 Smart Servo
   JSON API only (no embedded HTML).

   React web app connects from http://localhost:5173 (or wherever it's hosted)
   and talks to this firmware via:
     GET /api/telemetry          → full JSON for all 6 servos
     GET /api/command?servo=N&cmd=X[&angle=Y&speed=Z&acc=W]
     GET /api/batch?1=180&2=90&3=150&4=180&5=120&6=180[&speed=5&acc=20]
     GET /                       → quick health JSON

   All responses carry CORS headers so the browser allows cross-origin fetches.

   Servo bus: GPIO5 half-duplex UART (UART_MODE_RS485_HALF_DUPLEX — required for correct reads)
     ID 1 = J1  (CUBE LEFT  — twist)
     ID 2 = J2  (JOINT 1    — bend)
     ID 3 = J3  (JOINT 2    — bend)
     ID 4 = J4  (WRIST      — twist)
     ID 5 = J5  (JOINT 3    — bend)
     ID 6 = J6  (CUBE RIGHT — twist)
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <SCServo.h>
#include <math.h>

// UART_MODE_RS485_HALF_DUPLEX is ESP-IDF value 4 — define it if the board package
// doesn't expose the IDF header directly (avoids the include path issue).
#ifndef UART_MODE_RS485_HALF_DUPLEX
#define UART_MODE_RS485_HALF_DUPLEX 4
#endif

// ── Wi-Fi credentials ─────────────────────────────────────────────────────────
constexpr const char* WIFI_SSID = "GNXS-2.4G-6809B0";
constexpr const char* WIFI_PASS = "B43D086809B0";
constexpr const char* MDNS_HOST = "nischaylap";

// ── Hardware ──────────────────────────────────────────────────────────────────
#define SERVO_PIN   5
#define SERVO_BAUD  1000000

SMS_STS   st;
WebServer server(80);

// ── Servo definitions ─────────────────────────────────────────────────────────
struct ServoDef {
  uint8_t     id;
  const char* label;
  const char* name;
  const char* type;
};

const ServoDef SERVO_DEFS[] = {
  {1, "J1", "CUBE LEFT",  "twist"},
  {2, "J2", "JOINT 1",   "bend"},
  {3, "J3", "JOINT 2",   "bend"},
  {4, "J4", "WRIST",     "twist"},
  {5, "J5", "JOINT 3",   "bend"},
  {6, "J6", "CUBE RIGHT", "twist"},
};
constexpr uint8_t NUM_SERVOS = sizeof(SERVO_DEFS) / sizeof(SERVO_DEFS[0]);

// ── Runtime state per servo ───────────────────────────────────────────────────
struct ServoState {
  uint8_t  id;
  uint8_t  hwMode;
  bool     torqueOn;
  uint8_t  mode;          // 0=pos 1=cw 2=ccw 3=wave
  float    targetDeg;
  uint16_t targetRaw;
  int      speedScale;
  uint16_t speedRaw;
  uint8_t  acc;
  int      rawPos;
  int      rawSpeed;
  int      rawLoad;
  int      rawLoadAbs;
  int      rawCurrent;
  int      rawVoltage;
  int      rawTemp;
  bool     moving;
  unsigned long lastCommandMs;
};

ServoState servos[NUM_SERVOS] = {
  {1,255,true,0,180.0f,2047,10,3400,20,-1,-1,-1,-1,-1,-1,-1,false,0},
  {2,255,true,0,180.0f,2047,10,3400,20,-1,-1,-1,-1,-1,-1,-1,false,0},
  {3,255,true,0,180.0f,2047,10,3400,20,-1,-1,-1,-1,-1,-1,-1,false,0},
  {4,255,true,0,180.0f,2047,10,3400,20,-1,-1,-1,-1,-1,-1,-1,false,0},
  {5,255,true,0,180.0f,2047,10,3400,20,-1,-1,-1,-1,-1,-1,-1,false,0},
  {6,255,true,0,180.0f,2047,10,3400,20,-1,-1,-1,-1,-1,-1,-1,false,0},
};

// ── Timing ────────────────────────────────────────────────────────────────────
constexpr uint16_t FAST_MS          = 60;    // position read, ALL servos per tick (one full refresh every 60ms)
constexpr uint16_t SLOW_MS          = 250;   // other params,  1 servo per tick  (6×250 = 1.5s full cycle)
constexpr uint16_t WAVE_MS          = 40;
constexpr uint8_t  POS_MODE         = 0;
constexpr uint8_t  MOTOR_MODE       = 1;
constexpr uint8_t  POS_ACC_DEFAULT  = 40;
constexpr uint8_t  MOTOR_ACC        = 30;


unsigned long lastFast      = 0;
unsigned long lastSlow      = 0;
unsigned long lastWave      = 0;
unsigned long lastWiFiRetry = 0;
uint8_t       slowIdx       = 0;   // which servo gets the slow read this tick
bool          mdnsOk        = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
static inline void flushBus() {
  while (Serial1.available()) Serial1.read();
}

static inline float clampF(float v, float lo, float hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

static inline uint16_t angleToRaw(float d) {
  d = clampF(d, 0.0f, 360.0f);
  return (uint16_t)lroundf((d / 360.0f) * 4095.0f);
}

static inline float rawToAngle(uint16_t r) {
  return (r / 4095.0f) * 360.0f;
}

static inline uint16_t speedScaleToRaw(int s) {
  s = constrain(s, 1, 10);
  return (uint16_t)lroundf(340.0f + ((s - 1) / 9.0f) * (3400.0f - 340.0f));
}

static inline ServoState* byId(uint8_t id) {
  for (uint8_t i = 0; i < NUM_SERVOS; i++) if (servos[i].id == id) return &servos[i];
  return nullptr;
}

// 5 retries, delay(2) between — same as confirmed-working old code
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

// ── Servo commands ────────────────────────────────────────────────────────────
void setHwMode(ServoState& sv, uint8_t mode) {
  if (sv.hwMode == mode) return;
  st.writeByte(sv.id, 33, mode);
  delay(4); delay(15);
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
  sv.mode = POS_MODE;
  setHwMode(sv, POS_MODE);
  ensureTorque(sv);
  // Safety limits: bend joints (J2 J3 J5, IDs 2 3 5) → 80–280°; twist (J1 J4 J6) → 0–360°
  const bool isBend = (sv.id == 2 || sv.id == 3 || sv.id == 5);
  sv.targetDeg  = clampF(deg, isBend ? 80.0f : 0.0f, isBend ? 280.0f : 360.0f);
  sv.targetRaw  = angleToRaw(sv.targetDeg);
  sv.speedScale = constrain(speedScale, 1, 10);
  sv.speedRaw   = speedScaleToRaw(sv.speedScale);
  sv.acc        = (uint8_t)constrain((int)acc, 1, 100);
  sv.lastCommandMs = millis();
  st.WritePosEx(sv.id, sv.targetRaw, sv.speedRaw, sv.acc);
  delay(3);
}

void cmdCW(ServoState& sv) {
  sv.mode = 1; setHwMode(sv, MOTOR_MODE); ensureTorque(sv);
  sv.speedRaw = 3400; sv.lastCommandMs = millis();
  st.WriteSpe(sv.id, 3400, MOTOR_ACC); delay(3);
}

void cmdCCW(ServoState& sv) {
  sv.mode = 2; setHwMode(sv, MOTOR_MODE); ensureTorque(sv);
  sv.speedRaw = 3400; sv.lastCommandMs = millis();
  st.WriteSpe(sv.id, -3400, MOTOR_ACC); delay(3);
}

void cmdWave(ServoState& sv) {
  sv.mode = 3; setHwMode(sv, MOTOR_MODE); ensureTorque(sv);
  sv.lastCommandMs = millis();
}

void cmdStop(ServoState& sv) {
  sv.mode = POS_MODE; sv.lastCommandMs = millis();
  st.EnableTorque(sv.id, 0); delay(2);
  sv.torqueOn = false; sv.moving = false;
  if (sv.rawPos >= 0) {
    sv.targetRaw = (uint16_t)sv.rawPos;
    sv.targetDeg = rawToAngle((uint16_t)sv.rawPos);
  }
}

void cmdTorqueToggle(ServoState& sv) {
  if (sv.torqueOn) { st.EnableTorque(sv.id, 0); delay(2); sv.torqueOn = false; sv.moving = false; }
  else             { st.EnableTorque(sv.id, 1); delay(2); sv.torqueOn = true; }
}

void estopAll() {
  for (uint8_t i = 0; i < NUM_SERVOS; i++) cmdStop(servos[i]);
}

// ── Telemetry ─────────────────────────────────────────────────────────────────
// Fast tick: position only — 1 attempt (1Mbaud bus is reliable; retry adds latency)
void refreshFast(ServoState& sv) {
  int pos = readRetry(sv.id, [](uint8_t id){ return st.ReadPos(id); },
                              [](int v){ return v >= 0 && v <= 4095; }, 1);
  if (pos >= 0) sv.rawPos = pos;
  updateMotionFlag(sv);
}

// Slow tick: everything else (speed, load, current, voltage, temp)
void refreshSlow(ServoState& sv) {
  int spd  = readRetry(sv.id, [](uint8_t id){ return st.ReadSpeed(id);   }, [](int v){ return v != -1; });
  int load = readRetry(sv.id, [](uint8_t id){ return st.ReadLoad(id);    }, [](int v){ return v != -1; });
  int curr = readRetry(sv.id, [](uint8_t id){ return st.ReadCurrent(id); }, [](int v){ return v >= 0; });
  int volt = readRetry(sv.id, [](uint8_t id){ return st.ReadVoltage(id); }, [](int v){ return v > 0; });
  int temp = readRetry(sv.id, [](uint8_t id){ return st.ReadTemper(id);  }, [](int v){ return v > 0; });

  if (spd  != -1) { sv.rawSpeed = spd; }
  if (load != -1) { sv.rawLoad = load; sv.rawLoadAbs = abs(load); }
  if (curr >= 0)    sv.rawCurrent = curr;
  if (volt > 0)     sv.rawVoltage = volt;
  if (temp > 0)     sv.rawTemp    = temp;
}

// ── JSON builder ──────────────────────────────────────────────────────────────
String buildJSON() {
  String j;
  j.reserve(2600);
  j += F("{\"ok\":true,\"ms\":"); j += millis();
  j += F(",\"servos\":[");

  for (uint8_t i = 0; i < NUM_SERVOS; i++) {
    const ServoState& sv  = servos[i];
    const ServoDef&   def = SERVO_DEFS[i];

    if (i) j += ',';
    j += F("{\"id\":"); j += sv.id;
    j += F(",\"label\":\""); j += def.label; j += '"';
    j += F(",\"name\":\"");  j += def.name;  j += '"';
    j += F(",\"type\":\"");  j += def.type;  j += '"';
    j += F(",\"connected\":"); j += (sv.rawPos >= 0 ? F("true") : F("false"));

    const char* modeStr = sv.mode == 0 ? "Position"
                        : sv.mode == 1 ? "CW"
                        : sv.mode == 2 ? "CCW"
                        : "Wave";
    j += F(",\"mode\":\""); j += modeStr; j += '"';
    j += F(",\"torque\":"); j += (sv.torqueOn ? F("true") : F("false"));
    j += F(",\"moving\":"); j += (sv.moving   ? F("true") : F("false"));

    j += F(",\"currentAngle\":");
    if (sv.rawPos >= 0) j += String(rawToAngle((uint16_t)sv.rawPos), 2); else j += F("null");

    j += F(",\"targetAngle\":");
    if (sv.mode == POS_MODE) j += String(sv.targetDeg, 2); else j += F("null");

    j += F(",\"rawPos\":"); j += sv.rawPos;
    j += F(",\"speed\":"); j += sv.rawSpeed;
    j += F(",\"loadRaw\":"); j += sv.rawLoad;
    j += F(",\"loadAbs\":"); j += sv.rawLoadAbs;

    j += F(",\"currentmA\":");
    if (sv.rawCurrent >= 0) j += String(sv.rawCurrent * 6.5f, 1); else j += F("null");

    j += F(",\"voltageV\":");
    if (sv.rawVoltage > 0) j += String(sv.rawVoltage / 10.0f, 1); else j += F("null");

    j += F(",\"tempC\":");
    if (sv.rawTemp > 0) j += sv.rawTemp; else j += F("null");

    j += F(",\"speedScale\":"); j += sv.speedScale;
    j += F(",\"acc\":"); j += sv.acc;
    j += F(",\"lastCommandAgeMs\":"); j += (millis() - sv.lastCommandMs);
    j += '}';
  }

  j += F("],\"wifi\":{\"ssid\":\""); j += WIFI_SSID;
  j += F("\",\"ip\":\"");            j += WiFi.localIP().toString();
  j += F("\",\"hostname\":\"");      j += MDNS_HOST;
  j += F("\"}}");
  return j;
}

// ── CORS ──────────────────────────────────────────────────────────────────────
void setCORS() {
  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  server.sendHeader("Cache-Control",                "no-store, no-cache");
}

void handleOptions() { setCORS(); server.send(204); }

// ── HTTP handlers ─────────────────────────────────────────────────────────────
void handleRoot() {
  setCORS();
  String b = F("{\"ok\":true,\"device\":\"ROBO4-ESP32\",\"ip\":\"");
  b += WiFi.localIP().toString();
  b += F("\",\"hostname\":\""); b += MDNS_HOST; b += F("\"}");
  server.send(200, "application/json", b);
}

void handleTelemetry() {
  setCORS();
  server.send(200, "application/json", buildJSON());
}

// Forward declaration
void applyCmd(ServoState& sv, const String& cmd);

void handleCommand() {
  setCORS();
  if (!server.hasArg("servo") || !server.hasArg("cmd")) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing args\"}");
    return;
  }

  String sa  = server.arg("servo");
  String cmd = server.arg("cmd");
  cmd.toLowerCase();

  if ((sa == "all" || sa == "0") && (cmd == "estop" || cmd == "stop")) {
    estopAll();
    server.send(200, "application/json", "{\"ok\":true,\"result\":\"estop_all\"}");
    return;
  }

  if (sa == "all") {
    for (uint8_t i = 0; i < NUM_SERVOS; i++) applyCmd(servos[i], cmd);
    server.send(200, "application/json", "{\"ok\":true,\"result\":\"all\"}");
    return;
  }

  ServoState* sv = byId((uint8_t)sa.toInt());
  if (!sv) {
    server.send(404, "application/json", "{\"ok\":false,\"error\":\"servo not found\"}");
    return;
  }

  float   angle = server.hasArg("angle") ? server.arg("angle").toFloat() : sv->targetDeg;
  int     speed = server.hasArg("speed") ? server.arg("speed").toInt()   : 10;
  uint8_t acc   = (uint8_t)(server.hasArg("acc") ? constrain(server.arg("acc").toInt(), 1, 100) : POS_ACC_DEFAULT);

  if      (cmd == "pos")                    cmdPos(*sv, angle, speed, acc);
  else if (cmd == "cw")                     cmdCW(*sv);
  else if (cmd == "ccw")                    cmdCCW(*sv);
  else if (cmd == "wave")                   cmdWave(*sv);
  else if (cmd == "stop" || cmd == "estop") cmdStop(*sv);
  else if (cmd == "torquetoggle")           cmdTorqueToggle(*sv);
  else if (cmd == "torqueon")  { if (!sv->torqueOn) cmdTorqueToggle(*sv); }
  else if (cmd == "torqueoff") { if (sv->torqueOn)  cmdTorqueToggle(*sv); }
  else { server.send(400, "application/json", "{\"ok\":false,\"error\":\"unknown cmd\"}"); return; }

  server.send(200, "application/json", "{\"ok\":true}");
}

// GET /api/batch?1=180.0&2=90.0&3=150.0&4=120.0&5=180.0[&speed=5&acc=20]
// Uses SyncWritePosEx so all servos start simultaneously in one bus transaction.
void handleBatch() {
  setCORS();
  int     spd = server.hasArg("speed") ? constrain(server.arg("speed").toInt(), 1, 10) : 5;
  uint8_t acc = (uint8_t)(server.hasArg("acc") ? constrain(server.arg("acc").toInt(), 1, 100) : POS_ACC_DEFAULT);

  uint8_t  ids[NUM_SERVOS];
  int16_t  positions[NUM_SERVOS];
  uint16_t speeds[NUM_SERVOS];
  uint8_t  accs[NUM_SERVOS];
  uint8_t  cnt = 0;

  for (uint8_t id = 1; id <= NUM_SERVOS; id++) {
    String key = String(id);
    if (!server.hasArg(key)) continue;
    ServoState* sv = byId(id);
    if (!sv) continue;
    sv->mode = POS_MODE;
    setHwMode(*sv, POS_MODE);
    ensureTorque(*sv);
    const bool isBend = (sv->id == 2 || sv->id == 3 || sv->id == 5);
    sv->targetDeg     = clampF(server.arg(key).toFloat(), isBend ? 80.0f : 0.0f, isBend ? 280.0f : 360.0f);
    sv->targetRaw     = angleToRaw(sv->targetDeg);
    sv->speedScale    = constrain(spd, 1, 10);
    sv->speedRaw      = speedScaleToRaw(sv->speedScale);
    sv->acc           = (uint8_t)constrain((int)acc, 1, 100);
    sv->lastCommandMs = millis();
    ids[cnt]          = sv->id;
    positions[cnt]    = (int16_t)sv->targetRaw;
    speeds[cnt]       = sv->speedRaw;
    accs[cnt]         = sv->acc;
    cnt++;
  }

  if (cnt == 1) {
    st.WritePosEx(ids[0], positions[0], speeds[0], accs[0]);
    delay(3);
  } else if (cnt > 1) {
    st.SyncWritePosEx(ids, cnt, positions, speeds, accs);
    delay(3);
  }

  String b = F("{\"ok\":true,\"sent\":"); b += cnt; b += '}';
  server.send(200, "application/json", b);
}

void applyCmd(ServoState& sv, const String& cmd) {
  if      (cmd == "cw")                     cmdCW(sv);
  else if (cmd == "ccw")                    cmdCCW(sv);
  else if (cmd == "wave")                   cmdWave(sv);
  else if (cmd == "stop" || cmd == "estop") cmdStop(sv);
  else if (cmd == "torquetoggle")           cmdTorqueToggle(sv);
}

// ── Wi-Fi / mDNS ─────────────────────────────────────────────────────────────
void startMDNS() {
  if (mdnsOk) return;
  if (MDNS.begin(MDNS_HOST)) {
    MDNS.addService("http", "tcp", 80);
    mdnsOk = true;
    Serial.println(F("mDNS: http://nischaylap.local"));
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(true);             // MODEM_SLEEP: radio sleeps between DTIM beacons — biggest heat reduction
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  WiFi.setTxPower(WIFI_POWER_8_5dBm); // 8.5 dBm is plenty for same-room LAN; 11→8.5 dBm cuts TX current ~25%
  Serial.print(F("WiFi"));
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 20000) {
    delay(250); Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("IP: ")); Serial.println(WiFi.localIP());
    startMDNS();
  } else {
    Serial.println(F("WiFi timeout — will retry"));
  }
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) { 
    if (!mdnsOk) startMDNS(); // Only trigger if mDNS isn't already active
    return; 
  }
  if (millis() - lastWiFiRetry < 10000) return;
  lastWiFiRetry = millis();
  mdnsOk = false; // Reset flag so it can recover cleanly
  WiFi.disconnect(false); WiFi.begin(WIFI_SSID, WIFI_PASS);
}

// ── setup / loop ──────────────────────────────────────────────────────────────
void setup() {
  setCpuFrequencyMhz(80);   // 160→80 MHz: halves CPU switching losses, no measurable impact at our bus speeds
  Serial.begin(115200);
  delay(300);

  // UART_MODE_RS485_HALF_DUPLEX is required — it prevents TX echo on RX so
  // ReadPos/ReadSpeed/etc return real servo data instead of echoed garbage.
  Serial1.begin(SERVO_BAUD, SERIAL_8N1, SERVO_PIN, SERVO_PIN);
  Serial1.setMode((SerialMode)UART_MODE_RS485_HALF_DUPLEX);
  Serial1.setRxBufferSize(512);
  st.pSerial = &Serial1;

  Serial.println(F("Waiting 5s for servos to boot…"));
  delay(5000);
  flushBus();

  connectWiFi();

  server.on("/",                   HTTP_GET,     handleRoot);
  server.on("/api/telemetry",      HTTP_GET,     handleTelemetry);
  server.on("/api/command",        HTTP_GET,     handleCommand);
  server.on("/api/batch",          HTTP_GET,     handleBatch);
  server.on("/api/telemetry",      HTTP_OPTIONS, handleOptions);
  server.on("/api/command",        HTTP_OPTIONS, handleOptions);
  server.on("/api/batch",          HTTP_OPTIONS, handleOptions);
  server.onNotFound([]() {
    setCORS();
    server.method() == HTTP_OPTIONS ? server.send(204)
      : server.send(404, "application/json", "{\"ok\":false,\"error\":\"not found\"}");
  });
  server.begin();

  Serial.println(F("================================="));
  Serial.println(F("ROBO4 — 6-Servo API controller"));
  Serial.print(F("SSID: ")); Serial.println(WIFI_SSID);
  Serial.println(F("  GET /api/telemetry"));
  Serial.println(F("  GET /api/command?servo=N&cmd=X"));
  Serial.println(F("  GET /api/batch?1=180&2=90…&6=180"));
  Serial.println(F("================================="));

  // Boot: move all servos to home (180°) in one sync transaction
  {
    uint8_t  ids[NUM_SERVOS];
    int16_t  positions[NUM_SERVOS];
    uint16_t speeds[NUM_SERVOS];
    uint8_t  accs[NUM_SERVOS];
    for (uint8_t i = 0; i < NUM_SERVOS; i++) {
      setHwMode(servos[i], POS_MODE);
      ensureTorque(servos[i]);
      servos[i].mode         = POS_MODE;
      servos[i].targetDeg    = 180.0f;
      servos[i].targetRaw    = angleToRaw(180.0f);
      servos[i].speedScale   = 10;
      servos[i].speedRaw     = speedScaleToRaw(10);
      servos[i].acc          = POS_ACC_DEFAULT;
      servos[i].lastCommandMs = millis();
      ids[i]       = servos[i].id;
      positions[i] = (int16_t)servos[i].targetRaw;
      speeds[i]    = servos[i].speedRaw;
      accs[i]      = servos[i].acc;
    }
    st.SyncWritePosEx(ids, NUM_SERVOS, positions, speeds, accs);
    delay(3);
  }
}

void loop() {
  server.handleClient();
  ensureWiFi();
  delay(1);   // yield to FreeRTOS — lets power-management hooks run between iterations

  // Fast tick: read position for ALL servos in one shot (~60ms budget)
  // Every servo gets a fresh position every 60ms instead of 480ms before.
  if (millis() - lastFast >= FAST_MS) {
    lastFast = millis();
    for (uint8_t i = 0; i < NUM_SERVOS; i++) {
      refreshFast(servos[i]);
    }
    server.handleClient();   // keep web server responsive after bulk read
  }

  // Slow tick: read speed/load/current/voltage/temp for ONE servo
  // (each servo gets full slow update every 6 × 250ms = 1.5s)
  if (millis() - lastSlow >= SLOW_MS) {
    lastSlow = millis();
    refreshSlow(servos[slowIdx]);
    slowIdx = (slowIdx + 1) % NUM_SERVOS;
    server.handleClient();
  }

  // Wave mode animation
  if (millis() - lastWave >= WAVE_MS) {
    lastWave = millis();
    for (uint8_t i = 0; i < NUM_SERVOS; i++) {
      ServoState& sv = servos[i];
      if (sv.mode == 3 && sv.torqueOn) {
        float phase = (millis() / 500.0f) + (i * 0.65f);
        int spd = constrain((int)(1700 + ((sinf(phase) + 1.0f) * 0.5f) * 1700.0f), 0, 3400);
        setHwMode(sv, MOTOR_MODE);
        ensureTorque(sv);
        st.WriteSpe(sv.id, spd, MOTOR_ACC);
        delay(2);
        sv.lastCommandMs = millis();
      }
    }
  }
}
