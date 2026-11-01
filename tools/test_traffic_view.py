"""B12/B13 check: a Python script's messages show live in the Studio's Runtime panel (rate, bytes per second, the message).

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_traffic_view.py [OUT.png]
"""
import asyncio, os, sys, threading, time
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gos', 'python'))
sys.path.insert(0, os.path.dirname(__file__))
from gos.studio import StudioLink
from ui_shot import STUDIO_URL

bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    link = StudioLink(port=8794)
    stop = threading.Event()
    try:
        async with async_playwright() as p:
            # real GPU: software drawing freezes the page for seconds, and then every message arrives at once
            b = await p.chromium.launch(args=['--use-angle=d3d11', '--ignore-gpu-blocklist'])
            pg = await b.new_page(viewport={'width': 1600, 'height': 950})
            await pg.goto(f'{STUDIO_URL}?gos={link.url}&token={link.token}', wait_until='load', timeout=60000)
            await asyncio.to_thread(link.wait, 30)

            def feed():  # a script sending 20 messages a second
                n = 0
                while not stop.is_set():
                    link.publish('/robot/battery', {'volts': 7.4 - n * 0.001, 'cells': [3.7, 3.7]}); n += 1; time.sleep(0.05)
            threading.Thread(target=feed, daemon=True).start()
            await pg.wait_for_timeout(1500)
            if await pg.locator('.sp-backdrop').count(): await pg.locator('.sp-backdrop').first.click(position={'x': 5, 'y': 5})  # the startup Projects window
            await pg.evaluate("async () => (await import('/src/state/dockStore.ts')).useDockStore.getState().open('runtime')"); await pg.wait_for_timeout(800)
            tab = pg.locator('button:has-text("Topics")').first
            if await tab.count(): await tab.click()
            await pg.wait_for_timeout(2500)
            row = pg.locator('.rt-topicrow', has_text='/robot/battery').first
            check('the script topic is listed', await row.count() == 1)
            hz = await row.locator('.rt-thz').inner_text() if await row.count() else ''
            check('its rate shows about 20 Hz', hz.endswith('Hz') and 12 <= float(hz.split()[0]) <= 28, hz)
            bps = await row.locator('.rt-tbps').inner_text() if await row.count() else ''
            check('its bytes per second show', 'B/s' in bps, bps)
            await row.dispatch_event('click'); await pg.wait_for_timeout(600)  # the list redraws 4 times a second
            msg = await pg.locator('.rt-msg').first.inner_text()
            check('selecting it shows the live message', '"volts"' in msg, msg[:60])
            if await pg.locator('.sp-close').count(): await pg.locator('.sp-close').first.click(); await pg.wait_for_timeout(400)
            if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1])
            await b.close()
    finally:
        stop.set(); link.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'script traffic shows live in the Studio')
    sys.exit(1 if bad else 0)

asyncio.run(main())
