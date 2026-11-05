// test_now.cpp - checks the ESP-NOW frame format (r4now.h) on the laptop, no radio needed.
//   zig c++ -std=c++17 -O1 -w -I../libraries/R4Now/src test_now.cpp -o test_now && ./test_now
// REUSE-CHECKED: follows test_sync.cpp's style; nothing else tests r4now.h.
#ifndef ARDUINO   // laptop test only: the sketch build compiles every .cpp in this folder
#include "r4now.h"
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>
#include <algorithm>
#include <random>

using namespace r4now;
static int fails = 0;
#define CHECK(c, ...) do { if (!(c)) { fails++; printf("  FAIL: "); } else printf("  ok:   "); printf(__VA_ARGS__); printf("\n"); } while (0)

static std::vector<std::vector<uint8_t>> split(uint8_t type, uint16_t seq, const std::string& m) {
  std::vector<std::vector<uint8_t>> out;
  int cnt = fragsFor((int)m.size());
  for (int i = 0; i < cnt; i++) {
    std::vector<uint8_t> f(FRAME_MAX);
    f.resize(build(f.data(), type, seq, (const uint8_t*)m.data(), (int)m.size(), i));
    out.push_back(f);
  }
  return out;
}

// Feed frames; returns the message when one completes ("" if none).
static std::string feed(Assembly& a, const std::vector<std::vector<uint8_t>>& frames, int* completions = nullptr) {
  std::string got;
  for (auto& f : frames) {
    Head h; const uint8_t* p; int n;
    if (!parse(f.data(), (int)f.size(), h, p, n)) continue;
    if (a.add(h, p, n)) { got.assign((const char*)a.buf, a.len); if (completions) (*completions)++; }
  }
  return got;
}

int main() {
  Assembly* a = new Assembly();

  puts("1. a short request is one frame and comes back exactly");
  std::string req = "/api/batch?3=170.5&4=180&speed=5";
  auto f1 = split(REQ, 7, req);
  CHECK(f1.size() == 1 && f1[0].size() == (size_t)HEAD + req.size(), "1 frame of %zu bytes", f1[0].size());
  CHECK(feed(*a, f1) == req, "same text after the trip");

  puts("2. telemetry-sized answer (3.2 KB): 14 fragments, shuffled and some sent twice");
  std::string big; for (int i = 0; i < 3200; i++) big += (char)('a' + i % 26);
  auto f2 = split(RESP, 8, big);
  CHECK(f2.size() == 14, "%zu fragments", f2.size());
  std::mt19937 rng(1);
  auto mixed = f2; mixed.push_back(f2[3]); mixed.push_back(f2[0]);
  std::shuffle(mixed.begin(), mixed.end(), rng);
  int done = 0;
  CHECK(feed(*a, mixed, &done) == big && done == 1, "rebuilt once, repeats ignored");

  puts("3. a lost fragment: no message; the resend of the whole answer completes it");
  Assembly* b = new Assembly();
  auto lossy = f2; lossy.erase(lossy.begin() + 5);
  CHECK(feed(*b, lossy) == "", "incomplete while fragment 5 is missing");
  CHECK(feed(*b, f2) == big, "complete after the resend");

  puts("4. a new seq in the middle starts over (old half message dropped)");
  Assembly* c = new Assembly();
  std::vector<std::vector<uint8_t>> half(f2.begin(), f2.begin() + 4);
  feed(*c, half);
  auto f4 = split(RESP, 9, "200\n{\"ok\":true}");
  CHECK(feed(*c, f4) == "200\n{\"ok\":true}", "seq 9 completes on its own");

  puts("5. empty message (heartbeat) and the biggest message");
  auto hb = split(HB, 1, "");
  CHECK(hb.size() == 1 && hb[0].size() == (size_t)HEAD, "heartbeat is 8 bytes");
  Assembly* d = new Assembly();
  CHECK(feed(*d, hb) == "" && d->complete() && d->len == 0, "an empty message completes with length 0");
  std::string maxm(MSG_MAX, 'x');
  auto f5 = split(RESP, 2, maxm);
  CHECK((int)f5.size() == FRAG_MAX, "%zu fragments = FRAG_MAX", f5.size());
  CHECK(feed(*d, f5) == maxm, "%d bytes rebuilt", MSG_MAX);

  puts("6. foreign or broken frames are refused");
  Head h; const uint8_t* p; int n;
  auto bad = f1[0]; bad[0] = 'X';
  CHECK(!parse(bad.data(), (int)bad.size(), h, p, n), "wrong magic");
  bad = f1[0]; bad[3] = 99;
  CHECK(!parse(bad.data(), (int)bad.size(), h, p, n), "other version");
  bad = f1[0]; bad[6] = 1; bad[7] = 1;
  CHECK(!parse(bad.data(), (int)bad.size(), h, p, n), "index past count");
  bad = f2[0]; bad.resize(100);
  CHECK(!parse(bad.data(), (int)bad.size(), h, p, n), "short middle fragment");
  CHECK(!parse(bad.data(), 4, h, p, n), "too short for a header");

  printf("\n%s (%d failed)\n", fails ? "FAILED" : "ALL PASS", fails);
  return fails ? 1 : 0;
}
#endif
