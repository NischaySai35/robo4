from paths import tpath

import mujoco, numpy as np, math
m=mujoco.MjModel.from_xml_path(tpath('sim/scene_v2.xml')); d=mujoco.MjData(m)
d.mocap_pos[0]=[3,3,2]; d.mocap_quat[0]=[1,0,0,0]; mujoco.mj_forward(m,d)
gid=np.zeros(1,np.int32)
def first(p,v,g):
    # step along until we hit geom g (skip other geoms)
    t=0
    for _ in range(6):
        dist=mujoco.mj_ray(m,d,p+v*t,v,None,1,-1,gid)
        if dist<0: return None
        if gid[0]==g: return t+dist
        t+=dist+1e-5
    return None
g=m.geom('rx_visual').id; o=np.array([3,3,2.0])
print('RECEIVER inner wall radius vs height (pad angle 10 deg):')
print(' '.join('%.1f:%s'%(z, None if (r:=first(o+[0,0,z/1000],np.array([math.cos(.1745),math.sin(.1745),0]),g)) is None else round(r*1000,1)) for z in np.arange(7.6,13.4,0.2)))
# End B: its own frame, pads at 0/90.., axis = local y, pad tip at y=66.97
b=m.body('EndB_LockModule').id; R=d.xmat[b].reshape(3,3); ob=d.xpos[b]
gs=[i for i in range(m.ngeom) if m.geom_bodyid[i]==b and m.geom_type[i]==mujoco.mjtGeom.mjGEOM_MESH]
print('END B mesh geoms', [m.geom(i).name for i in gs])
for gg in gs:
    out=[]
    for h in np.arange(1.0,8.2,0.4):
        y=66.97-h; a=math.radians(10); v=R@np.array([math.cos(a),0,math.sin(a)]); p=ob+R@np.array([0,y/1000,0])
        r=first(p,v,gg); out.append('%.1f:%s'%(h, None if r is None else round(r*1000,1)))
    print('depth behind B pad tip -> inner wall r:', ' '.join(out))
