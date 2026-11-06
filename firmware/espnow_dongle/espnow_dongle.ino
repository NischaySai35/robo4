// espnow_dongle - the laptop's ESP-NOW radio (an ESP32-CAM on its USB board, or any ESP32).
// REUSE-CHECKED: no ESP-NOW code existed; frame format shared with the modules via libraries/R4Now/src/r4now.h.
//
// It is only the radio: USB serial <-> ESP-NOW. Heartbeats, numbering and resends live on the laptop
// (gos/python/gos/espnow.py), so if the laptop program dies, the heartbeat stops and the modules hold their pose.
//
// Build/upload (CH340 port, e.g. COM7; no button needed on the ESP32-CAM-MB):
//   arduino-cli compile --fqbn esp32:esp32:esp32cam --library ../libraries/R4Now --output-dir build .
//   arduino-cli upload  --fqbn esp32:esp32:esp32cam -p COM7 --input-dir build .
//
// USB frames, both ways:  A5 5A  type  len(2, little endian)  payload[len]  sum8(type, len bytes, payload)
//   laptop -> dongle   'S' mac[6] + air frame      send (FF:FF:FF:FF:FF:FF = everyone)
//                      'C' channel[1]              listen and send on this Wi-Fi channel (1-13)
//                      'I'                         ask for the info line
//   dongle -> laptop   'R' mac[6] rssi[1] + frame  heard over the air (only frames that parse as ours)
//                      'T' mac[6] ok[1]            the radio's own delivery report for an 'S' (unicast: acked or not)
//                      'I' text                    "mac=.. ch=.. heard=.. sent=.. txfail=.. lost=.. badusb=.."
// Anything else the board prints at boot (ROM text) is skipped by the laptop because it is not framed.

#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include "r4now.h"

#define USB_BAUD 921600
#define LED_PIN  33              // AI-Thinker red LED, on when LOW
#define FLASH_PIN 4              // the bright flash LED: keep it off
#define CAM_PWDN_PIN 32          // camera power-down: HIGH = camera chip off (heat; 6 Nov: "master too hot")

struct AirIn { uint8_t mac[6]; int8_t rssi; uint8_t len; uint8_t data[r4now::FRAME_MAX]; };
struct TxDone { uint8_t mac[6]; uint8_t ok; };
static QueueHandle_t airQ, txQ;
static uint32_t heard = 0, sent = 0, txFail = 0, lost = 0, badUsb = 0;
static uint8_t channel = 1;
static uint32_t ledOffAt = 0;

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

static void setChannel(uint8_t ch) {
  if (ch < 1 || ch > 13) return;
  esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
  uint8_t now; wifi_second_chan_t sc; esp_wifi_get_channel(&now, &sc);
  channel = now;
}

static void info() {
  char s[200];
  snprintf(s, sizeof s, "mac=%s ch=%u mhz=%u chipC=%.0f heard=%lu sent=%lu txfail=%lu lost=%lu badusb=%lu",
           WiFi.macAddress().c_str(), channel, (unsigned)getCpuFrequencyMhz(), temperatureRead(), (unsigned long)heard, (unsigned long)sent, (unsigned long)txFail,
           (unsigned long)lost, (unsigned long)badUsb);
  usbSend('I', (const uint8_t*)s, strlen(s));
}

static void airSend(const uint8_t* mac, const uint8_t* frame, int len) {
  if (!esp_now_is_peer_exist(mac)) {
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, mac, 6); peer.channel = 0; peer.ifidx = WIFI_IF_STA; peer.encrypt = false;
    if (esp_now_add_peer(&peer) == ESP_ERR_ESPNOW_FULL) {        // 20 peers: forget the oldest-looking one
      esp_now_peer_info_t old; if (esp_now_fetch_peer(true, &old) == ESP_OK) esp_now_del_peer(old.peer_addr);
      esp_now_add_peer(&peer);
    }
  }
  esp_err_t e;
  for (int tries = 0; (e = esp_now_send(mac, frame, len)) == ESP_ERR_ESPNOW_NO_MEM && tries < 20; tries++) delay(1);
  if (e == ESP_OK) sent++;
  else { txFail++; TxDone t; memcpy(t.mac, mac, 6); t.ok = 0; usbSend('T', t.mac, 6, &t.ok, 1); }
  digitalWrite(LED_PIN, LOW); ledOffAt = millis() + 20;
}

// USB reader: a small state machine so a cut or garbled frame only costs that frame.
static uint8_t rx[5 + 6 + r4now::FRAME_MAX + 1];
static int rxN = 0, rxWant = 0;
static void usbPoll() {
  while (Serial.available()) {
    uint8_t c = Serial.read();
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
    if (type == 'S' && n > 6 + 0) airSend(p, p + 6, n - 6);
    else if (type == 'C' && n == 1) { setChannel(p[0]); info(); }
    else if (type == 'I') info();
  }
}

void setup() {
  setCpuFrequencyMhz(80);                  // heat: 80 MHz is the lowest the radio allows; USB serial is unaffected
  pinMode(CAM_PWDN_PIN, OUTPUT); digitalWrite(CAM_PWDN_PIN, HIGH);
  pinMode(FLASH_PIN, OUTPUT); digitalWrite(FLASH_PIN, LOW);
  pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, HIGH);
  Serial.setRxBufferSize(4096);
  Serial.setTxBufferSize(8192);
  Serial.begin(USB_BAUD);
  airQ = xQueueCreate(64, sizeof(AirIn));
  txQ  = xQueueCreate(64, sizeof(TxDone));
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();                       // never joins a network: free to sit on the modules' channel
  esp_wifi_set_ps(WIFI_PS_NONE);           // always listening
  esp_now_init();
  esp_now_register_recv_cb(onRecv);
  esp_now_register_send_cb(onSent);
  setChannel(channel);
  const uint8_t all[6] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
  esp_now_peer_info_t peer = {}; memcpy(peer.peer_addr, all, 6); peer.ifidx = WIFI_IF_STA;
  esp_now_add_peer(&peer);
  info();
}

void loop() {
  usbPoll();
  AirIn a;
  while (xQueueReceive(airQ, &a, 0) == pdTRUE) {
    heard++;
    uint8_t head[7]; memcpy(head, a.mac, 6); head[6] = (uint8_t)a.rssi;
    usbSend('R', head, 7, a.data, a.len);
  }
  TxDone t;
  while (xQueueReceive(txQ, &t, 0) == pdTRUE) {
    if (t.mac[0] == 0xff && t.mac[1] == 0xff) continue;    // broadcasts are never acked: nothing to report
    usbSend('T', t.mac, 6, &t.ok, 1);
  }
  if (ledOffAt && (int32_t)(millis() - ledOffAt) > 0) { digitalWrite(LED_PIN, HIGH); ledOffAt = 0; }
  delay(0);
}
