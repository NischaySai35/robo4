"""v2_sim_check.py — MuJoCo hold test for every Studio v2 library shape.
   py -3.12 v2_sim_check.py SCENES.json RESULTS.json   (scenes from robo4 scripts/retag-v2-library.ts --scenes)"""
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from concurrent.futures import ProcessPoolExecutor
import verify_service as vs

def one(kv):
    k, s = kv
    try: return k, vs.check_static(s)
    except Exception as ex: return k, {'ok': False, 'drift_mm': -1, 'max_torque_pct': -1, 'reasons': [repr(ex)]}

if __name__ == '__main__':
    scenes = json.load(open(sys.argv[1]))
    with ProcessPoolExecutor() as ex: res = dict(ex.map(one, scenes.items()))
    for k, r in res.items(): print(f"{k:22s} {('PASS' + (' (fragile)' if r.get('fragile') else '')) if r['ok'] else 'FAIL'} sag {r.get('sag_mm')} mm sway {r.get('sway_mm')} mm touch {r.get('touch_mm')} mm drift {r['drift_mm']} mm torque {r['max_torque_pct']}% {r['reasons'][:1]}")
    json.dump(res, open(sys.argv[2], 'w'), indent=1)
