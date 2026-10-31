"""P6 check: panel buttons and scripts run the same commands (Add Module, Home, Wireframe, Connectors, Gravity).

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_panel_ops.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio

STATE = """async () => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); const { bridge: b } = await import('/src/bridge/cameraBridge.ts');
  const { useEditorStore: e } = await import('/src/state/editorStore.ts'); const d = m.getState().doc;
  return { bodies: Object.keys(d.bodies).length, comps: Object.keys(d.components ?? {}).length, bent: Object.values(d.joints).filter((j) => Math.abs(j.state?.value ?? 0) > 1e-6).length,
           wire: !!b.getWireframe?.(), plugs: !!b.getConnectorsVisible?.(), gravity: e.getState().gravityEnabled }; }"""
BEND = """async () => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); const c = await import('/src/core/commands/commands.ts');
  const ids = Object.values(m.getState().doc.joints).filter((j) => j.type !== 'fixed').map((j) => j.id);
  m.getState().dispatch(c.setJointValues(Object.fromEntries(ids.map((id) => [id, 0.3])))); }"""
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        s0 = await pg.evaluate(STATE)
        # The real buttons
        await pg.locator('.lp-add-wrap > button').first.click(); await pg.wait_for_timeout(300)
        await pg.locator('.lp-add-item--module').first.click(); await pg.wait_for_timeout(1500)
        s1 = await pg.evaluate(STATE)
        check('the Add Module button adds a module', s1['bodies'] == s0['bodies'] + 10, f"{s0['bodies']} to {s1['bodies']} bodies")
        r = await pg.evaluate("window.tetrobotOps.run('module.add')"); await pg.wait_for_timeout(1500)
        s2 = await pg.evaluate(STATE)
        check('a script adds a module with the same command', r['ok'] and s2['bodies'] == s1['bodies'] + 10 and s2['comps'] == s1['comps'] + 1, str(r)[:80])
        await pg.evaluate(BEND); await pg.wait_for_timeout(500)
        await pg.locator('.canvas-home-btn:visible').first.click(); await pg.wait_for_timeout(1500)
        check('the Home button brings every joint to rest', (await pg.evaluate(STATE))['bent'] == 0)
        await pg.evaluate(BEND); await pg.wait_for_timeout(500)
        await pg.evaluate("window.tetrobotOps.run('pose.home')"); await pg.wait_for_timeout(1500)
        check('a script runs Home', (await pg.evaluate(STATE))['bent'] == 0)
        await pg.locator('button[title*="Wireframe"]:visible').first.click(); await pg.wait_for_timeout(400)
        check('the WIRE button turns wireframe on', (await pg.evaluate(STATE))['wire'])
        await pg.evaluate("window.tetrobotOps.run('view.wireframe', { on: false })"); await pg.wait_for_timeout(300)
        check('a script turns it off', not (await pg.evaluate(STATE))['wire'])
        g0 = (await pg.evaluate(STATE))['gravity']
        await pg.evaluate("window.tetrobotOps.run('physics.gravity')"); await pg.wait_for_timeout(300)
        check('a script switches gravity', (await pg.evaluate(STATE))['gravity'] != g0)
        await pg.evaluate("window.tetrobotOps.run('physics.gravity', { on: false })")
        check('no page errors', not [l for l in logs if l.startswith('PAGEERROR')])
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'buttons and scripts run the same commands')
    sys.exit(1 if bad else 0)

asyncio.run(main())
