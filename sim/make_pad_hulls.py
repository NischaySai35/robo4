from paths import tpath

import numpy as np, struct, os, json, math
from scipy.spatial import ConvexHull
def load(fn):
    b=open(fn,'rb').read(); n=struct.unpack('<I',b[80:84])[0]
    a=np.frombuffer(b[84:84+n*50],dtype=np.dtype([('n','<f4',3),('v','<f4',(3,3)),('a','<u2')]))
    return a['v'].astype(float)
def sample(tri, n):
    A=0.5*np.linalg.norm(np.cross(tri[:,1]-tri[:,0], tri[:,2]-tri[:,0]),axis=1); p=A/A.sum()
    idx=np.random.default_rng(0).choice(len(tri), n, p=p); u=np.random.default_rng(1).random((n,2)); m=u.sum(1)>1; u[m]=1-u[m]
    t=tri[idx]; P=t[:,0]+u[:,:1]*(t[:,1]-t[:,0])+u[:,1:]*(t[:,2]-t[:,0])
    return np.vstack([P, tri.reshape(-1,3)])
D=__import__('paths').MESHES
# receiver in rx frame (mm): x+276.44, z+5.94, -y-0.65
R=sample(load(tpath('sim/floor_receiver.stl')), 600000); R=np.c_[R[:,0]+276.44, R[:,2]+5.94, -R[:,1]-0.65]
# End B in its local frame (mm): axis = local y
B=sample(load(os.path.join(D,'EndB_LockModule.stl')), 900000); B=np.c_[B[:,0]+69.808, B[:,1]-420.6, B[:,2]+261.465]
out={}
def piece(P, ang, lo, hi, axial, name, rmin=24.8, rmax=35.3, win=24.0):
    x, y = (P[:,0], P[:,2]) if axial==1 else (P[:,0], P[:,1])
    r=np.hypot(x,y); a=np.degrees(np.arctan2(y,x)); da=(a-ang+180)%360-180; h=P[:,axial]
    edges=np.linspace(-win, win, 7)
    for j in range(6):                      # 8 deg slices: inner/outer arcs stay true within 0.1 mm
        s=(r>rmin)&(r<rmax)&(da>=edges[j]-0.05)&(da<=edges[j+1]+0.05)&(h>lo)&(h<hi)
        Q=P[s]
        if len(Q)<20: continue
        try: hull=ConvexHull(Q)
        except Exception: continue
        out['%s_s%d'%(name,j)]=(Q[hull.vertices]/1000).round(6).tolist()
    s=(r>rmin)&(r<rmax)&(np.abs(da)<win)&(h>lo)&(h<hi); Q=P[s]; hull=ConvexHull(Q); V=Q[hull.vertices]
    rr=np.hypot(*(V[:,[0,2]].T if axial==1 else V[:,[0,1]].T)); aa=np.degrees(np.arctan2(*( (V[:,2],V[:,0]) if axial==1 else (V[:,1],V[:,0]))))
    print('%-14s pts %6d hullV %3d  h %.2f..%.2f  r %.2f..%.2f  ang %+.1f..%+.1f' % (name, len(Q), len(V), V[:,axial].min(), V[:,axial].max(), rr.min(), rr.max(), ((aa-ang+180)%360-180).min(), ((aa-ang+180)%360-180).max()))
for k,ang in enumerate([0,90,180,270]):
    piece(R, ang, 6.4, 8.95, 2, 'rx_pad%d_lo'%k); piece(R, ang, 9.1, 12.5, 2, 'rx_pad%d_po'%k); piece(R, ang, 12.65, 15.5, 2, 'rx_pad%d_lip'%k)
    piece(B, ang, 58.07, 60.5, 1, 'B_pad%d_lo'%k); piece(B, ang, 60.65, 64.2, 1, 'B_pad%d_po'%k); piece(B, ang, 64.35, 67.2, 1, 'B_pad%d_lip'%k)
# chamfer check: top face width vs base width of lip pieces
json.dump(out, open(tpath('sim/pad_hulls.json'),'w'))
print('saved', len(out))
