"""GOS G0 / P3 baseline: how much each Studio page draws while nobody touches it.

usage (PowerShell, dev server running): $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/bench/g0_idle.py
Counts WebGL draw calls and animation frames by wrapping the browser functions before the app loads.
Software rendering: compare counts, not milliseconds.
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ui_shot import STUDIO_URL
from ui_baseline import ADD_MODULE, PAGES

COUNT = """(() => { const c = window.__c = { draws: 0, raf: 0 };
  for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype])
    for (const f of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const o = P[f]; P[f] = function (...a) { c.draws++; return o.apply(this, a); }; }
  const r = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { c.raf++; return r(cb); }; })()"""


async def idle(pg, name, seconds=4):
    await pg.wait_for_timeout(2500)  # let tweens and damping finish
    a = await pg.evaluate('({...window.__c})'); await pg.wait_for_timeout(seconds * 1000); b = await pg.evaluate('({...window.__c})')
    print(f'{name:<12} draw calls/s {(b["draws"] - a["draws"]) / seconds:9.1f}   rAF requests/s {(b["raf"] - a["raf"]) / seconds:7.1f}', flush=True)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1700, 'height': 1000})
        await pg.add_init_script(COUNT)
        await pg.goto(STUDIO_URL, wait_until='load', timeout=60000); await pg.wait_for_timeout(4000)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        if await pg.locator('.sp-backdrop').count(): await pg.locator('.sp-backdrop').first.click(position={'x': 5, 'y': 5})
        await pg.evaluate(ADD_MODULE)
        for pid, label in PAGES + [('msrr', 'MSRR Experiments')]:
            await pg.locator('.app-nav-tab', has_text=label).first.click()
            await idle(pg, pid)
        await b.close()

asyncio.run(main())
