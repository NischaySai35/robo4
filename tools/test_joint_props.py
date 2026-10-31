"""P7/P11 check: the Properties panel's joint numbers and the scripted joint.set use the same descriptions.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_joint_props.py [OUT.png]
"""
import asyncio, math, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio
from ui_baseline import ADD_MODULE

PICK = """async () => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); const { useSelectionStore: s } = await import('/src/state/selectionStore.ts');
  const { useDockStore: d } = await import('/src/state/dockStore.ts');
  const j = Object.values(m.getState().doc.joints).find((x) => x.name === 'J_B1_bend'); s.getState().select(j.id, 'joint'); d.getState().open('inspector'); return j.id; }"""
LIM = "async (id) => (await import('/src/state/modelStore.ts')).useModelStore.getState().doc.joints[id].limit"
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1000)
        jid = await pg.evaluate(PICK); await pg.wait_for_timeout(1000)
        panes = pg.locator('.property-pane')
        check('joint numbers show in the shared property pane', await panes.count() >= 2, f'{await panes.count()} panes')
        before = await pg.evaluate(LIM, jid)
        lower = panes.first.locator('input').first
        await lower.fill('-45'); await lower.press('Enter'); await pg.wait_for_timeout(1200)
        after = await pg.evaluate(LIM, jid)
        check('typing -45° stores -45° in the joint', abs(after['lower'] + math.pi / 4) < 1e-6, f"{math.degrees(before['lower']):.1f} to {math.degrees(after['lower']):.1f}")
        check('the other limits are kept', after['upper'] == before['upper'] and after['effort'] == before['effort'])
        r = await pg.evaluate("window.tetrobotOps.run('joint.set', { joint: 'J_B1_bend', path: 'dynamics.damping', value: 0.25 })")
        check('a script sets a property by name', r['ok'], str(r))
        r = await pg.evaluate("window.tetrobotOps.run('joint.set', { joint: 'J_B1_bend', path: 'dynamics.damping', value: -1 })")
        check('a bad scripted value is refused with the reason', not r['ok'] and 'below 0' in r['error'], r.get('error', ''))
        await pg.wait_for_timeout(1500)
        await pg.evaluate('document.activeElement.blur()')  # out of the number box, as a user clicking the view
        await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(1500)
        await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(1500)
        back = await pg.evaluate(LIM, jid)
        check('undo takes the panel edit back', abs(back['lower'] - before['lower']) < 1e-6, f"{math.degrees(back['lower']):.1f}")
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1])
        check('no page errors', not [l for l in logs if l.startswith('PAGEERROR')])
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'panel and scripts share one description of each property')
    sys.exit(1 if bad else 0)

asyncio.run(main())
