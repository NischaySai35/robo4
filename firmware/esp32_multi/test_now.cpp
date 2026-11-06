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
#include <map>

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

// ── the master's Courier against a pretend module over a lossy radio (simulated milliseconds) ──────────────────────
// The pretend module behaves like esp32_multi's ESP-NOW section: runs a request once, keeps its last 8 answers and
// the last 32 numbers, resends a saved answer for a repeat, says hello every second, and (napping) hears only 80 ms
// after each hello.
namespace sim {
std::mt19937 rng(3);
double loss = 0; bool napping = false; uint32_t now = 0;
const uint8_t MOD[6] = {1, 2, 3, 4, 5, 6};
std::vector<std::vector<uint8_t>> toModule, toMaster;     // frames in the air this ms
bool lost() { return std::uniform_real_distribution<double>(0, 1)(rng) < loss; }
void masterSend(const uint8_t*, const uint8_t* f, int n) { if (!lost()) toModule.emplace_back(f, f + n); }
std::vector<std::pair<uint16_t, std::string>> failures;
void masterFail(const uint8_t*, uint16_t seq, const char* why) { failures.push_back({seq, why}); }

struct Module {
  Assembly a; std::vector<std::string> ran; std::vector<std::pair<uint16_t, std::string>> answers; std::vector<uint16_t> nums;
  uint32_t helloAt = 0, listenUntil = 0;
  void reply(uint16_t seq, const std::string& m) {
    for (int i = 0; i < fragsFor((int)m.size()); i++) {
      std::vector<uint8_t> f(FRAME_MAX); f.resize(build(f.data(), RESP, seq, (const uint8_t*)m.data(), (int)m.size(), i));
      if (!lost()) toMaster.push_back(f);
    }
  }
  void hear(const std::vector<uint8_t>& f) {
    if (napping && now > listenUntil) return;
    Head h; const uint8_t* p; int n;
    if (!parse(f.data(), (int)f.size(), h, p, n) || h.type != REQ) return;
    for (auto& an : answers) if (an.first == h.seq) { if (h.idx == h.cnt - 1) reply(h.seq, an.second); return; }
    if (std::find(nums.begin(), nums.end(), h.seq) != nums.end()) { if (h.idx == h.cnt - 1) reply(h.seq, "208\nalready done"); return; }
    std::string msg;
    if (h.cnt == 1) msg.assign((const char*)p, n);
    else if (a.add(h, p, n)) msg.assign((const char*)a.buf, a.len); else return;
    ran.push_back(msg);
    std::string ans = "200\n" + msg + (msg.find("telemetry") != std::string::npos ? std::string(3000, 'x') : "");
    answers.push_back({h.seq, ans}); if (answers.size() > 8) answers.erase(answers.begin());
    nums.push_back(h.seq); if (nums.size() > 32) nums.erase(nums.begin());
    reply(h.seq, ans);
  }
};
}  // namespace sim

static void courierTests() {
  using namespace sim;
  puts("7. Courier: 200 requests at 20% loss both ways, 3 in flight: each runs once, all answered");
  Courier* c = new Courier(); c->send = masterSend; c->fail = masterFail;
  Module* m = new Module();
  std::vector<std::string> sentMsgs; std::map<uint16_t, Assembly*> got; int complete = 0;
  uint16_t seq = 0; loss = 0.2; now = 0;
  auto lapSend = [&](const std::string& msg) {          // the laptop hands a request over (USB: never lost)
    ++seq; sentMsgs.push_back(msg); got[seq] = new Assembly();
    for (int i = 0; i < fragsFor((int)msg.size()); i++) {
      std::vector<uint8_t> f(FRAME_MAX); f.resize(build(f.data(), REQ, seq, (const uint8_t*)msg.data(), (int)msg.size(), i));
      c->request(MOD, f.data(), (int)f.size(), now);
    }
  };
  auto step = [&]() {
    now++;
    auto air = toModule; toModule.clear(); for (auto& f : air) m->hear(f);
    auto back = toMaster; toMaster.clear();
    for (auto& f : back) {
      Head h; const uint8_t* p; int n;
      if (parse(f.data(), (int)f.size(), h, p, n) && c->answer(MOD, h, now) && got.count(h.seq) && got[h.seq]->add(h, p, n)) complete++;
    }
    if (now - m->helloAt >= 1000) { m->helloAt = now; m->listenUntil = now + 80; c->hello(MOD); }
    c->tick(now);
  };
  int next = 0;
  while ((next < 200 || complete + (int)failures.size() < 200) && now < 600000) {
    int inflight = 0; for (auto& s : c->slot) inflight += s.used;
    if (next < 200 && inflight < 3) { lapSend(next % 5 == 0 ? "/api/telemetry" : "/api/batch?3=170&n=" + std::to_string(next)); next++; }
    step();
  }
  std::vector<std::string> ran = m->ran, want = sentMsgs;
  std::sort(ran.begin(), ran.end()); std::sort(want.begin(), want.end());
  for (auto& f : failures) printf("    failed seq %u: %s\n", f.first, f.second.c_str());
  CHECK(complete == 200 && failures.empty(), "%d answered, %zu failed, %u resends, %u ms simulated", complete, failures.size(), c->resent, now);
  CHECK(ran == want, "each request ran exactly once (%zu runs)", m->ran.size());

  puts("8. Courier: a napping module (hears only 80 ms after its hello) still gets every request");
  Courier* c2 = new Courier(); c2->send = masterSend; c2->fail = masterFail; c = c2;
  delete m; m = new Module(); m->helloAt = now; napping = true; loss = 0.1; failures.clear(); complete = 0;
  uint32_t t0 = now; int base = seq;
  for (int i = 0; i < 5; i++) { lapSend("/api/torque?on=1&i=" + std::to_string(i)); for (int k = 0; k < 300; k++) step(); }
  while (complete + (int)failures.size() < 5 && now - t0 < 20000) step();
  CHECK(complete == 5 && failures.empty() && (int)m->ran.size() == 5, "%d of 5 answered while napping (%zu runs), within ~1 s each", complete, m->ran.size());
  (void)base;

  puts("9. Courier: a module that is gone -> 'no answer' after 2.5 s, and the slot is free again");
  Courier* c3 = new Courier(); c3->send = masterSend; c3->fail = masterFail; c = c3;
  napping = false; loss = 1.0; failures.clear();
  lapSend("/api/health"); uint32_t t1 = now;
  while (failures.empty() && now - t1 < 5000) step();
  int used = 0; for (auto& s : c->slot) used += s.used;
  CHECK(failures.size() == 1 && failures[0].second == std::string("no answer from the module") && now - t1 <= 2600 && used == 0,
        "failed after %u ms: %s", now - t1, failures.empty() ? "-" : failures[0].second.c_str());
  loss = 0;
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

  courierTests();

  printf("\n%s (%d failed)\n", fails ? "FAILED" : "ALL PASS", fails);
  return fails ? 1 : 0;
}
#endif
