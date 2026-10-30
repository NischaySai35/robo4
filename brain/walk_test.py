
import os, sys, math, numpy as np, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from walk import Walker
from walk_env import WalkEnv
log=open(r'D:\\robo4\\brain\\logs\\walk_test_%s.log' % os.environ['TAG'],'w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s, flush=True); log.write(s+'\n'); log.flush()
rand = os.environ['TAG'] != 'nominal'
for trial in range(int(os.environ.get('N','1'))):
    XML=os.environ.get('XML', r'D:\robo4\brain\walk_train.xml')
    e=WalkEnv(seed=int(os.environ.get('S0','100'))+trial, randomize=rand, xml=XML); e.reset(base='A', base_rx=0, yaw_deg=45)
    g=e.m.opt.gravity.copy(); t0=time.time()
    W=Walker(e, 'A', 0, 0, g, log=P); W.debug = os.environ.get('DBG','0')=='1'
    if os.environ.get('JUDGE','0')=='1': W.judge_fn = W.sim_camera
    W.curl = os.environ.get('CURL','1')=='1'
    P('walk %d: start End A locked in rx0' % trial)
    ok=True
    for j in range(1, len(e.rx)):
        if not W.step_to(j): ok=False; break
        P('    after step %d: twist T1/T2/T3 now %s deg' % (j, list(np.round(np.degrees(W.last_cmd[[0,3,6]])).astype(int))))
    P('walk %d: %s | sim time %.1f s, wall %.0f s | max twist T1/T2/T3 %s deg (limit 176)' % (trial, 'ALL 3 STEPS OK' if ok else 'FAILED', e.t*0.06, time.time()-t0, list(np.round(getattr(W, 'twmax', np.zeros(3))).astype(int))))
    try:
        import json
        for _ in range(5):
            try:
                J=json.load(open(r'D:\\robo4\\brain\\status.json',encoding='utf-8')); J['notes'].insert(0,{'t':time.strftime('%H:%M'),'msg':'WALK TEST (%s, robot %d): %s' % (os.environ['TAG'], 100+trial, 'all 3 steps OK' if ok else 'failed - see logs/walk_test_%s.log' % os.environ['TAG'])}); json.dump(J,open(r'D:\\robo4\\brain\\status.json','w',encoding='utf-8'),indent=1); break
            except Exception: time.sleep(0.2)
    except Exception: pass
P('DONE')
