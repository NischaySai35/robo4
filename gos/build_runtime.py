"""G7: build gos/runtime_dist, a private Python with GOS inside, which the app installer carries so a machine with no Python can run `gos`.

usage: py -3.12 gos/build_runtime.py        (first: py -3.12 gos/build.py)
Downloads a pinned standalone Python for this computer, checks its checksum, installs the GOS wheel with its extras, writes the gos launcher,
and adds the physics service from git.
"""
import glob, hashlib, os, platform, shutil, subprocess, sys, tarfile, tempfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'runtime_dist')
RELEASE = '20261026'
VERSION = '3.12.16'
BASE = f'https://github.com/astral-sh/python-build-standalone/releases/download/{RELEASE}'
TARGETS = {
    ('Windows', 'AMD64'): 'x86_64-pc-windows-msvc',
    ('Linux', 'x86_64'): 'x86_64-unknown-linux-gnu',
    ('Darwin', 'arm64'): 'aarch64-apple-darwin',
    ('Darwin', 'x86_64'): 'x86_64-apple-darwin',
}


def fetch(url, path):
    print('download', url, flush=True)
    urllib.request.urlretrieve(url, path)


def main():
    key = (platform.system(), platform.machine())
    if key not in TARGETS:
        sys.exit(f'No standalone Python chosen for {key}. Add it to TARGETS in {__file__}.')
    name = f'cpython-{VERSION}+{RELEASE}-{TARGETS[key]}-install_only_stripped.tar.gz'
    work = tempfile.mkdtemp(prefix='gos_runtime_')
    try:
        archive = os.path.join(work, 'python.tar.gz'); sums = os.path.join(work, 'SHA256SUMS')
        fetch(f'{BASE}/{name.replace("+", "%2B")}', archive); fetch(f'{BASE}/SHA256SUMS', sums)
        want = next((l.split()[0] for l in open(sums) if l.split()[-1] == name), None)
        got = hashlib.sha256(open(archive, 'rb').read()).hexdigest()
        if want != got:
            sys.exit(f'Checksum of {name} does not match ({got} vs {want}). Nothing was installed.')
        shutil.rmtree(OUT, ignore_errors=True)
        with tarfile.open(archive) as t: t.extractall(work, filter='data')
        shutil.move(os.path.join(work, 'python'), OUT)
        py = os.path.join(OUT, 'python.exe') if os.name == 'nt' else os.path.join(OUT, 'bin', 'python3')
        wheels = os.path.join(work, 'wheels')
        subprocess.run([sys.executable, '-m', 'pip', 'wheel', os.path.join(HERE, 'python'), '--no-deps', '-q', '-w', wheels], check=True)
        shutil.rmtree(os.path.join(HERE, 'python', 'build'), ignore_errors=True)
        wheel = glob.glob(os.path.join(wheels, '*.whl'))[0]
        subprocess.run([py, '-m', 'pip', 'install', '-q', '--no-warn-script-location', f'{wheel}[ik,network,studio,record,sim]'], check=True)
        if os.name == 'nt':
            with open(os.path.join(OUT, 'gos.cmd'), 'w') as f: f.write('@"%~dp0python.exe" -m gos %*\r\n')
        else:
            launcher = os.path.join(OUT, 'gos')
            with open(launcher, 'w') as f: f.write('#!/bin/sh\nexec "$(dirname "$(readlink -f "$0")")/bin/python3" -m gos "$@"\n')
            os.chmod(launcher, 0o755)
        for d, subs, _ in os.walk(os.path.join(OUT, 'Lib' if os.name == 'nt' else 'lib')):
            for sub in [x for x in subs if x in ('tests', '__pycache__')]:
                shutil.rmtree(os.path.join(d, sub)); subs.remove(sub)
        # What the physics service needs. Only files in git: data/ also holds gigabytes of local logs.
        repo = os.path.dirname(HERE)
        tracked = subprocess.run(['git', 'ls-files', 'sim', 'brain/meshes', 'data'], cwd=repo, capture_output=True, text=True, check=True).stdout.splitlines()
        for rel in tracked:
            to = os.path.join(OUT, 'seed_data', rel[5:]) if rel.startswith('data/') else os.path.join(OUT, rel)
            if not os.path.exists(os.path.join(repo, rel)): continue
            os.makedirs(os.path.dirname(to), exist_ok=True); shutil.copy2(os.path.join(repo, rel), to)
        total = sum(os.path.getsize(os.path.join(d, x)) for d, _, fs in os.walk(OUT) for x in fs)
        print(f'runtime ready: {OUT}, {total / 1e6:.0f} MB')
    finally:
        shutil.rmtree(work, ignore_errors=True)


main()
