# ROBO4 module firmware v2 (ESP32-C3)

Replacement for `esp32/firmware.ino`. Same servo bus, same magnets, same HTTP API the React
app already uses — plus rock-solid Wi-Fi, a web UI, wireless code upload, and runtime
configuration so you stop re-flashing to change an ID or a limit.

`esp32/firmware.ino` is untouched; keep it as the known-good fallback.

---

## 1. One-time setup (the only time you need the USB cable)

Arduino IDE → Tools:

| Setting | Value |
|---|---|
| Board | **ESP32C3 Dev Module** |
| USB CDC On Boot | **Enabled** |
| Partition Scheme | **Default 4MB with spiffs (1.2MB APP / 1.5MB SPIFFS)** |
| Flash Size | 4MB |

The partition scheme matters: OTA needs **two** app partitions (`ota_0` + `ota_1`).
"Huge APP" has only one and every OTA attempt will fail with *not enough space*.

Libraries: `SCServo` (Waveshare) — same one the v1 sketch uses. Everything else
(`WiFi`, `WebServer`, `ESPmDNS`, `ArduinoOTA`, `Update`, `HTTPUpdate`, `Preferences`)
ships with the ESP32 core.

Open `firmware/esp32_multi/esp32_multi.ino`, set `DEF_SSID` / `DEF_PASS` if your network changed, upload
over USB **once**. After that, every upload can be wireless.

You do **not** need to edit `DEF_HOST` per board any more — see §3.

---

## 2. Wi-Fi: what actually changed

The v1 sketch blocked for 20 s in `setup()` and then retried every 10 s with the same
single SSID, and mDNS silently died after a drop. v2:

- **Non-blocking.** `setup()` never waits for Wi-Fi; the HTTP server is listening in
  milliseconds. If Wi-Fi comes up 40 s later, nothing else was held up.
- **Event-driven.** `GOT_IP` / `DISCONNECTED` events fire the moment the link changes, so a
  drop is noticed instantly instead of up to 10 s later.
- **Escalating backoff**, 0.8 s → 30 s, reset to 0.8 s on every success. Fast recovery from
  a router blip, no beacon-storming a router that is actually down.
- **3 stored networks**, rotated on each failure. Phone hotspot as slot 1 = a lab that keeps
  working when the house Wi-Fi does not.
- **Radio re-init** every 12th consecutive failure: the driver is torn down to `WIFI_OFF`
  and brought back. This clears the wedged-supplicant state that no amount of
  `WiFi.begin()` retrying recovers from.
- **SoftAP fallback.** After ~30 s of failure the board raises `ROBO4-mod1` /
  `robo4robo4`. Connect your laptop to it, open `http://192.168.4.1/`, fix the credentials
  in the Wi-Fi tab. It keeps hunting for the real AP in the background and drops its own AP
  20 s after the real link proves stable. **You can never again be locked out without a cable.**
- **mDNS is re-announced** after every reconnect (v1 kept a stale `mdnsOk` flag), and now
  also publishes a `_robo4._tcp` service with TXT `host`/`fw` — so the laptop app can
  *discover* modules instead of you hardcoding `mod1.local`, `mod2.local`, …
- `/api/log` exposes the last 70 log lines over HTTP, so you can read boot messages,
  disconnect reasons and drop counts **without plugging in a cable**. The dashboard header
  shows RSSI, uptime and a cumulative drop counter.

---

## 3. Wireless code upload — three ways

All three de-torque the servos and release the magnets before writing, and refuse to touch
the servo bus while a flash is in progress.

### a) Arduino IDE, no cable (best for your edit-test loop)
After the one USB upload, `mod1` appears under **Tools → Port → Network ports**. Select it
and press Upload as usual. Password: `robo4ota`.
If it doesn't appear: Windows mDNS discovery in the IDE is flaky — use (b) or (c), or run
`arduino-cli upload -p mod1.local --fqbn esp32:esp32:esp32c3 firmware/esp32_multi`.

### b) Drag a .bin into the web page
**Sketch → Export Compiled Binary**, then open `http://mod1.local/` → **OTA update** tab →
pick `esp32_multi.ino.bin` → Upload. Progress bar, auto-reboot, page reloads itself.

Same thing from a terminal:
```
curl -F "f=@esp32_multi.ino.bin" http://mod1.local/api/ota
```

### c) Flash every module at once
```powershell
.\tools\flash-all.ps1                    # build + push to mod1..mod4
.\tools\flash-all.ps1 -Hosts mod2,mod3
.\tools\flash-all.ps1 -NoBuild -Bin .\esp32_multi.ino.bin
```
It builds with `arduino-cli`, checks each board is online, uploads, waits for the reboot and
reports the firmware version that came back.

There is also a pull mode — serve the binary from your laptop
(`python -m http.server 8000`) and hit `http://modN.local/api/ota/url?u=http://<laptop-ip>:8000/fw.bin`
on each board. Useful when the boards are on a network your laptop can reach but not vice
versa, or from a script that can't do multipart uploads.

**Recovery:** if a bad build bricks the wireless path, the USB cable still works — the
bootloader is untouched. OTA writes to the *inactive* partition and only switches over after
a successful CRC, so a half-finished upload just reboots into the old firmware.

---

## 4. Nothing is hardcoded per board any more

Hostname, servo IDs, labels, per-joint angle limits, bus baud and the magnet safe-hold %
live in NVS (flash), editable from the **Config** tab. So:

- Flash the *identical* binary to every module.
- Open `http://192.168.4.1/` (or the board's IP), set `host` = `mod2`, Save, Reboot.
- That board is now `mod2.local` forever.

Config format used by `/api/config/set` (also usable from curl):
```
/api/config/set?host=mod2&baud=1000000&hold=40&servos=1:J1:0:360|2:J2:80:280|3:J3:80:280
                                                      id:label:minDeg:maxDeg
```

---

## 5. Servo discovery — the re-flash killer

Everything below is a URL. No compile, no cable, no IDE.

| What you wanted | Endpoint | UI |
|---|---|---|
| Which IDs are on this bus? | `/api/scan?from=1&to=20` | Servo tools → Scan |
| …and I don't know the baud either | `/api/scan?from=1&to=253&allbaud=1` | tick "sweep every baud" |
| Which physical joint is ID 5? | `/api/identify?id=5` | "identify" button — it wiggles |
| Change a servo's ID | `/api/servo/setid?from=1&to=5` | Servo tools |
| Change a servo's baud | `/api/servo/setbaud?id=5&idx=0` | Servo tools |
| Re-zero a joint | `/api/servo/center?id=5` | Servo tools |
| Write a raw offset | `/api/servo/ofs?id=5&val=-120` | Servo tools |
| Read *any* register | `/api/servo/read?id=5&addr=56&len=2` | peek/poke |
| Write *any* register | `/api/servo/write?id=5&addr=33&len=1&val=1&unlock=1` | peek/poke |

The scan is asynchronous — it hands the bus back between pings so the web UI stays alive,
drops the servo read-timeout to 20 ms so missing IDs fail fast, and restores your configured
baud when it finishes. A full 1–253 sweep across all 8 baud rates takes ~40 s and needs no
supervision.

**Changing an ID: only one servo may be on the bus.** Every servo that answers to the old ID
will take the new one. The firmware unlocks EPROM, writes, re-locks and verifies with a ping.

The peek/poke pair is the real escape hatch: any test you can express as a register write no
longer needs a firmware change. ST3215 map — `5`=ID `6`=baud `9/10`=min-angle `11/12`=max-angle
`31/32`=offset `33`=mode `40`=torque-enable `55`=lock `56/57`=position `62/63`=load `69`=voltage.

---

## 6. API compatibility

Unchanged in shape, so the React app keeps working:
`/api/telemetry`, `/api/command`, `/api/batch`, `/api/magnet`, `/`.

Telemetry gains (additive only): `fw`, `heap`, `scanning`, per-servo `min`/`max`, and
`wifi.{connected,mode,rssi,drops}`. `/` now serves the **web UI**; the old JSON health
payload moved to `/api/health`.

New: `/api/home`, `/api/identify`, `/api/log`, `/api/scan*`, `/api/servo/*`, `/api/config*`,
`/api/wifi*`, `/api/ota*`, `/api/reboot`.

---

## 7. Suggested first run

1. Upload over USB, watch the serial monitor for `HTTP server up`.
2. Open `http://mod1.local/` — dashboard should show live angles.
3. Servo tools → Scan 1–20. Confirm it finds exactly the servos you expect.
4. Config → set the real IDs/labels/limits for that module → Save → Reboot.
5. Make a trivial edit (e.g. bump `FW_VERSION` to `2.0.1`), Export Compiled Binary, drop it
   in the OTA tab. When the header shows `fw 2.0.1`, the cable is retired.
