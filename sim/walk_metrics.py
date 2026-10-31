"""Read a GPU walking log: per-step free-end max height (standing-up check) and joint travel vs direct change (detour / weird-shape check)."""
import sys, re, numpy as np, collections
f = sys.argv[1]; txt = open(f, encoding='utf-8').read()
rx = re.compile(r'End (\w) docked at rx(\d): (OK|FAILED) \| gap ([-\d.]+) mm, side ([-\d.]+) mm, lock (\d+) deg, ([\d.]+) s, free end max height (\d+) mm, joint travel (\d+) deg vs direct (\d+) deg')
rows = [m.groups() for m in rx.finditer(txt)]
print('%d docks with metrics' % len(rows))
if not rows: sys.exit()
H = np.array([float(r[7]) for r in rows]); T = np.array([float(r[8]) for r in rows]); D = np.array([float(r[9]) for r in rows]); S = np.array([float(r[6]) for r in rows])
first = np.array([r[1] == '1' and r[0] == 'B' for r in rows])
for name, sel in (('first dock (from standing start)', first), ('walking steps (after a swing)', ~first)):
    if sel.sum() == 0: continue
    print('%s: n=%d' % (name, sel.sum()))
    print('   free-end max height mm: median %.0f, 90%% %.0f, max %.0f  (module standing straight = ~680)' % (np.median(H[sel]), np.percentile(H[sel], 90), H[sel].max()))
    print('   robots that went above 600 mm (stood up): %d' % (H[sel] > 600).sum())
    r = T[sel] / np.maximum(D[sel], 1)
    print('   joint travel / direct change: median %.1f, 90%% %.1f, max %.1f  (1 = straight in joint space; >3 = big detour)' % (np.median(r), np.percentile(r, 90), r.max()))
    print('   step time s: median %.1f, 90%% %.1f' % (np.median(S[sel]), np.percentile(S[sel], 90)))
fails = collections.Counter(re.sub(r'[\d.]+', '#', l.strip())[:70] for l in txt.splitlines() if 'timed out' in l or 'FAILED' in l or 'CRASH' in l)
print('failure kinds:'); [print('  %3d x %s' % (v, k)) for k, v in fails.most_common(8)]
