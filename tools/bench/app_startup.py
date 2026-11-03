"""How fast the built app opens, and which graphics card it draws on.

usage: py -3.12 tools/bench/app_startup.py PATH\\TETROBOT.exe [extra app switches...]
Starts the app with a debugging port, connects to it, and times: window page loaded, and the 3D view's first frame.
Then closes the app (its physics service closes with it).
"""
# REUSE-CHECKED: startup|launch|electron|time to first frame -> test_clean_install checks the Python side only; g0_idle and
# editor_drag open the dev server in a test browser, not the built app. This drives the real exe over its debugging port.
import asyncio, os, socket, subprocess, sys, time
from playwright.async_api import async_playwright

RENDERER = """() => { const c = document.querySelector('canvas'); const g = c && (c.getContext('webgl2') || c.getContext('webgl'));
  const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '(no WebGL canvas)'; }"""


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close(); return port


async def main(exe, extra):
    port = free_port(); t0 = time.perf_counter()
    env = {k: v for k, v in os.environ.items() if k != 'ELECTRON_RUN_AS_NODE'}  # set inside VS Code; it turns the app into plain Node
    proc = subprocess.Popen([exe, f'--remote-debugging-port={port}', *extra], env=env)
    try:
        async with async_playwright() as p:
            for _ in range(200):  # the debugging port opens a moment after the process starts
                try: b = await p.chromium.connect_over_cdp(f'http://127.0.0.1:{port}'); break
                except Exception: await asyncio.sleep(0.1)
            else: sys.exit('the app never opened its debugging port')
            while not (b.contexts and b.contexts[0].pages): await asyncio.sleep(0.05)
            pg = b.contexts[0].pages[0]
            await pg.wait_for_load_state('load'); t_load = time.perf_counter() - t0
            await pg.wait_for_selector('canvas', timeout=60000)
            await pg.evaluate("() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))"); t_frame = time.perf_counter() - t0
            print(f'page loaded {t_load:.1f} s after start, first 3D frame at {t_frame:.1f} s')
            print('draws on:', await pg.evaluate(RENDERER))
    finally:
        proc.terminate()
        try: proc.wait(10)
        except subprocess.TimeoutExpired: proc.kill()

asyncio.run(main(sys.argv[1], sys.argv[2:]))
