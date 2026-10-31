"""P0 safety net: visit every Studio page, screenshot it, check the controls, and do the MSRR round trip.

usage (PowerShell, dev server must be running):
  $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/ui_baseline.py OUT_DIR [--only editor,msrr]
  py -3.12 tools/ui_baseline.py --compare BASE_DIR NEW_DIR

Writes OUT_DIR/<name>.png and OUT_DIR/report.json. Never clicks Connect, Scan or Stream: no real motor moves.
The camera checks import the page's own cameraBridge module, so they only work on the Vite dev server.
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio

PAGES = [('editor', 'Editor'), ('analysis', 'Analysis'), ('training', 'Training'), ('animation', 'Animation'),
         ('esptt', 'ESP-TTL'), ('motor', 'Motor Control')]
MSRR_TABS = ['Robot', 'Shapes', 'Plan', 'Ask', 'Run', 'Manual']
# The default module, through the same builder and command as the Add Module button: an empty scene shows no Home or VSEPR.
ADD_MODULE = """async () => {
  const { useModelStore } = await import('/src/state/modelStore.ts');
  const { buildDefaultModuleEntities } = await import('/src/core/factory/defaultModule.ts');
  const commands = await import('/src/core/commands/commands.ts');
  const st = useModelStore.getState();
  const { entities, componentName } = buildDefaultModuleEntities(st.doc);
  st.dispatch(commands.addEntities(entities, 'Add ' + componentName));
  return Object.keys(useModelStore.getState().doc.bodies).length;
}"""
BODIES = """async () => Object.keys((await import('/src/state/modelStore.ts')).useModelStore.getState().doc.bodies).length"""
CAM = """async () => { const { bridge: b } = await import('/src/bridge/cameraBridge.ts'); const c = b.camera;
  return c ? { uuid: c.uuid, pos: c.position.toArray().map((v) => +v.toFixed(4)) } : null; }"""


async def go(pg, label):
    await pg.locator('.app-nav-tab', has_text=label).first.click()
    await pg.wait_for_timeout(1200)


async def settled(pg):
    """Orbit damping keeps moving the camera after the mouse stops, so wait until two readings match."""
    last = await pg.evaluate(CAM)
    for _ in range(12):
        await pg.wait_for_timeout(500)
        cur = await pg.evaluate(CAM)
        if cur == last: break
        last = cur
    return last


async def probe(pg, logs, out, name):
    """Screenshot plus what is on screen; logs are drained so each error lands on the page that caused it."""
    await pg.screenshot(path=os.path.join(out, name + '.png'))
    r = {'canvases': await pg.locator('canvas:visible').count(), 'stats': await pg.locator('.vp-stats:visible').count(),
         'fit': await pg.locator('button[title="Fit model in view (F)"]:visible').count(), 'home': await pg.locator('.canvas-home-btn:visible').count(),
         'vsepr': await pg.get_by_text('VSEPR SCORE').locator('visible=true').count(), 'log': logs[:]}
    logs.clear()
    print(name, {k: v for k, v in r.items() if k != 'log'}, 'problems:', len(r['log']), flush=True)
    return r


async def main(out, only):
    os.makedirs(out, exist_ok=True)
    report = {'pages': {}, 'failures': []}
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        pg.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
        report['startup'] = logs[:]; logs.clear()
        report['bodies'] = await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(2500)
        await pg.locator('button[title="Fit model in view (F)"]:visible').first.click(); await pg.wait_for_timeout(1500)
        print('module bodies:', report['bodies'], flush=True)
        for pid, label in PAGES:
            if only and pid not in only: continue
            await go(pg, label)
            report['pages'][pid] = await probe(pg, logs, out, pid)
        if not only or 'msrr' in only:
            await go(pg, 'MSRR Experiments'); await pg.wait_for_timeout(1500)
            for t in MSRR_TABS:
                await pg.locator('.msrr-tab', has_text=t).first.click(); await pg.wait_for_timeout(500)
                report['pages']['msrr_' + t.lower()] = await probe(pg, logs, out, 'msrr_' + t.lower())
        if not only or 'roundtrip' in only:
            report['roundtrip'] = await roundtrip(pg, logs, out, report)
        await b.close()
    with open(os.path.join(out, 'report.json'), 'w', encoding='utf-8') as f: json.dump(report, f, indent=1)
    print('failures:', report['failures'] or 'none')


async def roundtrip(pg, logs, out, report):
    """Plan P2 'done when': opening and closing MSRR leaves the editor camera untouched and still drivable."""
    await go(pg, 'Editor')
    box = await pg.locator('canvas:visible').first.bounding_box()
    cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    await pg.mouse.move(cx, cy); await pg.mouse.down(button='middle'); await pg.mouse.move(cx + 120, cy + 40, steps=6); await pg.mouse.up(button='middle')
    before = await settled(pg)
    await go(pg, 'MSRR Experiments'); await pg.wait_for_timeout(1500)
    inside = await pg.evaluate(CAM)
    await go(pg, 'Editor')
    after = await settled(pg)
    await pg.locator('button[title="Fit model in view (F)"]:visible').first.click()
    fitted = await settled(pg)
    # Undo must take back the one edit: add a module, Ctrl+Z, Ctrl+Y, read the body count each time.
    n0 = await pg.evaluate(BODIES); n1 = await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1500)
    await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(1500); n2 = await pg.evaluate(BODIES)
    await pg.keyboard.press('Control+y'); await pg.wait_for_timeout(1500); n3 = await pg.evaluate(BODIES)
    r = {'before': before, 'insideMsrr': inside, 'after': after, 'afterFit': fitted,
         'sameCamera': bool(before and after and before['uuid'] == after['uuid']),
         # 1 mm: damping leaves about 0.2 mm of drift (measured 31 Oct), a moved camera is far more.
         'poseKept': bool(before and after and max(abs(x - y) for x, y in zip(before['pos'], after['pos'])) < 0.001),
         'fitStillDrives': bool(after and fitted and after['pos'] != fitted['pos']),
         'undo': {'start': n0, 'added': n1, 'undone': n2, 'redone': n3}, 'undoWorks': n2 == n0 and n3 == n1}
    await pg.screenshot(path=os.path.join(out, 'roundtrip_editor_after.png'))
    r['log'] = logs[:]; logs.clear()
    print('roundtrip', {k: v for k, v in r.items() if k != 'log'}, flush=True)
    for k in ('sameCamera', 'poseKept', 'fitStillDrives', 'undoWorks'):
        if not r[k]: report['failures'].append('roundtrip: ' + k)
    return r


# The mouse drag lands a little differently each run, so the viewport in these shots moves even between two
# runs of one build (1.9% and 5.3%, measured 31 Oct). Only the panels around it are compared.
CAMERA_MOVED = {'editor.png', 'roundtrip_editor_after.png'}
VIEWPORT_BOX = (250, 80, 1254, 970)


def compare(base, new, limit=0.02):
    """Share of pixels that moved by more than 16/255. The HUD numbers always differ, so the limit is not zero."""
    from PIL import Image, ImageChops
    bad = 0
    for f in sorted(os.listdir(base)):
        if not f.endswith('.png'): continue
        if not os.path.exists(os.path.join(new, f)): print('MISSING', f); bad += 1; continue
        a, b = (Image.open(os.path.join(d, f)).convert('L') for d in (base, new))
        if a.size != b.size: print('SIZE', f, a.size, b.size); bad += 1; continue
        diff = ImageChops.difference(a, b)
        if f in CAMERA_MOVED: diff.paste(0, VIEWPORT_BOX)
        hist = diff.histogram()
        share = sum(hist[17:]) / (a.width * a.height)
        print(f'{share * 100:6.2f}%  {"DIFF" if share > limit else "ok"}  {f}')
        bad += share > limit
    print('changed:', bad)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[0] == '--compare': compare(args[1], args[2])
    else:
        only = args[args.index('--only') + 1].split(',') if '--only' in args else None
        asyncio.run(main(args[0], only))
