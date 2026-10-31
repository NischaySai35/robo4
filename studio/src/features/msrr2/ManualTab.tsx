/**
 * ManualTab — drive the robot BY HAND in real physics (C:\TETROBOT\sim\manual.py through verify_service /manual/*).
 *
 * Choose how many modules and how they start (lying chain, standing in floor connectors, standing + lying free, library
 * shapes…), then: move joints with sliders, hover a connector for lock / unlock, or switch to Connect and click two
 * connectors — the modules bend into a stand-off and the robot's own docking brain goes in and locks, if physics lets it.
 * Gravity, contact, friction, magnets, servo limits, a random robot and the room disturbances are ON by default.
 * Sync to the real robot and the camera come later (switches shown, not active yet).
 */
import { useEffect, useRef, useState } from 'react';
import { useV2Store } from '@/state/msrrV2Store';
import { manualScene, MANUAL_PRESETS, libraryStarts, type ManualPreset } from '@/robotics/msrr2/manualScenes';
import { Section, Row } from '@/features/msrr/panelParts';

const JN = ['T1', 'B1', 'B2', 'T2', 'B3', 'B4', 'T3'];
const LIMIT = (j: string) => (j.startsWith('T') ? 176 : 88);

export function ManualTab() {
  const man = useV2Store((s) => s.manual);
  const busy = useV2Store((s) => s.physBusy);
  const err = useV2Store((s) => s.physErr);
  const { manualStart, manualStop, manualCmd, manualSet } = useV2Store.getState();
  const [n, setN] = useState(2);
  const [preset, setPreset] = useState<ManualPreset>('chain');
  const [seed, setSeed] = useState(1);
  const [randomize, setRandomize] = useState(true);
  const [disturb, setDisturb] = useState(true);
  const [judge, setJudge] = useState('off');
  const [mod, setMod] = useState('M1');
  const last = useRef(0);
  const st = man?.state as any;
  const starts = [...MANUAL_PRESETS.filter((p) => n > 1 || (p.id !== 'chain' && p.id !== 'stand_chain' && p.id !== 'stand_lying')), ...libraryStarts(n)];
  const start = () => manualStart(manualScene(n, preset), { seed, randomize, disturb, judge });
  const sendJoint = (j: string, v: number) => {
    const now = performance.now(); if (now - last.current < 80) return; last.current = now;      // the servos follow; don't flood the service
    manualCmd({ kind: 'joints', module: mod, joints: { [j]: v } });
  };
  const ms = st ? Object.keys(st.modules) : [];
  const cur = st?.modules?.[mod];
  return (
    <>
      <Section title="Manual control (real physics)" info={<p className="msrr-note">Everything is real MuJoCo physics: gravity, contact and friction,
        magnets, ST3215 servo speed/torque limits, PLA sag and gear play, the MPU-6050s, a random robot and the room disturbances (table shake,
        bumps, air, cardboard play). A lock only closes if the end is really seated; end↔end turns BOTH centre rotors, end↔side only the end's.</p>}>
        <Row label="modules"><select data-testid="man-n" value={n} onChange={(e) => { const v = +e.target.value; setN(v); setPreset('chain'); }}>{[1, 2, 3, 4].map((k) => <option key={k} value={k}>{k}</option>)}</select></Row>
        <Row label="start as"><select data-testid="man-preset" value={preset} onChange={(e) => setPreset(e.target.value as ManualPreset)}>{starts.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Row>
        <div className="msrr-row-btns">
          <label className="msrr-note"><input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} /> random robot</label>
          <input type="number" style={{ width: 52 }} value={seed} onChange={(e) => setSeed(+e.target.value || 1)} />
          <label className="msrr-note"><input type="checkbox" checked={disturb} onChange={(e) => setDisturb(e.target.checked)} /> room disturbances</label>
        </div>
        <Row label="docking judge"><select value={judge} onChange={(e) => setJudge(e.target.value)}>
          <option value="off">blind: encoders + IMU (the real robot today)</option>
          <option value="truth">physics truth + 1 mm noise (debug only, a cheat)</option>
        </select></Row>
        <div className="msrr-row-btns">
          <label className="msrr-note dim"><input type="checkbox" disabled /> camera (one, any angle) · next</label>
          <label className="msrr-note dim"><input type="checkbox" disabled /> sync to the real robot · later</label>
        </div>
        <div className="msrr-row-btns">
          <button className="msrr-btn small primary" data-testid="man-start" disabled={busy} onClick={start}>{man ? '↻ Restart' : '▶ Start'}</button>
          {man && <button className="msrr-btn small" onClick={manualStop}>■ Stop</button>}
        </div>
        {err && <p className="msrr-note bad">{err}</p>}
      </Section>
      {man && (
        <>
          <Section title="Act">
            <SessionBar />
            <div className="msrr-row-btns">
              {(['move', 'lock', 'connect'] as const).map((m) => (
                <button key={m} data-testid={`man-mode-${m}`} className={`msrr-btn small ${man.mode === m ? 'primary' : ''}`} onClick={() => manualSet({ mode: m, pick: [] })}>{m === 'move' ? 'Move joints' : m === 'lock' ? 'Lock mode' : 'Connect mode'}</button>
              ))}
            </div>
            <p className="msrr-note dim">{man.mode === 'connect' ? `click two connectors in the view${man.pick.length ? ` (first: ${man.pick[0]})` : ''}: the docking end's module bends, lines up and goes in`
              : man.mode === 'lock' ? 'hover a connector: lock it to one that touches it, or unlock it' : 'sliders below: servo targets (0 = straight); hover any connector for its menu'}</p>
            <p className="msrr-note">t {st?.t ?? 0} s · {st?.job ? <b>working: {st.job}</b> : 'idle'}{st?.queued ? ` · ${st.queued} queued` : ''}
              {st?.job && <button className="msrr-btn small" style={{ marginLeft: 8 }} onClick={() => manualCmd({ kind: 'stop' })}>stop job</button>}</p>
            {man.err && <p className="msrr-note bad">{man.err}</p>}
            {st?.locks?.length > 0 && <p className="msrr-note">locked: {st.locks.map((k: string) => (
              <span key={k} className="msrr-chip ok" style={{ marginRight: 4 }}>{k} <a style={{ cursor: 'pointer' }} onClick={() => { const [a, b] = k.split('|'); manualCmd({ kind: 'unlock', a, b }); }}>✕</a></span>))}</p>}
          </Section>
          <ShapeButtons />
          <Section title="Joints">
            <Row label="module"><select value={mod} onChange={(e) => setMod(e.target.value)}>{ms.map((m) => <option key={m}>{m}</option>)}</select></Row>
            {cur && JN.map((j, k) => (
              <div key={j} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 150px', gap: 6, alignItems: 'center' }}>
                <span className="msrr-note">{j}</span>
                <input type="range" min={-LIMIT(j)} max={LIMIT(j)} step={1} defaultValue={cur.target[k]} key={`${man.id}-${mod}-${j}`} data-testid={`man-j-${j}`}
                  onChange={(e) => sendJoint(j, +e.target.value)} onMouseUp={(e) => manualCmd({ kind: 'joints', module: mod, joints: { [j]: +(e.target as HTMLInputElement).value } })} />
                <span className="msrr-note dim">cmd {cur.target[k]}° · is {cur.q[k]}° · {cur.load[k]}%</span>
              </div>
            ))}
          </Section>
          <Section title="What happened">
            <pre className="msrr-note" style={{ whiteSpace: 'pre-wrap', fontSize: 11, maxHeight: 180, overflow: 'auto' }}>{(st?.log ?? []).join('\n') || '—'}</pre>
          </Section>
        </>
      )}
    </>
  );
}

/** the live session's controls (Manual tab AND Shapes tab): step back, home, reset, pause, save / restore */
export function SessionBar() {
  const man = useV2Store((s) => s.manual);
  const busy = useV2Store((s) => s.physBusy);
  const { manualStart, manualCmd } = useV2Store.getState();
  const st = man?.state as any; if (!man) return null;
  const last: string = (st?.log ?? []).at(-1) ?? '';
  return (
    <>
      <p className={`msrr-note ${/NOT|ERROR|cannot|stopped|failed/i.test(last) ? 'bad' : ''}`} data-testid="man-status">
        {st?.job ? <b>⏳ working: {st.job}{st.queued ? ` (+${st.queued} queued)` : ''} — </b> : st?.paused ? <b>paused — </b> : <span className="dim">idle — </span>}{last.trim() || 'nothing done yet'}
      </p>
    <div className="msrr-row-btns">
      <button className="msrr-btn small" data-testid="man-back" disabled={!!st?.job || !st?.steps} title="undo the last action: the robot plays its own commands backwards (locks it closed open again, locks it opened close again)"
        onClick={() => manualCmd({ kind: 'back' })}>⟲ Step back{st?.steps ? ` (${st.steps})` : ''}</button>
      <button className="msrr-btn small" data-testid="man-home" disabled={!!st?.job || !st?.steps} title="transform back to the start shape: the whole session played backwards, in real physics"
        onClick={() => manualCmd({ kind: 'home' })}>⌂ Home (transform back)</button>
      <button className="msrr-btn small" data-testid="man-reset" disabled={busy} title="instantly the start again (same setup, same random robot)"
        onClick={() => manualStart(man.start.scene, man.start.opts)}>⟳ Reset</button>
      <button className="msrr-btn small" data-testid="man-pause" onClick={() => manualCmd({ kind: 'pause', on: !st?.paused })}>{st?.paused ? '▶ Resume' : '❚❚ Pause'}</button>
      <button className="msrr-btn small" disabled={!!st?.job} onClick={() => manualCmd({ kind: 'save' })}>Save state</button>
      <button className="msrr-btn small" disabled={!!st?.job || !st?.saved} onClick={() => manualCmd({ kind: 'restore' })}>Restore state</button>
    </div>
    </>
  );
}

/** become a shape: the robot's OWN skills run live in real physics (manual.py `skill` -> floor_skills.py, blind brain) */
const SHAPES: { name: string; label: string; needs: (locks: string[], n: number) => string | null; note: string }[] = [
  { name: 'cobra', label: 'Cobra', note: 'M1 stands up on M2 (base curls into a C, tip first) · 7/8 random robots in tests',
    needs: (l, n) => (n < 2 || !l.includes('M1.B|M2.A') ? 'needs M1.B locked to M2.A' : l.some((k) => k.startsWith('F:')) ? 'needs the chain lying (no floor connector)' : null) },
  { name: 'twohead', label: 'Two heads', note: 'M2 curls, M1 and M3 both stand up · NOT working yet (the middle cannot curl while dragging two arms)',
    needs: (l, n) => (n < 3 || !l.includes('M1.B|M2.A') || !l.includes('M2.B|M3.A') ? 'needs 3 modules end to end' : null) },
  { name: 'ring', label: 'Ring', note: 'close the chain: M1.A docks into the last module\'s B · NOT locking yet (blind estimate ~37 mm off on the floor)',
    needs: (l, n) => (n < 2 || !l.includes('M1.B|M2.A') ? 'needs a chain end to end' : null) },
  { name: 'straight', label: 'Straighten', note: 'every joint back to 0', needs: () => null },
];

export function ShapeButtons() {
  const man = useV2Store((s) => s.manual);
  const { manualCmd, pushLog } = useV2Store.getState();
  const st = man?.state as any; if (!st) return null;
  const locks: string[] = st.locks ?? []; const n = Object.keys(st.modules ?? {}).length;
  return (
    <Section title="Become a shape (real physics)" info={<p className="msrr-note">Each button runs the robot's own skill live: the blind brain
      (encoders + the MPU-6050 on each Spine2) decides every move; gravity, friction, servos and the room do the rest. Nothing is animated.</p>}>
      {SHAPES.map((s) => {
        const why = s.needs(locks, n);
        return (
          <div key={s.name} className="msrr-row-btns" style={{ alignItems: 'center' }}>
            <button className="msrr-btn small primary" data-testid={`man-shape-${s.name}`} disabled={!!why || !!st.job}
              onClick={() => { manualCmd({ kind: 'skill', name: s.name }); pushLog(`become ${s.label}: the robot's own skill, live in real physics`); }}>{s.label}</button>
            <span className="msrr-note dim">{why ?? s.note}</span>
          </div>
        );
      })}
    </Section>
  );
}

/** the menu next to a hovered connector (drawn over the viewport by MsrrCanvas) */
export function ManualPortMenu() {
  const man = useV2Store((s) => s.manual);
  const { manualCmd, manualSet } = useV2Store.getState();
  const box = useRef<HTMLDivElement>(null);
  const open = !!man?.hover;
  useEffect(() => {                                    // standard menu: a click outside or Esc closes it
    if (!open) return;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) manualSet({ hover: null }); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') manualSet({ hover: null }); };
    const t = setTimeout(() => document.addEventListener('pointerdown', down), 0);
    document.addEventListener('keydown', key);
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [open, manualSet]);
  if (!man?.hover) return null;
  const p = man.ports.find((x) => x.id === man.hover!.id); if (!p) return null;
  const mid = p.id.split('.')[0];
  const near = man.ports.filter((q) => q.id !== p.id && q.id.split('.')[0] !== mid && Math.hypot(q.p[0] - p.p[0], q.p[1] - p.p[1], q.p[2] - p.p[2]) < 0.03
    && (p.kind === 'end' || q.kind === 'end') && !q.locked);
  const close = () => manualSet({ hover: null });
  return (
    <div ref={box} className="msrr-note" style={{ position: 'absolute', left: man.hover.x + 14, top: man.hover.y + 14, background: 'rgba(20,24,32,0.94)', color: '#eee', padding: '6px 8px', borderRadius: 6, zIndex: 20, minWidth: 170 }}>
      <b>{p.id}</b> <span className="dim">({p.kind === 'end' ? 'end connector' : p.kind === 'side' ? 'spine receiver' : 'floor receiver'})</span>
      <a style={{ float: 'right', cursor: 'pointer' }} onClick={close}>✕</a>
      <div>{p.locked ? <>locked to <b>{p.locked}</b></> : 'free'}</div>
      <div className="msrr-row-btns" style={{ marginTop: 4 }}>
        {p.locked && <button className="msrr-btn small" onClick={() => { manualCmd({ kind: 'unlock', a: p.id, b: p.locked }); close(); }}>Unlock ({p.kind === 'end' && p.locked.match(/\.(A|B)$/) ? 'both rotors' : 'end rotor'})</button>}
        {near.map((q) => <button key={q.id} className="msrr-btn small" onClick={() => { manualCmd({ kind: 'lock', a: p.id, b: q.id }); close(); }}>Lock with {q.id}</button>)}
        {!p.locked && <button className="msrr-btn small primary" onClick={() => { manualSet({ mode: 'connect', pick: [p.id], hover: null }); }}>Connect from here…</button>}
      </div>
    </div>
  );
}
