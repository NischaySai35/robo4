"""Drive the Studio page in a real (headless) Chromium and take screenshots.

usage: python tools/ui_shot.py OUT.png step [step ...]
steps: click:<text>  testid:<id>  select:<testid>=<value>  wait:<ms>  eval:<js>
The page is opened on STUDIO_URL (default http://localhost:5173) and the MSRR Experiments tab is selected first.
"""
import os, sys, asyncio
from playwright.async_api import async_playwright

STUDIO_URL = os.environ.get('STUDIO_URL', 'http://localhost:5173/')

async def open_studio(p, startup_shot=None):
    """Open the Studio past its startup dialog. Returns (browser, page, logs). Shared with ui_baseline.py."""
    b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = await b.new_page(viewport={'width': 1700, 'height': 1000})
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e} :: {getattr(e, "stack", "")[:600]}'))
    await pg.goto(STUDIO_URL, wait_until='load', timeout=120000); await pg.wait_for_timeout(4000)
    await pg.wait_for_timeout(800)
    if await pg.locator('.sp-backdrop').count():
        if startup_shot: await pg.screenshot(path=startup_shot)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        if await pg.locator('.sp-backdrop').count():
            await pg.locator('.sp-backdrop').first.click(position={'x': 5, 'y': 5}); await pg.wait_for_timeout(300)
    return b, pg, logs

async def main(out, steps):
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p, out.replace('.png', '_startup.png'))
        await pg.get_by_text('MSRR Experiments', exact=False).first.click()
        await pg.wait_for_timeout(1500)
        for s in steps:
            kind, _, arg = s.partition(':')
            if kind == 'click': await pg.get_by_text(arg, exact=True).first.click()
            elif kind == 'testid': await pg.get_by_test_id(arg).first.click()
            elif kind == 'select':
                tid, _, val = arg.partition('=')
                await pg.get_by_test_id(tid).first.select_option(val)
            elif kind == 'fill':
                tid, _, val = arg.partition('=')
                await pg.get_by_test_id(tid).first.fill(val)
            elif kind == 'wait': await pg.wait_for_timeout(int(arg))
            elif kind == 'eval': print('eval ->', await pg.evaluate(arg))
            elif kind == 'shot': await pg.screenshot(path=arg)
            await pg.wait_for_timeout(300)
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=out)
        for l in logs[-15:]: print(l)
        await b.close()

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], sys.argv[2:]))
