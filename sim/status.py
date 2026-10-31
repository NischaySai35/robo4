from paths import tpath
import json, os, time
F = tpath('status.json')
def _load():
    return json.load(open(F, encoding='utf-8-sig'))
def _save(d):
    d['updated'] = time.strftime('%Y-%m-%dT%H:%M:%S')
    tmp = F + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh: json.dump(d, fh, indent=1)
    for _ in range(10):
        try: os.replace(tmp, F); break
        except PermissionError: time.sleep(0.05)
def stage(sid, state, detail=None):
    d = _load()
    for s in d['stages']:
        if s['id'] == sid:
            s['state'] = state
            if state == 'running': s['started'] = time.strftime('%Y-%m-%dT%H:%M:%S')
            if state in ('done', 'failed'): s['ended'] = time.strftime('%Y-%m-%dT%H:%M:%S')
            if detail is not None: s['detail'] = detail
    _save(d)
def note(msg):
    d = _load()
    d['notes'] = [{'t': time.strftime('%H:%M'), 'msg': msg}] + d.get('notes', [])
    _save(d)
def set_log(path):
    d = _load(); d['log'] = path; _save(d)
def log(msg, f=tpath('logs/sim.log')):
    line = '[%s] %s' % (time.strftime('%H:%M:%S'), msg)
    print(line)
    open(f, 'a', encoding='utf-8').write(line + '\n')
