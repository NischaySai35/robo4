"""§7 test: the same module and the same lock test in MuJoCo (CPU), MuJoCo Warp and Newton.

The module starts seated in a floor receiver (sim/walk_env.py), then End A is pulled up with 30 N for 0.5 s, lock closed and lock open.
A good engine: closed barely moves, open comes out. Also reports speed and GPU memory.

usage: py -3.12 tools/bench/newton_vs_mjw.py [cpu|mjw|newton] [worlds] [steps]   (no arguments: all three, each in a fresh process)
"""
import json, os, re, subprocess, sys, tempfile, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'sim'))
XML = os.path.join(ROOT, 'sim', 'walk_long.xml')
FORCE = 30.0
OWN_CONTACTS = os.environ.get('OWN_CONTACTS', '0') == '1'  # Newton's own contact finder, not MuJoCo's
MULTICCD = os.environ.get('MULTICCD', '1') == '1'  # Newton: several contact points per pair of shapes


def gpu_mb():
    return int(subprocess.run(['nvidia-smi', '--query-gpu=memory.used', '--format=csv,noheader,nounits'], capture_output=True, text=True).stdout.strip())


def start(locked):
    """The module seated as the real simulator seats it, as (env, qpos, ctrl)."""
    import mujoco, walk_env as W
    e = W.WalkEnv(seed=0, randomize=False, xml=XML); e.reset(base='A', base_rx=0)
    if not locked:
        e.d.qpos[e.end['A']['lockq']] = 0; e.d.ctrl[e.lock_act['A']] = 0; mujoco.mj_forward(e.m, e.d)
    e.m.opt.noslip_iterations = 0  # the GPU solvers do not run it, so the CPU reference must not either
    return e, e.d.qpos.copy(), e.d.ctrl.copy()


def lift(e, tip):
    return float((np.asarray(tip) - e.rx[0]['seat']) @ e.rx[0]['z']) * 1000


def cpu(worlds, steps):
    import mujoco
    out = {}; t = time.time()
    for locked in (True, False):
        e, _, _ = start(locked); b = e.end['A']['body']; z = e.rx[0]['z']
        for _ in range(steps):
            e.d.xfrc_applied[:] = 0; e.d.xfrc_applied[b, :3] = FORCE * z; mujoco.mj_step(e.m, e.d)
        out['closed' if locked else 'open'] = lift(e, e.d.site_xpos[e.end['A']['tip']])
    return {**out, 'steps_per_s': 2 * steps / (time.time() - t), 'ncon': int(e.d.ncon)}


def mjw(worlds, steps):
    import warp as wp, mujoco_warp as mw
    eL, qL, cL = start(True); eU, qU, cU = start(False); m = eL.m
    wp.init(); base = gpu_mb(); mm = mw.put_model(m)
    d = mw.put_data(m, eL.d, nworld=worlds, nconmax=200, njmax=800, naccdmax=worlds * 128)
    q = d.qpos.numpy(); c = d.ctrl.numpy(); f = d.xfrc_applied.numpy()
    q[1::2] = qU; c[1::2] = cU; f[:] = 0; f[:, eL.end['A']['body'], :3] = FORCE * eL.rx[0]['z']
    d.qpos.assign(q); d.ctrl.assign(c); d.xfrc_applied.assign(f)
    mw.step(mm, d); wp.synchronize(); t = time.time()
    for _ in range(steps - 1): mw.step(mm, d)
    wp.synchronize(); wall = time.time() - t
    tip = d.site_xpos.numpy()[:, eL.end['A']['tip']]
    return {'closed': lift(eL, tip[0]), 'open': lift(eL, tip[1]), 'steps_per_s': worlds * (steps - 1) / wall, 'gpu_mb': gpu_mb() - base}


def newton_xml():
    """A copy Newton accepts: it wants an explicit weight on the massless frame, which MuJoCo fills in from boundmass."""
    s = open(XML, encoding='utf-8').read()
    s, n = re.subn(r'(<body name="module_frame"[^>]*>)', r'\1<inertial pos="0 0 0" mass="0.001" diaginertia="1e-8 1e-8 1e-8"/>', s, count=1)
    assert n == 1
    f = tempfile.NamedTemporaryFile('w', suffix='.xml', delete=False, encoding='utf-8'); f.write(s); f.close()
    return f.name


def nwt(worlds, steps):
    import warp as wp, newton, mujoco
    from newton.solvers import SolverMuJoCo as S
    eL, qL, cL = start(True); eU, qU, cU = start(False); m = eL.m
    wp.init(); base = gpu_mb()
    sub = newton.ModelBuilder(); S.register_custom_attributes(sub)
    sub.default_shape_cfg.gap = 0.0  # the file says 0; Newton's default looks for contacts 100 mm away (10527 contacts instead of 96)
    sub.add_mjcf(newton_xml(), mesh_maxhullvert=int(os.environ.get('MAXHULL', 1024)))  # Newton's default cuts every shape to 64 corners
    b = newton.ModelBuilder(); S.register_custom_attributes(b); b.replicate(sub, worlds)
    model = b.finalize(); per = model.joint_count // worlds
    solver = S(model, nconmax=400, njmax=1600, iterations=int(m.opt.iterations), ls_iterations=int(m.opt.ls_iterations), ccd_iterations=int(m.opt.ccd_iterations), enable_multiccd=MULTICCD, use_mujoco_contacts=not OWN_CONTACTS)
    # walk_env adjusts joint damping and motor gains after loading the file
    w = solver.mjw_model
    w.actuator_biasprm.assign(np.tile(m.actuator_biasprm, (w.actuator_biasprm.shape[0], 1, 1))); w.actuator_gainprm.assign(np.tile(m.actuator_gainprm, (w.actuator_gainprm.shape[0], 1, 1)))
    solver.mjw_model.dof_damping.assign(np.tile(m.dof_damping, (solver.mjw_model.dof_damping.shape[0], 1)))
    s0, s1, ctl = model.state(), model.state(), model.control()
    # same start pose. Newton merges a body's hinges into one joint but keeps the file's coordinate order; only the free joint's quaternion differs (wxyz, xyzw)
    assert model.joint_coord_count // worlds == m.nq, 'coordinates differ from the file'
    jq = model.joint_q.numpy().reshape(worlds, m.nq)
    for w in range(worlds):
        q = (qL if w % 2 == 0 else qU).copy(); q[3:7] = q[[4, 5, 6, 3]]; jq[w] = q
    jq = jq.reshape(-1)
    model.joint_q.assign(jq); s0.joint_q.assign(jq)
    newton.eval_fk(model, s0.joint_q, s0.joint_qd, s0)
    body_labels = [str(n).split('/')[-1] for n in list(model.body_label)[:model.body_count // worlds]]
    bname = mujoco.mj_id2name(m, mujoco.mjtObj.mjOBJ_BODY, eL.end['A']['body']); bi = body_labels.index(bname)
    # same actuator targets, in the file's order
    c = ctl.mujoco.ctrl.numpy().reshape(worlds, -1); c[0::2] = cL; c[1::2] = cU; ctl.mujoco.ctrl.assign(c.reshape(-1))
    if os.environ.get('TARGETS', '1') == '1':  # Newton's joint motors read their own target array, which starts at 0: that is lock OPEN
        t = ctl.joint_target_q.numpy().reshape(worlds, -1); dofs = m.jnt_qposadr[m.actuator_trnid[:, 0]]
        t[0::2, dofs] = cL; t[1::2, dofs] = cU; ctl.joint_target_q.assign(t.reshape(-1))
    per_b = model.body_count // worlds; f = np.zeros((model.body_count, 6), dtype=np.float32); f[bi::per_b, :3] = FORCE * eL.rx[0]['z']
    dt = float(m.opt.timestep)

    def step(a, c_):
        a.body_f.assign(f); solver.step(a, c_, ctl, model.collide(a) if OWN_CONTACTS else None, dt)
        return c_, a
    s0, s1 = step(s0, s1); wp.synchronize(); t = time.time()
    for _ in range(steps - 1): s0, s1 = step(s0, s1)
    wp.synchronize(); wall = time.time() - t
    q = s0.body_q.numpy()
    # the padtip site is fixed on the End A body
    tip_local = m.site_pos[eL.end['A']['tip']]

    def tip(w):
        p = q[w * per_b + bi]; x, y, z_, r = p[3:7]
        v = np.array(tip_local); u = np.array([x, y, z_])
        return p[:3] + v + 2 * np.cross(u, np.cross(u, v) + r * v)
    lockq = s0.joint_q.numpy().reshape(worlds, -1)[0, eL.end['A']['lockq']]
    return {'rotor_deg': float(np.degrees(lockq)), 'closed': lift(eL, tip(0)), 'open': lift(eL, tip(1)), 'steps_per_s': worlds * (steps - 1) / wall, 'gpu_mb': gpu_mb() - base, 'mass': float(solver.mj_model.body_mass.sum()), 'ncon': int(solver.mjw_data.nacon.numpy()[0]) // worlds}


if len(sys.argv) > 1:
    w = int(sys.argv[2]) if len(sys.argv) > 2 else 64
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 500
    print('RESULT ' + json.dumps({'cpu': cpu, 'mjw': mjw, 'newton': nwt}[sys.argv[1]](w, n)), flush=True)
else:
    for k in ('cpu', 'mjw', 'newton'):
        r = subprocess.run([sys.executable, __file__, k], capture_output=True, text=True, timeout=35)
        line = next((l for l in r.stdout.splitlines() if l.startswith('RESULT ')), None)
        if not line:
            print(k, 'FAILED:', (r.stdout + r.stderr)[-600:]); continue
        o = json.loads(line[7:])
        print(f"{k:7s} lock closed lifts {o['closed']:7.2f} mm, open lifts {o['open']:7.2f} mm, {o['steps_per_s']:8.0f} steps/s, GPU {o.get('gpu_mb', 0)} MB", {a: o[a] for a in ('mass', 'ncon') if a in o}, flush=True)
