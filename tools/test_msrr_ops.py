"""P6 check: the older MSRR panel's buttons and scripts run the same commands (build, clear, shape undo and redo, refusals).

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_msrr_ops.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio

STATE = """async () => { const { useMsrrStore: m } = await import('/src/state/msrrStore.ts'); const s = m.getState();
  return { cubes: s.config.occ.size, built: !!s.built, canUndo: s.canUndo }; }"""
SETUP = """async () => { (await import('/src/state/pageStore.ts')).usePageStore.getState().setPage('msrr');
  const { useMsrrStore: m } = await import('/src/state/msrrStore.ts'); m.getState().clearBuild();
  m.getState().setConfigCells([[0,0,0],[1,0,0],[2,0,0],[3,0,0]]); m.getState().setTab('build'); }"""
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p, real_gpu=True)
        await pg.evaluate(SETUP); await pg.wait_for_timeout(1500)
        await pg.locator('[data-testid="mode-legacy"]').first.click(); await pg.wait_for_timeout(800)
        state = lambda: pg.evaluate(STATE)
        run = lambda op: pg.evaluate(f"window.tetrobotOps.run('{op}')")
        s = await state()
        check('the shape is set', s['cubes'] == 4, str(s))
        r = await run('msrr.plan')
        check('planning with no robot is refused with a reason', not r['ok'] and bool(r.get('error')), str(r)[:90])
        r = await run('msrr.play')
        check('playing with no plan is refused', not r['ok'])
        await pg.locator('button.msrr-btn.primary:has-text("Build"):visible').first.click()
        for _ in range(20):
            await pg.wait_for_timeout(300)
            if (await state())['built']: break
        check('the Build button builds the robot', (await state())['built'])
        await pg.locator('button:has-text("Clear build"):visible').first.click(); await pg.wait_for_timeout(300)
        check('the Clear build button clears it', not (await state())['built'])
        r = await run('msrr.build')
        for _ in range(20):
            await pg.wait_for_timeout(300)
            if (await state())['built']: break
        check('a script builds with the same command', r['ok'] and (await state())['built'], str(r)[:80])
        await run('msrr.build.clear')
        await run('msrr.shape.clear'); await pg.wait_for_timeout(200)
        check('a script clears the shape', (await state())['cubes'] == 0)
        r = await run('msrr.shape.undo'); await pg.wait_for_timeout(200)
        check('a script undoes it', r['ok'] and (await state())['cubes'] == 4, str(r)[:80])
        problems = [l for l in logs if 'PAGEERROR' in l]
        check('no page errors', not problems, str(problems[:2]))
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'MSRR commands work')
    sys.exit(1 if bad else 0)

asyncio.run(main())
