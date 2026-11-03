"""The sim's physics engine, through GOS's plug-in point (gos/python/gos/physics.py, RESTRUCTURING P10).

The sim's worlds (phys_world.PhysWorld, verify_service.Robot) build their robot in code and step it here, so the
engine is chosen in one place: TETROBOT_ENGINE (default mujoco). Their magnets, locks and servo model work on
MuJoCo's own model and data, so an engine without those says so instead of running something different.
Batches of robots on the GPU (gpu_world.py) stay on MuJoCo Warp directly, as decided 31 Oct 2026.
"""
# REUSE-CHECKED: engine|open_engine|plug-in -> gos.physics.open_engine is the plug-in point (reused, not copied);
# this only finds it from sim/ and hands it a robot built in code (MujocoEngine.adopt).
import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'gos', 'python'))
from gos.physics import GosError, open_engine


def world_engine(spec, model=None):
    """An engine running this MjSpec. Use .model and .data for MuJoCo's own arrays and .step() to advance."""
    name = os.environ.get('TETROBOT_ENGINE', 'mujoco')
    e = open_engine(name)
    if not hasattr(e, 'adopt'):
        raise GosError(f'The sim needs MuJoCo\'s own model and data (magnets, locks, servo model); the {name} engine has neither. Use TETROBOT_ENGINE=mujoco.')
    e.adopt(spec, model)
    return e
