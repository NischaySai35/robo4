"""P7 check: the camera panel's new sliders change the real camera, and the camera's changes show in them.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_property_pane.py [OUT.png]
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio
from ui_baseline import ADD_MODULE

CAM = "async () => (await import('/src/bridge/cameraBridge.ts')).bridge.getCameraState()"
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1000)
        await pg.locator('button[title="Camera Settings"]').first.click(); await pg.wait_for_timeout(800)
        pane = pg.locator('.property-pane')
        check('the camera panel shows the new property pane', await pane.count() == 1)
        before = await pg.evaluate(CAM)
        field = pane.locator('input').first           # Focal length, the first property
        await field.fill('85'); await field.press('Enter'); await pg.wait_for_timeout(500)
        after = await pg.evaluate(CAM)
        check('typing a focal length changes the real camera', abs(after['focalLength'] - 85) < 0.5, f"{before['focalLength']:.1f} to {after['focalLength']:.1f}")
        await pg.evaluate("async () => (await import('/src/bridge/cameraBridge.ts')).bridge.applyCameraState({ focalLength: 40 })"); await pg.wait_for_timeout(700)
        shown = await field.input_value()
        check('a change made elsewhere shows in the pane', shown.startswith('40'), shown)
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1])
        check('no page errors', not [l for l in logs if l.startswith('PAGEERROR')])
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'the property pane drives the camera both ways')
    sys.exit(1 if bad else 0)

asyncio.run(main())
