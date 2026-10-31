"""Does the GPU physics hold a lock the same way as the CPU? Pull End A up 30 N for 0.5 s, locked vs unlocked. CPU (noslip 3 / 0) vs GPU."""
from paths import tpath
import sys, math, numpy as np, mujoco, warp as wp, mujoco_warp as mjw, torch
sys.path.insert(0, tpath('sim'))
import walk_env as W
XML = tpath('sim/walk_long.xml')
def setup(locked):
    e = W.WalkEnv(seed=0, randomize=False, xml=XML); e.reset(base='A', base_rx=0)
    if not locked:
        e.d.qpos[e.end['A']['lockq']] = 0; e.d.ctrl[e.lock_act['A']] = 0; mujoco.mj_forward(e.m, e.d)
    return e
def lift(e, d_tip):
    return float((d_tip - e.rx[0]['seat']) @ e.rx[0]['z']) * 1000
res = {}
for ns in (3, 0):
    for locked in (True, False):
        e = setup(locked); e.m.opt.noslip_iterations = ns; b = e.end['A']['body']; z = e.rx[0]['z']
        for _ in range(500):
            e.d.xfrc_applied[:] = 0; e.d.xfrc_applied[b, :3] = 30 * z; mujoco.mj_step(e.m, e.d)
        res['CPU noslip%d %s' % (ns, 'locked' if locked else 'unlocked')] = lift(e, e.d.site_xpos[e.end['A']['tip']])
# GPU: world 0 locked, world 1 unlocked
eL, eU = setup(True), setup(False); m = eL.m; m.opt.noslip_iterations = 0
wp.init(); mm = mjw.put_model(m)
d = mjw.put_data(m, eL.d, nworld=2, nconmax=200, njmax=800, naccdmax=128)
qp, ct, xf, sx = (wp.to_torch(getattr(d, f)) for f in ('qpos', 'ctrl', 'xfrc_applied', 'site_xpos'))
qp[1] = torch.as_tensor(eU.d.qpos, dtype=qp.dtype, device=qp.device); ct[1] = torch.as_tensor(eU.d.ctrl, dtype=ct.dtype, device=ct.device)
b = eL.end['A']['body']; z = torch.as_tensor(eL.rx[0]['z'], dtype=xf.dtype, device=xf.device)
for _ in range(500):
    xf.zero_(); xf[:, b, :3] = 30 * z; mjw.step(mm, d)
wp.synchronize(); tip = eL.end['A']['tip']
for w, nm in ((0, 'locked'), (1, 'unlocked')):
    res['GPU %s' % nm] = lift(eL, sx[w, tip].cpu().numpy())
for k, v in res.items(): print('%-24s End A lifted %.2f mm under 30 N' % (k, v))
