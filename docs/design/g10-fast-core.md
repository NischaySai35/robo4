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

## Step 2: the TCP wire in Rust (6 Nov 2026)

`gos/core/src/net.rs`, used by `TcpTransport` through `gos/python/gos/_core.py`. The bench now counts messages where they arrive in the second program (before, the burst counted in the sending program). Both wires measured on the same quiet laptop, taking turns:

| TCP wire | Small messages a second | 9-joint states a second | There and back, median | 99% under |
|---|---|---|---|---|
| Python sockets (before) | 72,000 | 57,000 | 64 µs | 274–295 µs |
| Rust wire | 164,000 | 97,000 | 87 µs | 234–274 µs |

- What moved: the sockets, one writer thread per connection that sends everything queued in one write, and the hub passing each message line straight on to the other programs without waking Python.
- A line that comes after 50 µs of quiet is written at once by the caller, so single commands do not wait for the writer thread (this took the median from 105 µs down to 87 µs).
- Still ~20 µs slower for one message there and back: a line that arrives is handed from the Rust reader thread to the Python thread. Tried: spinning before sleeping; it did not help and made the slowest 1 % worse, so it was removed. For TETROBOT this does not matter (Wi-Fi to a module takes milliseconds).
- Python keeps the message rules (latched values, services, discovery). The wire format is unchanged, so a Rust-wire program and a Python-wire program talk to each other (tested in all four mixes). `GOS_TCP_WIRE=python` forces the Python sockets; a core built before this falls back to them by itself.
- The Linux and macOS libraries in `gos/python/gos/_native` are not rebuilt yet (needs `py -3.12 -m pip install ziglang cargo-zigbuild`, then `py -3.12 gos/build.py --all`); until then those use the Python sockets.

## Step 3: bytes and arrays travel raw (6 Nov 2026)

Measured first: a 1 MB message as base64 inside JSON took 7.4 ms to pack and 6.4 ms to unpack and was 1.4 MB on the wire; 100,000 numbers as a JSON list took 47 ms. numpy arrays could not be sent over TCP or Zenoh at all. A 9-joint state costs only ~6 µs in JSON, so small messages stay JSON.

So the gain is not packing in Rust but not packing at all: a **binary frame**, a header line `#<n> {json}` and then exactly n raw bytes. Rust reads it, forwards it at the hub and writes it without turning it into text. The Python wire speaks the same frame, so mixes still work. Zenoh carries arrays the same way (`as_binary` / `from_binary` in `gos/python/gos/transport.py`, one packing for both).

| Message (TCP, Rust wire, to another program) | Before | Now |
|---|---|---|
| 100 KB of bytes | 1,900 a second | 4,000 a second (400 MB/s) |
| 1 MB of bytes | 123 a second | 418 a second (440 MB/s) |
| 100,000 numbers | 36 a second (as a list) | 848 a second as a float64 array (680 MB/s) |
| 640x480 colour picture | (not possible as an array) | 640 a second |

Measured with the laptop at 36 % load from other work. Small messages unchanged (180,000 a second). An array arrives read-only (a view of the received bytes): copy it to change it. Arrays on one computer still go fastest through shared memory (`app.arrays`, only a name travels).

## Order of work, by measured value

1. **Done:** the baseline above.
2. **Done (6 Nov): the TCP hub in Rust.** 2.3x the small messages a second, 1.7x the joint states, same 99% line (above). Python programs keep the same `App` calls.
3. **Done (6 Nov): big messages travel raw.** Bytes and numpy arrays as binary frames: 3.4x for 1 MB, 24x for 100,000 numbers (above). Not in Rust after all: measured, the cost was the text, not the packing.
4. **Executor and `gos.Rate` waiting in Rust:** Python's lock is released while a loop waits, so other threads keep running.
5. **Shared-memory arrays and the controllers' inner loops in Rust.**

Not worth moving (measured): small-message JSON, the `gos` commands, planners (already on MuJoCo and the Rust IK), package tools.

## Not measured yet

- Two computers (only one computer above).
- Many programs at once (above: two).
- Linux (only Windows above).
