"""G2 check: topics flow both ways between a Python script and the Studio page, and the script's own messages are not echoed back.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_studio_topics.py
"""
import asyncio, os, sys, time
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gos', 'python'))
sys.path.insert(0, os.path.dirname(__file__))
from gos.studio import StudioLink
from ui_shot import STUDIO_URL

BUS = "(await import('/src/runtime/messageBus.ts')).bus"
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    link = StudioLink(port=8793)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            pg = await b.new_page()
            await pg.goto(f'{STUDIO_URL}?view&gos={link.url}&token={link.token}', wait_until='load', timeout=60000)
            await asyncio.to_thread(link.wait, 30)
            got = []
            r = await asyncio.to_thread(link.subscribe, '/studio/hello', got.append)
            check('the script subscribes to a Studio topic', r.ok, r.message)
            await pg.evaluate(f"async () => {{ {BUS}.publish('/studio/hello', {{ n: 1 }}, 'test'); }}")
            for _ in range(50):
                if got: break
                await asyncio.sleep(0.05)
            check('a Studio message reaches the script', got == [{'n': 1}], str(got))
            await pg.evaluate(f"async () => {{ window.__seen = []; {BUS}.subscribe('/script/cmd', (m) => window.__seen.push(m)); }}")
            link.publish('/script/cmd', {'go': True})
            seen = []
            for _ in range(50):
                seen = await pg.evaluate('window.__seen')
                if seen: break
                await asyncio.sleep(0.05)
            check('a script message reaches the Studio', seen == [{'go': True}], str(seen))
            await asyncio.to_thread(link.subscribe, '/script/cmd', got.append)
            link.publish('/script/cmd', {'go': 2}); await asyncio.sleep(0.4)
            check("the script's own messages are not echoed back", {'go': 2} not in got, str(got))
            r = await asyncio.to_thread(link.subscribe, 'bad', got.append)
            check('a bad topic name is refused with the reason', not r.ok and 'starts with' in r.message, r.message)
            await b.close()
    finally:
        link.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'topics flow both ways between a script and the Studio')
    sys.exit(1 if bad else 0)

asyncio.run(main())
