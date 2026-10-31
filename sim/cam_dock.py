"""cam_dock.py CKPT MID.END BASE_RX TARGET_RX MODE [SEED] - one dock as a short piece, from a checkpoint (plan_ckpt.py), with the
camera as an OPTIONAL add-on, scored by Nischay's good-dock rule: locked + no bump into another module + about <= 20 s.
  MODE  off      encoders only (no camera)
        truth    the old judge: physics truth + 1 mm noise (walk.sim_camera)
        cam      the stereo camera (cam_judge.py) from the start
        cam@T    camera switched on T s after the dock starts (mid-way)
        shake    camera on, its tripod shaking (2 mm)
        knock@T  camera on, knocked T s after the dock starts (it re-measures its own pose from the board tags)
  env   MARKERS=1 TAGS_PER_END=8 FLOOR_TAG_MM=35 CAM_RES=3840x2160 VISUAL_MESH=1 (pictures: logs/snaps/camdock_*)"""
from paths import tpath
import sys, os, json, time; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
from phys_world import PhysWorld
from phys_dock import PhysDockEnv, dock
from cam_judge import CameraJudge
from snap import Snapper
from watchdog import Watchdog, Stalled
ck, me, base_rx, tgt, mode = sys.argv[1:6]; seed = int(sys.argv[6]) if len(sys.argv) > 6 else 1
mid, e = me.split('.'); base_end = 'A' if e == 'B' else 'B'
w, ex = PhysWorld.load(ck); t0w = time.time(); t0 = float(w.d.time); tag = f"camdock_{os.path.basename(ck).split('.')[0]}_{mode.replace('@', 'at')}"
S = Snapper(w, tpath('logs/snaps'), tag); WD = Watchdog(w, S, abort=False); WD.stage = f'dock {me} -> {tgt}'
WD.allow = (f'{mid}_End{e}', f'{mid}_L{1 if e == "A" else 2}_LockRotor', w.m.body([r for r in w.rx if r['name'] == tgt][0]['bid']).name)
w.on_tick = WD.tick
lines = []; log = lambda s: (lines.append(s), print(s, file=sys.stderr))
J = None
if mode != 'off' and mode != 'truth':
    kw = dict(tag=tag, log=log, seed=seed)
    if mode.startswith('cam@'): kw['on_at'] = t0 + float(mode[4:])
    if mode == 'shake': kw['shake_mm'] = 2.0
    if mode.startswith('knock@'): kw['knock_at'] = t0 + float(mode[6:])
    J = CameraJudge(w, **kw)
    if os.environ.get('SAVE_LOOK'):                          # checkpoint at the camera's first look (to study that view)
        _j = J.judge
        def jj(*a):
            if not os.path.exists(os.environ['SAVE_LOOK']): w.save(os.environ['SAVE_LOOK'], extra=ex)
            return _j(*a)
        J.judge = jj
env = PhysDockEnv(w, mid, seed=seed * 7919 + ex.get('step', 1), randomize=True)
try:
    ok, info = dock(env, base_end, base_rx, tgt, judge={'off': False, 'truth': True}.get(mode, J), log=log)
except Stalled as s:
    ok, info = False, dict(seconds=round(env.t * 0.06, 1), axial_mm=None, radial_mm=None, lock_deg=None, log=[str(s)])
bumps = [f['msg'] for f in WD.flags if f['msg'].startswith('COLLISION')]
print('touching at the end (other bodies, min distance mm):', info.get('touching'))
if os.environ.get('END_CKPT'): w.save(os.environ['END_CKPT'], extra=ex)       # the world after the dock (close-ups, next piece)
good = bool(ok and not bumps and info['seconds'] <= 20.5)
S.shot(f"{mode}: {'LOCKED' if ok else 'not locked'} in {info['seconds']} s")
res = dict(ckpt=os.path.basename(ck), mode=mode, locked=ok, seconds=info['seconds'], gap_mm=info.get('axial_mm'), side_mm=info.get('radial_mm'), slot_deg=info.get('slot_deg'), lock_deg=info.get('lock_deg'),
           bumps=bumps, good_dock=good, camera_looks=[] if J is None else [dict(t=round(x['t'] - t0, 1), stage=x['stage'], answer=x['answer'], err_mm=round(x.get('err_mm', -1), 2)) for x in J.looks],
           watchdog=[f['msg'] for f in WD.flags], wall_s=round(time.time() - t0w))
print('RESULT', json.dumps(res))
for l in [l for l in lines if 'judge' in l or 'camera' in l or 'aligned' in l or 'seat' in l][-14:]: print('   ', l[:200])
