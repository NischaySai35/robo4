"""The gos command: gos run script.py | gos graph show robot.json | gos check | gos topic echo /joints"""
import argparse, json, runpy, sys, time

from . import App, GosError, __version__, compile_graph


def main(argv=None):
    p = argparse.ArgumentParser(prog='gos', description='GOS: the graph engine under TETROBOT.')
    p.add_argument('--version', action='version', version=f'gos {__version__}')
    s = p.add_subparsers(dest='cmd', required=True)
    r = s.add_parser('run', help='run a Python script against GOS'); r.add_argument('script'); r.add_argument('args', nargs='*')
    g = s.add_parser('graph', help='look at a robot graph'); g.add_argument('action', choices=['show']); g.add_argument('file')
    t = s.add_parser('topic', help='watch a live topic over Zenoh'); t.add_argument('action', choices=['echo']); t.add_argument('name'); t.add_argument('--count', type=int, default=0); t.add_argument('--connect', default=None)
    sim = s.add_parser('sim', help='run a robot with no window'); sim.add_argument('file'); sim.add_argument('--seconds', type=float, default=1.0)
    a = p.parse_args(argv)
    try:
        if a.cmd == 'run':
            sys.argv = [a.script, *a.args]
            runpy.run_path(a.script, run_name='__main__')
        elif a.cmd == 'graph':
            with App(headless=True) as app:
                app.load(a.file)
                print(json.dumps(app.graph(), indent=2))
        elif a.cmd == 'sim':
            with App(headless=True) as app:
                app.load(a.file)
                print(app.run(seconds=a.seconds).message)
        elif a.cmd == 'topic':
            with App(headless=True, transport='zenoh', connect=[a.connect] if a.connect else None) as app:
                seen = [0]
                def show(m):
                    print(json.dumps(m)[:400], flush=True); seen[0] += 1
                app.topic(a.name).subscribe(show)
                while not a.count or seen[0] < a.count: time.sleep(0.05)
    except (GosError, ValueError, OSError) as e:
        print(f'gos: {e}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
