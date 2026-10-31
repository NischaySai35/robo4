from paths import tpath

import mujoco, numpy as np, math
m=mujoco.MjModel.from_xml_path(tpath('sim/scene_v2.xml')); d=mujoco.MjData(m); mujoco.mj_forward(m,d)
b=m.body('EndB_LockModule').id; R=d.xmat[b].reshape(3,3); o=d.xpos[b]
print('EndB origin world',o*1000,'\nEndB R',np.round(R,3))
for s in ['B_padtip','B_gapfloor','B_rotorface']: print(s, np.round((R.T@(d.site(s).xpos-o))*1000,2))
for k in range(8): print('B_mag%d'%k, np.round((R.T@(d.site('B_mag%d'%k).xpos-o))*1000,2))
# compare B pad boxes with the EndB mesh vertices near pad tip
g=[i for i in range(m.ngeom) if m.geom_bodyid[i]==b and m.geom_type[i]==mujoco.mjtGeom.mjGEOM_MESH]
for gi in g:
    mid=m.geom_dataid[gi]; va=m.mesh_vertadr[mid]; vn=m.mesh_vertnum[mid]; V=m.mesh_vert[va:va+vn]
    gR=d.geom_xmat[gi].reshape(3,3); W=(gR@V.T).T+d.geom_xpos[gi]; L=(R.T@(W-o).T).T*1000
    print(m.geom(gi).name,'local bounds min',np.round(L.min(0),2),'max',np.round(L.max(0),2))
    tip=L[L[:,1]>L[:,1].max()-0.3]; r=np.hypot(tip[:,0],tip[:,2]); a=np.degrees(np.arctan2(tip[:,2],tip[:,0]))
    print('  tip-plane verts r %.1f..%.1f  angles sample'%(r.min(),r.max()), np.unique(np.round(a/5)*5)[:40])
t=m.body('target_rx').id
for gi in range(m.ngeom):
    if m.geom(gi).name=='rx_visual':
        mid=m.geom_dataid[gi]; va=m.mesh_vertadr[mid]; vn=m.mesh_vertnum[mid]; V=m.mesh_vert[va:va+vn]
        gR=d.geom_xmat[gi].reshape(3,3); W=(gR@V.T).T+d.geom_xpos[gi]; Rt=d.xmat[t].reshape(3,3); L=(Rt.T@(W-d.xpos[t]).T).T*1000
        print('rx mesh in rx frame min',np.round(L.min(0),2),'max',np.round(L.max(0),2))
        top=L[L[:,2]>15.0]; print('  top verts angles', np.unique(np.round(np.degrees(np.arctan2(top[:,1],top[:,0]))/5)*5))
