"""Click every safe button on one page and report what went wrong.

For each visible button: has it a name (text, title or aria-label)? Does it show the hand cursor? Clicking it: any page
error or console error? Did anything on screen change? After each click Esc closes menus, and the page is reopened if the
click left it. Buttons that could move motors, talk to hardware, delete, or overwrite files are skipped by name.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/ui_click_all.py PAGE [OUT.json]
PAGE: editor, analysis, training, animation, esptt, motor, msrr_robot, msrr_shapes, msrr_plan, msrr_ask, msrr_run, msrr_manual
"""
import asyncio, json, os, re, sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio
from ui_baseline import ADD_MODULE, PAGES, MSRR_TABS, go

SKIP = re.compile(r'connect|scan|stream|send|torque|e-?stop|home all|^go$|flash|upload|delete|remove|clear|reset|unassign|train|'
                  r'export|render|import|save|load|open bag|record|quit|exit|calibrat|explore|navigate|mission|^stop|■|180°|t\.on|'
                  r'✕|×|⤓|disconnect|real physics|plan \+ execute|ask|send|dry run|rehearse|watch|build|install|update|restart|'
                  r'delete|wipe|overwrite|new project|close|home|set current|api|board|esp|wifi|ota|pair|bind|apply to robot', re.I)  # home: on ESP-TTL it overwrites the board's saved homes
LIST = """() => [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b);
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; })
  .map((b, i) => ({ i, name: (b.getAttribute('aria-label') || b.textContent || b.title || '').trim().replace(/\\s+/g, ' ').slice(0, 50),
    title: b.title || '', disabled: b.disabled, cursor: getComputedStyle(b).cursor, top: b.closest('nav, header, .topbar, .app-header') ? 1 : 0 }))"""
SNAP = "() => { const t = document.body.innerText; let h = 0; for (let i = 0; i < t.length; i += 7) h = (h * 31 + t.charCodeAt(i)) | 0; const on = [...document.querySelectorAll('[aria-pressed=true],[aria-expanded=true],[class*=--on],[class*=active],.on')].length; return [t.length, h, on]; }"
CLICK = "(i) => { const v = [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; }); const b = v[i]; if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true; }"


async def view(pg):
    """The visible 3D view as bytes, so buttons that only change the picture count as doing something."""
    c = pg.locator('canvas:visible').first
    try: return await c.screenshot(timeout=2000)
    except Exception: return b''


async def open_page(pg, page):
    if page.startswith('msrr_'):
        await go(pg, 'MSRR Experiments'); await pg.wait_for_timeout(800)
        tab = next(t for t in MSRR_TABS if t.lower() == page[5:])
        await pg.locator('.msrr-tab', has_text=tab).first.click(); await pg.wait_for_timeout(500)
    else:
        await go(pg, dict(PAGES)[page])


async def main(page, out):
    report = {'page': page, 'clicked': [], 'skipped': [], 'errors': [], 'no_name': [], 'no_pointer': [], 'no_change': []}
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p, real_gpu=True)
        pg.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1500)
        await open_page(pg, page); await pg.wait_for_timeout(800)
        base = [x for x in await pg.evaluate(LIST) if not x['top']]
        seen, t0 = set(), time.time()
        for x in base:
            label = x['name'] or x['title']
            if not label: report['no_name'].append(x['i'])
            if not x['disabled'] and x['cursor'] != 'pointer': report['no_pointer'].append(label)
        for x in base:
            if time.time() - t0 > 85: report['skipped'].append('(time limit) remaining buttons'); break
            label = x['name'] or x['title'] or f"#{x['i']}"
            key = (label, x['i'])
            if key in seen or x['disabled']: continue
            seen.add(key)
            if SKIP.search(label): report['skipped'].append(label); continue
            now = [y for y in await pg.evaluate(LIST) if not y['top']]
            idx = next((y['i'] for y in now if (y['name'] or y['title']) == (x['name'] or x['title'])), None)
            if idx is None: continue
            before, view0, n_logs = await pg.evaluate(SNAP), await view(pg), len(logs)
            await pg.evaluate(CLICK, idx); await pg.wait_for_timeout(350)
            after = await pg.evaluate(SNAP)
            # the offline Studio cannot resolve some network names; that is not the button's doing
            errs = [l for l in logs[n_logs:] if (l.startswith('PAGEERROR') or l.startswith('error')) and 'ERR_NAME_NOT_RESOLVED' not in l]
            if errs: report['errors'].append({'button': label, 'error': errs[0][:220]})
            if after == before and await view(pg) == view0: report['no_change'].append(label)
            report['clicked'].append(label)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(120)
            # back to the page if the click left it
            try:
                await open_page(pg, page) if page.startswith('msrr_') else await go(pg, dict(PAGES)[page])
            except Exception:
                pass
        try: await b.close()
        except Exception: pass  # the browser sometimes drops the connection while closing; the report is already complete
    if out:
        with open(out, 'w', encoding='utf-8') as f: json.dump(report, f, indent=1)
    print(f"{page}: {len(report['clicked'])} clicked, {len(report['skipped'])} skipped, {len(report['errors'])} with errors, "
          f"{len(report['no_name'])} without a name, {len(report['no_pointer'])} without the hand cursor, {len(report['no_change'])} with no visible change")
    for e in report['errors']: print('  ERROR', e['button'], '->', e['error'])
    if report['no_pointer']: print('  no hand cursor:', report['no_pointer'][:10])
    if report['no_change']: print('  no visible change:', report['no_change'][:25])
    sys.exit(1 if report['errors'] else 0)

asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
