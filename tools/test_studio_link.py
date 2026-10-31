"""GOS G5 check: one script drives the no-window simulation and the real Studio page together.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_studio_link.py [OUT.png]
"""
import asyncio, json, os, sys, threading
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gos', 'python'))
sys.path.insert(0, os.path.dirname(__file__))
import gos
from gos.studio import StudioLink
from ui_shot import STUDIO_URL

MODULE = os.path.join(os.path.dirname(__file__), '..', 'studio', 'src', 'core', 'factory', 'single-module-demo.json')
SHOT = sys.argv[1] if len(sys.argv) > 1 else None
results, bad = {}, []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


def script(link):
    """What a user's script would be, apart from the checks."""
    doc = json.load(open(MODULE, encoding='utf-8'))
    link.wait(40)
    check('Studio connected with the token', link.connected, f'{len(link.operators)} operators offered')
    r = link.show(doc); check('robot shown in the Studio', r.ok, r.message)
    r = link.read(); check('Studio reports the robot', r.ok and r.bodies == 10, f'bodies {r.data.get("bodies")}, VSEPR {r.data.get("vsepr")}')
    straight = r.data.get('vsepr')
    r = link.run('page.analysis'); check('a Studio command runs by name', r.ok and link.read().page == 'analysis', r.message)
    link.run('page.editor')
    r = link.run('no.such.command'); check('a wrong command gives a clear error', not r.ok and 'No operator' in r.message, r.message)
    with gos.App(headless=True) as app:
        app.load_document(doc)
        names = list(app.robot.joints())
        check('same joint names both sides', len(names) == 9)
        # Same script, sim and window: bend in the no-window sim and stream each frame to the Studio.
        for k in range(60):
            q = [0.5 * min(1, k / 40) * (1 if i % 2 else -1) for i in range(len(names))]
            app.set_joints(**dict(zip(names, q)))
            link.joints(names, q)
        import time; time.sleep(1.5)
        r = link.read()
        shown = dict(r.data['joints'])
        check('the Studio follows the simulation', all(abs(abs(v) - 0.5) < 1e-6 for v in shown.values()), str(list(shown.items())[:2]))
        check('the VSEPR score moved with it', r.data['vsepr'] != straight, f'{straight} to {r.data["vsepr"]}')
    results['done'] = True


async def page_side(link):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1700, 'height': 1000})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)[:200]))
        # A wrong token must be refused before the real connection.
        await pg.goto(f'{STUDIO_URL}?gos={link.url}&token=wrong', wait_until='load', timeout=60000)
        await pg.wait_for_timeout(3000)
        check('a wrong token is refused', not link.connected)
        await pg.goto(f'{STUDIO_URL}?gos={link.url}&token={link.token}', wait_until='load', timeout=60000)
        t = threading.Thread(target=script, args=(link,)); t.start()
        while t.is_alive(): await pg.wait_for_timeout(300)
        t.join()
        if SHOT: await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1500); await pg.screenshot(path=SHOT)
        check('no page errors', not errors, str(errors[:2]))
        await b.close()


link = StudioLink(port=18772)
asyncio.run(page_side(link))
link.close()
if not results.get('done'): bad.append('the script did not finish')
print('FAILED: ' + ', '.join(bad) if bad else 'one script drives the simulation and the Studio')
sys.exit(1 if bad else 0)
