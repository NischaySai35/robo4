"""Self-test of brain_server.py over HTTP, exactly like the Studio Walk tab talks to it.
  python test_brain_server.py sim    full walk against the MuJoCo robot (auto judge)
  python test_brain_server.py real   'real' mode code path with a fake board that echoes every command back and a judge that says yes"""
import sys, json, time, urllib.request
B = 'http://127.0.0.1:8770'
def call(path, body=None):
    req = urllib.request.Request(B + path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'}, method='GET' if body is None else 'POST')
    return json.loads(urllib.request.urlopen(req, timeout=120).read())
mode = sys.argv[1] if len(sys.argv) > 1 else 'sim'
print(call('/api/health')); cfg = call('/api/config'); print('servo map', cfg['servo_id'])
r = call('/api/start', dict(mode=mode, receivers=[[0, 0, 0], [250, 0, 0], [500, 0, 0]], seed=3300, judge='auto'))
for l in r['logs']: print('  ', l)
board = {str(i): 180.0 for i in cfg['servo_id'].values()}          # fake board: all servos at 180 (straight)
t0 = time.time(); n = 0; questions = 0
while True:
    r = call('/api/tick', dict(servos=board)); n += 1
    for l in r['logs']: print('  ', l)
    if not r['ok']: print('ERROR', r['error']); break
    if r['question']:
        questions += 1; ans = '' if r['question']['stage'] == 'hover' else 'y'
        print('   QUESTION [%s] -> answering "%s"' % (r['question']['stage'], ans)); call('/api/answer', dict(text=ans)); continue
    if r['cmd'] and mode == 'real': board = {str(k): v for k, v in r['cmd'].items()}   # perfect servos: reach the target at once
    if r['done']: break
    if n > 6000: print('too many ticks'); break
print('RESULT: %s | %d ticks (%.0f s robot time) in %.0f s wall, %d judge questions' % ('WALK COMPLETE' if r['result'] else 'FAILED', n, n * 0.06, time.time() - t0, questions))
