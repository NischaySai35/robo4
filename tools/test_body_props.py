"""P7/P11 check: a body's mass and its material's Metal and Rough show in the shared property pane, edit the document, and undo.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_body_props.py [OUT.png]
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio
from ui_baseline import ADD_MODULE

PICK = """async () => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); const { useSelectionStore: s } = await import('/src/state/selectionStore.ts');
  const { useDockStore: d } = await import('/src/state/dockStore.ts');
  const b = Object.values(m.getState().doc.bodies).find((x) => x.name === 'Spine1_B1B2'); s.getState().select(b.id, 'body'); d.getState().open('inspector'); return b.id; }"""
MASS = "async (id) => (await import('/src/state/modelStore.ts')).useModelStore.getState().doc.bodies[id].inertial.mass"
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1000)
        bid = await pg.evaluate(PICK); await pg.wait_for_timeout(1200)
        text = await pg.locator('.property-pane').all_inner_texts()
        joined = ' | '.join(t.replace('\n', ' ') for t in text)
        check('mass shows in grams in the property pane', 'Mass' in joined and 'g' in joined, joined[:120])
        check('Metal and Rough show in the property pane', 'Metal' in joined and 'Rough' in joined)
        m0 = await pg.evaluate(MASS, bid)
        box = pg.locator('.property-pane').filter(has_text='Mass').locator('input').first
        shown = float(await box.input_value())
        check('the pane shows the stored mass in grams', abs(shown - m0 * 1000) < 0.6, f'{shown} g for {m0} kg')
        await box.fill('300'); await box.press('Enter'); await pg.wait_for_timeout(800)
        check('typing 300 stores 0.3 kg', abs(await pg.evaluate(MASS, bid) - 0.3) < 1e-9, str(await pg.evaluate(MASS, bid)))
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1])
        await pg.evaluate('document.activeElement.blur()')
        await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(1000)
        check('undo takes it back', abs(await pg.evaluate(MASS, bid) - m0) < 1e-9)
        check('no page errors', not [l for l in logs if l.startswith('PAGEERROR')])
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'body and material numbers use the shared pane')
    sys.exit(1 if bad else 0)

asyncio.run(main())
