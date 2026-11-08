r"""Sync twin test: ideal sim docks; real_sync.RealSync computes the corrected servo angles every 60 ms (exactly what the board
would get); a REALISTIC sim (flex, gear play, droop, randomness, disturbances) plays them open-loop. Does the twin seat + lock?
usage: py -3.12 sim\sync_twin.py SCENE A B [SEED] [nocorr]   env: TRACE=1, SNAP=<dir>, SHOT_T=3.8,4.3
REUSE-CHECKED: corrected angles = real_sync.RealSync (unchanged, never switched on); worlds = manual.Manual; pictures = snap.Snapper."""
import os, sys, json, time, math, io, contextlib
for v in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS'): os.environ.setdefault(v,'1')
SIM = r'D:\robo4-restructure\sim'; sys.path.insert(0, SIM); sys.path.insert(0, os.path.join(SIM,'deploy')); os.chdir(r'D:\robo4-restructure')
os.environ.setdefault('COOP_SECONDS','30')
with contextlib.redirect_stdout(io.StringIO()):
    import manual as M, real_sync as RS
    from paths import tpath
    import numpy as np
scene, a, b = sys.argv[1:4]; seed = int(sys.argv[4]) if len(sys.argv) > 4 else 1; nocorr = 'nocorr' in sys.argv
sc = json.load(open(tpath('teacher/scenes.json')))[scene]; T0 = time.time()
lg = lambda tag: (lambda *x: None)
# 1) ideal session + RealSync (never switched on: computes only, sends nothing)
s = M.Manual(sc, seed=1, pace=False, randomize=False, disturb=False, judge='off', ideal=True, log=lambda *x: None)
sy = RS.RealSync(s.w); s.sync = sy; plan = []
orig = sy.tick
def tick():
    st = sy.stamp; orig()
    if sy.stamp != st:
        cmd = {mid: (r['ideal'] if nocorr else r['cmd']).copy() for mid, r in sy.rows.items()}
        plan.append((float(s.w.d.time), cmd, s.w.tgt.copy()))
sy.tick = tick
with contextlib.redirect_stdout(io.StringIO()): ok_ideal = bool(s.connect(a, b))
t_ideal = time.time() - T0
# 2) realistic twin plays the plan (same scene, its own random robot + room)
tw = M.Manual(sc, seed=seed, pace=False, randomize=True, disturb=True, judge='off', ideal=False, log=lambda *x: None); w = tw.w
L = M.canon(a, b); (dm, de), _ = M.docking_of(L); rx = M.ref_name(L['a'])
best = None; last = None
SN = None
if os.environ.get('SNAP'):
    from snap import Snapper; SN = Snapper(w, os.environ['SNAP'], f'{scene}_{a}_{b}'.replace('.','')); SN.shot('twin start')
SHOTS = [float(x) for x in os.environ.get('SHOT_T','').split(',') if x]
for k, (t, cmd, tg) in enumerate(plan):
    for i, mid in enumerate(w.ids):
        w.tgt[i*9:i*9+7] = np.radians(cmd[mid]); w.tgt[i*9+7:i*9+9] = tg[i*9+7:i*9+9]
    w.run(RS.SEND_DT)
    if SN and SHOTS and t >= SHOTS[0]: SN.shot(f'twin t={t:.1f}'); SHOTS.pop(0)
    r = w.end_vs(dm, de, rx); last = r
    sc_ = abs(r['axial_mm']) + r['radial_mm']
    if best is None or sc_ < best[0]: best = (sc_, r)
    if os.environ.get('TRACE') and k % 5 == 0:
        w._refresh_rx(); R_ = next(x for x in w.rx if x['name'] == rx); E_ = w.mod[dm]['end'][de]; Re_ = w.d.xmat[E_['body']].reshape(3, 3)
        nE_ = Re_[:, 1] if de == 'B' else -Re_[:, 1]; tilt = math.degrees(np.linalg.norm(np.cross(nE_, -R_['z'])))
        import phys_dock as PD_; slot = PD_.end_rel(w.d.site_xpos[E_['tip']].copy(), Re_, R_['seat'], R_['z'], R_['R'])['slot_deg']
        print(f"   tilt {tilt:5.1f} deg  pad turn {slot:6.1f} deg", end='')
    if os.environ.get('TRACE') and k % 5 == 0: print(f" t{t:5.1f} gap {r['axial_mm']:7.1f} side {r['radial_mm']:6.1f} rotor {r['lock_deg']:4.0f} | ideal-vs-twin joint err max {max(float(np.max(np.abs(np.degrees(w.d.qpos[np.array(w.mod[mid]['qa'])]) - cmd[mid]))) for mid in w.ids):5.1f} deg", flush=True)
for _ in range(int(2.5 / 0.06)):                     # hold the last command 2.5 s (magnets + chamfers settle)
    w.run(0.06); r = w.end_vs(dm, de, rx); last = r
if SN: SN.shot('twin end')
seated = abs(r['axial_mm']) < 0.8 and r['radial_mm'] < 1.5 and r['lock_deg'] > 40
print(json.dumps(dict(task=f'{scene} {a}->{b}', seed=seed, corr=not nocorr, ideal_locked=ok_ideal, twin_locked=seated,
      end_gap_mm=round(r['axial_mm'], 2), end_side_mm=round(r['radial_mm'], 2), rotor_deg=round(r['lock_deg']),
      best_gap=round(best[1]['axial_mm'], 2), best_side=round(best[1]['radial_mm'], 2), ticks=len(plan),
      wall=round(time.time() - T0, 1), wall_ideal=round(t_ideal, 1))), flush=True)
