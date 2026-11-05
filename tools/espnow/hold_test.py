"""Hold-on-silence test for the ESP-NOW link. MOVES ONE MOTOR: run it only with Nischay at the robot.

REUSE-CHECKED: uses gos.espnow (the link) and the board's own /api/batch + /api/telemetry; nothing else tests the hold.

    py -3.12 tools/espnow/hold_test.py --yes            (mod1 at 192.168.137.112, dongle auto-found)
    py -3.12 tools/espnow/hold_test.py --yes --ip 192.168.137.112 --servo 8 --deg 30

Before: Studio bridge stopped (the dongle has one owner), torque ON from the board page, the joint free to turn 30 deg.
What it does:
  1. over ESP-NOW: one slow move of one joint (default servo 8 = T3 twist, the lightest), speed 1 (~30 deg/s);
  2. 0.4 s later the laptop goes silent (the link closes: no more heartbeat), the joint still on its way;
  3. over Wi-Fi: reads where the joint ended and the board's log.
Pass: it stopped well short of the goal (about 0.4-0.9 s of travel, not 30 deg), torque still on, the log says
"laptop silent ... holding". Fail: it went all the way, or went limp.
"""
import argparse, json, sys, time, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'gos' / 'python'))
from gos.espnow import EspNowLink                      # noqa: E402


def wifi(ip, path):
    with urllib.request.urlopen(f'http://{ip}{path}', timeout=4) as r: return r.read().decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--yes', action='store_true', help='I am at the robot; one joint may move')
    ap.add_argument('--ip', default='192.168.137.112'); ap.add_argument('--name', default='mod1')
    ap.add_argument('--servo', type=int, default=8); ap.add_argument('--deg', type=float, default=30.0)
    ap.add_argument('--port', default=None, help='dongle port, e.g. COM7')
    a = ap.parse_args()
    if not a.yes: sys.exit('This moves a motor. Run it with --yes, at the robot.')

    t = json.loads(wifi(a.ip, '/api/telemetry'))
    sv = next(s for s in t['servos'] if s['id'] == a.servo)
    if t['motionLocked'] or not sv['torque']: sys.exit(f'servo {a.servo} has torque off or the board is locked: press Turn torque ON on the board page first.')
    start = sv['currentAngle']; goal = max(sv['min'], min(sv['max'], start + a.deg))
    print(f'servo {a.servo} ({sv["label"]}): at {start:.1f}, moving slowly to {goal:.1f}')

    link = EspNowLink.open(a.port)
    end = time.time() + 15
    while not link.alive() and time.time() < end: time.sleep(0.05)
    code, body = link.request(a.name, f'/api/batch?{a.servo}={goal:.1f}&speed=1')
    print('move sent over ESP-NOW:', code, body)
    time.sleep(0.4)
    link.close(); quiet = time.time()
    print('laptop silent now (heartbeat stopped)')

    time.sleep(2.5)
    t = json.loads(wifi(a.ip, '/api/telemetry'))
    sv = next(s for s in t['servos'] if s['id'] == a.servo)
    moved = abs(sv['currentAngle'] - start)
    print(f'ended at {sv["currentAngle"]:.1f} (moved {moved:.1f} of {abs(goal - start):.1f}), target now {sv["targetAngle"]}, torque {sv["torque"]}')
    print('board espnow:', t['espnow'])
    print('log:', *[l for l in wifi(a.ip, '/api/log').splitlines() if 'ESP-NOW' in l][-3:], sep='\n  ')
    ok = sv['torque'] and moved < abs(goal - start) * 0.7 and t['espnow']['holds'] > 0
    print('PASS: stopped where it was and holds' if ok else 'FAIL: see the numbers above')


if __name__ == '__main__':
    main()
