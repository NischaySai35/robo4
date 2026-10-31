from paths import tpath

import numpy as np, struct, math, os, mujoco
def load(fn):
    b=open(fn,'rb').read(); n=struct.unpack('<I',b[80:84])[0]
    a=np.frombuffer(b[84:84+n*50],dtype=np.dtype([('n','<f4',3),('v','<f4',(3,3)),('a','<u2')]))
    return a['v'].reshape(-1,3).astype(float)
# build a tiny MuJoCo model with the rotor mesh and ray-probe it (exact, not vertex-based)
for tag, fn in [('OLD', os.path.join(__import__('paths').MESHES, 'L2_LockRotor_B.stl')), ('NEW', tpath('sim/L2_LockRotor_B_new.stl'))]:
    xml='<mujoco><compiler meshdir=""/><asset><mesh name="r" file="%s" scale="0.001 0.001 0.001" inertia="shell"/></asset><worldbody><geom type="mesh" mesh="r" contype="0" conaffinity="0"/></worldbody></mujoco>'%fn.replace('\\','/')
    m=mujoco.MjModel.from_xml_string(xml); d=mujoco.MjData(m); mujoco.mj_forward(m,d)
    # NOTE mesh geoms are convex for collision but mj_ray uses the actual mesh triangles
    gp=d.geom_xpos[0]; gR=d.geom_xmat[0].reshape(3,3); gid=np.zeros(1,np.int32)
    def hitz(r, th, ystart, dirn):
        # ray along -/+ axis (module y) at radius r and angle th (deg), from ystart (mm)
        P=np.array([(-69.808+r*math.cos(math.radians(th)))/1000, ystart/1000, (-261.465+r*math.sin(math.radians(th)))/1000])
        v=np.array([0, dirn, 0.0]); dist=mujoco.mj_ray(m,d,P,v,None,1,-1,gid)
        return None if dist<0 else ystart+dirn*dist*1000
    print(tag)
    for th in [0, 10, 15, 18, 20, 22, 30, 45]:
        row=[]
        for r in [5, 15, 20, 22, 24, 25.5, 26.5, 27.5, 28.3]:
            top=hitz(r,th,500,-1); bot=hitz(r,th,460,1)
            row.append('r%.1f:%s'%(r, '-' if top is None else '%.2f..%.2f'%(bot,top)))
        print('  th %2d '%th, ' '.join(row))
