from paths import tpath

import mujoco, numpy as np, math
m=mujoco.MjModel.from_xml_path(tpath('sim/scene_v2.xml')); d=mujoco.MjData(m)
d.mocap_pos[0]=[3,3,2]; d.mocap_quat[0]=[1,0,0,0]; mujoco.mj_forward(m,d)
g=m.geom('rx_visual').id; o=np.array([3,3,2.0]); gid=np.zeros(1,np.int32)
def ray(z, th):
    # from the centre outward at height z (mm) and angle th (deg, rx frame): radius of first wall
    p=o+np.array([0,0,z/1000]); v=np.array([math.cos(math.radians(th)), math.sin(math.radians(th)), 0])
    dist=mujoco.mj_ray(m,d,p,v,None,1,-1,gid)
    return round(dist*1000,2) if gid[0]==g else None
def rayin(z, th, r0=60):
    v=np.array([math.cos(math.radians(th)), math.sin(math.radians(th)), 0]); p=o+np.array([0,0,z/1000])+v*r0/1000
    dist=mujoco.mj_ray(m,d,p,-v,None,1,-1,gid)
    return round(r0-dist*1000,2) if gid[0]==g else None
print('rx frame: pads at 0/90/180/270 deg, gaps at 45...')
for th in [0, 10, 18, 30, 45]:
    print('angle %3d:'%th, ' '.join('z%.1f:in%s/out%s'%(z, ray(z,th), rayin(z,th)) for z in [1,3,5,6.0,7,8,9,9.8,10.5,11.2,12,12.6,13.5,14.5,15.1]))
