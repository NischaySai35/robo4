"""Summarise walk test logs: python walk_stats.py PREFIX  (e.g. curl_)"""
from paths import tpath
import sys, glob, re, os, statistics
pref = sys.argv[1]
docks_ok = docks_fail = walks = walks3 = 0; times = []; pulls = []
for p in sorted(glob.glob(tpath('logs/walk_test_%s*.log') % pref)):
    cur = None
    for l in open(p, encoding='utf-8', errors='ignore'):
        if re.match(r'walk \d+: start', l):
            if cur is not None: walks += 1; walks3 += cur >= 3
            cur = 0
        m = re.search(r'docked at rx\d: OK .* ([\d.]+) s', l)
        if m: docks_ok += 1; cur = (cur or 0) + 1; times.append(float(m.group(1)))
        if re.search(r'docked at rx\d: FAILED|timed out|CRASH', l): docks_fail += 1
        m = re.search(r'pulled out .* now ([\d.]+) mm', l)
        if m: pulls.append(float(m.group(1)))
    if cur is not None and any('walk' in x and ('ALL' in x or 'FAILED' in x) for x in open(p, encoding='utf-8', errors='ignore').read().splitlines()[-3:]):
        walks += 1; walks3 += cur >= 3
print('docks OK %d / %d (%.0f%%) | walks with all 3 docks OK: %d / %d | median dock time %.1f s | pull-out min %.1f mm, median %.1f mm' % (
    docks_ok, docks_ok + docks_fail, 100 * docks_ok / max(1, docks_ok + docks_fail), walks3, walks, statistics.median(times) if times else 0, min(pulls) if pulls else 0, statistics.median(pulls) if pulls else 0))
