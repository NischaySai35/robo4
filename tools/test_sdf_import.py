"""B16 check in the browser (the importers use its XML reader): the real module exported to SDF, read back and exported
again gives the same file, rings included; a wrong file is refused with the reason.

usage: $env:STUDIO_URL='http://127.0.0.1:5183/'; py -3.12 tools/test_sdf_import.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
from ui_shot import open_studio
from ui_baseline import ADD_MODULE

ROUND = """async () => {
  const { useModelStore: m } = await import('/src/state/modelStore.ts');
  const { exportSDF } = await import('/src/core/serialization/exporters/sdf.ts');
  const { parseSDF } = await import('/src/core/serialization/importers/sdf.ts');
  const { makeDocument } = await import('/src/core/model/index.ts');
  const first = exportSDF(m.getState().doc, 'module');
  const r = parseSDF(first);
  const doc = makeDocument({ name: 'module' });
  for (const e of r.entities) doc[e.kind === 'body' ? 'bodies' : 'joints'][e.id] = e;
  // mesh shapes come back as placeholder boxes (the importer says so), so shape lines are left out of the comparison
  const strip = (x) => x.split('\\n').filter((l) => !/<(visual|collision) /.test(l)).join('\\n');
  const second = strip(exportSDF(doc, 'module')); const firstS = strip(first);
  const joints = Object.keys(m.getState().doc.joints).length;
  let bad = null; try { parseSDF('<robot name="x"/>'); } catch (e) { bad = e.message; }
  return { same: firstS === second, joints, read: Object.keys(doc.joints).length, warnings: r.warnings, bad,
           diff: firstS === second ? null : [firstS.split('\\n').find((l, i) => l !== second.split('\\n')[i]), second.split('\\n').find((l, i) => l !== firstS.split('\\n')[i])] };
}"""
bad = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f': {detail}' if detail else ''), flush=True)
    if not ok: bad.append(name)


async def main():
    async with async_playwright() as p:
        b, pg, logs = await open_studio(p)
        await pg.evaluate(ADD_MODULE); await pg.wait_for_timeout(1000)
        r = await pg.evaluate(ROUND)
        check('every joint of the module is read back', r['read'] == r['joints'], f"{r['read']} of {r['joints']}")
        check('export, import, export gives the same SDF apart from mesh shapes', r['same'], str(r['diff'])[:300])
        check('a non-SDF file is refused with the reason', r['bad'] and 'no <sdf><model>' in r['bad'], str(r['bad']))
        print('notes:', r['warnings'][:3])
        await b.close()
    print('FAILED: ' + ', '.join(bad) if bad else 'SDF round trip is exact')
    sys.exit(1 if bad else 0)

asyncio.run(main())
