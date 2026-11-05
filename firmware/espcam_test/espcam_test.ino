// ESP32-CAM (AI-Thinker) bring-up test: camera + SD card, picture sent over USB serial.
// REUSE-CHECKED: no camera code existed in the repo (grep esp_camera / CAMERA_MODEL, 6 Nov 2026).
//
// Build/upload (no IO0 button needed on the ESP32-CAM-MB board; it is CH340, e.g. COM7):
//   arduino-cli compile --fqbn esp32:esp32:esp32cam --output-dir build .
//   arduino-cli upload  --fqbn esp32:esp32:esp32cam -p COM7 --input-dir build .
// Laptop side:  py -3.12 tools/espcam/grab.py COM7
//
// Serial protocol (921600 baud), one line commands from the laptop:
//   "snap\n"  -> "JPEG <bytes>\n" then the raw bytes, then "END\n"; also saved to SD as /snapN.jpg
//   "info\n"  -> one status line
// Every other line the board prints starts with "# " so the laptop can skip it.

#include "esp_camera.h"
#include "FS.h"
#include "SD_MMC.h"

// AI-Thinker pin map
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

static bool camOk = false, sdOk = false;
static uint32_t snapCount = 0;
static uint64_t sdSizeMB = 0;

static bool startCamera() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM; c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM; c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.grab_mode = CAMERA_GRAB_LATEST;   // always the newest picture, never an old buffered one
  if (psramFound()) {
    c.frame_size = FRAMESIZE_VGA; c.jpeg_quality = 12; c.fb_count = 2; c.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    c.frame_size = FRAMESIZE_QVGA; c.jpeg_quality = 15; c.fb_count = 1; c.fb_location = CAMERA_FB_IN_DRAM;
  }
  esp_err_t e = esp_camera_init(&c);
  if (e != ESP_OK) { Serial.printf("# camera init failed 0x%x\n", e); return false; }
  return true;
}

static bool startSd() {
  // 1-bit mode: frees GPIO4 (the flash LED) and 12/13; slower but enough for snapshots.
  if (!SD_MMC.begin("/sdcard", true)) { Serial.println("# SD mount failed"); return false; }
  if (SD_MMC.cardType() == CARD_NONE) { Serial.println("# no SD card"); return false; }
  sdSizeMB = SD_MMC.cardSize() / (1024 * 1024);
  return true;
}

static void info() {
  sensor_t* s = camOk ? esp_camera_sensor_get() : nullptr;
  Serial.printf("INFO cam=%d sensor=0x%x psram=%d sd=%d sdMB=%llu snaps=%u heap=%u\n",
                camOk, s ? s->id.PID : 0, psramFound(), sdOk, sdSizeMB, snapCount, ESP.getFreeHeap());
}

static void snap() {
  if (!camOk) { Serial.println("ERR camera not running"); return; }
  // The first frames after start are often dark/green while exposure settles: drop two.
  for (int i = 0; i < 2; i++) { camera_fb_t* f = esp_camera_fb_get(); if (f) esp_camera_fb_return(f); }
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { Serial.println("ERR capture failed"); return; }
  snapCount++;
  if (sdOk) {
    char path[24]; snprintf(path, sizeof path, "/snap%u.jpg", snapCount);
    File f = SD_MMC.open(path, FILE_WRITE);
    if (f) { f.write(fb->buf, fb->len); f.close(); Serial.printf("# saved %s\n", path); }
    else Serial.println("# SD write failed");
  }
  Serial.printf("JPEG %u\n", (unsigned)fb->len);
  Serial.write(fb->buf, fb->len);
  Serial.print("\nEND\n");
  Serial.flush();
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(921600);
  delay(300);
  Serial.println("# espcam_test booting");
  camOk = startCamera();
  sdOk = startSd();
  info();
}

void loop() {
  static String line;
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      line.trim();
      if (line == "snap") snap();
      else if (line == "info") info();
      else if (line.length()) Serial.printf("ERR unknown '%s'\n", line.c_str());
      line = "";
    } else if (line.length() < 32) line += ch;
  }
}
