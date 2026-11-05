// r4now.h - the TETROBOT ESP-NOW link: one frame layout for the USB dongle, every module and the laptop.
// REUSE-CHECKED: no ESP-NOW code existed in the repo (grep espnow / esp_now, 6 Nov 2026).
//
// Who does what (the laptop is the brain, the dongle is only the radio):
//   laptop  gos/python/gos/espnow.py   heartbeat, numbered requests, resend until answered, HTTP gateway
//   dongle  firmware/espnow_dongle     USB serial <-> ESP-NOW, nothing else
//   module  firmware/esp32_multi       runs each request through the SAME handlers as its web API
//
// Air frame (<= 250 bytes, ESP-NOW v1 size, so any ESP32 hears it):
//   [0]'R' [1]'4' [2]type [3]version [4..5]seq (little endian) [6]fragment index [7]fragment count, then payload
//   HB    laptop -> broadcast, empty payload. A module that hears none for a while holds its pose.
//   HELLO module -> laptop every second: "name=mod1 ip=192.168.137.112 fw=0.1.0 up=<ms> ch=<n>"
//   REQ   laptop -> module: "/api/batch?3=170&speed=5", optionally "\n" + a POST body; split into fragments
//   RESP  module -> laptop: "<http code>\n<body>"; same seq as its REQ, so it is also the acknowledgement
// A REQ with the seq just answered is NOT run again: the module resends the saved answer (a lost answer must not
// toggle torque twice). The Python side (gos/espnow.py) mirrors these numbers; change both together.
//
// Plain C++ (no Arduino): tested on the laptop by firmware/esp32_multi/test_now.cpp.
#pragma once
#include <stdint.h>
#include <string.h>

namespace r4now {

enum Type : uint8_t { HB = 1, REQ = 2, RESP = 3, HELLO = 4 };

constexpr uint8_t  VERSION     = 1;
constexpr int      FRAME_MAX   = 250;
constexpr int      HEAD        = 8;
constexpr int      PAYLOAD_MAX = FRAME_MAX - HEAD;                     // 242
constexpr int      MSG_MAX     = 7744;                                 // 32 fragments; telemetry is ~3.2 KB
constexpr int      FRAG_MAX    = MSG_MAX / PAYLOAD_MAX;                // 32 (one bit each in a uint32)

struct Head { uint8_t type; uint16_t seq; uint8_t idx, cnt; };

inline int fragsFor(int len) { return len <= 0 ? 1 : (len + PAYLOAD_MAX - 1) / PAYLOAD_MAX; }

// Fragment `idx` of a message of `len` bytes into `out` (FRAME_MAX bytes). Returns the frame length.
inline int build(uint8_t* out, uint8_t type, uint16_t seq, const uint8_t* msg, int len, int idx) {
  const int cnt = fragsFor(len);
  const int off = idx * PAYLOAD_MAX;
  int n = len - off; if (n > PAYLOAD_MAX) n = PAYLOAD_MAX; if (n < 0) n = 0;
  out[0] = 'R'; out[1] = '4'; out[2] = type; out[3] = VERSION;
  out[4] = (uint8_t)(seq & 0xff); out[5] = (uint8_t)(seq >> 8);
  out[6] = (uint8_t)idx; out[7] = (uint8_t)cnt;
  if (n) memcpy(out + HEAD, msg + off, n);
  return HEAD + n;
}

// False for anything that is not one of our frames (other ESP-NOW users, a newer version, a broken count).
inline bool parse(const uint8_t* f, int len, Head& h, const uint8_t*& pay, int& plen) {
  if (len < HEAD || len > FRAME_MAX || f[0] != 'R' || f[1] != '4' || f[3] != VERSION) return false;
  h.type = f[2]; h.seq = (uint16_t)(f[4] | (f[5] << 8)); h.idx = f[6]; h.cnt = f[7];
  if (h.cnt == 0 || h.cnt > FRAG_MAX || h.idx >= h.cnt) return false;
  if (h.idx + 1 < h.cnt && len != FRAME_MAX) return false;            // only the last fragment may be short
  pay = f + HEAD; plen = len - HEAD;
  return true;
}

// Puts one message back together. Fragments may come in any order or twice; a new seq starts over.
struct Assembly {
  uint8_t  buf[MSG_MAX];
  uint16_t seq = 0;
  uint8_t  cnt = 0;
  uint32_t have = 0;
  int      len = 0;
  bool     active = false;

  void reset() { active = false; have = 0; len = 0; cnt = 0; }
  bool complete() const { return active && cnt && have == (cnt == 32 ? 0xffffffffu : ((1u << cnt) - 1)); }
  // True when this fragment completed the message (buf[0..len) holds it).
  bool add(const Head& h, const uint8_t* pay, int plen) {
    if (!active || h.seq != seq || h.cnt != cnt) { active = true; seq = h.seq; cnt = h.cnt; have = 0; len = 0; }
    if (have & (1u << h.idx)) return false;                            // repeat: already have it
    memcpy(buf + h.idx * PAYLOAD_MAX, pay, plen);
    have |= 1u << h.idx;
    if (h.idx == h.cnt - 1) len = h.idx * PAYLOAD_MAX + plen;
    return complete();
  }
};

}  // namespace r4now
