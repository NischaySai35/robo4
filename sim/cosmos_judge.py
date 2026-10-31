"""cosmos_judge.py — can a vision-language model (Cosmos-Reason2 8B, local Ollama) be the docking JUDGE?
The sim's judge reads the true pose (+ noise). The real robot will only have a camera. So: render a virtual camera in
MuJoCo while the robot's docking brain docks End B into a floor receiver, label each image with the physics truth
(seated = gap < 0.8 mm and side < 1.5 mm, as walk.py counts it), ask Cosmos, score it.
   py -3.12 cosmos_judge.py [N_IMAGES]       -> C:\\TETROBOT\\logs\\cosmos_judge\\ (images + results.json)"""
from paths import tpath
import sys, os, io, json, math, base64, time, contextlib, urllib.request; sys.path.insert(0, tpath('sim')); sys.path.insert(0, tpath('deploy'))
import numpy as np, mujoco
from phys_world import PhysWorld
from phys_dock import PhysDockEnv
OUT = os.environ.get('OUT', tpath('logs/cosmos_judge')); os.makedirs(OUT, exist_ok=True)
MODEL = os.environ.get('VLM', 'cosmos-reason2:8b')
PROMPT = ("You are the camera judge of a modular robot. The picture is a close-up of the robot's END CONNECTOR (with four "
          "raised pads) docking into a RECEIVER on the floor (also four raised pads). Docked correctly, the end's pads sit "
          "BETWEEN the receiver's pads and the two faces touch with no visible gap. Not docked: the end hovers above, is "
          "shifted sideways, or rests on top of the receiver's pads. Reply with JSON only: "
          '{"seated": true or false, "gap_mm": your estimate of the gap between the faces, "reason": "short"}')


def ask(png_bytes):
    body = json.dumps({'model': MODEL, 'stream': False, 'format': 'json', 'options': {'temperature': 0},
                       'messages': [{'role': 'user', 'content': PROMPT, 'images': [base64.b64encode(png_bytes).decode()]}]}).encode()
    req = urllib.request.Request('http://127.0.0.1:11434/api/chat', data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r: return json.loads(json.loads(r.read())['message']['content'])


CAM = dict(dist=float(os.environ.get('CAM_DIST', '0.16')), az=float(os.environ.get('CAM_AZ', '135')), el=float(os.environ.get('CAM_EL', '-6')))


def render(m, d, look_at, dist=None, az=None, el=None):
    """virtual camera: LOW and side-on by default (a gap between the faces shows as daylight); no sim markers"""
    cam = mujoco.MjvCamera(); cam.type = mujoco.mjtCamera.mjCAMERA_FREE
    cam.lookat[:] = look_at; cam.distance = dist or CAM['dist']; cam.azimuth = az or CAM['az']; cam.elevation = el or CAM['el']
    opt = mujoco.MjvOption(); opt.sitegroup[:] = 0
    with mujoco.Renderer(m, 448, 448) as R:
        R.update_scene(d, cam, scene_option=opt); img = R.render()
    from PIL import Image
    b = io.BytesIO(); Image.fromarray(img).save(b, format='PNG'); return b.getvalue()


if __name__ == '__main__':
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 16
    import json as J
    sc = J.load(open(tpath('logs/judge_scene.json')))
    with contextlib.redirect_stdout(io.StringIO()):
        import walk as WK
    shots = []
    for seed in range(1, 100):
        if len(shots) >= n: break
        w = PhysWorld(['M1'], sc['anchors'], randomize=True, seed=seed, locks=sc['locks'] + [{'a': {'floor': 'F1'}, 'b': {'module': 'M1', 'port': 'B'}}])
        w.place(sc); w.run(0.3)
        env = PhysDockEnv(w, 'M1', seed=seed); j = env.index('F:F1')
        W = WK.Walker(env, 'A', env.index('F:F0'), 0, w.m.opt.gravity.copy(), log=lambda *a: None); W.judge_fn = W.sim_camera
        with contextlib.redirect_stdout(io.StringIO()):
            C = W._ctrl(j); locks, done = W.dock_fns('B')
        # step the dock and take pictures at moments with different truths: above, going in, seated
        took = set()
        for t in range(900):
            with contextlib.redirect_stdout(io.StringIO()):
                cn, lk = C.step(env.measured())
            la, lb = locks(lk); env.step(cn, la, lb)
            r = env.end_vs_rx('B', j); ax, rad = r['axial_mm'], r['radial_mm']
            kind = 'seated' if (abs(ax) < 0.8 and rad < 1.5) else ('near' if ax < 8 else 'above')
            if kind not in took and (kind != 'above' or 10 < ax < 40):
                png = render(w.m, w.d, env.rx[j]['seat'])
                name = f'{seed}_{kind}.png'; open(os.path.join(OUT, name), 'wb').write(png)
                shots.append(dict(img=name, truth_seated=kind == 'seated', gap_mm=round(ax, 2), side_mm=round(rad, 2)))
                took.add(kind)
            if done(C, lk) or len(took) == 3: break
    print(f'{len(shots)} images ({sum(s["truth_seated"] for s in shots)} seated); asking {MODEL} ...', flush=True)
    right = 0; t0 = time.time()
    for s in shots:
        try:
            a = ask(open(os.path.join(OUT, s['img']), 'rb').read()); s['vlm'] = a
            s['correct'] = bool(a.get('seated')) == s['truth_seated']; right += s['correct']
        except Exception as ex:
            s['vlm'] = {'error': repr(ex)}; s['correct'] = False
        print(f"  {s['img']:16s} truth {'SEATED' if s['truth_seated'] else 'not   '} (gap {s['gap_mm']:6.2f} mm) -> {s['vlm']}", flush=True)
    tp = sum(1 for s in shots if s['truth_seated'] and s['correct']); fp = sum(1 for s in shots if not s['truth_seated'] and not s['correct'])
    print(f'{MODEL}: {right}/{len(shots)} correct | says seated when NOT (dangerous: it would lock): {fp} | {time.time() - t0:.0f} s')
    json.dump(dict(model=MODEL, correct=right, n=len(shots), false_seated=fp, shots=shots), open(os.path.join(OUT, 'results.json'), 'w'), indent=1)
