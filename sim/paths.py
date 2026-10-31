"""Where the sim finds things. Everything lives in this project: code here, data in ../data.

tpath('sim/x') and tpath('deploy/x') are inside this folder. Anything else is under the project's data/
folder (TETROBOT_DATA can point elsewhere). What the software needs there is in git; new logs stay local.
"""
import os

SIM = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('TETROBOT_DATA', os.path.join(os.path.dirname(SIM), 'data'))
# Byte-identical to the copy the XML scenes were built from; assets/tetrobot-module/meshes has X and Y swapped.
MESHES = os.path.join(os.path.dirname(SIM), 'brain', 'meshes')


def tpath(rel: str = '') -> str:
    head, _, rest = rel.replace('\\', '/').partition('/')
    if head == 'sim': return os.path.join(SIM, *rest.split('/')) if rest else SIM
    if head == 'deploy': return os.path.join(SIM, 'deploy', *rest.split('/')) if rest else os.path.join(SIM, 'deploy')
    return os.path.join(DATA, *rel.replace('\\', '/').split('/')) if rel else DATA
