"""P9 check on the real GPU: every render engine switches on, Cycles converges and cleans up, a wrong name changes nothing.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_engines.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import STUDIO_URL
from ui_baseline import ADD_MODULE

READ = """async () => { const { bridge: b } = await import('/src/bridge/cameraBridge.ts');
  return { engine: b.getRenderEngine?.(), samples: b.getPathTracerSamples?.(), canvases: document.querySelectorAll('canvas').length }; }"""
SET = "async (e) => (await import('/src/bridge/cameraBridge.ts')).bridge.setRenderEngine?.(e)"
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        # real GPU: software rendering has no WebGPU adapter, so Cycles could not start
        b = await p.chromium.launch(channel='chromium', args=['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--ignore-gpu-blocklist', '--use-angle=d3d11'])
        pg = await b.new_page(viewport={'width': 1400, 'height': 900})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)[:200]))
        await pg.goto(STUDIO_URL + '?view', wait_until='load', timeout=60000); await pg.wait_for_timeout(3000)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(800)
        start = await pg.evaluate(READ)
        check('starts on Eevee', start['engine'] == 'eevee', str(start))
        await pg.evaluate(SET, 'raycast'); await pg.wait_for_timeout(600)
        check('Raycast switches on', (await pg.evaluate(READ))['engine'] == 'raycast')
        await pg.evaluate(SET, 'cycles')
        s = {}
        for _ in range(30):
            await pg.wait_for_timeout(500); s = await pg.evaluate(READ)
            if s['samples'] > 0: break
        check('Cycles draws samples on its overlay', s['engine'] == 'cycles' and s['samples'] > 0 and s['canvases'] > start['canvases'], str(s))
        await pg.evaluate(SET, 'nonsense'); await pg.wait_for_timeout(200)
        check('a wrong name changes nothing', (await pg.evaluate(READ))['engine'] == 'cycles')
        await pg.evaluate(SET, 'eevee'); await pg.wait_for_timeout(800)
        s = await pg.evaluate(READ)
        check('back to Eevee removes the overlay', s['engine'] == 'eevee' and s['canvases'] == start['canvases'], str(s))
        check('no page errors', not errors, str(errors[:2]))
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'all render engines work')
    sys.exit(1 if bad else 0)

asyncio.run(main())
