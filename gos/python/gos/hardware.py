"""The real robot: one ESP32 module board (firmware/esp32_multi), driven over its web API.

Safety first, because this moves motors:
- Nothing moves until arm(). stop() is the board's emergency stop and works armed or not.
- Every command is clamped to the joint limits, and a large jump is split into small steps.
- Servo IDs 1-9 are the module's joints in physical order (LOCK1 ... LOCK2); the board reports each servo's
  home. Directions (SIGN) are still unconfirmed defaults of +1, so check them on the robot before trusting a pose.
"""
import json, math, time, urllib.error, urllib.parse, urllib.request

from .app import GosError, Result


class Esp32Robot:
    def __init__(self, url='http://mod1.local', joints=None, servo_ids=None, signs=None, limits=None,
                 speed=10, acc=40, max_step_deg=15.0, timeout=0.5):
        self.url = url.rstrip('/')
        self.joints = list(joints or [])
        self.ids = dict(servo_ids or {j: i + 1 for i, j in enumerate(self.joints)})
        self.signs = dict(signs or {j: 1 for j in self.joints})
        self.limits = dict(limits or {})
        self.speed, self.acc, self.max_step, self.timeout = speed, acc, max_step_deg, timeout
        self.armed = False
        self._homes = None
        self._last = None

    # ── talking to the board ──────────────────────────────────────────────────
    def _get(self, path):
        try:
            with urllib.request.urlopen(self.url + path, timeout=self.timeout) as r:
                return json.loads(r.read() or b'{}')
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise GosError(f'The robot at {self.url} does not answer ({e}). Check it is powered, on the same Wi-Fi, and the address is right.') from None

    def telemetry(self):
        return self._get('/api/telemetry')

    def _read_homes(self):
        servos = {s['id']: s for s in self.telemetry().get('servos', [])}
        missing = [j for j in self.joints if self.ids[j] not in servos or servos[self.ids[j]].get('home') is None]
        if missing:
            raise GosError(f'The board does not report servos for {", ".join(missing)}. Run a scan in the ESP-TTL tab.')
        self._homes = {j: float(servos[self.ids[j]]['home']) for j in self.joints}
        return servos

    def read(self):
        """Joint angles in radians, from the servo encoders."""
        servos = self._read_homes()
        out = {}
        for j in self.joints:
            a = servos[self.ids[j]].get('currentAngle')
            if a is None: raise GosError(f'Servo {self.ids[j]} ({j}) gives no angle. It may be unpowered or disconnected.')
            out[j] = math.radians(self.signs[j] * (a - self._homes[j]))
        return out

    # ── safety ───────────────────────────────────────────────────────────────
    def arm(self):
        """Allow motion. Reads the current pose first, so the first move starts from where the robot really is."""
        self._last = self.read()
        self.armed = True
        return Result(True, 'Armed: commands will move the motors. Call stop() to halt everything.')

    def disarm(self):
        self.armed = False
        return Result(True, 'Disarmed: commands are refused until arm().')

    def stop(self):
        """Emergency stop on every servo. Always allowed, and disarms."""
        self.armed = False
        try:
            self._get('/api/command?servo=all&cmd=estop')
            return Result(True, 'Emergency stop sent to every servo.')
        except GosError as e:
            return Result(False, f'Emergency stop could NOT be sent: {e} Cut the power if the robot is moving.')

    def _clamp(self, j, v):
        lo, hi = self.limits.get(j, (-math.pi, math.pi))
        return min(max(v, lo), hi)

    def move(self, values):
        """Command joint angles (radians, by joint name). Clamped to limits; a large jump goes in steps."""
        if not self.armed:
            return Result(False, 'Not armed: call arm() first. Nothing moved.')
        unknown = [j for j in values if j not in self.ids]
        if unknown:
            return Result(False, f'Unknown joints {", ".join(unknown)}. Joints: {", ".join(self.joints)}.')
        target = {j: self._clamp(j, v) for j, v in values.items()}
        clamped = [j for j in values if abs(target[j] - values[j]) > 1e-9]
        start = {j: self._last.get(j, 0.0) for j in target}
        biggest = max([abs(math.degrees(target[j] - start[j])) for j in target] + [0])
        steps = max(1, math.ceil(biggest / self.max_step))
        for k in range(1, steps + 1):
            q = {j: start[j] + (target[j] - start[j]) * k / steps for j in target}
            parts = {'speed': self.speed, 'acc': self.acc}
            parts.update({str(self.ids[j]): round(self._homes[j] + self.signs[j] * math.degrees(v), 2) for j, v in q.items()})
            self._get('/api/batch?' + urllib.parse.urlencode(parts))
            if not self.armed: return Result(False, 'Stopped during the move.')
            if k < steps: time.sleep(0.05)
        self._last.update(target)
        msg = f'Moved {len(target)} joints in {steps} step(s).' + (f' Clamped to limits: {", ".join(clamped)}.' if clamped else '')
        return Result(True, msg, {'steps': steps, 'clamped': clamped})
