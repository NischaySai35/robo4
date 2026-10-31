"""The gos command, like ros2's: run scripts, look at what is running, and talk to it.

  gos run script.py              gos sim robot.json --seconds 1      gos graph show robot.json
  gos topic list|echo|pub|stats        gos service list|call               gos param list|get|set
  gos node list                  gos action list                     gos launch launch.json

Commands that look at running programs connect over Zenoh: --connect tcp/127.0.0.1:7447 (default), --domain N.
"""
import argparse, json, os, runpy, shutil, signal, subprocess, sys, threading, time

from . import App, GosError, __version__


def _live(a):
    return App(headless=True, transport='zenoh', connect=[a.connect], domain=a.domain, name=f'gos_cli_{os.getpid()}')


def _launch(path):
    """Start every program listed in a launch file, show their output with their names, stop them together."""
    with open(path, encoding='utf-8') as f:
        spec = json.load(f) if path.endswith('.json') else __import__('yaml').safe_load(f)
    procs = []
    base = os.path.dirname(os.path.abspath(path))
    if spec.get('compose'):
        # One process, one App, every part inside it (composition).
        from .compose import load_parts
        with App(headless=True, name=spec.get('name', 'container')) as app:
            load_parts(app, [os.path.join(base, x) for x in spec['compose']])
            try:
                while True: time.sleep(0.2)
            except KeyboardInterrupt:
                return 0
    for p in spec.get('processes', []):
        name = p.get('name') or os.path.basename(p['run'])
        cmd = [sys.executable, os.path.join(base, p['run']), *map(str, p.get('args', []))] if p['run'].endswith('.py') else [p['run'], *map(str, p.get('args', []))]
        env = dict(os.environ, **{k: str(v) for k, v in p.get('env', {}).items()})
        proc = subprocess.Popen(cmd, cwd=base, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        def pump(proc=proc, name=name):
            for line in proc.stdout: print(f'[{name}] {line}', end='', flush=True)
        threading.Thread(target=pump, daemon=True).start()
        procs.append((name, proc))
    code = 0
    try:
        while procs and all(p.poll() is None for _, p in procs if p): time.sleep(0.1)
        for name, p in procs:
            if p.poll() not in (None, 0):
                print(f'[launch] {name} stopped with code {p.returncode}: stopping the others.', flush=True); code = p.returncode
        if spec.get('stop_when_any_exits', True):
            for _, p in procs:
                if p.poll() is None: p.terminate()
        for _, p in procs: p.wait(10)
    except KeyboardInterrupt:
        for _, p in procs: p.terminate()
    return code


PKG = {
    'pyproject.toml': '[project]\nname = "{name}"\nversion = "0.1.0"\nrequires-python = ">=3.12"\ndependencies = ["tetrobot-gos"]\n\n[tool.setuptools]\npy-modules = ["{mod}"]\n',
    '{mod}.py': '"""{name}: a GOS part. start(app) is called once; return anything the tests want to see."""\n\n\ndef start(app):\n    log = app.logger("{name}")\n    app.topic("/{mod}/hello").subscribe(lambda m: log.info(f"got {{m}}"))\n    return log\n',
    'launch.json': '{{"compose": ["{mod}.py"], "name": "{mod}_container"}}\n',
    'test_{mod}.py': 'import os, sys\nsys.path.insert(0, os.path.dirname(__file__))\nimport gos, {mod}\n\n\ndef test_starts():\n    with gos.App() as app:\n        assert {mod}.start(app) is not None\n',
    'README.md': '# {name}\n\nRun: `gos launch launch.json`. Test: `py -3.12 -m pytest`.\n',
}


def _messages(a):
    """What `topic pub` sends: the JSON on the command line, or a JSON or YAML file holding one message or a list of them."""
    if not a.file: return [json.loads(a.data)] if a.data is not None else (_ for _ in ()).throw(GosError('Give the message as JSON, or --file with a JSON or YAML file.'))
    with open(a.file, encoding='utf-8') as f:
        if a.file.endswith('.json'): m = json.load(f)
        else:
            try: import yaml
            except ImportError: raise GosError('Reading YAML needs PyYAML: pip install pyyaml, or use a .json file.')
            m = yaml.safe_load(f)
    return m if isinstance(m, list) else [m]


def path_entry(current, folder, add):
    """The PATH text with this folder added or removed. Other entries are kept exactly as they were."""
    sep = os.pathsep
    parts = [p for p in (current or '').split(sep) if p]
    same = lambda p: os.path.normcase(os.path.normpath(p)) == os.path.normcase(os.path.normpath(folder))
    kept = [p for p in parts if not same(p)]
    return sep.join(kept + [folder] if add else kept)


def _set_path(add):
    """Let `gos` be typed in any new terminal, for this user only. `gos path remove` undoes it."""
    folder = os.path.dirname(os.path.abspath(sys.executable))
    if os.path.basename(folder).lower() == 'bin': folder = os.path.dirname(folder)
    launcher = os.path.join(folder, 'gos.cmd' if os.name == 'nt' else 'gos')
    if not os.path.exists(launcher):
        raise GosError(f'Only the app\'s own GOS needs this; no launcher at {launcher}. After pip install, gos is already in that Python\'s Scripts folder.')
    if os.name == 'nt':
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment', 0, winreg.KEY_READ | winreg.KEY_WRITE) as k:
            try: cur, kind = winreg.QueryValueEx(k, 'Path')
            except FileNotFoundError: cur, kind = '', winreg.REG_EXPAND_SZ
            winreg.SetValueEx(k, 'Path', 0, kind, path_entry(cur, folder, add))
    else:
        link = os.path.expanduser('~/.local/bin/gos')
        if add:
            os.makedirs(os.path.dirname(link), exist_ok=True)
            if os.path.lexists(link): os.remove(link)
            os.symlink(launcher, link)
        elif os.path.islink(link): os.remove(link)
    print(f'{"Added" if add else "Removed"} {folder}. Open a new terminal for it to take effect.')
    return 0


def _new_package(name):
    """A new package folder with a part, a launch file and a test: GOS's small version of `ros2 pkg create`."""
    mod = name.replace('-', '_')
    if os.path.exists(name): raise GosError(f'{name} already exists: pick another name or delete it.')
    os.makedirs(name)
    for fn, text in PKG.items():
        with open(os.path.join(name, fn.format(mod=mod)), 'w', encoding='utf-8') as f: f.write(text.format(name=name, mod=mod))
    print(f'Made {name}/: {", ".join(f.format(mod=mod) for f in PKG)}')
    return 0


def _plugins():
    """Commands other packages add: an entry point in the group "gos.commands" (name = command, value = function(argv) -> exit code)."""
    from importlib.metadata import entry_points
    return {e.name: e for e in entry_points(group='gos.commands')}


def _external(name, argv):
    """`gos NAME ...` runs a plugin, or a program called gos-NAME on PATH, as git does. None when there is neither."""
    plug = _plugins().get(name)
    if plug: return plug.load()(argv) or 0
    exe = shutil.which(f'gos-{name}')
    if exe: return subprocess.run([exe, *argv]).returncode
    return None


def _write_docs(out):
    """HTML pages for every GOS module, plus an index, from the code's own docs."""
    import pkgutil, pydoc, gos
    os.makedirs(out, exist_ok=True)
    names = ['gos'] + [f'gos.{m.name}' for m in pkgutil.iter_modules(gos.__path__) if not m.name.startswith('_')]
    here = os.getcwd(); os.chdir(out)
    try:
        for n in names: pydoc.writedoc(n)
    finally:
        os.chdir(here)
    with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as f:
        f.write('<!doctype html><meta charset="utf-8"><title>GOS docs</title><h1>GOS</h1><ul>' + ''.join(f'<li><a href="{n}.html">{n}</a>' for n in names) + '</ul>')
    print(f'Wrote {len(names)} pages to {out}. Open index.html.')
    return 0


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    builtin = {'certs', 'interfaces', 'run', 'graph', 'sim', 'topic', 'service', 'param', 'node', 'action', 'launch', 'pkg', 'path', 'doc', 'plugins'}
    first = next((x for x in argv if not x.startswith('-')), None)
    if first and first not in builtin and argv[0] == first:
        code = _external(first, argv[1:])
        if code is not None: return code
    p = argparse.ArgumentParser(prog='gos', description='GOS: the graph engine under TETROBOT.')
    p.add_argument('--version', action='version', version=f'gos {__version__}')
    p.add_argument('--connect', default='tcp/127.0.0.1:7447', help='where running GOS programs listen')
    p.add_argument('--domain', type=int, default=0)
    s = p.add_subparsers(dest='cmd', required=True)
    r = s.add_parser('run', help='run a Python script against GOS'); r.add_argument('script'); r.add_argument('args', nargs='*')
    g = s.add_parser('graph', help='look at a robot graph'); g.add_argument('action', choices=['show']); g.add_argument('file')
    sim = s.add_parser('sim', help='run a robot with no window'); sim.add_argument('file'); sim.add_argument('--seconds', type=float, default=1.0); sim.add_argument('--engine', default='mujoco', help='physics engine')
    t = s.add_parser('topic', help='live topics'); t.add_argument('action', choices=['list', 'echo', 'pub', 'stats']); t.add_argument('name', nargs='?'); t.add_argument('data', nargs='?'); t.add_argument('--count', type=int, default=0); t.add_argument('--file', help='pub: messages from a JSON or YAML file'); t.add_argument('--seconds', type=float, default=2.0, help='stats: how long to measure')
    sv = s.add_parser('service', help='live services'); sv.add_argument('action', choices=['list', 'call']); sv.add_argument('name', nargs='?'); sv.add_argument('data', nargs='?', default='null')
    pa = s.add_parser('param', help="another program's parameters"); pa.add_argument('action', choices=['list', 'get', 'set']); pa.add_argument('node'); pa.add_argument('name', nargs='?'); pa.add_argument('value', nargs='?')
    s.add_parser('node', help='running programs').add_argument('action', choices=['list'])
    s.add_parser('action', help='live actions').add_argument('action', choices=['list'])
    la = s.add_parser('launch', help='start several programs together'); la.add_argument('file')
    pk = s.add_parser('pkg', help='make a new GOS package'); pk.add_argument('action', choices=['new']); pk.add_argument('name')
    s.add_parser('path', help='let gos be typed in any terminal').add_argument('action', choices=['add', 'remove'])
    d = s.add_parser('doc', help='how to use GOS, from its own code'); d.add_argument('topic', nargs='?', default='gos'); d.add_argument('--html', metavar='DIR', help='write HTML pages for every module')
    it = s.add_parser('interfaces', help='message types: list them, or write TypeScript for the Studio'); it.add_argument('action', choices=['list', 'ts']); it.add_argument('out', nargs='?'); it.add_argument('--from', dest='folders', action='append', default=[], help='also load this folder')
    ce = s.add_parser('certs', help='certificates for encrypted links'); ce.add_argument('action', choices=['new']); ce.add_argument('folder'); ce.add_argument('names', nargs='+'); ce.add_argument('--host', action='append', help='address the programs use (default localhost and 127.0.0.1)')
    s.add_parser('plugins', help='commands added by other packages or gos-NAME programs')
    a = p.parse_args(argv)
    need = lambda x, what: x if x is not None else (_ for _ in ()).throw(GosError(f'Give the {what}.'))
    try:
        if a.cmd == 'run':
            sys.argv = [a.script, *a.args]
            runpy.run_path(a.script, run_name='__main__')
        elif a.cmd == 'graph':
            with App(headless=True) as app:
                app.load(a.file); print(json.dumps(app.graph(), indent=2))
        elif a.cmd == 'sim':
            with App(headless=True, engine=a.engine) as app:
                app.load(a.file); print(app.run(seconds=a.seconds).message)
        elif a.cmd == 'launch':
            return _launch(a.file)
        elif a.cmd == 'path':
            return _set_path(a.action == 'add')
        elif a.cmd == 'pkg':
            return _new_package(a.name)
        elif a.cmd == 'doc' and a.html:
            return _write_docs(a.html)
        elif a.cmd == 'certs':
            from . import certs
            certs.new(a.folder, a.names, *( [a.host] if a.host else []))
            print(f'Made {", ".join(a.names)} in {a.folder}. Give each program ca.pem and its own NAME.pem and NAME.key; keep ca.key private.')
        elif a.cmd == 'interfaces':
            from . import interfaces
            t = interfaces.load(*a.folders)
            if a.action == 'list': print('\n'.join(f'{n}: {", ".join(map(repr, f))}' for n, f in sorted(t.types.items())))
            else:
                with open(need(a.out, 'output file, e.g. studio/src/runtime/gosTypes.generated.ts'), 'w', encoding='utf-8', newline='\n') as f: f.write(t.to_ts())
                print(f'Wrote {len(t.types)} types to {a.out}.')
        elif a.cmd == 'plugins':
            print('\n'.join(f'{n}  ({e.value})' for n, e in sorted(_plugins().items())) or 'No plugin commands installed. Add one with an entry point in "gos.commands", or put a gos-NAME program on PATH.')
        elif a.cmd == 'doc':
            import pydoc
            print(pydoc.render_doc(a.topic, renderer=pydoc.plaintext))
        else:
            with _live(a) as app:
                if a.cmd in ('node', 'action'):
                    print('\n'.join(app.bus.discover(a.cmd)) or f'(no {a.cmd}s found: is anything running and connected to {a.connect}?)')
                elif a.cmd == 'topic' and a.action == 'list':
                    print('\n'.join(t for t in app.bus.discover('topic') if '/_' not in t) or f'(no topics found at {a.connect})')
                elif a.cmd == 'topic' and a.action == 'pub':
                    time.sleep(0.5)
                    msgs = _messages(a)
                    for _ in range(max(1, a.count)):
                        for m in msgs: app.topic(need(a.name, 'topic name')).publish(m); time.sleep(0.05)
                elif a.cmd == 'topic' and a.action == 'stats':
                    times, sizes = [], []
                    app.topic(need(a.name, 'topic name')).subscribe(lambda m: (times.append(time.monotonic()), sizes.append(len(json.dumps(m)))))
                    time.sleep(a.seconds)
                    if not times: raise GosError(f'No messages on {a.name} in {a.seconds:g} s. See what is live with: gos topic list')
                    span = times[-1] - times[0]
                    print(json.dumps({'messages': len(times), 'per_second': round((len(times) - 1) / span, 1) if span else None, 'average_bytes': round(sum(sizes) / len(sizes)), 'biggest_bytes': max(sizes)}))
                elif a.cmd == 'topic':
                    seen = [0]
                    def show(m):
                        print(json.dumps(m)[:400], flush=True); seen[0] += 1
                    app.topic(need(a.name, 'topic name')).subscribe(show)
                    while not a.count or seen[0] < a.count: time.sleep(0.05)
                elif a.cmd == 'service' and a.action == 'list':
                    print('\n'.join(x for x in app.bus.discover('service') if '/_' not in x) or f'(no services found at {a.connect})')
                elif a.cmd == 'service':
                    print(json.dumps(app.services.call(need(a.name, 'service name'), json.loads(a.data))))
                elif a.cmd == 'param':
                    rp = app.remote_params(a.node)
                    if a.action == 'list': print(json.dumps(rp.list(), indent=2))
                    elif a.action == 'get': print(json.dumps(rp.get(need(a.name, 'parameter name'))))
                    else: rp.set(need(a.name, 'parameter name'), json.loads(need(a.value, 'value as JSON'))); print('set')
    except (GosError, ValueError, OSError, LookupError, RuntimeError, TypeError, KeyError) as e:
        print(f'gos: {e}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
