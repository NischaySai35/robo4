"""Where the sim finds things. Code lives in the repo; big generated data (logs, lessons, runs) stays outside git.

tpath('sim/x') and tpath('deploy/x') are inside this folder. Anything else is under TETROBOT_DATA,
which defaults to C:\\TETROBOT, so existing logs and trained brains keep working on this PC.
"""
import os

SIM = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('TETROBOT_DATA', r'C:\TETROBOT')
# Byte-identical to the copy the XML scenes were built from; assets/tetrobot-module/meshes has X and Y swapped.
MESHES = os.path.join(os.path.dirname(SIM), 'brain', 'meshes')


def tpath(rel: str = '') -> str:
    head, _, rest = rel.replace('\\', '/').partition('/')
    if head == 'sim': return os.path.join(SIM, *rest.split('/')) if rest else SIM
    if head == 'deploy': return os.path.join(SIM, 'deploy', *rest.split('/')) if rest else os.path.join(SIM, 'deploy')
    return os.path.join(DATA, *rel.replace('\\', '/').split('/')) if rel else DATA
