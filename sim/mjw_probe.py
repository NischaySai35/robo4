
import mujoco_warp as mjw, inspect
import mujoco_warp._src.types as T
print('funcs', [n for n in dir(mjw) if not n.startswith('_')][:80])
src=inspect.getsource(T.Model)
for k in ['dof_damping','dof_frictionloss','dof_armature','jnt_stiffness','jnt_range','body_mass','body_inertia','body_ipos','geom_friction','opt:','gravity','qpos_spring','jnt_margin']:
    for l in src.splitlines():
        if l.strip().startswith(k): print('M', l.strip()[:130]); break
src=inspect.getsource(T.Data)
for k in ['qpos','qvel','ctrl','xfrc_applied','site_xpos','xmat','xipos','actuator_force','cvel','qfrc_bias','nacon','time']:
    for l in src.splitlines():
        if l.strip().startswith(k): print('D', l.strip()[:130]); break
src=inspect.getsource(T.Option)
for l in src.splitlines():
    if 'gravity' in l or 'timestep' in l: print('O', l.strip()[:130])
