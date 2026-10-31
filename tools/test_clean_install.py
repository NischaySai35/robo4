"""The plan's "done" test for GOS: a fresh Python, the GOS package installed with pip, a script that opens,
runs and closes a simulation with no window, plus the gos command.

usage: py -3.12 tools/test_clean_install.py          (needs the core built: py -3.12 gos/build.py)
"""
import os, shutil, subprocess, sys, tempfile, venv

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
work = tempfile.mkdtemp(prefix='gos_clean_')
try:
    wheels = os.path.join(work, 'wheels')
    subprocess.run([sys.executable, '-m', 'pip', 'wheel', os.path.join(ROOT, 'gos', 'python'), '--no-deps', '-q', '-w', wheels], check=True)
    for d in ('build',): shutil.rmtree(os.path.join(ROOT, 'gos', 'python', d), ignore_errors=True)
    env_dir = os.path.join(work, 'env')
    venv.create(env_dir, with_pip=True)
    py = os.path.join(env_dir, 'Scripts' if os.name == 'nt' else 'bin', 'python')
    gos_cmd = os.path.join(env_dir, 'Scripts' if os.name == 'nt' else 'bin', 'gos')
    wheel = os.path.join(wheels, os.listdir(wheels)[0])
    subprocess.run([py, '-m', 'pip', 'install', '-q', wheel], check=True)
    shutil.copy(os.path.join(ROOT, 'studio', 'src', 'core', 'factory', 'single-module-demo.json'), os.path.join(work, 'robot.json'))
    with open(os.path.join(work, 'demo.py'), 'w') as f:
        f.write("import gos\nwith gos.App(headless=True) as app:\n    app.load('robot.json')\n    r = app.run(seconds=0.2)\nprint('RAN', r.steps, app.model is None)\n")
    # Outside the repo, with no PYTHONPATH: only the installed package can answer.
    env = {k: v for k, v in os.environ.items() if k != 'PYTHONPATH'}
    out = subprocess.run([py, 'demo.py'], cwd=work, env=env, capture_output=True, text=True, timeout=120)
    assert out.returncode == 0 and 'RAN 100 True' in out.stdout, out.stdout + out.stderr
    out = subprocess.run([gos_cmd, 'sim', 'robot.json', '--seconds', '0.1'], cwd=work, env=env, capture_output=True, text=True, timeout=120)
    assert out.returncode == 0 and 'Ran 50 steps' in out.stdout, out.stdout + out.stderr
    print('clean install works: pip install, script with no window, gos command')
finally:
    shutil.rmtree(work, ignore_errors=True)
