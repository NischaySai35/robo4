/**
 * Shapes tab — the v2 shape library (M2 gallery + M3 seed library).
 *
 * Every entry is topology + pose (+ behaviour) with tags MEASURED by the static
 * checker on that exact pose. "Show" draws it with the check overlay; "Use as robot"
 * makes it the current robot (the Plan tab plans FROM the current robot).
 */
import { useState } from 'react';
import { useV2Store } from '@/state/msrrV2Store';
import { type ShapeEntry, type Config, type CapabilityTag } from '@/robotics/msrr2/model';
import { LIBRARY, TOPOLOGY_GALLERY_N2 } from '@/robotics/msrr2/library';
import { Section } from '@/features/msrr/MsrrPanel';
import { MarginChips } from './V2Panel';
import { VERIFY_URL } from '@/robotics/msrr2/simScene';
import { manualScene } from '@/robotics/msrr2/manualScenes';
import { SessionBar, ShapeButtons } from './ManualTab';

export const entryConfig = (e: ShapeEntry): Config => ({
  modules: Array.from({ length: e.nModules }, (_, i) => `M${i + 1}`),
  unused: [],
  edges: e.topology,
  pose: e.pose,
  baseFrame: e.baseFrame,
});

const SHOW_TAGS: [CapabilityTag, string, string][] = [
  ['height_mm', 'height', 'mm'], ['ground_contacts', 'feet', ''], ['cog_height_mm', 'CoG', 'mm'],
  ['holds_load_kg', 'load', 'kg'], ['flat_top_area_cm2', 'top', 'cm²'], ['reach_mm', 'reach', 'mm'],
  ['spans_gap_mm', 'span', 'mm'], ['stable_on_tilt_deg', 'tilt', '°'],
];

export function TagBadges({ e }: { e: ShapeEntry }) {
  const t = e.tags;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '4px 0' }}>
      {t.stands_upright?.value === true && <span className="msrr-chip ok">stands</span>}
      {t.encloses?.value === true && <span className="msrr-chip">loop</span>}
      {t.has_free_end?.value === true && <span className="msrr-chip">free end</span>}
      {e.behaviour && <span className="msrr-chip">does: {e.behaviour}</span>}
      {e.sim && <span className={`msrr-chip ${e.sim.ok ? 'ok' : 'bad'}`} title={e.sim.reasons.join('; ') || 'held 2 s in MuJoCo'}>MuJoCo {e.sim.ok ? 'holds' : 'fails'}</span>}
      {SHOW_TAGS.map(([k, label, unit]) => {
        const v = t[k];
        if (!v || v.value === 0) return null;
        return <span key={k} className="msrr-chip" title={`${k}, measured by ${v.measuredBy}`}>{label} <b>{String(v.value)}{unit}</b></span>;
      })}
    </div>
  );
}

function Card({ e }: { e: ShapeEntry }) {
  const show = useV2Store((s) => s.show);
  const setConfig = useV2Store((s) => s.setConfig);
  const pushLog = useV2Store((s) => s.pushLog);
  const pass = /static check: PASS/.test(e.notes ?? '');
  return (
    <div className="msrr-card" data-testid={`shape-${e.id}`} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <b style={{ fontSize: 13 }}>{e.name}</b>
        <span className="msrr-note dim">{e.nModules} module{e.nModules > 1 ? 's' : ''} · {e.topology.length} lock{e.topology.length === 1 ? '' : 's'}</span>
      </div>
      <TagBadges e={e} />
      <MarginChips m={e.margins} ok={pass} />
      {e.notes && <p className="msrr-note dim" style={{ margin: '2px 0' }}>{e.notes}</p>}
      <div className="msrr-row-btns">
        <button className="msrr-btn small" data-testid={`show-${e.id}`} onClick={() => { show(entryConfig(e), true); pushLog(`showing ${e.name}`); }}>Show</button>
        <button className="msrr-btn small" onClick={() => { setConfig(entryConfig(e)); pushLog(`robot is now: ${e.name}`); }}>Use as robot</button>
      </div>
    </div>
  );
}

export function ShapesTab() {
  const [which, setWhich] = useState<'library' | 'topo'>('library');
  return (
    <>
      <PhysicsShapes />
      <div className="msrr-row-btns" style={{ margin: '6px 10px' }}>
        <button className={`msrr-btn small ${which === 'library' ? 'primary' : ''}`} onClick={() => setWhich('library')}>Library ({LIBRARY.length})</button>
        <button className={`msrr-btn small ${which === 'topo' ? 'primary' : ''}`} data-testid="topo-gallery" onClick={() => setWhich('topo')}>All 2-module topologies ({TOPOLOGY_GALLERY_N2.length})</button>
      </div>
      {which === 'library' ? (
        <Section title="Shape library" info={
          <p className="msrr-note">Each shape is a lock graph + a pose, optimised for what it must do, with every tag measured by the static checker (torque, CoG, collisions, limits). Dynamic tags (moving on the floor, speed) need the Python sim.</p>
        }>
          {LIBRARY.map((e) => <Card key={e.id} e={e} />)}
        </Section>
      ) : (
        <Section title="Every distinct 2-module topology" info={
          <p className="msrr-note">2 ways to join two modules with one lock (end↔end, end↔side) and 9 with two locks (closed loops), after removing duplicates by renaming and turning modules over. Each is shown in the tallest stable pose the optimiser found.</p>
        }>
          {TOPOLOGY_GALLERY_N2.map((e) => <Card key={e.id} e={e} />)}
        </Section>
      )}
    </>
  );
}

/** recorded transformations (verify_service /transform?name=NAME&seed=SEED -> logs/tf_NAME_SEED.json) */
const GALLERY = [
  { name: 'cobra2', seed: 2, live: { n: 2, preset: 'chain' as const, skill: 'cobra' }, title: '2 modules, NO floor connectors: lying chain → cobra (one module stands on the other)', note: 'blind brain: encoders + the MPU-6050 on Spine2 · base curls into a C so it cannot roll, the other rises tip first · room on · robot #2 · 7/8 robots stood, 1 partial (weak B4)' },
  { name: 'T2', seed: 1, title: '2 modules: standing → T / brace', note: 'one module walks its free end over and docks into the side of the other · room on · robot #1' },
  { name: 'AB', seed: 2, title: '3 modules: shape A → shape B', note: 'one module unlocks, steps to another floor receiver, docks into a different side receiver · room on · robot #2 · GPU: 61/64 robots (room off)' },
  { name: 'bridge5', seed: 3, title: '3 modules: standing → T → gate', note: 'one module lifts its foot and docks into a third module, spanning two · room OFF · robot #3 · 5/7 robots' },
  { name: 'chain_ABC', seed: 1, title: '3 modules: A → B → C (two changes in a row)', note: 'room OFF (27 Oct) · with the room on, the second change fails: W1 is left sideways and cannot lift itself' },
];

/** G6: shapes searched on the floor-receiver board and BUILT IN REAL PHYSICS (service: /shapes, /build_shape) */
export function PhysicsShapes() {
  const buildShape = useV2Store((s) => s.buildShape);
  const watchTransform = useV2Store((s) => s.watchTransform);
  const manual = useV2Store((s) => s.manual);
  const { manualStart, manualCmd } = useV2Store.getState();
  const busy = useV2Store((s) => s.physBusy);
  const [tf, setTf] = useState<any>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [grown, setGrown] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [results, setResults] = useState<Record<number, any>>({});
  const load = async () => {
    try { const r = await fetch(`${VERIFY_URL}/shapes`); const j = await r.json(); setList(j.shapes); setGrown(j.grown ?? []); setErr(''); }
    catch { setErr('the physics service is not running (py -3.12 C:\\TETROBOT\\sim\\verify_service.py)'); }
  };
  const best = (k: string) => (list ?? []).filter((x) => x.kind === k && x.clear !== false).slice(0, 3);
  return (
    <Section title="Built in physics (G6)" info={<p className="msrr-note">Upright modules on the floor-receiver board, each walker docking its End B into the centre module's spine receivers, only at placements the reach sweep found good. "Build &amp; watch" runs the robot's own docking brain in MuJoCo (magnets, rotors, servos, random errors) and plays it. Takes 1–8 minutes.</p>}>
      {!list && <button className="msrr-btn small" data-testid="phys-shapes-load" onClick={load}>Load shapes</button>}
      {err && <p className="msrr-note bad">{err}</p>}
      {list && (
        <div data-testid="phys-transform">
          <p className="msrr-note"><b>Transformations (watch)</b>: each one is a recorded run in real physics. Every move is the robot's own docking brain
            against contact, magnets and servos; nothing is animated by hand. "room" = the disturbances are on (table shake, bumps, air, cardboard
            receiver play, every magnet different; estimates).</p>
          {GALLERY.map((g) => (
            <div key={g.name} className="msrr-row-btns" style={{ alignItems: 'center' }}>
              <button className="msrr-btn small primary" data-testid={`tf-watch-${g.name}`} disabled={busy} onClick={async () => setTf(await watchTransform(g.seed, g.name))}>{busy ? '…' : 'Watch'}</button>
              {'live' in g && g.live && <button className="msrr-btn small" data-testid={`tf-live-${g.name}`} disabled={busy} title="do it now, live in real physics (same setup, the robot's own skill) - then step back / home / reset below"
                onClick={async () => { await manualStart(manualScene(g.live.n, g.live.preset), { seed: g.seed, randomize: true, disturb: true, judge: 'off' }); manualCmd({ kind: 'skill', name: g.live.skill }); }}>▶ Live</button>}
              <span className="msrr-note"><b>{g.title}</b> <span className="dim">· {g.note}</span></span>
            </div>
          ))}
          {manual && <><SessionBar /><ShapeButtons /></>}
          {tf?.stages && <span className={`msrr-chip ${tf.ok ? 'ok' : 'warn'}`}>{tf.stages.filter((x: any) => x.ok).length}/{tf.stages.length} stages OK</span>}
          <p className="msrr-note dim">Not possible yet (and why): snake (needs end-to-end docking, 0% so far), cube (needs modules folded into a closed box),
            flat table top (one upright cannot carry a module from its upper receiver: it bends over), a module left sticking out sideways cannot lift itself.</p>
        </div>
      )}
      {list && grown.length > 0 && (
        <div>
          <p className="msrr-note"><b>Grown shapes</b> — built module by module; each new module docks into a free spine receiver of the structure (physics-chosen)</p>
          {grown.map((g, gi) => (
            <div key={gi} className="msrr-row-btns" style={{ alignItems: 'center' }}>
              <button className="msrr-btn small primary" data-testid={`phys-grown-${gi}`} disabled={busy} onClick={() => buildShape(g.shape)}>{busy ? '…' : 'Build & watch'}</button>
              <span className="msrr-note"><b>{g.name}</b> <span className="dim">· measured: {g.measured}</span></span>
            </div>
          ))}
        </div>
      )}
      {list && ['star2', 'star3', 'star4'].map((k) => (
        <div key={k}>
          <p className="msrr-note"><b>{k === 'star2' ? '3 modules' : k === 'star3' ? '4 modules' : '5 modules'}</b>: {k.slice(-1)} walkers dock into one upright module</p>
          {best(k).map((x) => (
            <div key={x.index} className="msrr-row-btns" style={{ alignItems: 'center' }}>
              <button className="msrr-btn small" data-testid={`phys-build-${x.index}`} disabled={busy} onClick={async () => { const r = await buildShape(x.index); if (r) setResults((o) => ({ ...o, [x.index]: r })); }}>{busy ? '…' : 'Build & watch'}</button>
              <span className="msrr-note dim">#{x.index} · root spot {x.root} · worst twist {x.worst_twist}°{x.clear === true ? ' · no collisions (static)' : ''}</span>
              {results[x.index] && <span className={`msrr-chip ${results[x.index].locked === results[x.index].of ? 'ok' : 'warn'}`}>{results[x.index].locked}/{results[x.index].of} locked</span>}
            </div>
          ))}
        </div>
      ))}
    </Section>
  );
}
