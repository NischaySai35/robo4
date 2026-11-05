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
- [x] 66 GOS tests pass (2 skipped): `cd gos/python; $env:PYTHONPATH='.'; py -3.12 -m pytest -q -p no:dash -p no:anyio tests/test_gos.py` (the two `-p no:` hide warnings from other installed packages). Rust: `cd gos; cargo test --release`.

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
  - Rebuild the Linux/macOS libraries (`gos/build.py --all`, needs ziglang + cargo-zigbuild) so they get it too.
- [ ] **G10 next:** binary packing for big messages; then executor/Rate waiting in Rust; shared-memory arrays and controller loops.
  - Measure each step with `tools/bench/gos_messaging.py`.
- [ ] **Wi-Fi link quality on ROBO4-NET:** tonight 25–50 % ping loss, even with the guard paused, so it is not the guard.
  - Check again after the capacitors; read the heartbeat-gap log lines (voltage, loop time).
- [ ] `docs/RESTRUCTURING.md` / `docs/GOS_PARITY.md`: add the firmware guard and the G10 progress when they change.
- [ ] Option B (a GOS client inside the firmware): only if the laptop translator (`gos robot serve`) proves too slow. Not needed so far.

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
