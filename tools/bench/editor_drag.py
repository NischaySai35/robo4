"""P3/P8 budget: is dragging in the Editor smooth? Real mouse drags with the real GPU, timed frame by frame.

usage (dev server running): $env:STUDIO_URL='http://127.0.0.1:5183/'; [$env:MODULES=10;] py -3.12 tools/bench/editor_drag.py
Three drags of 2 s each: the move gizmo on a body, an orbit of the view, and the same gizmo drag with 10 modules
when MODULES=10. Prints frames a second, the slowest frame and how many frames took longer than 1/30 s.
"""
# REUSE-CHECKED: drag|fps|frame time|bench -> g0_idle counts draws at rest, g2_studio times the GOS link; none drags.
# Reuses ui_shot.open_studio, ui_baseline.ADD_MODULE and the selection pick of test_body_props.
import asyncio, os, statistics, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import ui_shot
from ui_baseline import ADD_MODULE

PICK = """async () => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); const { useSelectionStore: s } = await import('/src/state/selectionStore.ts');
  const b = Object.values(m.getState().doc.bodies)[1]; s.getState().select(b.id, 'body'); s.getState().revealGizmo(); return b.id; }"""
# Where the move gizmo's centre (free-move handle) is on screen.
GIZMO = """async () => { const { bridge } = await import('/src/bridge/cameraBridge.ts'); let root = null;
  bridge.scene.traverse((o) => { if (o.isTransformControlsRoot && o.controls?.object) root = o; });
  if (!root) return null; const o = root.controls.object; const p = o.getWorldPosition(o.position.clone()).project(bridge.camera);
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; }"""
POS = """async (id) => (await import('/src/state/modelStore.ts')).useModelStore.getState().doc.bodies[id].transform?.position ?? null"""
REC = """() => { window.__f = []; let last = performance.now(); const f = (t) => { if (!window.__f) return; window.__f.push(t - last); (window.__t = window.__t || []).push(t); last = t; if (window.__f) requestAnimationFrame(f); }; requestAnimationFrame(f); }"""


async def drag(pg, x, y, dx, dy, steps=120):
    await pg.evaluate(REC)
    await pg.mouse.move(x, y); await pg.evaluate("() => { window.__t = []; window.__down = performance.now(); }"); await pg.mouse.down()
    for i in range(1, steps + 1):  # 2 s at 60 mouse events a second
        await pg.mouse.move(x + dx * i / steps, y + dy * i / steps); await pg.wait_for_timeout(16)
    await pg.evaluate("() => { window.__up = performance.now(); }"); await pg.mouse.up(); await pg.wait_for_timeout(1000)
    if os.environ.get('SLOW'):  # when the slow frames happen, in ms after the button went down; the button came up at 'up'
        print(await pg.evaluate("() => ({ up: Math.round(window.__up - window.__down), slow: window.__t.map((t, i) => [Math.round(t - window.__down), Math.round(window.__f[i + 0] ?? 0)]).filter(([, d]) => d > 33) })"))
    f = (await pg.evaluate("() => { const f = window.__f.slice(2); window.__f = null; return f; }"))
    return f


def report(name, f):
    print(f'{name}: {1000 / statistics.mean(f):.0f} fps, median frame {statistics.median(f):.1f} ms, '
          f'slowest {max(f):.0f} ms, {sum(x > 1000 / 30 for x in f)} of {len(f)} frames slower than 1/30 s', flush=True)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await ui_shot.open_studio(p, real_gpu=True)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1500)
        for _ in range(int(os.environ.get('MODULES', '1')) - 1):
            await pg.evaluate("window.tetrobotOps.run('module.add')"); await pg.wait_for_timeout(300)
        await pg.locator('button[title="Fit model in view (F)"]:visible').first.click(); await pg.wait_for_timeout(1500)
        n = await pg.evaluate("async () => Object.keys((await import('/src/state/modelStore.ts')).useModelStore.getState().doc.bodies).length")
        print(f'{n} bodies', flush=True)
        bid = await pg.evaluate(PICK); await pg.wait_for_timeout(800)
        g = await pg.evaluate(GIZMO)
        if not g: sys.exit('no move gizmo on screen after selecting a body')
        p0 = await pg.evaluate(POS, bid)
        report('move gizmo drag', await drag(pg, g['x'], g['y'], 160, 40))
        await pg.wait_for_timeout(800)
        p1 = await pg.evaluate(POS, bid)
        print('the body moved and was saved:', p0 != p1, flush=True)
        await pg.keyboard.press('Escape'); await pg.evaluate("async () => (await import('/src/state/selectionStore.ts')).useSelectionStore.getState().clear?.()")
        box = await pg.locator('canvas').first.bounding_box()
        report('orbit drag', await drag(pg, box['x'] + 60, box['y'] + box['height'] - 60, 300, -80))
        errs = [l for l in logs if l.startswith('PAGEERROR')]
        print('page errors:', errs[:3] or 'none')
        try: await b.close()
        except Exception: pass

asyncio.run(main())
