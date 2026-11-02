"""GOS G2 budget, Studio side: message round trip Python -> Studio -> Python, and a 60 Hz joint stream into the 3D view.

usage (dev server running): $env:STUDIO_URL='http://127.0.0.1:5183/'; [$env:MODULES=10;] py -3.12 tools/bench/g2_studio.py
Real GPU. Prints round-trip times and how many joint updates the page drew per second, with its frame rate.
"""
# REUSE-CHECKED: bench|latency|round trip|studio link -> tools/bench/g0_* measure Python and idle drawing only; test_studio_topics checks
# correctness, not speed. This times the same link (gos.studio.StudioLink).
import asyncio, os, statistics, sys, threading, time
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'gos', 'python'))
from ui_shot import STUDIO_URL
from ui_baseline import ADD_MODULE
from gos.studio import StudioLink

ECHO = "async () => { const { bus } = await import('/src/runtime/messageBus.ts'); bus.subscribe('/bench/ping', (m) => bus.publish('/bench/pong', m, 'bench')); }"
COUNT = """async () => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); window.__b = { poses: 0, frames: 0 };
  m.subscribe((s, p) => { if (s.doc !== p.doc) window.__b.poses++; }); const f = () => { window.__b.frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); }"""


async def main():
    link = StudioLink(port=8796)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-angle=d3d11', '--ignore-gpu-blocklist'])
            pg = await b.new_page(viewport={'width': 1600, 'height': 950})
            await pg.goto(f'{STUDIO_URL}?view&gos={link.url}&token={link.token}', wait_until='load', timeout=60000)
            await asyncio.to_thread(link.wait, 30)
            await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1500)
            for _ in range(int(os.environ.get('MODULES', '1')) - 1):  # MODULES=10: a bigger robot
                await pg.evaluate("window.tetrobotOps.run('module.add')"); await pg.wait_for_timeout(300)
            await pg.evaluate(ECHO)
            back, rtt = threading.Event(), []
            link.subscribe('/bench/pong', lambda m: back.set())
            for i in range(200):
                back.clear(); t = time.perf_counter(); link.publish('/bench/ping', {'i': i})
                if back.wait(1): rtt.append((time.perf_counter() - t) * 1000)
                await asyncio.sleep(0.005)
            rtt.sort()
            print(f'round trip Python -> Studio -> Python, {len(rtt)} of 200: median {statistics.median(rtt):.2f} ms, 95% {rtt[int(len(rtt) * .95)]:.2f} ms, worst {rtt[-1]:.2f} ms')
            names = await pg.evaluate("async () => { const { useModelStore: m } = await import('/src/state/modelStore.ts'); const { exportMjcf } = await import('/src/core/gos/graphCore.ts'); return Object.values(exportMjcf(m.getState().doc, 'robot').jointNames); }")
            await pg.evaluate(COUNT)
            stop = threading.Event()

            def stream():  # 60 Hz joint poses, as a simulation would send
                k = 0
                while not stop.is_set():
                    link.joints(names, [0.4 * __import__('math').sin(k / 20 + i) for i in range(len(names))]); k += 1; time.sleep(1 / 60)
            await pg.wait_for_timeout(500); await pg.evaluate("() => { window.__b.poses = 0; window.__b.frames = 0; }")
            threading.Thread(target=stream, daemon=True).start()
            await pg.wait_for_timeout(3000)
            r = await pg.evaluate("() => ({ ...window.__b })"); stop.set()
            print(f'joint stream at 60 Hz: the page applied {r["poses"] / 3:.0f} poses a second and drew {r["frames"] / 3:.0f} frames a second ({len(names)} joints, JSON)')
            await b.close()
    finally:
        link.close()

asyncio.run(main())
