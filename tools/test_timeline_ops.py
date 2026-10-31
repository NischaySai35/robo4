"""P6 check: the Timeline's buttons and scripts run the same commands (key, play, stop, add clip, clear).

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_timeline_ops.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio
from ui_baseline import ADD_MODULE

STATE = """async () => { const { useAnimationStore: a } = await import('/src/state/animationStore.ts'); const s = a.getState();
  return { keys: s.keyTimes().length, clips: s.clips.length, playing: s.playing, sequence: s.sequence, playhead: s.playhead }; }"""
PAGE = "async () => (await import('/src/state/pageStore.ts')).usePageStore.getState().setPage('animation')"
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1000)
        await pg.evaluate(PAGE); await pg.wait_for_timeout(1500)
        state = lambda: pg.evaluate(STATE)
        s0 = await state()
        await pg.locator('.tl-key:visible').first.click(); await pg.wait_for_timeout(200)
        s = await state()
        check('the Key button adds a key', s['keys'] == s0['keys'] + 1, f"{s0['keys']} to {s['keys']}")
        # a second key time, so scripts can be seen adding one too
        await pg.evaluate("async () => (await import('/src/state/animationStore.ts')).useAnimationStore.getState().setPlayhead(1)")
        r = await pg.evaluate("window.tetrobotOps.run('anim.key.joints')"); await pg.wait_for_timeout(200)
        check('a script adds a key with the same code', r['ok'] and (await state())['keys'] == s['keys'] + 1, str(r)[:80])
        await pg.locator('button[title^="Play / pause"]:visible').first.click(); await pg.wait_for_timeout(300)
        check('the Play button plays', (await state())['playing'])
        await pg.evaluate("window.tetrobotOps.run('anim.play')"); await pg.wait_for_timeout(200)
        check('a script pauses', not (await state())['playing'])
        await pg.evaluate("window.tetrobotOps.run('anim.playAll')"); await pg.wait_for_timeout(200)
        s = await state()
        check('a script plays all clips', s['playing'] and s['sequence'], str(s))
        await pg.locator('button[title="Stop"]:visible').first.click(); await pg.wait_for_timeout(200)
        check('the Stop button stops', not (await state())['playing'])
        c0 = (await state())['clips']
        await pg.locator('.tl-addclip:not(.tl-addclip--inline):visible').first.click(); await pg.wait_for_timeout(200)
        check('the Add clip button adds a clip', (await state())['clips'] == c0 + 1)
        r = await pg.evaluate("window.tetrobotOps.run('anim.clear')")
        check('clearing an empty clip is refused with a reason', not r['ok'] and bool(r.get('error')), str(r)[:90])
        await pg.evaluate("window.tetrobotOps.run('anim.key')")
        r = await pg.evaluate("window.tetrobotOps.run('anim.clear')")
        check('a script clears the keys', r['ok'] and (await state())['keys'] == 0, str(r)[:80])
        problems = [l for l in logs if 'PAGEERROR' in l]
        check('no page errors', not problems, str(problems[:2]))
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'Timeline commands work')
    sys.exit(1 if bad else 0)

asyncio.run(main())
