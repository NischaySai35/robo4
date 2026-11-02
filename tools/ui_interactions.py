"""Beyond single clicks: first load, menu bar and sub-menus, double-click, right-click menus, and hover / click / right-click in the 3D view.
Every menu must close on Esc and on a click outside.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/ui_interactions.py [OUT_DIR]
"""
import asyncio, os, sys, time
from playwright.async_api import async_playwright
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import STUDIO_URL
from ui_baseline import ADD_MODULE

SEL = "async () => { const s = (await import('/src/state/selectionStore.ts')).useSelectionStore.getState(); return { id: s.selectedId, kind: s.kind, vp: !!s.vpCtxMenu }; }"
DOCK = "async () => (await import('/src/state/dockStore.ts')).useDockStore.getState().active"
bad, out_dir = [], (sys.argv[1] if len(sys.argv) > 1 else None)


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=d3d11', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1700, 'height': 1000})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)[:200]))
        pg.on('console', lambda m: errors.append(m.text[:200]) if m.type == 'error' and 'ERR_NAME_NOT_RESOLVED' not in m.text else None)
        t0 = time.time()
        await pg.goto(STUDIO_URL, wait_until='load', timeout=60000)
        await pg.locator('canvas').first.wait_for(state='visible', timeout=30000)
        ready = time.time() - t0
        check('first load: the 3D view is up quickly', ready < 15, f'{ready:.1f} s')
        try: await pg.locator('.sp-backdrop').wait_for(state='visible', timeout=10000)
        except Exception: pass
        shown = time.time() - t0
        start = await pg.locator('.sp-backdrop').count()
        check('first load: the Projects window offers a start', start == 1, f'after {shown:.1f} s')
        check('first load: no errors', not errors, str(errors[:2]))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        check('the Projects window closes on Esc', await pg.locator('.sp-backdrop').count() == 0)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(800)
        await pg.locator('button[title="Fit model in view (F)"]:visible').first.click(); await pg.wait_for_timeout(1200)

        # menu bar and its sub-menus
        for name in ('File', 'Edit', 'View', 'Help'):
            await pg.locator('.menu-label', has_text=name).first.click(); await pg.wait_for_timeout(200)
            items = await pg.locator('.menu-dropdown .menu-item:visible').count()
            check(f'{name} menu opens with its items', items >= 2, f'{items} items')
            sub = pg.locator('.menu-dropdown .menu-item--sub:visible')
            if await sub.count():
                await sub.first.hover(); await pg.wait_for_timeout(250)
                check(f'{name}: hovering a sub-menu opens it', await pg.locator('.menu-subdropdown:visible .menu-item').count() >= 1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
            check(f'{name} menu closes on Esc', await pg.locator('.menu-dropdown:visible').count() == 0)
        await pg.locator('.menu-label', has_text='File').first.click(); await pg.wait_for_timeout(150)
        await pg.mouse.click(800, 600); await pg.wait_for_timeout(200)
        check('a menu closes on a click outside', await pg.locator('.menu-dropdown:visible').count() == 0)

        # project explorer: double-click and right-click
        row = pg.locator('.left-panel', has_text='Spine1_B1B2').locator('text=Spine1_B1B2').first
        await row.dblclick(); await pg.wait_for_timeout(500)
        s = await pg.evaluate(SEL)
        check('double-click a body selects it and opens Properties', s['kind'] == 'body' and await pg.evaluate(DOCK) == 'inspector', f"{s} dock={await pg.evaluate(DOCK)}")
        await row.click(button='right'); await pg.wait_for_timeout(300)
        menu = pg.locator('.px-ctx-menu:visible')
        check('right-click a body opens its menu', await menu.count() == 1, f"{await menu.locator('button').count()} items")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        check('the right-click menu closes on Esc', await pg.locator('.px-ctx-menu:visible').count() == 0)
        await row.click(button='right'); await pg.wait_for_timeout(300)
        await pg.mouse.click(900, 700); await pg.wait_for_timeout(200)
        check('the right-click menu closes on a click outside', await pg.locator('.px-ctx-menu:visible').count() == 0)

        # 3D view: hover, click, right-click on the robot
        await pg.evaluate("async () => (await import('/src/state/selectionStore.ts')).useSelectionStore.getState().clear()"); await pg.wait_for_timeout(300)
        canvas = pg.locator('canvas:visible').first
        box = await canvas.bounding_box()
        hit = None
        for dx in (0, -60, 60, -120, 120, -180, 180):
            x, y = box['x'] + box['width'] / 2 + dx, box['y'] + box['height'] / 2
            await pg.mouse.move(x - 200, y - 150); await pg.wait_for_timeout(250)
            away = await canvas.screenshot()
            await pg.mouse.move(x, y); await pg.wait_for_timeout(350)
            near = await canvas.screenshot()
            if near != away:
                await pg.mouse.click(x, y); await pg.wait_for_timeout(400)
                if (await pg.evaluate(SEL))['kind'] == 'body': hit = (x, y); break
        check('3D: hovering the robot highlights it, and clicking selects the part', hit is not None, f'at {hit}')
        if out_dir:
            os.makedirs(out_dir, exist_ok=True); await pg.screenshot(path=os.path.join(out_dir, '3d_selected.png'))
        if hit:
            await pg.mouse.click(*hit, button='right'); await pg.wait_for_timeout(400)
            check('3D: right-click the robot opens its menu', await pg.locator('.px-ctx-menu:visible').count() == 1 and (await pg.evaluate(SEL))['vp'])
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            check('3D: that menu closes on Esc', await pg.locator('.px-ctx-menu:visible').count() == 0)
            await pg.mouse.click(box['x'] + 30, box['y'] + box['height'] - 30); await pg.wait_for_timeout(400)
            check('3D: clicking empty space clears the selection', (await pg.evaluate(SEL))['id'] in (None, ''))
        check('no errors while doing all this', not errors, str(errors[:3]))
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'menus, double-click, right-click and the 3D view behave')
    sys.exit(1 if bad else 0)

asyncio.run(main())
