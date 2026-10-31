"""Bend joint limit change (Nischay, 25 Oct 2026 20:55): B1..B4 +-95 deg -> +-90 deg. Twist +-180 and lock +-45 unchanged.
Edits every live MJCF in C:/TETROBOT/sim (backups -> sim/backup_bend95/), the CAD joint source mass_properties.json (so rebuilds keep it),
and prints what changed. Run once."""
from paths import tpath
import os, re, json, glob, shutil, math
SIM = tpath('sim'); BK = os.path.join(SIM, 'backup_bend95'); os.makedirs(BK, exist_ok=True)
NEW = 90.0
r95 = '%.4f' % math.radians(95); r90 = '%.4f' % math.radians(NEW)
for f in sorted(glob.glob(os.path.join(SIM, '*.xml'))):
    s = open(f, encoding='utf-8').read(); s0 = s
    s = re.sub(r'(<joint name="(?:m\d+_)?J_B[1-4]_bend" axis="[^"]+" range=")-95\.000 95\.000"', r'\g<1>-%.3f %.3f"' % (NEW, NEW), s)
    s = re.sub(r'(<position name="(?:m\d+_)?m_B[1-4]_bend"[^>]*ctrlrange=")-%s %s"' % (re.escape(r95), re.escape(r95)), r'\g<1>-%s %s"' % (r90, r90), s)
    if s != s0:
        shutil.copy2(f, os.path.join(BK, os.path.basename(f)))
        open(f, 'w', encoding='utf-8').write(s)
        print('%-28s joints %d, actuators %d' % (os.path.basename(f), len(re.findall(r'J_B[1-4]_bend" axis="[^"]+" range="-90', s)), len(re.findall(r'm_B[1-4]_bend"[^>]*ctrlrange="-%s' % re.escape(r90), s))))
src = os.path.join(os.path.expanduser('~'), 'Downloads', 'TETROBOT_Module_try8', 'mass_properties.json')
if os.path.exists(src):
    P = json.load(open(src)); shutil.copy2(src, os.path.join(BK, 'mass_properties.json'))
    for k, v in P['joints'].items():
        if '_bend' in k: v['lim_deg'] = [-NEW, NEW]
    json.dump(P, open(src, 'w'), indent=1); print('mass_properties.json bends ->', [P['joints'][k]['lim_deg'] for k in P['joints'] if '_bend' in k])
