"""Open TETROBOT as a 3D view and animate the real module from Python, with no editing window.

usage: py -3.12 gos/python/examples/view_demo.py      (needs the installed app, or TETROBOT_APP=path\\to\\app.exe)
"""
import json, math, os, time
import gos
from gos.studio import view

doc = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'studio', 'src', 'core', 'factory', 'single-module-demo.json'), encoding='utf-8'))
link = view()
link.show(doc)
with gos.App() as app:
    app.load_document(doc)
    names = list(app.robot.joints())
    for k in range(300):
        q = [0.5 * math.sin(k / 30 + i) for i in range(len(names))]
        app.set_joints(**dict(zip(names, q)))
        link.joints(names, q)
        time.sleep(1 / 60)
print('VSEPR at the end:', link.read().vsepr)
link.close()
