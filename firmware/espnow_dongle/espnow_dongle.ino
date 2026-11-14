// espnow_dongle - the laptop's ESP-NOW radio AND a small controller of its own (an ESP32-CAM on its USB board).
// REUSE-CHECKED: no ESP-NOW code existed; frame format shared with the modules via libraries/R4Now/src/r4now.h.
//
// The laptop is the brain (gos/python/gos/espnow.py: what to do, the mod1.local gateway); it talks only to this board,
// over USB, which does not drop. This board owns the radio side ("the comm control of the C3s is with the master"):
//   - the heartbeat to every module, every 100 ms, straight to each (acked + retried by the radio);
//   - delivery: each request from the laptop is sent, and sent again, until the module's whole answer is back
//     (r4now::Courier); a napping module gets it the moment it says hello; after 2.5 s the laptop hears "failed".
// What it also does by itself, laptop program running or not (6 Nov 2026, Nischay):
//   - keeps a list of the modules it hears (their hellos), and follows their Wi-Fi channel; searches when none is heard;
//   - when the laptop program (re)connects, hands it that list at once, so the modules show up immediately;
//   - laptop program gone while it was driving moves (no USB for 0.4 s): tells every module to stop and HOLD at once;
//   - the IO0 button on the USB board: short press = every module stops and holds (torque on);
//     held 2 s = E-STOP (every module limp, like the Studio's E-STOP ALL).
//
// Build/upload (CH340 port, e.g. COM7; no button needed on the ESP32-CAM-MB):
//   arduino-cli compile --fqbn esp32:esp32:esp32cam --library ../libraries/R4Now --output-dir build .
//   arduino-cli upload  --fqbn esp32:esp32:esp32cam -p COM7 --input-dir build .
//
// USB frames, both ways:  A5 5A  type  len(2, little endian)  payload[len]  sum8(type, len bytes, payload)
//   laptop -> dongle   'Q' mac[6] + air frame      a request fragment: deliver it (resend until answered or failed)
//                      'P'                         the laptop program is here (every 100 ms; silence = gone)
//                      'S' mac[6] + air frame      send once as it is (FF:FF:FF:FF:FF:FF = everyone)
//                      'C' channel[1]              use this Wi-Fi channel (1-13); it still follows the modules after
//                      'I'                         ask for the info line
//                      'W' rate[1]                 ESP-NOW speed: 0 normal 1 Mbps, 1 Long Range 500 kbps, 2 Long Range 250 kbps
//                      'X' mode[1] bright[1]       flash LED: mode 0 off, 1 on, 2 blink; bright 0-100 % (default off)
//                      'V' on[1]                   camera on (1) / off (0) - default off (heat); off = camera chip powered down
//   dongle -> laptop   'R' mac[6] rssi[1] + frame  heard over the air (only frames that parse as ours)
//                      'T' mac[6] ok[1]            the radio's own delivery report for an 'S' (unicast: acked or not)
//                      'I' text                    "mac=.. ch=.. auto=1 modules=N mhz=.. chipC=.. heard=.. sent=.. ..."
//                      'F' mac[6] seq[2] text      a request it gave up on, and why
//                      'L' text                    something it did by itself (hold, E-STOP, channel change)
//                      'J' id[1] part[1] last[1] + jpeg bytes (<= 1024)   a camera picture, in pieces (camera on only)
// Anything else the board prints at boot (ROM text) is skipped by the laptop because it is not framed.

#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include "r4now.h"
#include <Preferences.h>
#include "esp_camera.h"


#define USB_BAUD 921600
#define LED_PIN  33              // AI-Thinker red LED, on when LOW
#define FLASH_PIN 4              // the bright flash LED: keep it off
#define CAM_PWDN_PIN 32          // camera power-down: HIGH = camera chip off (heat; 6 Nov: "master too hot")
#define BUTTON_PIN 0             // IO0 button on the ESP32-CAM-MB (free: the camera clock is off)
#define ESTOP_HOLD_MS  2000      // button held this long = E-STOP
#define LAPTOP_GONE_MS  400      // no USB frame this long while the laptop was driving -> HOLD
#define DRIVE_MS       3000      // a laptop move this recent = the laptop is driving
#define SEARCH_AFTER_MS 4000     // no hello this long -> look on the other channels
#define SEARCH_DWELL_MS 1100     // per channel (a module says hello once a second)
#define MAX_MODULES 16
#define HB_MS          100       // the heartbeat to each awake module (it holds after 0.8 s without the laptop driving)

struct AirIn { uint8_t mac[6]; int8_t rssi; uint8_t len; uint8_t data[r4now::FRAME_MAX]; };
struct TxDone { uint8_t mac[6]; uint8_t ok; };
struct Known { uint8_t mac[6]; int8_t rssi; uint8_t ch; bool awake; uint32_t seen; uint8_t len; uint8_t hello[r4now::FRAME_MAX]; };
static QueueHandle_t airQ, txQ;
static uint32_t heard = 0, sent = 0, txFail = 0, lost = 0, badUsb = 0, holds = 0, estops = 0;
static esp_err_t lastErr = ESP_OK;                 // radio self-recovery (radioWatch), shown in the info line
static uint32_t refusedRun = 0, lastAcceptMs = 0, reinits = 0, lastReinitMs = 0;
static uint8_t channel = 1;
static uint8_t nowRate = 1;   // 12 Nov (Nischay): Long Range 500 kbps by default, like the modules                // ESP-NOW speed, see applyRate
static uint8_t flashMode = 0;               // flash LED: 0 off, 1 on, 2 blink (see flashSet)
static bool camOn = false;                 // the camera runs (default off: heat) - see camStart
static Preferences prefs;                   // "r4master": ch = the channel the modules were last heard on
static uint32_t ledOffAt = 0;
static Known known[MAX_MODULES];
static uint8_t nKnown = 0;
static uint32_t lastHelloMs = 0, searchStepMs = 0;
static uint32_t lastUsbMs = 0, laptopMoveMs = 0;
static bool laptopHere = false, heldForLaptop = false;
static uint16_t ownSeq = 0;
static r4now::Courier* courier = nullptr;
static uint32_t tQfirst = 0, tQ2S = 0, tAirAcc = 0, tAirUs = 0, tSentAt = 0, tS2A = 0;   // stage timing of the last request     // 8 requests in flight (~32 KB), made once

static void onRecv(const esp_now_recv_info_t* info, const uint8_t* data, int len) {
  r4now::Head h; const uint8_t* p; int n;
  if (!r4now::parse(data, len, h, p, n)) return;
  AirIn a; memcpy(a.mac, info->src_addr, 6); a.rssi = info->rx_ctrl ? info->rx_ctrl->rssi : 0;
  a.len = (uint8_t)len; memcpy(a.data, data, len);
  if (xQueueSend(airQ, &a, 0) != pdTRUE) lost++;
}
static void onSent(const esp_now_send_info_t* info, esp_now_send_status_t st) {
  TxDone t; memcpy(t.mac, info->des_addr, 6); t.ok = st == ESP_NOW_SEND_SUCCESS;
  if (!t.ok) txFail++;
  xQueueSend(txQ, &t, 0);
}

static void usbSend(uint8_t type, const uint8_t* a, int an, const uint8_t* b = nullptr, int bn = 0) {
  const int len = an + bn;
  uint8_t head[5] = {0xA5, 0x5A, type, (uint8_t)(len & 0xff), (uint8_t)(len >> 8)};
  uint8_t sum = type + head[3] + head[4];
  for (int i = 0; i < an; i++) sum += a[i];
  for (int i = 0; i < bn; i++) sum += b[i];
  Serial.write(head, 5);
  if (an) Serial.write(a, an);
  if (bn) Serial.write(b, bn);
  Serial.write(&sum, 1);
}
static void say(const char* fmt, ...) {
  char s[160]; va_list ap; va_start(ap, fmt); vsnprintf(s, sizeof s, fmt, ap); va_end(ap);
  usbSend('L', (const uint8_t*)s, strlen(s));
}

static void setChannel(uint8_t ch) {
  if (ch < 1 || ch > 13) return;
  esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
  uint8_t now; wifi_second_chan_t sc; esp_wifi_get_channel(&now, &sc);
  channel = now;
}

static uint8_t aliveCount() {
  uint8_t n = 0;
  for (uint8_t i = 0; i < nKnown; i++) if (millis() - known[i].seen < 3000) n++;
  return n;
}

static void info() {
  char s[400];   // 12 Nov: + up (s) and heap for master.local
  snprintf(s, sizeof s, "mac=%s ch=%u auto=1 courier=1 stop=1 modules=%u mhz=%u chipC=%.0f heard=%lu sent=%lu txfail=%lu lost=%lu badusb=%lu holds=%lu estops=%lu cresent=%lu cdeliv=%lu cfail=%lu q2s=%lu air=%lu s2a=%lu lasterr=%d reinit=%lu up=%lu heap=%u cam=%d lr=%u flash=%u",
           WiFi.macAddress().c_str(), channel, aliveCount(), (unsigned)getCpuFrequencyMhz(), temperatureRead(),
           (unsigned long)heard, (unsigned long)sent, (unsigned long)txFail, (unsigned long)lost, (unsigned long)badUsb,
           (unsigned long)holds, (unsigned long)estops, (unsigned long)courier->resent, (unsigned long)courier->delivered, (unsigned long)courier->failed, (unsigned long)tQ2S, (unsigned long)tAirUs, (unsigned long)tS2A, (int)lastErr, (unsigned long)reinits, (unsigned long)(millis() / 1000), (unsigned)ESP.getFreeHeap(), (int)camOn, (unsigned)nowRate, (unsigned)flashMode);
  usbSend('I', (const uint8_t*)s, strlen(s));
}

// ESP-NOW speed (12 Nov 2026, Gemini's Long Range tip): 0 normal 1 Mbps, 1 LR 500 kbps, 2 LR 250 kbps. USB 'W' rate[1] sets it
// live (not saved). The radio accepts all of them always (LR in the protocol list), so the modules can switch one by one.
static void applyRate(const uint8_t* mac) {
  esp_now_rate_config_t c = {};
  c.phymode = nowRate ? WIFI_PHY_MODE_LR : WIFI_PHY_MODE_11B;
  c.rate = nowRate == 2 ? WIFI_PHY_RATE_LORA_250K : nowRate == 1 ? WIFI_PHY_RATE_LORA_500K : WIFI_PHY_RATE_1M_L;
  esp_now_set_peer_rate_config(mac, &c);
}
static void applyRateAll() {
  esp_now_peer_info_t pi; bool first = true;
  while (esp_now_fetch_peer(first, &pi) == ESP_OK) { first = false; applyRate(pi.peer_addr); }
}
static void addPeer(const uint8_t* mac) {
  if (esp_now_is_peer_exist(mac)) return;
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, mac, 6); peer.channel = 0; peer.ifidx = WIFI_IF_STA; peer.encrypt = false;
  if (esp_now_add_peer(&peer) == ESP_ERR_ESPNOW_FULL) {        // 20 peers: forget one
    esp_now_peer_info_t old; if (esp_now_fetch_peer(true, &old) == ESP_OK) esp_now_del_peer(old.peer_addr);
    esp_now_add_peer(&peer);
  }
  applyRate(mac);
}

// 12 Nov 2026: the radio refused EVERY send for ~2 h ('sent' frozen at 4234, 'txfail' to 76 000) while it still heard every
// module; only a restart cured it. Now the dongle notices by itself: sends refused for RADIO_STUCK_MS -> restart ESP-NOW;
// stuck again within RADIO_REBOOT_MS -> reboot the chip. lastErr / reinit are in the info line.
#define RADIO_STUCK_MS  3000
#define RADIO_REBOOT_MS 30000

static void airSend(const uint8_t* mac, const uint8_t* frame, int len) {
  addPeer(mac);
  esp_err_t e;
  for (int tries = 0; (e = esp_now_send(mac, frame, len)) == ESP_ERR_ESPNOW_NO_MEM && tries < 20; tries++) delay(1);
  if (e == ESP_OK) { sent++; refusedRun = 0; lastAcceptMs = millis(); }
  else { txFail++; lastErr = e; refusedRun++; TxDone t; memcpy(t.mac, mac, 6); t.ok = 0; usbSend('T', t.mac, 6, &t.ok, 1); }
  digitalWrite(LED_PIN, LOW); ledOffAt = millis() + 20;
}

// Something the dongle decides by itself goes to every module it knows (each acked + retried), and to everyone.
static void toAll(uint8_t type) {
  uint8_t f[r4now::HEAD];
  int n = r4now::build(f, type, ++ownSeq, nullptr, 0, 0);
  for (uint8_t i = 0; i < nKnown; i++) if (millis() - known[i].seen < 10000) airSend(known[i].mac, f, n);
  static const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
  airSend(all, f, n);
}

// "name=mod1 ip=.. ch=13 ..." -> the channel number (0 if none)
static uint8_t helloChannel(const uint8_t* p, int n) {
  for (int i = 0; i + 3 < n; i++)
    if ((i == 0 || p[i - 1] == ' ') && p[i] == 'c' && p[i + 1] == 'h' && p[i + 2] == '=') return (uint8_t)atoi((const char*)p + i + 3);
  return 0;
}

static void remember(const AirIn& a, const uint8_t* p, int n) {
  int k = -1;
  for (uint8_t i = 0; i < nKnown; i++) if (memcmp(known[i].mac, a.mac, 6) == 0) { k = i; break; }
  if (k < 0) {
    if (nKnown < MAX_MODULES) k = nKnown++;
    else { k = 0; for (uint8_t i = 1; i < nKnown; i++) if (known[i].seen < known[k].seen) k = i; }   // oldest out
    memcpy(known[k].mac, a.mac, 6);
  }
  Known& m = known[k];
  if (memmem(p, n, "dying=battery", 13)) {             // the module's battery guard: it switches itself off now
    static uint32_t toldAt = 0;
    if (millis() - toldAt > 5000) { toldAt = millis(); char t[64]; int l = n < 63 ? n : 63; memcpy(t, p, l); t[l] = 0; say("battery empty, module switching off: %s", t); }
    m.seen = 0;                                          // gone: no heartbeat, no replay
    return;
  }
  m.rssi = a.rssi; m.seen = millis(); m.len = a.len; memcpy(m.hello, a.data, a.len);
  m.ch = helloChannel(p, n);
  m.awake = !(n >= 7 && memmem(p, n, "awake=0", 7));
  courier->hello(m.mac);                                 // it listens right now: what waits for it goes out
  lastHelloMs = millis();
  if (m.ch && m.ch != channel) {
    setChannel(m.ch); say("following the modules to channel %u", m.ch);
    if (prefs.getUChar("ch", 0) != channel) prefs.putUChar("ch", channel);   // a restart starts here (~1 s, not ~17 s)
  }
}

// The laptop program just (re)connected: what we know, at once, as the hellos it would have heard.
static void replayKnown() {
  for (uint8_t i = 0; i < nKnown; i++) {
    if (millis() - known[i].seen > 3000) continue;
    uint8_t head[7]; memcpy(head, known[i].mac, 6); head[6] = (uint8_t)known[i].rssi;
    usbSend('R', head, 7, known[i].hello, known[i].len);
  }
}

// A laptop request that moves something (the laptop is driving: hold if it vanishes)
static bool isMove(const uint8_t* frame, int len) {
  r4now::Head h; const uint8_t* p; int n;
  if (!r4now::parse(frame, len, h, p, n) || h.type != r4now::REQ || h.idx != 0) return false;
  auto starts = [&](const char* s) { int k = strlen(s); return n >= k && memcmp(p, s, k) == 0; };
  if (starts("/api/batch") || starts("/api/anim/play") || starts("/api/home") || starts("/api/lock")) return true;
  if (starts("/api/command")) { for (int i = 0; i + 7 <= n; i++) if (memcmp(p + i, "cmd=pos", 7) == 0) return true; }
  return false;
}

// USB reader: a small state machine so a cut or garbled frame only costs that frame.
static uint8_t rx[5 + 6 + r4now::FRAME_MAX + 1];
static int rxN = 0, rxWant = 0;
// ── camera (12 Nov 2026, Nischay: "a small live camera window, on/off, default off - it must not stress the board") ──
// Off: the camera chip is powered down (CAM_PWDN HIGH) and nothing runs. On: 320x240 JPEG, at most CAM_FPS pictures a
// second, sent to the laptop in 1 KB pieces between the radio work (one piece per loop turn), so the modules' traffic
// never waits behind a whole picture. GPIO0 is the camera clock while it is on: the button is not read then.
#define CAM_FPS 8
static camera_fb_t* camFb = nullptr;
static uint32_t camSentAt = 0, camOff = 0, camFrames = 0;
static uint8_t camId = 0;
// ── flash LED (12 Nov 2026, Nischay: off / on / blink on master.local, default off) ── PWM on LEDC channel 4 (timer 2): the
// camera keeps channel 0 / timer 0. It is a very bright, hot LED: off when the laptop program goes away, like the camera.
static uint8_t flashBright = 30;
static bool flashPwm = false, flashLit = false;
static uint32_t flashFlipAt = 0;
static void flashWrite(bool lit) {
  if (!flashPwm) { flashPwm = ledcAttachChannel(FLASH_PIN, 5000, 8, 4); }
  flashLit = lit;
  if (flashPwm) ledcWrite(FLASH_PIN, lit ? (uint32_t)flashBright * 255 / 100 : 0); else digitalWrite(FLASH_PIN, lit ? HIGH : LOW);
}
static void flashSet(uint8_t mode, uint8_t bright) {
  flashMode = mode > 2 ? 0 : mode; flashBright = bright > 100 ? 100 : bright;
  flashWrite(flashMode != 0); flashFlipAt = millis();
}
static void flashTick() {
  if (flashMode != 2 || millis() - flashFlipAt < 500) return;
  flashFlipAt = millis(); flashWrite(!flashLit);
}
static void camStop() {
  if (camFb) { esp_camera_fb_return(camFb); camFb = nullptr; }
  if (camOn) esp_camera_deinit();
  camOn = false;
  pinMode(CAM_PWDN_PIN, OUTPUT); digitalWrite(CAM_PWDN_PIN, HIGH);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
}
static void camStart() {
  if (camOn) return;
  camera_config_t c = {};
  c.pin_pwdn = CAM_PWDN_PIN; c.pin_reset = -1; c.pin_xclk = 0; c.pin_sccb_sda = 26; c.pin_sccb_scl = 27;
  c.pin_d7 = 35; c.pin_d6 = 34; c.pin_d5 = 39; c.pin_d4 = 36; c.pin_d3 = 21; c.pin_d2 = 19; c.pin_d1 = 18; c.pin_d0 = 5;
  c.pin_vsync = 25; c.pin_href = 23; c.pin_pclk = 22;
  c.xclk_freq_hz = 10000000; c.ledc_timer = LEDC_TIMER_0; c.ledc_channel = LEDC_CHANNEL_0;
  c.pixel_format = PIXFORMAT_JPEG; c.frame_size = FRAMESIZE_QVGA; c.jpeg_quality = 14; c.fb_count = 1;
  c.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM; c.grab_mode = CAMERA_GRAB_LATEST;
  esp_err_t e = esp_camera_init(&c);
  if (e != ESP_OK) { say("camera did not start (error 0x%x)", (unsigned)e); camStop(); return; }
  camOn = true; camFrames = 0; say("camera ON");
}
static void camTick() {
  if (!camOn || !laptopHere) return;
  if (!camFb) {
    if (millis() - camSentAt < 1000 / CAM_FPS) return;
    camFb = esp_camera_fb_get(); if (!camFb) return;
    camSentAt = millis(); camOff = 0; camId++;
  }
  const uint32_t n = camFb->len - camOff < 1024 ? camFb->len - camOff : 1024;
  const uint8_t head[3] = {camId, (uint8_t)(camOff / 1024), (uint8_t)(camOff + n >= camFb->len)};
  usbSend('J', head, 3, camFb->buf + camOff, n);
  camOff += n;
  if (camOff >= camFb->len) { esp_camera_fb_return(camFb); camFb = nullptr; camFrames++; }
}

static void usbPoll() {
  // Read what has arrived in one go: Serial.read() one byte at a time cost ~50 us each at 80 MHz, so a 3.2 KB firmware
  // piece took 184 ms to come in (measured 7 Nov, the laptop sent it in 38 ms) and updates crawled at ~7 KB/s.
  static uint8_t chunk[512];
  int got;
  while ((got = Serial.available()) > 0) {
   got = Serial.read(chunk, got < (int)sizeof chunk ? got : (int)sizeof chunk);
   for (int ci = 0; ci < got; ci++) {
    uint8_t c = chunk[ci];
    if (rxN == 0 && c != 0xA5) continue;
    if (rxN == 1 && c != 0x5A) { rxN = c == 0xA5 ? 1 : 0; continue; }
    rx[rxN++] = c;
    if (rxN == 5) {
      rxWant = rx[3] | (rx[4] << 8);
      if (rxWant > 6 + r4now::FRAME_MAX) { badUsb++; rxN = 0; continue; }
    }
    if (rxN < 5 || rxN < 5 + rxWant + 1) continue;
    uint8_t sum = 0; for (int i = 2; i < 5 + rxWant; i++) sum += rx[i];
    const uint8_t type = rx[2]; const uint8_t* p = rx + 5; const int n = rxWant;
    rxN = 0;
    if (sum != rx[5 + n]) { badUsb++; continue; }
    const bool wasAway = !laptopHere;
    lastUsbMs = millis(); laptopHere = true;
    if (wasAway) { heldForLaptop = false; replayKnown(); }
    if (type == 'Q' && n > 6 && p[6 + 6] == 0) tQfirst = millis();             // fragment 0 of a request
    if (type == 'Q' && n > 6) { if (isMove(p + 6, n - 6)) laptopMoveMs = millis(); courier->request(p, p + 6, n - 6, millis()); }
    else if (type == 'P') { /* presence only */ }
    else if (type == 'W' && n >= 1) { nowRate = p[0] > 2 ? 2 : p[0]; applyRateAll(); say("radio speed: %s", nowRate == 2 ? "Long Range 250 kbps" : nowRate == 1 ? "Long Range 500 kbps" : "normal 1 Mbps"); }
    else if (type == 'X' && n >= 2) { flashSet(p[0], p[1]); say("flash %s (%u %%)", flashMode == 2 ? "BLINK" : flashMode ? "ON" : "OFF", flashBright); }
    else if (type == 'V' && n >= 1) { if (p[0]) camStart(); else if (camOn) { camStop(); say("camera OFF"); } }
    else if (type == 'S' && n > 6) { if (isMove(p + 6, n - 6)) laptopMoveMs = millis(); airSend(p, p + 6, n - 6); }
    else if (type == 'C' && n == 1) { setChannel(p[0]); searchStepMs = millis(); info(); }
    else if (type == 'I') info();
    // the laptop's stop-all (gos robot stop, the GOS /modules/stop service): exactly what the button does
    else if (type == 'H') { holds++; toAll(r4now::HOLD); say("laptop: every module stops and holds"); }
    else if (type == 'E') { estops++; toAll(r4now::ESTOP); say("laptop: E-STOP sent to every module (limp)"); }
   }
  }
}

static void camStop();
static void laptopWatch() {
  if (!laptopHere || millis() - lastUsbMs < LAPTOP_GONE_MS) return;
  laptopHere = false;                                    // its heartbeat alone comes every 100 ms
  if (camOn) { camStop(); say("camera OFF (laptop program gone)"); }   // nobody watching: never left running
  if (flashMode) { flashSet(0, flashBright); say("flash OFF (laptop program gone)"); }
  if (laptopMoveMs && millis() - laptopMoveMs < DRIVE_MS + LAPTOP_GONE_MS && !heldForLaptop) {
    heldForLaptop = true; holds++;
    toAll(r4now::HOLD);                                  // faster than each module's own 0.8 s wait
  }
}

static void buttonWatch() {
  static uint32_t downAt = 0; static bool down = false, fired = false;
  const bool now = digitalRead(BUTTON_PIN) == LOW;
  if (now && !down) { down = true; downAt = millis(); fired = false; }
  if (now && down && !fired && millis() - downAt >= ESTOP_HOLD_MS) {
    fired = true; estops++; toAll(r4now::ESTOP); say("button held 2 s: E-STOP sent to every module (limp)");
  }
  if (!now && down) {
    down = false;
    if (!fired && millis() - downAt >= 40) { holds++; toAll(r4now::HOLD); say("button: every module stops and holds"); }
  }
}

static void courierSend(const uint8_t* mac, const uint8_t* f, int n) {
  uint32_t a = micros(); airSend(mac, f, n); tAirAcc += micros() - a;
  if (f[6] == f[7] - 1) { tQ2S = millis() - tQfirst; tAirUs = tAirAcc; tAirAcc = 0; tSentAt = millis(); }   // last fragment out
}
static void courierFail(const uint8_t* mac, uint16_t seq, const char* why) {
  uint8_t head[8]; memcpy(head, mac, 6); head[6] = (uint8_t)(seq & 0xff); head[7] = (uint8_t)(seq >> 8);
  usbSend('F', head, 8, (const uint8_t*)why, strlen(why));
}

// The master's own heartbeat: straight to each awake module it heard lately, plus everyone twice a second.
static void heartbeat() {
  static uint32_t at = 0; static uint8_t n = 0;
  if (millis() - at < HB_MS) return;
  at = millis();
  uint8_t f[r4now::HEAD];
  int len = r4now::build(f, r4now::HB, ++ownSeq, nullptr, 0, 0);
  for (uint8_t i = 0; i < nKnown; i++) if (known[i].awake && millis() - known[i].seen < 3000) airSend(known[i].mac, f, len);
  if (++n % 5 == 0) { static const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff}; airSend(all, f, len); }
}

static void onRecv(const esp_now_recv_info_t* info, const uint8_t* data, int len);
static void onSent(const esp_now_send_info_t* info, esp_now_send_status_t st);
static void setChannel(uint8_t ch);
static void radioWatch() {
  if (refusedRun < 20 || millis() - lastAcceptMs < RADIO_STUCK_MS) return;
  if (lastReinitMs && millis() - lastReinitMs < RADIO_REBOOT_MS) { delay(50); ESP.restart(); }   // a restart did not cure it
  lastReinitMs = millis(); reinits++; refusedRun = 0; lastAcceptMs = millis();
  esp_now_deinit();
  esp_now_init();
  esp_now_register_recv_cb(onRecv);
  esp_now_register_send_cb(onSent);
  const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
  esp_now_peer_info_t peer = {}; memcpy(peer.peer_addr, all, 6); peer.ifidx = WIFI_IF_STA;
  esp_now_add_peer(&peer); applyRate(all);                                   // module peers come back by themselves (addPeer on each send)
  setChannel(channel);
}

static void searchWatch() {
  if (millis() - lastHelloMs < SEARCH_AFTER_MS || millis() - searchStepMs < SEARCH_DWELL_MS) return;
  searchStepMs = millis();
  setChannel(channel % 13 + 1);
}

void setup() {
  setCpuFrequencyMhz(80);                  // heat: 80 MHz is the lowest the radio allows; USB serial is unaffected
  pinMode(CAM_PWDN_PIN, OUTPUT); digitalWrite(CAM_PWDN_PIN, HIGH);
  pinMode(FLASH_PIN, OUTPUT); digitalWrite(FLASH_PIN, LOW);
  pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, HIGH);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Serial.setRxBufferSize(4096);
  Serial.setTxBufferSize(8192);
  Serial.begin(USB_BAUD);
  courier = new r4now::Courier(); courier->send = courierSend; courier->fail = courierFail;
  airQ = xQueueCreate(64, sizeof(AirIn));
  txQ  = xQueueCreate(64, sizeof(TxDone));
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();                       // never joins a network: free to sit on the modules' channel
  esp_wifi_set_ps(WIFI_PS_NONE);           // always listening
  esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N | WIFI_PROTOCOL_LR);   // hear LR too
  WiFi.setTxPower(WIFI_POWER_15dBm);       // 12 Nov (Nischay): 15 dBm on the master and every module
  esp_now_init();
  esp_now_register_recv_cb(onRecv);
  esp_now_register_send_cb(onSent);
  prefs.begin("r4master", false);
  channel = prefs.getUChar("ch", 1);       // where the modules were last time: no 13-channel search after a restart
  setChannel(channel);
  const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
  esp_now_peer_info_t peer = {}; memcpy(peer.peer_addr, all, 6); peer.ifidx = WIFI_IF_STA;
  esp_now_add_peer(&peer); applyRate(all);
  info();
}

void loop() {
  usbPoll();
  AirIn a;
  while (xQueueReceive(airQ, &a, 0) == pdTRUE) {
    heard++;
    r4now::Head h; const uint8_t* p; int n;
    if (r4now::parse(a.data, a.len, h, p, n)) {
      if (h.type == r4now::HELLO) remember(a, p, n);
      // A module's group STOP (groupsync.h GroupMsg: kind at byte 4, GK_STOP = 3) is a broadcast: never acked, said 3
      // times, so a weak link can lose all three. The master heard it: hand a copy to every other module it knows,
      // straight to each (acked and retried by the radio). Repeats are harmless: a stopped module ignores STOP.
      // 12 Nov (Nischay): module<->module is too weak (-91..-94 dBm, mod2 missed all 13 GO repeats) while both hear the
      // master (~-80): the master now passes on EVERY group message - GO (1), PLACE (2) and STOP (3) - the same way.
      // A repeat is harmless: GO only refines the start instant, PLACE is the latest place, STOP stops once.
      else if (h.type == r4now::GRP && n >= 5 && p[4] >= 1 && p[4] <= 3) {
        for (uint8_t i = 0; i < nKnown; i++)
          if (memcmp(known[i].mac, a.mac, 6) && millis() - known[i].seen < 10000) airSend(known[i].mac, a.data, a.len);
      }
      else if (h.type == r4now::RESP) { uint32_t d0 = courier->delivered; courier->answer(a.mac, h, millis()); if (courier->delivered != d0) tS2A = millis() - tSentAt; }
    }
    if (laptopHere) {
      uint8_t head[7]; memcpy(head, a.mac, 6); head[6] = (uint8_t)a.rssi;
      usbSend('R', head, 7, a.data, a.len);
    }
  }
  TxDone t;
  while (xQueueReceive(txQ, &t, 0) == pdTRUE) {
    if (t.mac[0] == 0xff && t.mac[1] == 0xff) continue;    // broadcasts are never acked: nothing to report
    if (laptopHere) usbSend('T', t.mac, 6, &t.ok, 1);
  }
  courier->tick(millis());
  heartbeat();
  laptopWatch();
  if (!camOn) buttonWatch();                 // GPIO0 is the camera clock while the camera is on
  camTick();
  flashTick();
  searchWatch();
  radioWatch();
  if (ledOffAt && (int32_t)(millis() - ledOffAt) > 0) { digitalWrite(LED_PIN, HIGH); ledOffAt = 0; }
  delay(1);
}
