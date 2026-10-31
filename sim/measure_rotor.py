from paths import tpath

import numpy as np, struct, math, os
def load(fn):
    b=open(fn,'rb').read(); n=struct.unpack('<I',b[80:84])[0]
    a=np.frombuffer(b[84:84+n*50],dtype=np.dtype([('n','<f4',3),('v','<f4',(3,3)),('a','<u2')]))
    return a['v'].reshape(-1,3).astype(float)
def info(fn, unit):
    V=load(fn)*unit
    x=V[:,0]+69.808; z=V[:,2]+261.465; y=V[:,1]; r=np.hypot(x,z); a=np.degrees(np.arctan2(z,x))
    print(os.path.basename(fn), 'y %.2f..%.2f'%(y.min(),y.max()), 'r max %.2f'%r.max())
    for lo,hi in [(0,15),(15,21),(21,26),(26,30)]:
        s=(r>=lo)&(r<hi)
        if s.any(): print('   r %d-%d: y %.2f..%.2f  angles near 0: %s'%(lo,hi,y[s].min(),y[s].max(), np.round(np.sort(np.unique(np.round(a[s&(np.abs(a)<45)],1)))[[0,-1]],1) if (s&(np.abs(a)<45)).any() else '-'))
    # fin outer arc
    s=r>r.max()-0.3; print('   outer arc angles', np.round([a[s&(np.abs(a)<45)].min(), a[s&(np.abs(a)<45)].max()],2), 'y', round(y[s].min(),2), round(y[s].max(),2))
D=__import__('paths').MESHES
print(os.listdir(D))
for f in ['L2_LockRotor_B','L1_LockRotor_A']:
    print('--- OLD'); info(os.path.join(D,f+'.stl'),1.0)
    print('--- NEW'); info(tpath('sim/%s_new.stl')%f,10.0)
