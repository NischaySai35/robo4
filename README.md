# TETROBOT — Modular Robotic Arm Simulator & Controller

A full-stack platform for simulating, visualizing, and controlling a 6-DOF modular robotic arm. The browser-based 3D simulator runs inverse kinematics in real time and streams joint commands to an ESP32-C3 microcontroller driving ST3215 smart servos over a WiFi link.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Hardware Setup](#hardware-setup)
- [Pages & UI](#pages--ui)
- [Kinematics Chain](#kinematics-chain)
- [API Reference](#api-reference)
- [Data Flow](#data-flow)
- [Configuration](#configuration)

---

## Overview

TETROBOT is a 7-rod, 6-joint articulated arm built from modular segments. The platform has three layers:

| Layer | Role |
|---|---|
| **Frontend** (React + Three.js) | 3D simulator, IK drag control, servo dashboard |
| **Backend** (FastAPI) | REST stub — ready to proxy ESP32 in production |
| **Firmware** (ESP32-C3 Arduino) | WiFi API + ST3215 servo bus driver |

The simulator page lets you drag the end effector (or any rod) in 3D space. The FABRIK IK solver computes joint angles, which are sampled every 100 ms and forwarded to real hardware if connected.

---

## Features

### Simulator (Page 1)
- Interactive **3D arm visualization** using Three.js scene graph
- **Forward kinematics (FK)** — live render of all joint angles
- **Inverse kinematics (IK)** — drag the tip; FABRIK solver drives the joints
- **Root switching** — click any rod to make it the fixed anchor; world poses are preserved
- **Joint telemetry overlay** — angle, velocity, acceleration, limit-hit indicator per joint
- **Horizontal / vertical mode** — XZ-plane or XY-plane orientation
- **SimTransmit log** — shows every batch sent to ESP32 with timestamps
- **End-effector status bar** — position (x, y, z) and reach percentage

### Servo Controller (Page 2)
- **Live telemetry polling** at 200 ms from ESP32 per servo
- **AngleGauge** — SVG semi-circle drag control per servo
- Per-servo buttons: GO, CW, CCW, WAVE, STOP, 180°, Torque toggle
- Speed and acceleration sliders
- Real-time **current (mA) and load graphs** per servo
- **Group control** — Bend group (J2, J3, J5) and Twist group (J1, J4, J6)
- **Sequence recorder** — capture frames, play back, export/import JSON
- **Preset manager** — save and load arm positions to localStorage
- **Thermal alerts** — banner when any servo exceeds 55 °C or total draw exceeds 8 A
- **Debug log** — timestamped command/response feed

---

## Architecture

```
Browser
  ├─ Page 1: Simulator
  │    Three.js scene ←→ armStore (Zustand)
  │         │
  │    SimTransmitPanel ──► integrationStore.pendingAngles
  │                               │ (100 ms sampler, Δ ≥ 0.8°)
  │                               ▼
  └─ Page 2: Servo Controller ──► GET /api/batch → ESP32
                                          │
                                    ST3215 servo bus (UART RS-485, 1 Mbaud)
                                          │
                                   Servos 1 – 5
```

---

## Project Structure

```
robo4/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Root shell, tab routing, header/footer
│   │   ├── store/
│   │   │   ├── armStore.js          # Joint angles, telemetry, drag state
│   │   │   └── integrationStore.js  # Sim ↔ ESP bridge, logs, stats
│   │   ├── components/
│   │   │   ├── SimCanvas.jsx        # Three.js canvas mount + lifecycle
│   │   │   ├── LeftPanel.jsx        # Joint telemetry, root selector
│   │   │   ├── ServoController.jsx  # Full servo dashboard (Page 2)
│   │   │   ├── SimTransmitPanel.jsx # Transmission overlay (Page 1)
│   │   │   └── StatusBar.jsx        # End-effector position strip
│   │   ├── three/
│   │   │   ├── RobotFK.js           # Scene graph, FK render, root switching
│   │   │   ├── RenderLoop.js        # 60 fps loop, IK solver calls
│   │   │   └── Interaction.js       # Raycasting, drag callbacks
│   │   └── math/
│   │       ├── kinematics.js        # Pure FK math (no Three.js)
│   │       └── fabrik.js            # FABRIK IK solver
│   ├── package.json
│   └── vite.config.js               # Dev server port 5173
├── backend/
│   ├── main.py                      # FastAPI app, CORS, router mount
│   ├── routers/arm.py               # REST endpoints (stubbed)
│   ├── config.py                    # Env-based config
│   └── requirements.txt
├── esp32/
│   └── firmware.ino                 # ESP32-C3 WiFi server + servo bus driver
├── test_ik_direct.mjs               # IK algorithm unit tests
└── playwright_zustand.js            # E2E test utilities
```

---

## Tech Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| Three.js | 0.164.1 | 3D rendering |
| Zustand | 4.5.2 | State management |
| Vite | 5.3.4 | Dev server & bundler |
| Postprocessing | 6.36.3 | Post-render effects |

### Backend
| Package | Version | Purpose |
|---|---|---|
| FastAPI | 0.111.0 | REST API |
| Uvicorn | 0.30.0 | ASGI server |
| Pydantic | 2.7.0 | Data validation |
| PySerial | 3.5 | Serial comms (optional) |

### Firmware
- Arduino for ESP32-C3
- SCServo library (ST3215 half-duplex RS-485 bus)
- WiFi + WebServer + ESPmDNS

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- (Optional) Arduino IDE 1.8+ or PlatformIO for firmware

### 1. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Production build
npm run build
npm run preview
```

### 2. Run the Backend (optional stub)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Flash the ESP32 Firmware (for real hardware)

1. Open `esp32/firmware.ino` in Arduino IDE
2. Install board: **ESP32-C3** (Espressif Systems)
3. Install library: **SCServo**
4. Edit WiFi credentials in the sketch:
   ```cpp
   const char* ssid = "YOUR_SSID";
   const char* password = "YOUR_PASSWORD";
   ```
5. Select board → Upload
6. The ESP32 will advertise itself as `tetrobot.local` (or your chosen mDNS name)
7. In the Servo Controller page, set the ESP URL to `http://tetrobot.local`

---

## Hardware Setup

```
ESP32-C3
  GPIO5 ──► RS-485 transceiver ──► ST3215 servo bus
  (UART TX/RX, half-duplex, 1 Mbaud)

Servo IDs: 1, 2, 3, 4, 5  (set via servo programmer before assembly)

Power: 7.4 V LiPo or regulated 8 V supply, ≥5 A continuous
```

### Arm Physical Layout

```
R1 ─J1─ R2 ─J2─ R3 ─J3─ R4 ─J4─ R5 ─J5─ R6 ─J6─ R7
```

| Segment | Type | Notes |
|---|---|---|
| R1, R7 | End caps | Cube mesh |
| R2 – R6 | Rods | Cylinder mesh, configurable lengths |
| J1, J4, J6 | Twist joints | ±180° (full rotation) |
| J2, J3, J5 | Bend joints | ±100° (mechanical limit) |

---

## Pages & UI

### Page 1 — 3D Simulator

| Area | Function |
|---|---|
| Left panel | Per-joint angle / velocity / acceleration readout, root selector, home button |
| 3D canvas | Click rod to set root; drag rod/end-effector for IK; RMB orbit; scroll zoom |
| SimTransmit overlay | Log of every batch command sent to ESP32 |
| Status bar | End-effector XYZ position, reach % |

### Page 2 — Servo Controller

| Area | Function |
|---|---|
| Top bar | ESP URL input, connect/disconnect, latency, online servo count |
| Servo cards (×5) | AngleGauge, GO/CW/CCW/WAVE/STOP buttons, speed & acc sliders, live graphs |
| Group Control | Bend group / Twist group batch commands |
| Sequence Recorder | Record frames, play back, export/import JSON |
| Preset Manager | Named saves to localStorage |
| Alert banner | Thermal / overcurrent warnings |
| Debug log | Timestamped command & response feed |

---

## Kinematics Chain

```
R1 —[J1 twist]— R2 —[J2 bend]— R3 —[J3 bend]— R4 —[J4 twist]— R5 —[J5 bend]— R6 —[J6 twist]— R7
```

**Forward kinematics** (`math/kinematics.js`) — walks the chain from the active root, composing rotation matrices at each joint.

**Inverse kinematics** (`math/fabrik.js`) — FABRIK (Forward And Backward Reaching IK) solver that runs inside the 60 fps render loop during drag interactions.

**Root switching** — any rod can become the fixed anchor. `RobotFK.computeAnglesForRoot()` snapshots world quaternions and recomputes all local joint angles so the visual pose is preserved.

---

## API Reference

### ESP32 Firmware Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/telemetry` | All 5 servos: angle, current, temp, load, voltage |
| `GET` | `/api/command` | Single servo command: `?servo=N&cmd=pos&angle=Y&speed=Z&acc=W` |
| `GET` | `/api/batch` | Multi-servo positions: `?1=180&2=90&3=150&4=120&5=180&speed=5&acc=20` |

### Backend REST (FastAPI stub)

| Method | Path | Description |
|---|---|---|
| `POST` | `/arm/angles` | Send joint angles |
| `GET` | `/arm/status` | Robot state |
| `POST` | `/arm/stop` | Emergency stop |
| `POST` | `/arm/home` | Move to home position |
| `GET` | `/arm/config` | Hardware configuration |

---

## Data Flow

### Simulator → Hardware

1. User drags a rod in the 3D view
2. FABRIK solver updates `armStore.jointAngles`
3. `SimTransmitPanel` samples every 100 ms; sends batch if any joint changed by ≥ 0.8°
4. `integrationStore.pendingAngles` is updated
5. `ServoController` detects pending angles, fires `GET /api/batch` to ESP32
6. ESP32 drives servos, returns telemetry
7. Transmission log updates in the overlay on Page 1

### Servo Controller → Hardware (direct)

1. User drags `AngleGauge` on a servo card
2. Component calls `sendCmd(id, 'pos', { angle, speed, acc })`
3. Fetches `GET /api/command?servo=N&cmd=pos&angle=Y&speed=Z&acc=W`
4. ESP32 executes, response logged to debug panel

---

## Configuration

### Frontend — `frontend/vite.config.js`
- Dev server port: **5173**

### Backend — environment variables (`backend/config.py`)

| Variable | Default | Description |
|---|---|---|
| `SERIAL_PORT` | — | Serial port for direct USB connection |
| `ESP32_IP` | — | Static IP of the ESP32 |
| `DEBUG` | `false` | Enable verbose logging |

### Firmware — edit `esp32/firmware.ino`

```cpp
const char* ssid     = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* hostname = "tetrobot";      // accessible at tetrobot.local
```

---

## Author

Nischay Sai D R
