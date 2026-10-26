/**
 * retag-v2-library.ts — re-measure every library entry's tags and margins with the current
 * static checker (no re-optimising), and merge MuJoCo hold results if given.
 *
 *   npx tsx scripts/retag-v2-library.ts                    re-measure static tags
 *   npx tsx scripts/retag-v2-library.ts --scenes OUT.json  also write every entry as a VERIFY scene
 *   npx tsx scripts/retag-v2-library.ts --sim RES.json     merge v2_sim_check.py results (entry.sim)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config, ShapeEntry } from '../src/robotics/msrr2/model';
import { checkStatic } from '../src/robotics/msrr2/statics';
import { measureStaticTags } from '../src/robotics/msrr2/tags';
import { toSimScene } from '../src/robotics/msrr2/simScene';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/robotics/msrr2/library');
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const scenesOut = arg('--scenes'), simIn = arg('--sim');
const sim: Record<string, { ok: boolean; drift_mm: number; max_torque_pct: number; reasons: string[] }> = simIn ? JSON.parse(fs.readFileSync(simIn, 'utf-8')) : {};
const cfgOf = (e: ShapeEntry): Config => ({ modules: Array.from({ length: e.nModules }, (_, i) => `M${i + 1}`), unused: [], edges: e.topology, pose: e.pose, baseFrame: e.baseFrame });
const scenes: Record<string, unknown> = {};

function retag(e: ShapeEntry): ShapeEntry {
  const cfg = cfgOf(e);
  const r = checkStatic(cfg);
  const tags = measureStaticTags(cfg, r, true);
  const notes = (e.notes ?? '').split(' · ').filter((n) => n && !n.startsWith('static check:') && !n.startsWith('MuJoCo'));
  notes.push(r.ok ? 'static check: PASS' : `static check: FAIL — ${r.reasons[0]}`);
  const out: ShapeEntry = { ...e, tags, margins: { maxTorquePct: +r.margins.maxTorquePct.toFixed(1), cogMarginMm: +Math.min(999, r.margins.cogMarginMm).toFixed(1), minJointMarginDeg: +r.margins.minJointMarginDeg.toFixed(1) } };
  const s = sim[e.id];
  if (s) {
    out.sim = { ok: s.ok, driftMm: s.drift_mm, maxTorquePct: s.max_torque_pct, reasons: s.reasons };
    notes.push(s.ok ? `MuJoCo hold: PASS (drift ${s.drift_mm} mm)` : `MuJoCo hold: FAIL — ${s.reasons[0]}`);
  }
  out.notes = notes.join(' · ');
  scenes[e.id] = toSimScene(cfg);
  console.log(`${e.id.padEnd(22)} static ${r.ok ? 'PASS' : 'FAIL'}${s ? `  sim ${s.ok ? 'PASS' : 'FAIL'} drift ${s.drift_mm} mm` : ''}`);
  return out;
}

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json') && x !== 'demo_plans.json')) {
  const p = path.join(DIR, f);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  fs.writeFileSync(p, JSON.stringify(Array.isArray(data) ? data.map(retag) : retag(data), null, 1));
}
if (scenesOut) fs.writeFileSync(scenesOut, JSON.stringify(scenes));
