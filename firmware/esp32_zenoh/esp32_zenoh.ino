/*
   ROBO4 — per-MODULE firmware, Zenoh transport variant (NOT built/flashed yet).

   This is an ADDITIVE alternative to firmware.ino, not a replacement — the
   working HTTP/JSON sketch is untouched. Same servo bus, same physical joint
   map (J1..J7 ST3215 servos), same DRV8833 electromagnet driver, same safety
   limits (bend 80-280 deg, twist 0-360 deg) as firmware.ino. Only the
   transport changes: WebServer polling -> Zenoh-Pico pub/sub, matching the
   native/schemas/actuator.fbs joint_id convention (servo ID - 1).

   Wire format: plain packed structs, NOT FlatBuffers. Pulling flatc-generated
   headers + the FlatBuffers runtime onto an ESP32-C3 is a real embedded
   undertaking (flash budget, no verified Arduino-core FlatBuffers port) that
   deserves its own decision, not a blind default. See MIGRATION.md. The
   struct layout below is wire-compatible field-for-field with
   ActuatorTarget/JointState in actuator.fbs, so swapping to real FlatBuffers
   later is a decode-layer change only.

   STATUS: written but never compiled — no zenoh-pico Arduino library
   dependency is installed in this environment, and there is no ESP32 board
   here to flash. Treat as a translation-complete draft, same caveat as the
   native/ C++ port.

   Requires (PlatformIO/Arduino library manager): "zenoh-pico" (Espressif32,
   client mode over Wi-Fi/TCP to a Zenoh router — e.g. the same host running
   native/tetrobot_core, or a standalone `zenohd`).
*/

#include <Arduino.h>
#include <WiFi.h>
#include <SCServo.h>
#include <math.h>
extern "C" {
  #include "zenoh-pico.h"
}

#ifndef UART_MODE_RS485_HALF_DUPLEX
#define UART_MODE_RS485_HALF_DUPLEX 4
#endif

// ── Wi-Fi + Zenoh router ────────────────────────────────────────────────────
constexpr const char* WIFI_SSID = "GNXS-2.4G-6809B0";
constexpr const char* WIFI_PASS = "B43D086809B0";
constexpr const char* ZENOH_ROUTER_LOCATOR = "tcp/192.168.1.10:7447";  // set to the host running zenohd / tetrobot_core

constexpr const char* MDNS_HOST = "mod1";  // per-module identity, same convention as firmware.ino

// ── Hardware (identical to firmware.ino) ────────────────────────────────────
#define SERVO_PIN   5
#define SERVO_BAUD  1000000
#define MAG_COUNT   2
const uint8_t MAG_IN1[MAG_COUNT] = { 6, 8 };
const uint8_t MAG_IN2[MAG_COUNT] = { 7, 9 };
constexpr uint32_t MAG_PWM_FREQ  = 20000;
constexpr uint8_t  MAG_PWM_RES   = 8;

SMS_STS st;

struct ServoDef { uint8_t id; const char* label; const char* type; };
const ServoDef SERVO_DEFS[] = {
  {1, "J1", "twist"}, {2, "J2", "bend"}, {3, "J3", "bend"}, {4, "J4", "twist"},
  {5, "J5", "bend"},  {6, "J6", "bend"}, {7, "J7", "twist"},
};
constexpr uint8_t NUM_SERVOS = sizeof(SERVO_DEFS) / sizeof(SERVO_DEFS[0]);

struct ServoState {
  uint8_t id;
  float targetDeg;
  uint16_t targetRaw;
  int rawPos;
  bool torqueOn;
};
ServoState servos[NUM_SERVOS];

// ── Wire structs — field-compatible with native/schemas/actuator.fbs ───────
#pragma pack(push, 1)
struct WireActuatorTarget {
  uint32_t joint_id;        // servo ID - 1, matches ActuatorTarget.joint_id
  float position_rad;
  float velocity_rad_s;     // unused by this position-mode firmware, kept for schema parity
  float effort_nm;          // unused (ST3215 has no torque-mode API used here)
  uint64_t stamp_ns;
};
struct WireJointState {
  uint32_t joint_id;
  float position_rad;
  float velocity_rad_s;
  float effort_nm;
};
#pragma pack(pop)

// ── Angle <-> servo raw conversion (identical formula to firmware.ino) ─────
static inline float clampF(float v, float lo, float hi) { return v < lo ? lo : v > hi ? hi : v; }
static inline uint16_t angleToRaw(float d) { d = clampF(d, 0.0f, 360.0f); return (uint16_t)lroundf((d / 360.0f) * 4095.0f); }
static inline float rawToAngle(uint16_t r) { return (r / 4095.0f) * 360.0f; }

// MuJoCo/actuator.fbs use radians centered at 0; the servo firmware uses
// degrees 0-360 centered at 180. This is the seam between the two conventions.
static inline float radToServoDeg(float rad) { return 180.0f + rad * (180.0f / (float)M_PI); }
static inline float servoDegToRad(float deg) { return (deg - 180.0f) * ((float)M_PI / 180.0f); }

void cmdPos(ServoState& sv, float deg) {
  const bool isBend = (sv.id == 2 || sv.id == 3 || sv.id == 5 || sv.id == 6);
  sv.targetDeg = clampF(deg, isBend ? 80.0f : 0.0f, isBend ? 280.0f : 360.0f);
  sv.targetRaw = angleToRaw(sv.targetDeg);
  if (!sv.torqueOn) { st.EnableTorque(sv.id, 1); sv.torqueOn = true; }
  st.WritePosEx(sv.id, sv.targetRaw, 3400, 40);
}

// ── Zenoh session + pub/sub ─────────────────────────────────────────────────
z_owned_session_t z_session;
z_owned_publisher_t z_state_pub;
char actuator_key[64];
char state_key[64];

void on_actuator_sample(z_loaned_sample_t* sample, void* /*ctx*/) {
  z_owned_slice_t slice;
  z_bytes_to_slice(z_sample_payload(sample), &slice);
  const uint8_t* buf = z_slice_data(z_loan(slice));
  size_t len = z_slice_len(z_loan(slice));

  // One or more packed WireActuatorTarget records back-to-back.
  size_t n = len / sizeof(WireActuatorTarget);
  for (size_t i = 0; i < n; ++i) {
    WireActuatorTarget t;
    memcpy(&t, buf + i * sizeof(WireActuatorTarget), sizeof(t));
    if (t.joint_id < NUM_SERVOS) {
      float deg = radToServoDeg(t.position_rad);
      cmdPos(servos[t.joint_id], deg);
    }
  }
  z_drop(z_move(slice));
}

void publishJointStates() {
  WireJointState states[NUM_SERVOS];
  for (uint8_t i = 0; i < NUM_SERVOS; ++i) {
    int pos = st.ReadPos(servos[i].id);
    if (pos >= 0 && pos <= 4095) servos[i].rawPos = pos;
    states[i].joint_id = i;
    states[i].position_rad = servoDegToRad(rawToAngle((uint16_t)servos[i].rawPos));
    states[i].velocity_rad_s = 0.0f;  // ST3215 speed read omitted from the fast path, as in firmware.ino
    states[i].effort_nm = 0.0f;
  }
  z_owned_bytes_t payload;
  z_bytes_copy_from_buf(&payload, (const uint8_t*)states, sizeof(states));
  z_publisher_put(z_loan(z_state_pub), z_move(payload), nullptr);
}

void setMagnet(uint8_t ch, int pct) {
  if (ch >= MAG_COUNT) return;
  pct = constrain(pct, 0, 100);
  uint32_t duty = (uint32_t)lroundf((pct / 100.0f) * ((1u << MAG_PWM_RES) - 1));
  ledcWrite(MAG_IN1[ch], duty);  // ESP32 core 3.x API, same as firmware.ino
  ledcWrite(MAG_IN2[ch], 0);
}

void setup() {
  Serial.begin(115200);
  for (uint8_t i = 0; i < NUM_SERVOS; ++i) {
    servos[i] = ServoState{SERVO_DEFS[i].id, 180.0f, 2047, -1, false};
  }

  Serial1.begin(SERVO_BAUD, SERIAL_8N1, -1, SERVO_PIN);
  Serial1.setMode(UART_MODE_RS485_HALF_DUPLEX);
  st.pSerial = &Serial1;

  for (uint8_t ch = 0; ch < MAG_COUNT; ++ch) {
    ledcAttach(MAG_IN1[ch], MAG_PWM_FREQ, MAG_PWM_RES);
    ledcAttach(MAG_IN2[ch], MAG_PWM_FREQ, MAG_PWM_RES);
  }

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(200);

  z_owned_config_t config;
  z_config_default(&config);
  zp_config_insert(z_loan_mut(config), Z_CONFIG_CONNECT_KEY, ZENOH_ROUTER_LOCATOR);
  if (z_open(&z_session, z_move(config), nullptr) < 0) {
    Serial.println("Zenoh: failed to open session");
    return;
  }
  // zenoh-pico needs an explicit read/lease task on constrained targets (no OS scheduler backing it).
  zp_start_read_task(z_loan_mut(z_session), nullptr);
  zp_start_lease_task(z_loan_mut(z_session), nullptr);

  snprintf(actuator_key, sizeof(actuator_key), "tetrobot/%s/actuator/target", MDNS_HOST);
  snprintf(state_key, sizeof(state_key), "tetrobot/%s/joint/state", MDNS_HOST);

  z_view_keyexpr_t sub_ke;
  z_view_keyexpr_from_str(&sub_ke, actuator_key);
  z_owned_closure_sample_t closure;
  z_closure(&closure, on_actuator_sample, nullptr, nullptr);
  z_owned_subscriber_t sub;
  z_declare_subscriber(z_loan(z_session), &sub, z_loan(sub_ke), z_move(closure), nullptr);

  z_view_keyexpr_t pub_ke;
  z_view_keyexpr_from_str(&pub_ke, state_key);
  z_declare_publisher(z_loan(z_session), &z_state_pub, z_loan(pub_ke), nullptr);
}

unsigned long lastPublishMs = 0;

void loop() {
  unsigned long now = millis();
  if (now - lastPublishMs >= 60) {  // same 60 ms cadence as firmware.ino's FAST_MS
    publishJointStates();
    lastPublishMs = now;
  }
}
