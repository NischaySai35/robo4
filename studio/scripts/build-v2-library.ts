/**
 * build-v2-library.ts — build the v2 shape library (brief §5 L2.5, milestones M2 + M3).
 *
 *   npx tsx scripts/build-v2-library.ts            (seed shapes + 2-module topology gallery)
 *
 * Writes one JSON file per entry into src/robotics/msrr2/library/ and regenerates
 * library/index.ts. Every entry's tags are MEASURED by the static checker on the
 * optimised pose (measuredBy: "static"); nothing is typed in by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Edge, type ShapeEntry, type Config, STRAIGHT } from '../src/robotics/msrr2/model';
import { optimisePose, type TagSpec } from '../src/robotics/msrr2/optimise';
import { enumerateTopologies, topologyLabel } from '../src/robotics/msrr2/topology';
import { checkStatic } from '../src/robotics/msrr2/statics';
import { measureStaticTags } from '../src/robotics/msrr2/tags';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../src/robotics/msrr2/library');
fs.mkdirSync(OUT, { recursive: true });

const e = (am: string, ap: string, bm: string, bp: string): Edge => ({ a: { module: am, port: ap as never }, b: { module: bm, port: bp as never }, slot: 0, locked: true });
const floor = (anchor: string, m: string, p: 'A' | 'B'): Edge => ({ a: { floor: anchor }, b: { module: m, port: p }, slot: 0, locked: true });
const mods = (n: number) => Array.from({ length: n }, (_, i) => `M${i + 1}`);

function entryFrom(id: string, name: string, cfg: Config, extra: Partial<ShapeEntry> = {}): ShapeEntry {
  const r = checkStatic(cfg);
  const tags = measureStaticTags(cfg, r, true);
  return {
    id, name, nModules: cfg.modules.length, topology: cfg.edges, pose: cfg.pose, baseFrame: cfg.baseFrame,
    tags, margins: { maxTorquePct: +r.margins.maxTorquePct.toFixed(1), cogMarginMm: +Math.min(999, r.margins.cogMarginMm).toFixed(1), minJointMarginDeg: +r.margins.minJointMarginDeg.toFixed(1) },
    source: 'seed', ...extra,
    notes: [extra.notes, r.ok ? 'static check: PASS' : `static check: FAIL — ${r.reasons[0]}`].filter(Boolean).join(' · '),
  };
}

function optimised(id: string, name: string, topo: Edge[], n: number, spec: TagSpec, extra: Partial<ShapeEntry> = {}, seed = 1, restarts = 16, iterations = 400): ShapeEntry {
  const t0 = Date.now();
  let best = optimisePose(topo, mods(n), spec, { seed, restarts, iterations });
  // a second, differently-seeded attempt when the first one missed
  if (!best.feasible || best.unmet.length) {
    const again = optimisePose(topo, mods(n), spec, { seed: seed + 100, restarts, iterations });
    if (again.score < best.score) best = again;
  }
  console.log(`${id.padEnd(22)} feasible=${best.feasible} unmet=[${best.unmet.join('; ')}] torque=${best.report.margins.maxTorquePct.toFixed(0)}% cog=${best.report.margins.cogMarginMm.toFixed(0)}mm  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return entryFrom(id, name, best.config, { ...extra, spec, notes: [extra.notes, best.unmet.length ? `unmet: ${best.unmet.join('; ')}` : ''].filter(Boolean).join(' · ') });
}

const entries: ShapeEntry[] = [];
const only = process.argv[2];
const want = (id: string) => !only || only.split(',').some((p) => id.startsWith(p));

// ── 1 module ──
if (want('straight_on_floor')) entries.push(entryFrom('straight_on_floor_1m', 'Straight on the floor', { modules: ['M1'], unused: [], edges: [], pose: { M1: { ...STRAIGHT } } }, { spec: { height_mm: { max: 100 } } }));
if (want('curled_stand')) entries.push(optimised('curled_stand_1m', 'Curled stand', [], 1, { stands_upright: { is: true }, height_mm: { min: 300 } }));
if (want('arch')) entries.push(optimised('arch_1m', 'Arch', [], 1, { spans_gap_mm: { min: 250 }, ground_contacts: { min: 2, max: 2 }, height_mm: { min: 150 } }, { notes: 'stands on its two ends' }));
if (want('inchworm')) entries.push(optimised('inchworm_1m', 'Inchworm (both ends in floor receivers)', [floor('F0', 'M1', 'A'), floor('F1', 'M1', 'B')], 1,
  { height_mm: { min: 120 } }, { behaviour: 'walk_step', notes: 'the walk\'s double-support state: A in F0, B in F1 (250 mm apart)' }));

// ── 2 modules ──
if (want('snake')) entries.push(entryFrom('snake_2m', 'Long snake (end to end)', { modules: ['M1', 'M2'], unused: [], edges: [e('M1', 'B', 'M2', 'A')], pose: { M1: { ...STRAIGHT }, M2: { ...STRAIGHT } } }, { spec: { height_mm: { max: 100 } } }));
if (want('t_anchored')) entries.push(optimised('t_anchored_2m', 'T on a standing module (anchored)', [floor('F1', 'M2', 'A'), e('M1', 'B', 'M2', 'S1B')], 2, { height_mm: { min: 300 } }, { notes: 'M2 stands in a floor receiver, M1 hangs by its end on the spine of M2' }));
if (want('t_stand')) entries.push(optimised('t_stand_2m', 'T-stand (end onto spine)', [e('M2', 'A', 'M1', 'S1B')], 2, { stands_upright: { is: true }, height_mm: { min: 350 } }));
if (want('l_stand')) entries.push(optimised('l_stand_2m', 'L-stand (end to end)', [e('M1', 'B', 'M2', 'A')], 2, { stands_upright: { is: true }, height_mm: { min: 400 }, ground_contacts: { min: 2 } }));
if (want('loop')) entries.push(optimised('loop_2m', 'Low loop / crawler', [e('M1', 'B', 'M2', 'A'), e('M2', 'B', 'M1', 'A')], 2, { encloses: { is: true }, ground_contacts: { min: 2 }, height_mm: { max: 250 } }, { notes: 'two locks close a ring' }, 1, 24, 600));
if (want('tripod')) entries.push(optimised('tripod_2m', 'Tripod (seat)', [e('M2', 'A', 'M1', 'S1B')], 2, { stands_upright: { is: true }, ground_contacts: { min: 3 }, height_mm: { min: 200 }, flat_top_area_cm2: { min: 30 }, holds_load_kg: { min: 0.2 } }));

for (const en of entries) fs.writeFileSync(path.join(OUT, `${en.id}.json`), JSON.stringify(en, null, 1));

// ── the 2-module topology gallery (M2) ──
if (want('topo')) {
  const gallery: ShapeEntry[] = [];
  const topos = [...enumerateTopologies(2, 0), ...enumerateTopologies(2, 1)];
  topos.forEach((t, i) => {
    const en = optimised(`topo2_${String(i + 1).padStart(2, '0')}`, topologyLabel(t), t, 2, { stands_upright: { is: true }, height_mm: { min: 600, weight: 0.3 } }, { source: 'generator', notes: `${t.length} lock(s)` }, 7 + i, 10, 300);
    gallery.push(en);
  });
  fs.writeFileSync(path.join(OUT, 'topologies_n2.json'), JSON.stringify(gallery, null, 1));
}

// ── index.ts: import every entry so the page and the tests can use the library ──
const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && f !== 'topologies_n2.json' && f !== 'demo_plans.json').sort();
const lines = [
  '/* generated by scripts/build-v2-library.ts — do not edit by hand */',
  "import type { ShapeEntry } from '../model';",
  ...files.map((f, i) => `import e${i} from './${f}';`),
  "import topo2 from './topologies_n2.json';",
  `export const LIBRARY: ShapeEntry[] = [${files.map((_, i) => `e${i}`).join(', ')}] as unknown as ShapeEntry[];`,
  'export const TOPOLOGY_GALLERY_N2: ShapeEntry[] = topo2 as unknown as ShapeEntry[];',
  '',
];
if (!fs.existsSync(path.join(OUT, 'topologies_n2.json'))) fs.writeFileSync(path.join(OUT, 'topologies_n2.json'), '[]');
fs.writeFileSync(path.join(OUT, 'index.ts'), lines.join('\n'));
console.log(`wrote ${entries.length} entries; library has ${files.length}`);
