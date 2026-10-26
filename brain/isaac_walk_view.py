"""Watch the TETROBOT walk in Isaac Sim 6.2 (RTX render).
It REPLAYS the recorded walk (walk_record.npz = MuJoCo physics + the real walking code, judge on). Isaac only draws it.
Keys: none needed - it loops. SPEED env var = playback speed (default 1 = real time). Close the window to stop."""
import os, sys, time, math, numpy as np
from isaacsim import SimulationApp
TEST = os.environ.get('TEST') == '1'          # self-check: no window, a few frames, then exit
app = SimulationApp({'headless': TEST, 'width': 1600, 'height': 900})
import omni.usd
from pxr import Usd, UsdGeom, UsdLux, Gf, Vt, Sdf
R = np.load(r'D:\robo4\brain\walk_record.npz')
xpos, xquat, dt = R['xpos'], R['xquat'], float(R['dt']); F = len(xpos); names = [str(n) for n in R['body_names']]
SPEED = float(os.environ.get('SPEED', '1'))
ctx = omni.usd.get_context(); ctx.new_stage(); app.update(); stage = ctx.get_stage()
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z); UsdGeom.SetStageMetersPerUnit(stage, 1.0)
UsdGeom.Xform.Define(stage, '/World')
# lights + floor
dome = UsdLux.DomeLight.Define(stage, '/World/Dome'); dome.CreateIntensityAttr(900)
sun = UsdLux.DistantLight.Define(stage, '/World/Sun'); sun.CreateIntensityAttr(2500); UsdGeom.Xformable(sun).AddRotateXYZOp().Set(Gf.Vec3f(-50, 20, 30))
fl = UsdGeom.Mesh.Define(stage, '/World/Floor'); s = 3.0
fl.CreatePointsAttr(Vt.Vec3fArray([Gf.Vec3f(-s, -s, 0), Gf.Vec3f(s, -s, 0), Gf.Vec3f(s, s, 0), Gf.Vec3f(-s, s, 0)]))
fl.CreateFaceVertexCountsAttr([4]); fl.CreateFaceVertexIndicesAttr([0, 1, 2, 3]); fl.CreateDisplayColorAttr([Gf.Vec3f(0.55, 0.5, 0.45)])
# robot + connectors: one Xform per MuJoCo body, shapes inside it (body frame)
ops = {}
for b, nm in enumerate(names):
    if b == 0: continue
    xf = UsdGeom.Xform.Define(stage, '/World/TETROBOT/%s' % nm.replace('-', '_').replace(' ', '_'))
    ops[b] = (xf.AddTranslateOp(UsdGeom.XformOp.PrecisionDouble), xf.AddOrientOp(UsdGeom.XformOp.PrecisionDouble))
import json
CADDIR = r'D:\robo4\brain\meshes'          # the real try8 parts exported from Fusion (mm, Fusion frame) + body-frame offsets
OFF = json.load(open(CADDIR + r'\offsets.json')) if os.environ.get('CAD', '1') == '1' else {}
COLS = {'Spine': (0.22, 0.24, 0.27), 'LockRotor': (1.0, 0.55, 0.12), 'LockModule': (0.92, 0.92, 0.90), 'Housing': (0.95, 0.95, 0.93), 'Ring': (0.85, 0.87, 0.9)}
def read_stl(p):
    raw = open(p, 'rb').read(); n = int(np.frombuffer(raw, np.uint32, 1, 80)[0])
    if 84 + 50 * n == len(raw):
        a = np.frombuffer(raw, np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('x', '<u2')]), n, 84); return a['v'].reshape(-1, 3).astype(np.float64)
    vs = [list(map(float, l.split()[1:4])) for l in raw.decode(errors='ignore').splitlines() if l.strip().startswith('vertex')]; return np.array(vs)
cad = set()
for nm, off in OFF.items():
    if nm not in names: print('CAD part %s: no matching body in the sim, skipped' % nm); continue
    v = read_stl(os.path.join(CADDIR, nm + '.stl')) * 0.001 - np.array(off); nt = len(v) // 3
    me = UsdGeom.Mesh.Define(stage, '/World/TETROBOT/%s/cad' % nm.replace('-', '_'))
    me.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(np.ascontiguousarray(v, np.float32)))
    me.CreateFaceVertexCountsAttr(Vt.IntArray([3] * nt)); me.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(np.arange(3 * nt, dtype=np.int32)))
    me.CreateSubdivisionSchemeAttr('none'); col = next((c for k_, c in COLS.items() if k_ in nm), (0.9, 0.9, 0.9)); me.CreateDisplayColorAttr([Gf.Vec3f(*col)])
    cad.add(nm); print('CAD part %-26s %6d triangles' % (nm, nt), flush=True)
va = fa = 0
for k in range(len(R['g_body'])):
    b = int(R['g_body'][k]); nv, nf = int(R['g_nv'][k]), int(R['g_nf'][k])
    v = R['g_v'][va:va + nv]; f = R['g_f'][fa:fa + nf]; va += nv; fa += nf
    if b == 0 or names[b] in cad: continue          # real CAD replaces the simple physics shapes for that part
    me = UsdGeom.Mesh.Define(stage, '/World/TETROBOT/%s/g%d' % (names[b].replace('-', '_').replace(' ', '_'), k))
    me.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(np.ascontiguousarray(v, np.float32)))
    me.CreateFaceVertexCountsAttr(Vt.IntArray([3] * nf)); me.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(np.ascontiguousarray(f.reshape(-1), np.int32)))
    me.CreateSubdivisionSchemeAttr('none'); c = R['g_rgba'][k]; me.CreateDisplayColorAttr([Gf.Vec3f(float(c[0]), float(c[1]), float(c[2]))])
# camera looking at the connector row
c = xpos[0][[b for b in range(1, len(names)) if names[b].startswith('rx')]].mean(0) if any(n.startswith('rx') for n in names) else np.zeros(3)
eye, tgt = c + np.array([0.15, -0.75, 0.45]), c + np.array([0, 0, 0.08])
try:
    from isaacsim.core.utils.viewports import set_camera_view
    set_camera_view(eye=eye.tolist(), target=tgt.tolist())
except Exception as ex:
    print('camera helper not found (%r) - use the mouse to look around' % ex)
def put(fr):
    i = int(fr) % F; j = min(i + 1, F - 1); a = fr - int(fr)
    for b, (t, o) in ops.items():
        p = (1 - a) * xpos[i, b] + a * xpos[j, b]; q = (1 - a) * xquat[i, b] + a * xquat[j, b]
        if q @ xquat[i, b] < 0: q = -q
        q = q / np.linalg.norm(q)
        t.Set(Gf.Vec3d(float(p[0]), float(p[1]), float(p[2]))); o.Set(Gf.Quatd(float(q[0]), Gf.Vec3d(float(q[1]), float(q[2]), float(q[3]))))
ev = list(zip(R['ev_frame'].tolist(), [str(x) for x in R['ev_text']]))
print('\nTETROBOT walk replay: %d frames = %.0f s of robot time, speed x%.1f, result: %s\n' % (F, F * dt, SPEED, 'ALL STEPS OK' if bool(R['ok']) else 'FAILED'), flush=True)
put(0)
for _ in range(30): app.update()
t0 = time.time(); last = -1; loop = 0
while app.is_running():
    fr = (time.time() - t0) * SPEED / dt
    if fr >= F - 1:
        put(F - 1); app.update(); time.sleep(1.5); t0 = time.time(); last = -1; loop += 1; print('--- replay again (loop %d) ---' % loop, flush=True); continue
    put(fr)
    for f_, s_ in ev:
        if last < f_ <= fr: print('[%5.1f s] %s' % (f_ * dt, s_), flush=True)
    last = fr
    app.update()
    if TEST and time.time() - t0 > 5:
        print('SELFTEST OK: replayed %.0f frames, End B tip body z now %.3f m' % (fr, xpos[int(fr)].max(0)[2]), flush=True); break
app.close()
