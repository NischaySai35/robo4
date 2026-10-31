"""GOS: the graph engine under TETROBOT, usable from a script with no window.

    import gos
    with gos.App(headless=True) as app:
        robot = app.load('robot.json')
        app.topic('/joints').subscribe(print)
        app.run(seconds=1)

Every result says whether it worked and why not. See docs/design/gos-g0-contract.md.
"""
from .app import App, GosError, Result
from .execution import Rate
from .transport import LocalTransport, ZenohTransport, open_transport
from ._core import compile_graph, export_mjcf, tf_query, solve_ik

__version__ = '0.1.0'
__all__ = ['Rate', 'App', 'GosError', 'Result', 'LocalTransport', 'ZenohTransport', 'open_transport', 'compile_graph', 'export_mjcf', 'tf_query', 'solve_ik']
