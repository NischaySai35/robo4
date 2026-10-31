"""TETROBOT guided calibration (real robot). Uses only your existing firmware API - no reflash.
Run with End A locked in a floor connector, battery on, ESP32 on WiFi:
    python calibrate.py                 (ESP address from laptop_controller.ESP, e.g. http://mod1.local)
    python calibrate.py http://192.168.1.50
Steps: 1) which servo ID is which joint (wiggle + you type the name)
       2) HOME: torque off -> you hold the module STRAIGHT, lock fins OPEN -> Enter -> angles saved -> torque on
       3) direction of every joint: 3D window shows +25 deg in the model, real joint moves +10 deg slowly -> same way? y/n
       4) lock direction: fins turn 20 deg -> toward LOCKED (under the pads)? y/n
Saves deploy/robot_config.json (laptop_controller.py and walk_real.py load it automatically).
"""
from paths import tpath
import sys, json, time, math, urllib.request
CFG = tpath('deploy/robot_config.json')
sys.path.insert(0, tpath('deploy')); sys.path.insert(0, tpath('sim'))
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    import laptop_controller as L
ESP = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith('http') else L.ESP
NAMES = ['L1', 'T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3', 'L2']
ACT_JOINT = {'T1': 'J_T1_twist', 'B1': 'J_B1_bend', 'B2': 'J_B2_bend', 'T2': 'J_T2_twist', 'B3': 'J_B3_bend', 'B4': 'J_B4_bend', 'T3': 'J_T3_twist'}

def get(path, timeout=3.0):
    with urllib.request.urlopen(ESP + path, timeout=timeout) as r: return json.loads(r.read())
def angles():
    return {s['id']: s['currentAngle'] for s in get('/api/telemetry')['servos'] if s.get('currentAngle') is not None}
def move(sid, deg, speed=3):
    get('/api/command?servo=%d&cmd=pos&angle=%.2f&speed=%d&acc=20' % (sid, deg, speed))
def ask(q, default=''):
    a = input(q).strip(); return a if a else default

def show_model(joint, deg):
    """Open a 3D window with the module straight except this joint at +deg (the direction the controller calls '+')."""
    import os
    if os.environ.get('NOVIEW') == '1': return None
    try:
        import mujoco, mujoco.viewer
        m = mujoco.MjModel.from_xml_path(tpath('sim/scene_v2.xml')); d = mujoco.MjData(m)
        d.qpos[m.joint(ACT_JOINT[joint]).qposadr[0]] = math.radians(deg); mujoco.mj_forward(m, d)
        v = mujoco.viewer.launch_passive(m, d); v.cam.distance = 1.1; v.cam.elevation = -15; v.cam.lookat[:] = [0, 0, 0.3]; v.sync()
        return v
    except Exception as e:
        print('   (3D window not available: %s)' % e); return None

def save(cfg):
    json.dump(cfg, open(CFG, 'w'), indent=1)

def main():
    print('TETROBOT calibration - ESP at', ESP)
    try: get('/api/health')
    except Exception as e: print('Cannot reach the ESP32 (%s). Check WiFi / address.' % e); return
    cfg = {}
    try: cfg = json.load(open(CFG))
    except Exception: pass
    # ---- 1) IDs
    a = angles(); ids = sorted(a)
    print('\nServos answering: %s' % ids)
    if ask('Step 1 - map servo IDs to joints now? [Y/n]: ', 'y').lower().startswith('y'):
        sid_map = {}
        for sid in ids:
            print('   wiggling ID %d ...' % sid); get('/api/identify?id=%d' % sid, timeout=5)
            nm = ask('   which joint moved? (%s, or Enter = skip): ' % '/'.join(NAMES)).upper()
            if nm in NAMES: sid_map[nm] = sid
        missing = [n for n in NAMES if n not in sid_map]
        if missing: print('   NOTE: not mapped: %s' % missing)
        cfg['SERVO_ID'] = sid_map; save(cfg)
    sid_map = cfg.get('SERVO_ID', L.SERVO_ID)
    # ---- 2) HOME
    if ask('\nStep 2 - set HOME (straight pose)? [Y/n]: ', 'y').lower().startswith('y'):
        input('   Hold the module firmly. Press Enter to switch torque OFF ...')
        get('/api/torque?on=0')
        input('   Bend it STRAIGHT (all bends straight, twists lined up, lock fins OPEN), hold still, press Enter ...')
        a = angles(); home = {nm: a[sid] for nm, sid in sid_map.items() if sid in a}
        get('/api/torque?on=1'); print('   torque ON (holding). HOME =', {k: round(v, 1) for k, v in home.items()})
        cfg['HOME'] = home; save(cfg)
    home = cfg.get('HOME', L.HOME)
    # ---- 3) directions
    if ask('\nStep 3 - check joint directions? [Y/n]: ', 'y').lower().startswith('y'):
        sign = {}
        for nm in ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3']:
            if nm not in sid_map: continue
            sid = sid_map[nm]; v = show_model(nm, 25)
            print('\n   %s: the 3D window shows the + direction (25 deg). Moving the real %s +10 deg slowly ...' % (nm, nm))
            move(sid, home[nm] + 10); time.sleep(1.5)
            ans = ask('   Did the real %s move the SAME way as the 3D window? [y/n]: ' % nm).lower()
            sign[nm] = 1 if ans.startswith('y') else -1
            move(sid, home[nm]); time.sleep(1.0)
            if v is not None:
                try: v.close()
                except Exception: pass
        cfg['SIGN'] = sign; save(cfg)
    # ---- 4) locks
    if ask('\nStep 4 - check lock-fin direction? [Y/n]: ', 'y').lower().startswith('y'):
        lock_dir = {}
        for nm, end in [('L1', 'A'), ('L2', 'B')]:
            if nm not in sid_map: continue
            sid = sid_map[nm]
            move(sid, home[nm] + 20); time.sleep(1.2)
            ans = ask('   %s (End %s): fins turned 20 deg. Toward LOCKED (sliding under the receiver pads)? [y/n]: ' % (nm, end)).lower()
            lock_dir[end] = 1.0 if ans.startswith('y') else -1.0
            move(sid, home[nm]); time.sleep(1.0)
        cfg['LOCK_DIR'] = lock_dir; save(cfg)
    json.dump(cfg, open(CFG, 'w'), indent=1)
    print('\nSaved', CFG, '\n', json.dumps(cfg, indent=1))

if __name__ == '__main__':
    try: main()
    except (KeyboardInterrupt, EOFError):
        print('\nStopped. Everything finished so far is saved in', CFG, '(servos keep holding).')
