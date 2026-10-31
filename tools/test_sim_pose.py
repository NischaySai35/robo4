"""P8 check in the real app: a simulated pose is shown, but saving and undo keep the design until Keep.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_sim_pose.py [OUT.png]
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio
from ui_baseline import ADD_MODULE

MOVE = """async (v) => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); const { withJointValues } = await import('/src/core/model/index.ts');
  const j = Object.keys(m.getState().doc.joints)[1]; m.getState().applyTransient((d) => withJointValues(d, { [j]: v })); return j; }"""
STATE = """async (j) => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); const { serializeProject } = await import('/src/core/serialization/project.ts');
  const { useHistoryStore: h } = await import('/src/state/historyStore.ts');
  return { shown: m.getState().doc.joints[j].state.value, saved: serializeProject().model.joints[j].state.value, undo: h.getState().canUndo,
           badge: !!document.querySelector('[data-testid=sim-pose]') }; }"""
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(2500)
        await pg.evaluate("async () => (await import('/src/state/historyStore.ts')).useHistoryStore.getState()")
        j = await pg.evaluate(MOVE, 0.6); await pg.wait_for_timeout(2000)
        s = await pg.evaluate(STATE, j)
        check('the simulated pose is shown', abs(s['shown'] - 0.6) < 1e-9, str(s))
        check('the saved project keeps the design pose', s['saved'] == 0, f"saved {s['saved']}")
        check('the badge says it is not saved', s['badge'])
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1])
        undo_before = s['undo']
        for v in (0.1, 0.2, 0.3): await pg.evaluate(MOVE, v); await pg.wait_for_timeout(300)
        await pg.wait_for_timeout(1500)
        check('moving adds no undo steps', (await pg.evaluate(STATE, j))['undo'] == undo_before)
        await pg.get_by_role('button', name='Back to design').click(); await pg.wait_for_timeout(500)
        s = await pg.evaluate(STATE, j)
        check('Back to design restores the design and hides the badge', s['shown'] == 0 and not s['badge'], str(s))
        await pg.evaluate(MOVE, 0.4); await pg.wait_for_timeout(500)
        await pg.get_by_role('button', name='Keep').click(); await pg.wait_for_timeout(1500)
        s = await pg.evaluate(STATE, j)
        check('Keep saves the pose, as one undo step', abs(s['saved'] - 0.4) < 1e-9 and not s['badge'] and s['undo'], str(s))
        await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(1500)
        s = await pg.evaluate(STATE, j)
        check('undo takes the kept pose back', s['saved'] == 0, str(s))
        check('no page errors', not [l for l in logs if l.startswith('PAGEERROR')])
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'design and simulated pose stay apart')
    sys.exit(1 if bad else 0)

asyncio.run(main())
