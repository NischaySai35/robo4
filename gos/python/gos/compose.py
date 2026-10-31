"""Composition, like ROS's component containers: several parts in one program, sharing one App, so their
messages pass in memory with no copying. A part is a Python file with a start(app) function.
"""
import importlib.util, os


def load_parts(app, paths):
    parts = []
    for p in paths:
        spec = importlib.util.spec_from_file_location(os.path.splitext(os.path.basename(p))[0], p)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if not hasattr(mod, 'start'):
            raise AttributeError(f'{p} has no start(app) function, so it can\'t be composed.')
        parts.append(mod.start(app))
    return parts
