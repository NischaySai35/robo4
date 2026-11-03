"""B11 check: a trace written by a real GOS script opens in the Studio's Runtime panel, Trace tab, by clicking.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_trace_view.py [OUT.png]
"""
# REUSE-CHECKED: test_trace|traceEvents -> test_gos.py checks the file is written; test_traffic_view opens the panel the same way. This checks the view.
import asyncio, os, sys, tempfile, time
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gos', 'python'))
sys.path.insert(0, os.path.dirname(__file__))
import gos
from ui_shot import open_studio

bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


def real_trace(path):
    with gos.App(trace=path) as app:
        app.topic('/fast').subscribe(lambda m: None)
        app.topic('/slow').subscribe(lambda m: time.sleep(0.02))
        for i in range(20): app.topic('/fast').publish({'i': i})
        for i in range(5): app.topic('/slow').publish({'i': i})


async def main(out):
    work = tempfile.mkdtemp(prefix='gos_trace_')
    good, junk = os.path.join(work, 'trace.json'), os.path.join(work, 'junk.json')
    real_trace(good)
    open(junk, 'w').write('hello')
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p, real_gpu=True)
        await pg.evaluate("async () => (await import('/src/state/dockStore.ts')).useDockStore.getState().open('runtime')"); await pg.wait_for_timeout(800)
        await pg.get_by_role('tab', name='Trace', exact=True).first.click(); await pg.wait_for_timeout(300)
        check('the empty tab says how to make a trace', await pg.get_by_text('gos.App(trace="trace.json")').count() == 1)
        file = pg.get_by_test_id('trace-file')
        await file.set_input_files(junk); await pg.wait_for_timeout(300)
        check('a wrong file is explained', 'not JSON' in await pg.locator('.rt-trace-error').inner_text())
        await file.set_input_files(good); await pg.wait_for_timeout(500)
        rows = await pg.locator('.rt-trace-table tbody tr').all_inner_texts()
        check('the slow callback is listed first', bool(rows) and '/slow' in rows[0], str(rows[:2]))
        check('both callbacks are listed with their run counts', len(rows) == 2 and '\t5\t' in rows[0] and '\t20\t' in rows[1], str(rows))
        worst = float(rows[0].split('\t')[4]) if rows else 0
        check('its time is about the 20 ms it slept', 18 <= worst <= 60, str(worst))
        await pg.locator('.rt-trace-table tbody tr').nth(1).click(); await pg.wait_for_timeout(200)
        check('clicking a row picks it', await pg.locator('.rt-trace-table tbody tr.active').count() == 1)
        box = await pg.locator('.rt-trace-view').bounding_box()
        drawn = await pg.evaluate("() => { const c = document.querySelector('.rt-trace-view'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; return new Set(Array.from({length: d.length / 4}, (_, i) => d[i * 4])).size; }")
        check('the timeline has bars on it', drawn >= 2, f'{drawn} shades')
        await pg.mouse.move(box['x'] + box['width'] - 2, box['y'] + 8); await pg.wait_for_timeout(200)
        check('pointing at a bar names it', '/slow' in await pg.locator('.rt-trace-hover').inner_text(), await pg.locator('.rt-trace-hover').inner_text())
        if out: await pg.screenshot(path=out)
        errs = [l for l in logs if l.startswith('PAGEERROR')]
        check('no page errors', not errs, str(errs[:2]))
        try: await b.close()
        except Exception: pass
    print('FAILED: ' + ', '.join(bad) if bad else 'a script trace opens and reads correctly in the Studio')
    sys.exit(1 if bad else 0)

asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else None))
