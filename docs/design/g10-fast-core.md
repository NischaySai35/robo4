# G10 Fast core: measure first

**Goal:** move only the speed-critical parts of GOS into the Rust core (`gos/core`). Python stays the top layer that people write, the way ROS 2 puts rclpy on top of rcl. Every step is measured with `tools/bench/gos_messaging.py` before and after.

## Baseline, 4 Nov 2026 (this laptop, Windows 11, Python 3.12, one computer)

| Carrier | Small messages a second | 9-joint states a second | There and back, median | 99% under |
|---|---|---|---|---|
| In one program | 431,000 | 151,000 | 9 µs | 18 µs |
| TCP between programs | 54,000 | 57,000 | 58 µs | 204 µs |
| Zenoh between programs | 121,000 | 47,000 | 130 µs | 422 µs |

For comparison, ROS 2 between programs on one computer is usually 50–200 µs there and back. GOS is already in that range.

## Where the time goes (profile of the TCP run)

- Packing a 9-joint state into JSON: 3.5 µs; unpacking it: 2.6 µs. Small, so moving only the packing to Rust would gain little; a Python-to-Rust call itself costs about 1 µs.
- One `sendall` system call per message (about 8 µs each) and waking a thread per message: this is the real cost.
- Zenoh's own work is already in Rust. What's left for Zenoh is the JSON and handing each message from its thread to Python.

## Order of work, by measured value

1. **Done:** the baseline above.
2. **The TCP hub in Rust:** routing and socket I/O for every program, with several messages written per system call. Expected: several times more messages a second between programs, and a flatter 99% line. Python programs keep the same `App` calls.
3. **Binary packing for big messages:** joint states, point clouds and images, packed in Rust. The gain shows on big messages, not small ones.
4. **Executor and `gos.Rate` waiting in Rust:** Python's lock is released while a loop waits, so other threads keep running.
5. **Shared-memory arrays and the controllers' inner loops in Rust.**

Not worth moving (measured): small-message JSON, the `gos` commands, planners (already on MuJoCo and the Rust IK), package tools.

## Not measured yet

- Two computers (only one computer above).
- Many programs at once (above: two).
- Linux (only Windows above).
