"""Take one picture from the ESP32-CAM test firmware over USB serial.

REUSE-CHECKED: no serial camera reader existed (grep pyserial / JPEG, 6 Nov 2026).

    py -3.12 tools/espcam/grab.py COM7 [out.jpg]

Opens the port without pulling DTR/RTS (on the ESP32-CAM-MB board those are wired to
reset and IO0, so a careless open holds the chip in reset or in flash mode).
"""
import sys
import time

import serial


def open_port(port: str) -> serial.Serial:
    s = serial.Serial()
    s.port, s.baudrate, s.timeout = port, 921600, 0.5
    s.dtr = False
    s.rts = False
    s.open()
    return s


def command(s: serial.Serial, cmd: str, want: str, wait: float = 8.0) -> str:
    """Send a line, return the first reply line starting with `want` (skips '# ' lines)."""
    s.reset_input_buffer()
    s.write((cmd + "\n").encode())
    end = time.time() + wait
    while time.time() < end:
        line = s.readline().decode(errors="replace").strip()
        if not line:
            continue
        if line.startswith(want) or line.startswith("ERR"):
            return line
        print("  board:", line)
    raise TimeoutError(f"no '{want}' reply to '{cmd}' in {wait} s")


def snap(s: serial.Serial) -> bytes:
    head = command(s, "snap", "JPEG")
    if head.startswith("ERR"):
        raise RuntimeError(head)
    n = int(head.split()[1])
    data = bytearray()
    end = time.time() + 10
    while len(data) < n and time.time() < end:
        data += s.read(n - len(data))
    if len(data) != n:
        raise RuntimeError(f"picture cut off: {len(data)} of {n} bytes")
    if data[:2] != b"\xff\xd8" or data[-2:] != b"\xff\xd9":
        raise RuntimeError("not a complete JPEG (start/end markers missing)")
    return bytes(data)


def main() -> None:
    port = sys.argv[1] if len(sys.argv) > 1 else "COM7"
    out = sys.argv[2] if len(sys.argv) > 2 else "snap.jpg"
    with open_port(port) as s:
        time.sleep(0.3)
        print(command(s, "info", "INFO"))
        t = time.time()
        jpg = snap(s)
        print(f"picture {len(jpg)} bytes in {time.time() - t:.2f} s")
        with open(out, "wb") as f:
            f.write(jpg)
        print("saved", out)


if __name__ == "__main__":
    main()
