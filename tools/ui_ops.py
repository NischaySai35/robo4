"""P6 check: run every operator on an empty document and on a real module, and press the real keys.

usage (PowerShell, fresh dev server): $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/ui_ops.py
Skips operators that open file dialogs. Never presses anything that talks to the robot.
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio
from ui_baseline import ADD_MODULE

RUN_ALL = """async () => {
  const { useEditModeStore } = await import('/src/state/editModeStore.ts');
  const { usePageStore } = await import('/src/state/pageStore.ts');
  const ops = window.tetrobotOps; const out = { run: [], blocked: [], failed: [] };
  for (const o of ops.list()) {
    if (o.interactive || o.id.startsWith('ui.')) continue;
    if (!ops.canRun(o.id)) { out.blocked.push(o.id); continue; }
    const r = ops.run(o.id); (r.ok ? out.run : out.failed).push(r.ok ? o.id : o.id + ': ' + r.error);
    if (o.id.startsWith('axis.')) ops.run('modal.cancel');
    if (useEditModeStore.getState().active) useEditModeStore.getState().exit();
    usePageStore.getState().setPage('editor');
    await new Promise((f) => setTimeout(f, 60));
  }
  return out;
}"""
SEL = """async () => { const { useSelectionStore: s } = await import('/src/state/selectionStore.ts'); const { useModelStore: m } = await import('/src/state/modelStore.ts');
  s.getState().select?.(Object.keys(m.getState().doc.bodies)[0], 'body'); return s.getState().selectedId; }"""
STATE = """async () => { const { useSelectionStore: s } = await import('/src/state/selectionStore.ts'); const { useTransformHudStore: h } = await import('/src/state/transformHudStore.ts');
  const { useModelStore: m } = await import('/src/state/modelStore.ts');
  return { selected: s.getState().selectedId, axis: h.getState().axis, bodies: Object.keys(m.getState().doc.bodies).length }; }"""


async def main():
    bad = []
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        for label, setup in (('empty document', None), ('default module', ADD_MODULE)):
            if setup: await pg.evaluate(setup); await pg.wait_for_timeout(1000)
            if setup: await pg.evaluate(SEL)
            r = await pg.evaluate(RUN_ALL)
            print(f'{label}: ran {len(r["run"])}, blocked {len(r["blocked"])}, failed {r["failed"] or 0}', flush=True)
            bad += r['failed']
        for _ in range(3): await pg.evaluate(SEL)
        await pg.evaluate(SEL); await pg.wait_for_timeout(300)
        await pg.mouse.move(600, 600)
        await pg.keyboard.press('m'); await pg.wait_for_timeout(300)  # X needs the move gizmo showing
        await pg.keyboard.press('x'); await pg.wait_for_timeout(200); s = await pg.evaluate(STATE); print('X on body', s)
        if s['axis'] != 'x': bad.append('X did not start an axis move')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200); s = await pg.evaluate(STATE); print('Esc once', s)
        if s['axis']: bad.append('Esc did not cancel the axis move')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200); s = await pg.evaluate(STATE); print('Esc twice', s)
        if s['selected']: bad.append('Esc did not clear the selection')
        await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(300)
        n = await pg.locator('input:focus').count(); print('palette open with focus', n)
        await pg.keyboard.press('Escape')
        problems = sorted({l[:150] for l in logs if l.startswith('PAGEERROR')})
        print('page errors', problems)
        bad += problems
        await b.close()
    print('FAILED: ' + '; '.join(bad) if bad else 'all operators and keys OK')
    sys.exit(1 if bad else 0)

asyncio.run(main())
