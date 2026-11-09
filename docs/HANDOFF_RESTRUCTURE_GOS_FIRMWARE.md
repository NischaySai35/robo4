# Handoff: restructure, GOS and module firmware (5 Nov 2026)

This file covers three tracks: the Studio restructure, GOS (the ROS-like Graph Operating System), and the module firmware's safety work.
The sim / teacher / AI-model track has its own handoff: `docs/CURRENT_STATE.md` (written by another chat). Read both.

Work happens in `D:\robo4-restructure` (branch `restructure`). Nischay's terminal is PowerShell.
Read `docs/ARCHITECTURE.md` before changing anything in the Studio.

---

## 1. Main goals

- **TETROBOT:** a shape-changing modular robot.
  - Each module: one ESP32-C3 and 9 ST3215 servos (IDs 1–9 = LOCK1, T1, B1, B2, T2, B3, B4, T3, LOCK2).
  - The laptop is the brain. The modules talk to it over Wi-Fi: the laptop's own network ROBO4-NET, or the house router as fallback.
  - There are no computers on the modules (no Jetson). At most one camera.
- **Restructure (P0–P11, `docs/RESTRUCTURING.md`):** a clean, professional Studio. One shared set of controls, one physics plug-in point.
- **GOS (G0–G10, `docs/RESTRUCTURING.md` §10, `docs/GOS_PARITY.md`):**
  - Does what ROS 2 does, simpler.
  - Python on top, Rust core underneath.
  - Will be published on PyPI as `gos-robotics`.
- **Firmware:** safe modules.
  - Never keep pushing into a hit.
  - Never drop limp suddenly.
  - Never move by itself after power-on.
  - Stay cool.

---

## 2. Done ✅

### Restructure
- [x] **P7 shared controls:** Button / Input / NativeSelect / Segmented on every page; the per-page control CSS is deleted.
  - Left as they are, on purpose: menu and tree rows, dock rail icons, viewport chips, and the Servo controller's big E-STOP.
- [x] **P10 physics plug-in point:** the sim's live worlds go through `sim/engine.py` → `gos.physics`. This covers Gravity, Manual and Check (`phys_world.PhysWorld`, `verify_service.Robot`).
  - Results are identical to the last digit; Planner v2's 12 checks pass in the app.

### GOS (pip name `gos-robotics`; the command and the import stay `gos`)
- [x] Parity with ROS 2: **41 native, 1 partial (A20), 0 missing.**
  - A19 (hard real time) and A24 (GPU memory between programs) are marked *not wanted* for TETROBOT.
- [x] Runs on Linux (cross-built Rust core); Windows and Linux talk over TCP and Zenoh.
- [x] `gos robot list` finds every module on the local networks (neighbour table + port knock + `/api/health`).
- [x] `gos robot serve mod1.local` puts a module on the GOS network:
  - topics `/mod1/joint_states` and `/mod1/joint_commands`;
  - services arm, disarm and stop;
  - live mode (UDP angle stream);
  - disarms if the module restarts or goes silent for over 2 s;
  - reports the board's own reason when it refuses a move.
- [x] `gos studio open`; `gos.progress` download bar (used by `gos studio install`); `gos.realtime()`; GPU arrays as CUDA handles (refused on WSL, where they silently fail).
- [x] Installed on Nischay's laptop: `py -3.12 -m pip install -e gos/python[network]`, so `gos` works in any terminal.
- [x] **G10 step 1, measure first:** `tools/bench/gos_messaging.py` and `docs/design/g10-fast-core.md`.
  - In one program: 431,000 msgs/s, 9 µs there and back.
  - TCP: 54,000/s, 58 µs. Zenoh: 121,000/s, 130 µs.
  - The cost is system calls and thread wake-ups, not JSON.
- [x] 72 GOS tests pass (2 skipped): `cd gos/python; $env:PYTHONPATH='.'; py -3.12 -m pytest -q -p no:dash -p no:anyio tests/test_gos.py` (the two `-p no:` hide warnings from other installed packages). Rust: `cd gos; cargo test --release`.

### Firmware (`firmware/esp32_multi/`, FW_VERSION stays 0.1.0; flashed to mod1 and checked)
- [x] **Power-on is always limp:** it reads the servos and moves nothing.
  - Laptop moves (`/api/batch`) get **423 "locked after power-on"** until the operator presses Turn torque ON, Go to manual home, a servo's own button, or Play.
  - The boot after an OTA update is also limp.
- [x] **Each module keeps its own manual homes** in flash; Go to manual home uses them. No saved home = no correction.
  - mod1's homes are backed up in `firmware/backups/mod1-homes-2026-11-04.json`: 176.8 181.4 167.9 179.9 185.1 179.7 176.9 179.3 184.1.
  - The page shows "at home ✓" or "go home". 180 shown = at home.
- [x] **Overload guard** (`guard.h`, tested on the laptop by `test_guard.cpp`):
  - Trips at 75 % load or 1300 mA held for 0.1 s; LOCK1/LOCK2 at 88 % / 1900 mA.
  - The **strength ceiling is 80 %** for bend/twist (100 % for locks), so bend/twist trip at about 76 %.
  - After a trip it steps back to the last easy point and holds at 30 %.
  - A load it cannot hold makes it give way at most 10°/s, braking, never limp.
  - Moves further into the hit are refused; it is normal again by itself 0.5 s after the load is safe (1 s while moving away), or with **Clear blocks**.
  - Heat must last 2 s to count (a garbled read once said 145 °C). 60 °C makes it weaker; 70 °C means hold and refuse moves.
  - A playing sequence pauses when a joint trips.
- [x] **Layer 2, inside each servo (EEPROM):**
  - Overload 78 % (locks 92 %) for 0.3 s → 30 %.
  - Current 1600 mA (locks 2200 mA) for 0.3 s.
  - Voltage protection on. Max torque at power-on = the ceiling.
  - Read back and verified on servos 3 and 9.
- [x] **Guard runs in its own FreeRTOS task:**
  - Every **31–33 ms**, even with the page open; each pass takes about 10 ms. The main loop never freezes more than about 40 ms.
  - Cause found: `ESP.getSketchSize()` read the flash on every reply and froze the board for 0.6 s. It is now read once at boot.
  - A missing servo reply now gives up after 5 ms.
  - `/api/guard/set?everyMs=` changes the period for tests.
- [x] **Live mode (UDP 4211)** while GOS watches: 4 angle updates a second while still, about 16 while moving. The radio is fully awake only while moving (heat).
- [x] **Wi-Fi:** waits 2 s for the heartbeat if still connected with a good signal (it was 0.7 s), and tries ROBO4-NET 6 times before falling back to the router.
  - Each heartbeat gap logs the loop time, the servo voltage and the current.
- [x] **Page and telemetry show:** chip temperature, guard state per joint (OK / HELD / GIVING / HOT), the guard message, `motionLocked`, `animInterrupted`, `guardGapMs`, `guardPassMs`, `guardWaitMs`, `servoMisses`, `loopMaxMs`.
- [x] Backup of the firmware from before these changes: `firmware/backups/esp32_multi-v0.1.0-before-live-mode-2026-11-04.bin` (not in git).

---

## 3. Yet to do ⏳

### Needs Nischay
- [ ] **Real guard test** (moves motors, so do it with him there):
  - lift something heavy, then put it down; expect a stop within about 0.1 s and back to normal about 0.5 s after putting it down;
  - stop one joint gently by hand.
  - Still unmeasured: on the real servo, which trips first, 76 % load or 1300 mA? On mod1, 31 % load drew only about 270 mA.
- [ ] **Hardware:** a 470–1000 µF capacitor (16 V or more) on the servo power near the servos, and about 100 µF on the ESP32 power.
  - Under load the voltage dropped to 10.5 V. That garbled servo reads and caused Wi-Fi drops while lifting.
- [x] **Push (5 Nov):** the 12 commits went up combined as one (`99a6678`).
  - Local backup branches `backup/before-squash-3nov`, `-4nov` and `-5nov` can be deleted when he says so.
- [ ] **PyPI publish:** he chose the name `gos-robotics`. Still needed from him: the **licence** (suggested Apache 2.0, like ROS 2) and a pypi.org account plus token. Then: TestPyPI first, then PyPI.
- [ ] **G4 drag IK, P6 hardware commands:** waiting for him.

### Claude
- [x] **G10 step 2, the TCP wire in Rust (6 Nov):** `gos/core/src/net.rs`; 2.3x the messages a second; numbers in `docs/design/g10-fast-core.md`.
  - Linux and macOS libraries rebuilt with `py -3.12 gos/build.py --all` (ziglang + cargo-zigbuild now installed); Linux checked in WSL, macOS not tested (no Mac).
- [x] **G10 step 3, bytes and arrays travel raw (6 Nov):** binary frames on TCP, raw arrays on Zenoh; 3.4x for 1 MB, 24x for arrays.
- [x] **G10 steps 4-5 (6 Nov):** `gos.Rate` on time beside busy threads (7.9 ms -> 0.002 ms) and less CPU; controllers at the asked rate (50/s gave 32/s); shared-memory arrays never torn (257/300 were). **G10 is finished.**
  - Measure each step with `tools/bench/gos_messaging.py`.
- [ ] **Wi-Fi link quality on ROBO4-NET** (checked 6 Nov, motors unplugged, reading only):
  - [x] Pings: 0 of 50 lost, 1–30 ms (the 25–50 % loss of 5 Nov is gone for now).
  - [x] **Found and fixed (`tools/robo4-net.ps1`):** after an address sweep (`gos robot list`), Windows keeps 252 'Incomplete' neighbour entries, and the heartbeat went to all of them 5 times a second (~1,250 packets/s, each making Windows ask over the air who has the address). The same happened on the night of 5 Nov. Now it goes only to real devices (Wi-Fi Direct pins them as 'Permanent', with a real MAC) and remembers them. Takes effect when the Studio restarts the network (`npm run dev` again).
  - [ ] **Still open:** the laptop drops mod1 **every 120.8 s like clockwork** (board log: "WiFi lost (reason 1)", back in 0.1–1.4 s; Windows logs only the rejoin, no reason). Signal is fine (−67 dBm). Suspect: the radio's modem sleep missing something Windows sends on a 2-minute timer. Test: keep the radio awake for 5 minutes and see whether the drops stop. Tested 5 Nov 2026 with the new switch `/api/radio?awake=1` (firmware f48bd99, flashed to mod1): radio held awake, drops still at 153.5 / 274.1 / 394.7 s, so **sleep is not the cause**. Next suspect: the laptop network's 2-minute key refresh (rekey) that the board misses. **5 Nov evening, measured:** the kick runs on ONE laptop clock every 120.6 s (survives board restarts); a phone on ROBO4-NET is NOT kicked, only the ESP32. Tried and disproved: radio awake, PMF off, cached WPA2 key, no 11k/v/r/MBO, waking the radio for the rejoin. Fixed: the board no longer leaves on its own after 2 s of silence (now 4 s), so each kick costs ~0.6 s instead of 2-3 s; heartbeat sender at high priority. The 0.6 s is Windows: it associates in 80 ms, then waits ~520 ms before the password check. Windows Wi-Fi Direct cannot give zero outages; options: ESP-NOW USB dongle, or a dedicated router. `/api/radio?awake=0` puts it back (a reboot does too).
- [ ] `docs/RESTRUCTURING.md` / `docs/GOS_PARITY.md`: add the firmware guard and the G10 progress when they change.
- [ ] Option B (a GOS client inside the firmware): only if the laptop translator (`gos robot serve`) proves too slow. Not needed so far.

### ESP-NOW master (6-7 Nov)
**Setup (Nischay):** power the modules, plug the ESP32-CAM into the laptop. `http://mod1.local` works everywhere (browser, Studio, sim, `build.sh`), Studio running or not.
- **Who does what:** the laptop decides; it talks ONLY to the master (ESP32-CAM, AI-Thinker, CH340 = COM7, `firmware/espnow_dongle`) over USB, which does not drop. The master owns the radio:
  - heartbeat straight to each awake module every 100 ms (acked + retried by the radio; broadcast heartbeats got lost at -85 dBm and held a move);
  - delivery: `r4now::Courier` resends each request until the whole answer is back, wakes napping modules on their hello, says "failed" after 2.5 s (`test_now.cpp` 7-9: 200 requests at 20 % loss both ways, each ran once);
  - its own module list + channel search (follows the hellos), handed to the laptop the moment it connects;
  - laptop program silent 0.4 s while driving -> HOLD to every module; IO0 button: short = HOLD, 2 s = E-STOP;
  - 80 MHz, camera chip powered down (heat).
- **Modules (`esp32_multi`):** every web-API handler also answers over the radio (`rq` + route table); last 8 answers + last 32 request numbers kept, so nothing runs twice; any request counts as the laptop; hold after 0.8 s silence while driving; radio awake only for 30 s after a command (reads do not count), else naps and listens 80 ms after each hello (heat). HOLD/ESTOP frames from the master.
- **Laptop (`gos/python/gos/espnow.py`, `gos robot bridge`):** hands each request to the master once ('Q'), says it is here ('P'); up to 3 requests in flight per module; identical reads at the same moment share one trip. Gateway on `127.0.4.1..9:80`: radio first, the module's Wi-Fi when not heard or the master gives up; web page + uploads always Wi-Fi; Wi-Fi addresses remembered in `~/.gos/modules.json`. Waits for the dongle, survives unplugging.
- **One-time setup:** `powershell -ExecutionPolicy Bypass -File tools\espnow\install.ps1` (hosts: mod1..9.local -> 127.0.4.1..9, admin once; Startup launcher, log `~/.gos/espnow_bridge.log`). `-Remove` undoes it. The Studio also starts a bridge (`studio/tools/robo4Net.cjs`); a second copy just waits.
- [x] Measured on mod1 (before the master took over delivery): health 19 ms median, telemetry 4.3 KB in 95 ms, 60 s non-stop: 1,565 reads, worst 123 ms.
- [x] Master firmware uploaded and answering (courier=1, own heartbeat, channel search).
- [x] **7 Nov, new mod1 board** (old C3 died: 3V3-GND short) flashed by USB, homes restored from `firmware/backups/mod1-homes-2026-11-04.json` (the board had another module's homes). Everything below verified on it.
- [x] `install.ps1` run: mod1..9.local -> bridge; bridge starts at login (Startup), waits for the dongle.
- [x] **Hold tests passed:** bridge killed 0.42 s into a 60 deg T3 move -> master HOLD, T3 stopped after 22 deg, torque on; IO0 short = HOLD, 2 s = E-STOP (all limp).
- [x] **Web page + firmware updates over ESP-NOW** (`/api/page`, `/api/ota/begin|part|finish`): 1.3 MB in 60 s (was 2 min 50 s: the master read USB a byte at a time). `build.sh mod1` and the board page's upload both use it via mod1.local.
- [x] **Battery guard** at 10.3 V (5 s; 20 s above 1 A): log -> master told -> torque off -> radio off -> deep sleep. Not yet seen trip for real.
- [x] Fixed on the way: a board with no servos hung (guardTask starved loop()); the bridge opened a C3's own USB while hunting for the dongle; opening COM7 could leave the master in upload mode (now restarted cleanly); a restarted bridge's request numbers were answered "already done" (random start + 10 s memory).
- Decided: the C3 keeps joining Wi-Fi (house Wi-Fi is fine, ROBO4-NET not needed): only a joined radio can nap (modem sleep); without a network ESP-NOW would listen all the time = hotter.
- **Hardware (Nischay):** many C3s died with 3V3-GND shorts, 99 % when the ESP was powered first and the servo cable plugged in after: latch-up from the hot-plugged 5 V servo line (ST3215 data is 5 V-referenced, the C3 pin max is 3.6 V). Fix: a 1 kohm series resistor on GPIO5, never hot-plug servo cables; 5.1 V zener + polyfuse on the ESP's 5 V; TVS + 470-1000 uF on the battery. The BSS138 I2C level shifter (10 k pull-ups) is too slow for the 1 Mbaud bus.
- [ ] Reception is weak-ish (-76..-85 dBm); an ESP32 with an external antenna would give margin.

### GOS knows the fleet (9 Nov) — built and tested on the laptop, NOT yet on the hardware
- **Stop all:** `gos robot stop` (hold) / `gos robot stop --limp` (E-STOP), `hardware.stop_all()`, service `/modules/stop`. Through the bridge (`/_stop` on 8790) and the master's new USB commands `H` / `E` (= its button; info says `stop=1`; an older master gets the frames via `S`). No master: Wi-Fi `/api/hold` (new on the module) or the E-STOP to every address in `~/.gos/modules.json`.
- **Status:** the module's hello now also says `bat=` (V), `held=`, `anim=`. **Notes:** `note()` in the module = `lg()` + an r4now `NOTE` frame (type 8) to the master, for: animation finished (top 2 currents) / stopped, HOLD, E-STOP, master silent, battery low / back. The bridge keeps them (`/_events?after=N`) and prints them in its log.
- **GOS:** `gos robot status` (modules + last events), `gos robot modules` publishes `/modules`, `/modules/events`, serves `/modules/stop`. `hardware.ModuleGroup([1, 2])`: load / play / stop / status, same format as the Studio's `sender.ts` (group play, `groupsync.h`).
- **Kept in step:** `test_message_types_and_sizes_match_the_firmware` reads `r4now.h`.
- [ ] Upload the master (COM7, stop the bridge first) and mod1; then try `gos robot stop` while a slow move runs, and check an animation's "highest current" note shows in `gos robot status`.

---

## 4. Key files

- **Overload guard logic:** `firmware/esp32_multi/guard.h`; laptop test `firmware/esp32_multi/test_guard.cpp`.
  - Build the test with `zig c++ -std=c++17 -O1 -w test_guard.cpp` (ziglang from pip).
- **Firmware:** `firmware/esp32_multi/esp32_multi.ino`. Guard section, `guardTask`, `BusLock`, `refreshAllFastSync`, `tuneServoHolding` (servo EEPROM), live mode, `radioTick`, `wifiTick`.
- **Board web page:** `firmware/esp32_multi/webui.h`.
- **Build and OTA:** `firmware/esp32_multi/build.sh` (`./build.sh mod1` builds and uploads to `mod1.local`).
- **GOS module driver:** `gos/python/gos/hardware.py` (`Esp32Robot`, `from_board`, `live`, `serve_robot`, `find_modules`).
- **GOS command line:** `gos/python/gos/__main__.py` (`robot list|serve`, `studio open|install|where`).
- **Progress bar:** `gos/python/gos/progress.py`.
- **Physics plug-in:** `gos/python/gos/physics.py`, `sim/engine.py`.
- **GOS tests:** `gos/python/tests/test_gos.py` (FakeBoard = a pretend module).
- **Benches:** `tools/bench/gos_messaging.py`, `tools/bench/rate_jitter.py`.
- **Plans:** `docs/RESTRUCTURING.md` (P0–P11, G0–G10), `docs/GOS_PARITY.md`, `docs/design/g10-fast-core.md`, `docs/design/p10-physics-interface.md`.

**Board API worth knowing:**
- `/api/health`, `/api/telemetry`, `/api/batch`
- `/api/guard`, `/api/guard/clear?id=all`, `/api/guard/set?everyMs=30`
- `/api/servo/read?id=&addr=&len=` (read-only register peek)
- `/api/home/set?id=N&deg=X` (never call it without args: that overwrites all homes)
- `/api/log`

---

## 5. Commands

```
# find modules, put one on the GOS network, watch it (any terminal)
gos robot list
gos robot serve mod1.local          # or: gos robot serve 192.168.137.x --name mod1
gos topic echo /mod1/joint_states
gos robot status                    # every module the bridge hears (battery, holding, playing) + recent events
gos robot stop                      # every module stops and holds; --limp = E-STOP
gos robot modules                   # the fleet on the GOS network: /modules, /modules/events, /modules/stop

# GOS tests
cd D:\robo4-restructure\gos\python
$env:PYTHONPATH='.'; py -3.12 -m pytest -q tests/test_gos.py

# firmware: build (and upload to mod1)
cd D:\robo4-restructure\firmware\esp32_multi
bash build.sh            # build only
bash build.sh mod1       # build + OTA
```

How to upload by IP when `mod1.local` does not resolve:

```
curl -F "f=@esp32_multi-v0.1.0.bin" "http://<ip>/api/ota?size=<bytes>"
```

A cut-off upload is harmless: the board keeps its old firmware. Just retry.

---

## 6. Rules from Nischay (strict)

- **Never move a motor without asking.** Reading is fine.
  - An OTA update switches the motors off for about 15 s. Ask, or check torque and load first.
  - Clearing homes needs his click.
- **Ask before push, merge, PR, release or deleting a branch.** One commit per checked checkpoint.
- Never run anything over 120 s yourself; longer runs are commands for him.
- Reuse, never duplicate (grep first).
  - New code files need a `REUSE-CHECKED:` line.
- Don't edit other chats' uncommitted files. Right now these are another chat's: `sim/*`, several `studio/` files, and `docs/CURRENT_STATE.md`.
- Explain in simple words, short, with checklists; progress as plain text, no artifacts.
- Decide technical things yourself; ask only what only he knows.
- Verify in the real app or on the real board; logs alone are not enough.
- FW_VERSION stays 0.1.0. No pogo pins in plans.
