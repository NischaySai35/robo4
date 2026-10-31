from paths import tpath

import mujoco, math, re
p=tpath('sim/build_v2.py')
s=open(p,encoding='utf-8').read()
s=s.replace("dict(name='base_lift', type='slide', axis='0 1 0', pos=pa, stiffness='30000', damping='60', range='-0.0001 0.0005', armature='0.01')",
 "dict(name='base_lift', type='slide', axis='0 1 0', pos=pa, stiffness=str(LIFT_K), springref=str(-LIFT_PRE), damping='60', range='0 0.0005', limited='true', solreflimit='0.002 1', armature='0.01')")
s=s.replace("stiffness='175'", "stiffness=str(TILT_K)")
if 'LIFT_K =' not in s: s=s.replace('import numpy as np','import numpy as np\nLIFT_K = 30000\nLIFT_PRE = 0.0003\nTILT_K = 175', 1)
open(p,'w',encoding='utf-8').write(s)
exec(compile(s.split('import mujoco\nfor fn')[0], 'b', 'exec'))
m=mujoco.MjModel.from_xml_path(tpath('sim/train_v2.xml'))
print('actuators',[m.actuator(i).name for i in range(m.nu)])
def test(b1, b2=0, sign=1):
    d=mujoco.MjData(m)
    for i in range(m.nu):
        n=m.actuator(i).name
        if 'B1' in n: d.ctrl[i]=math.radians(b1)*sign
        if 'B2' in n: d.ctrl[i]=math.radians(b2)*sign
    for _ in range(4000): mujoco.mj_step(m,d)
    ta=math.degrees(d.joint('base_tilt_a').qpos[0]); tb=math.degrees(d.joint('base_tilt_b').qpos[0]); L=d.joint('base_lift').qpos[0]*1000
    tq=[ (m.actuator(i).name, round(float(d.actuator_force[i]),2)) for i in range(m.nu) if 'B1' in m.actuator(i).name]
    return 'B1=%4d B2=%4d  tilt %.2f/%.2f deg  lift %.3f mm  %s'%(b1*sign,b2*sign,ta,tb,L,tq)
for a in [(0,0),(45,0),(90,0),(90,-90),(60,30)]:
    print(test(*a)); print(test(*a,sign=-1))
