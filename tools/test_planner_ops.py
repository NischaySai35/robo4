"""P6 check: Planner v2's buttons and scripts run the same commands (check, real physics on and off, sketch, Manual),
and commands that make no sense right now are refused with the reason. Needs the physics service (the dev server starts it).

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_planner_ops.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio

V2 = "async () => { const s = (await import('/src/state/msrrV2Store.ts')).useV2Store.getState(); return { report: !!s.report, physics: !!s.physics, busy: s.physBusy, err: s.physErr, manual: !!s.manual }; }"
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p, real_gpu=True)
        pg.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
        await pg.evaluate("async () => (await import('/src/state/pageStore.ts')).usePageStore.getState().setPage('msrr')"); await pg.wait_for_timeout(800)
        await pg.locator('[data-testid="mode-v2"]').first.click(); await pg.wait_for_timeout(800)
        run = lambda op, props=None: pg.evaluate("([o, p]) => window.tetrobotOps.run(o, p ?? undefined)", [op, props])
        await pg.locator('[data-testid="v2-check"]').first.click(); await pg.wait_for_timeout(300)
        check('the Check button checks the robot', (await pg.evaluate(V2))['report'])
        r = await run('planner.check')
        check('a script runs the same check', r['ok'], str(r)[:80])
        r = await run('planner.sketch.play')
        check('playing with no plan is refused with a reason', not r['ok'] and bool(r.get('error')), str(r)[:90])
        r = await run('planner.manual', {'kind': 'home'})
        check('Manual commands with no session are refused', not r['ok'])
        await pg.locator('[data-testid="gravity"], button:has-text("Real physics")').first.click()
        s = {}
        for _ in range(120):
            await pg.wait_for_timeout(500); s = await pg.evaluate(V2)
            if s['physics'] or s['err']: break
        check('the Real physics button starts MuJoCo', s['physics'], s.get('err') or str(s))
        r = await run('planner.physics')
        check('starting it twice is refused', not r['ok'])
        r = await run('planner.physics.stop'); await pg.wait_for_timeout(300)
        check('a script stops it', r['ok'] and not (await pg.evaluate(V2))['physics'], str(r)[:80])
        await pg.evaluate("async () => (await import('/src/state/msrrV2Store.ts')).useV2Store.getState().setTab('manual')"); await pg.wait_for_timeout(500)
        await pg.locator('[data-testid="man-start"]').first.click()
        for _ in range(120):
            await pg.wait_for_timeout(500); s = await pg.evaluate(V2)
            if s['manual'] or s['err']: break
        check('the Manual Start button opens a live robot', s['manual'], s.get('err') or str(s))
        r = await run('planner.manual', {'kind': 'pause', 'on': True})
        check('a script pauses the live robot', r['ok'] and not (r.get('value') or {}).get('error'), str(r)[:100])
        r = await run('planner.manual', {'kind': 'fly'})
        check('an unknown Manual command lists the real ones', not r['ok'] and 'Commands: back' in r['error'], r.get('error', '')[:90])
        r = await run('planner.manual.stop'); await pg.wait_for_timeout(300)
        check('a script ends the session', r['ok'] and not (await pg.evaluate(V2))['manual'])
        problems = [l for l in logs if 'PAGEERROR' in l]
        check('no page errors', not problems, str(problems[:2]))
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'Planner v2 commands work')
    sys.exit(1 if bad else 0)

asyncio.run(main())
