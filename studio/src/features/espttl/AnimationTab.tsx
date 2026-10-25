/**
 * AnimationTab — record poses from the real arm, arrange them on a timeline, play them back.
 *
 * The whole sequence lives on the laptop (see timelineStore); the board only ever receives
 * "go to these angles". That is what makes undo, drag-reorder and import/export possible at
 * all — none of it would fit in the ESP32's RAM, and none of it needs to.
 */
import React, { useRef, useState } from 'react';
import { useEspTtlStore, currentPose, ttlTry } from '@/state/espTtlStore';
import { useTimelineStore, type Frame } from './timelineStore';
import { playTimeline, stopPlayback, gotoFrame } from './player';
import { sendToBoard, startOnBoard, stopOnBoard } from './sender';
import { planTimeline, peakDegPerS, type FramePlan } from './motion';
import { useSavedStore, type SavedAnimation } from './savedStore';

export default function AnimationTab() {
  const tel      = useEspTtlStore(s => s.tel);
  const online   = useEspTtlStore(s => s.online);
  const t        = useTimelineStore();
  const [msg, setMsg]   = useState<string>('');
  const [sending, setSending] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saved   = useSavedStore();
  const [naming, setNaming]     = useState(false);
  const [saveName, setSaveName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  const say = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(x => (x === m ? '' : x)), 4000); };
  const call = async (path: string, label: string) => {
    const r = await ttlTry(path);
    say(r.ok ? `${label} ok` : `${label} failed: ${r.error}`);
  };

  const servos = tel?.servos ?? [];
  const sel    = t.frames.find(f => f.id === t.selectedId) || null;
  const selIdx = sel ? t.frames.indexOf(sel) : -1;
  const plans: FramePlan[] = planTimeline(t.frames, t.globalSpeed, t.globalDelayMs, t.sine, currentPose());

  // ── record ──────────────────────────────────────────────────────────────────
  const record = () => {
    const pose = currentPose();
    if (!Object.keys(pose).length) { say('nothing to record — no servo is reporting an angle'); return; }
    t.addFrame(pose);
    say(`recorded ${Object.keys(pose).length} joint(s)`);
  };

  // ── send the whole sequence to the board ────────────────────────────────────
  // Upload first, and only start it if the board confirms it received every frame. The
  // board checks a declared count and checksum, so a truncated upload is refused rather
  // than played as a half sequence.
  const send = async () => {
    setSending(true);
    const up = await sendToBoard();
    if (!up.ok) { setSending(false); say(`send failed: ${up.error}`); return; }
    const go = await startOnBoard(0);
    setSending(false);
    say(go.ok
      ? `sent ${up.frames} frames — the board is running it on its own now`
      : `uploaded ${up.frames} frames but could not start: ${go.error}`);
  };

  // ── import / export ─────────────────────────────────────────────────────────
  const exportFile = () => {
    const blob = new Blob([t.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `timeline-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    say(`exported ${t.frames.length} frame(s)`);
  };

  const importFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const res = t.importJson(String(r.result || ''));
      say(res.ok ? `imported ${res.count} frame(s)` : `import failed: ${res.error}`);
    };
    r.readAsText(file);
  };

  // ── saved animations (kept inside TETROBOT) ─────────────────────────────────
  const commitSave = () => {
    const e = saved.save(t.exportJson(), saveName);
    if (!e) { say('nothing to save — the timeline is empty'); return; }
    setNaming(false); setSaveName('');
    say(`saved “${e.name}” (${e.data.frames.length} frames)`);
  };

  /** Put a saved animation on the timeline. Goes through importJson, so Undo brings back what was there. */
  const loadSaved = (s: SavedAnimation): boolean => {
    const res = t.importJson(JSON.stringify(s.data));
    say(res.ok ? `loaded “${s.name}” — ${res.count} frame(s); Undo restores the previous timeline` : `load failed: ${res.error}`);
    return res.ok;
  };

  const sendSaved = async (s: SavedAnimation) => {
    if (!loadSaved(s)) return;
    await send();
  };

  const commitRename = () => {
    if (renaming) saved.rename(renaming, renameVal);
    setRenaming(null);
  };

  // ── drag to reorder ─────────────────────────────────────────────────────────
  const onDrop = (to: number) => {
    if (drag != null && drag !== to) t.moveFrame(drag, to);
    setDrag(null); setOver(null);
  };

  return (
    <div className="ettl-anim">
      {/* ── global controls ─────────────────────────────────────────────────── */}
      <div className="ettl-card">
        <h4>Global control</h4>
        <div className="ettl-row">
          <button className="ettl-btn danger big" onClick={() => call('/api/command?servo=all&cmd=estop', 'E-STOP')}>
            E-STOP ALL
          </button>
          <button className="ettl-btn" onClick={() => call('/api/torque?on=1', 'torque on')}>Torque ON</button>
          <button className="ettl-btn" onClick={() => call('/api/torque?on=0', 'torque off')}>Torque OFF (limp)</button>
          <span className="ettl-sep" />
          <button className="ettl-btn" onClick={() => call('/api/home', 'home 180')}>Home all → 180°</button>
          <button className="ettl-btn accent" onClick={() => call('/api/home/manual', 'manual home')}>Go to manual home</button>
          <button className="ettl-btn" onClick={() => call('/api/home/set', 'set home')}>Set current as home</button>
        </div>
        <div className="ettl-row">
          <label className="ettl-lbl">speed
            <input type="range" min={1} max={10} value={t.globalSpeed}
                   onChange={e => t.setGlobalSpeed(+e.target.value)} />
            <b>{t.globalSpeed}</b> <span className="ettl-dim">≤ {Math.round(peakDegPerS(t.globalSpeed))}°/s</span>
          </label>
          <label className={`ettl-toggle ${t.globalDelayMs === 0 ? 'on' : ''}`}
                 title="Auto: each frame takes as long as its biggest joint move needs at this speed">
            <input type="checkbox" checked={t.globalDelayMs === 0}
                   onChange={e => t.setGlobalDelay(e.target.checked ? 0 : 2000)} />
            <span />Auto time
          </label>
          <label className="ettl-lbl" style={{ opacity: t.globalDelayMs === 0 ? 0.45 : 1 }}>move time
            <input type="number" min={0} step={100} value={t.globalDelayMs} disabled={t.globalDelayMs === 0}
                   onChange={e => t.setGlobalDelay(+e.target.value)} /> ms
          </label>
          <label className="ettl-lbl" title="Pause after the joints have arrived, before the next frame">pause
            <input type="number" min={0} step={100} value={t.globalHoldMs}
                   onChange={e => t.setGlobalHold(+e.target.value)} /> ms
          </label>
          <label className={`ettl-toggle ${t.sine ? 'on' : ''}`} title="Ease in and out instead of a flat run">
            <input type="checkbox" checked={t.sine} onChange={e => t.setSine(e.target.checked)} />
            <span />Sine motion
          </label>
          <label className={`ettl-toggle ${t.loop ? 'on' : ''}`}>
            <input type="checkbox" checked={t.loop} onChange={e => t.setLoop(e.target.checked)} />
            <span />Loop
          </label>
        </div>
        <p className="ettl-hint">
          <b>Send to board</b> uploads the whole sequence and hands over timing — once the
          board has it, a poor Wi-Fi link cannot stutter the motion, because nothing is being
          streamed. It only runs if every frame arrived intact (checked by count and checksum).
          <b> Stream from laptop</b> is the old behaviour, useful when you are still tweaking
          frames and want each edit to take effect immediately.
        </p>
        <p className="ettl-hint">
          <b>Time is the control; speed is only a maximum.</b> Speed is the fastest any joint
          may go (speed 4 = 72°/s), with a matching acceleration limit. Each joint gets one command per frame and
          the servo runs the move itself; <b>Sine motion</b> gives long, soft speed-up and
          slow-down ramps. Every joint finishes together at the move
          time; if the move cannot fit at this speed the frame stretches (<b>⚠ 2500 → 3100 ms</b>)
          instead of being cut off. <b>Auto time</b> = the shortest time the speed allows. The
          next frame starts when the joints have actually arrived, then the <b>pause</b> runs.
        </p>
      </div>

      {/* ── saved animations ────────────────────────────────────────────────── */}
      <div className="ettl-card">
        <h4>Saved animations · {saved.items.length}</h4>
        {!saved.items.length ? (
          <div className="ettl-empty">
            Nothing saved yet. Build a sequence below and press <b>Save to local</b> — it is kept
            inside TETROBOT and comes back here, ready to load and send.
          </div>
        ) : (
          <div className="ettl-saved-grid">
            {saved.items.map(s => (
              <div key={s.id} className="ettl-saved" onClick={() => renaming !== s.id && loadSaved(s)}
                   title="click to load onto the timeline">
                {renaming === s.id ? (
                  <input autoFocus value={renameVal} maxLength={60}
                         onClick={e => e.stopPropagation()}
                         onChange={e => setRenameVal(e.target.value)}
                         onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }}
                         onBlur={commitRename} />
                ) : (
                  <div className="ettl-saved-name">{s.name}</div>
                )}
                <div className="ettl-saved-meta">
                  {s.data.frames.length} frame{s.data.frames.length === 1 ? '' : 's'} · {new Date(s.savedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div className="ettl-saved-btns" onClick={e => e.stopPropagation()}>
                  <button className="ettl-btn tiny accent" onClick={() => loadSaved(s)}>Load</button>
                  <button className="ettl-btn tiny" disabled={!online || sending}
                          onClick={() => void sendSaved(s)} title="Load onto the timeline and send to the board">Send</button>
                  <button className="ettl-btn tiny" onClick={() => { setRenaming(s.id); setRenameVal(s.name); }}>Rename</button>
                  <button className="ettl-btn tiny danger" onClick={() => {
                    if (confirm(`Delete saved animation “${s.name}”?`)) saved.remove(s.id);
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── transport ───────────────────────────────────────────────────────── */}
      <div className="ettl-card">
        <h4>Timeline · {t.frames.length} frame{t.frames.length === 1 ? '' : 's'}</h4>
        <div className="ettl-row">
          <button className="ettl-btn rec" onClick={record} disabled={!online}>● Record pose</button>
          <button className="ettl-btn accent" onClick={send}
                  disabled={!t.frames.length || !online || sending}>
            {sending ? 'Sending…' : `⇪ Send to board (${t.frames.length})`}
          </button>
          <button className="ettl-btn danger" onClick={() => { void stopOnBoard(); stopPlayback(); }}>■ Stop</button>
          {t.playing
            ? <button className="ettl-btn" onClick={stopPlayback}>stop streaming</button>
            : <button className="ettl-btn" onClick={() => playTimeline(0, say)}
                      disabled={!t.frames.length || !online}
                      title="Play from the laptop instead — every frame boundary goes over Wi-Fi">
                ▶ Stream from laptop
              </button>}
          <span className="ettl-sep" />
          <button className="ettl-btn" onClick={t.undo} disabled={!t.canUndo()} title="Undo">↶ Undo</button>
          <button className="ettl-btn" onClick={t.redo} disabled={!t.canRedo()} title="Redo">↷ Redo</button>
          <span className="ettl-sep" />
          <button className="ettl-btn accent" onClick={() => setNaming(v => !v)} disabled={!t.frames.length}
                  title="Keep this timeline inside TETROBOT (see Saved animations above)">💾 Save to local</button>
          <button className="ettl-btn" onClick={exportFile} disabled={!t.frames.length}>Export .json</button>
          <button className="ettl-btn" onClick={() => fileRef.current?.click()}>Import</button>
          <input ref={fileRef} type="file" accept=".json,.txt,application/json,text/plain"
                 style={{ display: 'none' }}
                 onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
          <button className="ettl-btn danger" onClick={() => {
            if (t.frames.length && confirm(`Delete all ${t.frames.length} frames? Undo can bring them back.`)) t.clearAll();
          }} disabled={!t.frames.length}>Clear</button>
        </div>

        {naming && (
          <div className="ettl-row">
            <label className="ettl-lbl">name
              <input autoFocus value={saveName} maxLength={60} style={{ width: 220 }}
                     placeholder="optional — blank = automatic name"
                     onChange={e => setSaveName(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') commitSave(); if (e.key === 'Escape') setNaming(false); }} />
            </label>
            <button className="ettl-btn accent" onClick={commitSave}>Save</button>
            <button className="ettl-btn" onClick={() => setNaming(false)}>Cancel</button>
          </div>
        )}

        {!t.frames.length ? (
          <div className="ettl-empty">
            No frames yet. Limp the arm (<b>Torque OFF</b>), pose it by hand, then press
            <b> ● Record pose</b>. Repeat for each key position.
          </div>
        ) : (
          <div className="ettl-track">
            {t.frames.map((f, i) => (
              <FrameCard
                key={f.id} f={f} i={i}
                selected={t.selectedId === f.id}
                playing={t.playIdx === i}
                dragOver={over === i}
                globalSpeed={t.globalSpeed} globalDelay={t.globalDelayMs} globalHold={t.globalHoldMs}
                plan={plans[i]}
                onSelect={() => t.select(t.selectedId === f.id ? null : f.id)}
                onGo={() => gotoFrame(f, say)}
                onDup={() => t.duplicate(f.id)}
                onDel={() => t.deleteFrame(f.id)}
                onPlayFrom={() => playTimeline(i, say)}
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => { e.preventDefault(); setOver(i); }}
                onDrop={() => onDrop(i)}
                onDragEnd={() => { setDrag(null); setOver(null); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── per-frame editor ────────────────────────────────────────────────── */}
      {sel && (
        <div className="ettl-card">
          <h4>Edit · {sel.name}</h4>
          <div className="ettl-row">
            <label className="ettl-lbl">name
              <input value={sel.name} style={{ width: 160 }}
                     onChange={e => t.updateFrame(sel.id, { name: e.target.value })} />
            </label>
            <label className="ettl-lbl">speed
              <input type="number" min={1} max={10} placeholder={String(t.globalSpeed)}
                     value={sel.speed ?? ''} style={{ width: 70 }}
                     onChange={e => t.updateFrame(sel.id, { speed: e.target.value === '' ? null : +e.target.value })} />
              <span className="ettl-dim">{sel.speed == null ? `global (${t.globalSpeed})` : 'override'}</span>
            </label>
            <label className="ettl-lbl">move time
              <input type="number" min={0} step={100} placeholder={t.globalDelayMs === 0 ? 'auto' : String(t.globalDelayMs)}
                     value={sel.delayMs ?? ''} style={{ width: 90 }}
                     onChange={e => t.updateFrame(sel.id, { delayMs: e.target.value === '' ? null : +e.target.value })} />
              <span className="ettl-dim">
                {sel.delayMs == null ? `global (${t.globalDelayMs === 0 ? 'auto' : t.globalDelayMs + ' ms'})`
                  : sel.delayMs === 0 ? 'auto' : 'override'} · 0 = auto
                {plans[selIdx] && ` · plans ${plans[selIdx].ms} ms${plans[selIdx].stretched ? ' (stretched: needs ≥ ' + plans[selIdx].minMs + ')' : ''}`}
              </span>
            </label>
            <label className="ettl-lbl">pause after
              <input type="number" min={0} step={100} placeholder={String(t.globalHoldMs)}
                     value={sel.holdMs ?? ''} style={{ width: 80 }}
                     onChange={e => t.updateFrame(sel.id, { holdMs: e.target.value === '' ? null : +e.target.value })} /> ms
            </label>
            <button className="ettl-btn" onClick={() => {
              const pose = currentPose();
              if (!Object.keys(pose).length) { say('no live angles to capture'); return; }
              t.updateFrame(sel.id, { pose });
              say('frame updated from the live arm');
            }} disabled={!online}>Re-capture from arm</button>
          </div>

          <table className="ettl-table">
            <thead><tr><th>servo</th><th>angle in this frame</th><th>live</th><th></th></tr></thead>
            <tbody>
              {Object.keys(sel.pose).map(Number).sort((a, b) => a - b).map(id => {
                const live = servos.find(s => s.id === id);
                return (
                  <tr key={id}>
                    <td className="l">{live?.label || `id ${id}`}</td>
                    <td className="grow">
                      <JointRow
                        min={live?.min ?? 0} max={live?.max ?? 360}
                        value={sel.pose[id]}
                        onChange={v => t.setJoint(sel.id, id, v)}
                      />
                    </td>
                    <td className="ettl-dim">{live?.currentAngle?.toFixed(1) ?? '—'}°</td>
                    <td><button className="ettl-btn tiny danger"
                                onClick={() => t.removeJoint(sel.id, id)}>drop</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {servos.some(s => sel.pose[s.id] === undefined) && (
            <div className="ettl-row">
              <span className="ettl-dim">not in this frame:</span>
              {servos.filter(s => sel.pose[s.id] === undefined).map(s => (
                <button key={s.id} className="ettl-btn tiny"
                        onClick={() => t.setJoint(sel.id, s.id, s.currentAngle ?? 180)}>
                  + {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {msg && <div className="ettl-toast">{msg}</div>}
    </div>
  );
}

/**
 * A joint row in the frame editor: slider, whole-degree steppers, typed box.
 * The typed box commits on Enter or blur — never per keystroke, so a half-typed number
 * cannot land in the frame.
 */
function JointRow(props: { min: number; max: number; value: number; onChange: (v: number) => void }) {
  const [typed, setTyped] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(props.max, Math.max(props.min, v));
  const step = (dir: 1 | -1) =>
    props.onChange(clamp(dir > 0 ? Math.floor(props.value) + 1 : Math.ceil(props.value) - 1));
  const commit = () => {
    if (typed === null) return;
    const v = parseFloat(typed);
    setTyped(null);
    if (Number.isFinite(v)) props.onChange(clamp(v));
  };
  return (
    <div className="ettl-angle">
      <button className="ettl-btn step" onClick={() => step(-1)}>−</button>
      <input className="ettl-slider" type="range" min={props.min} max={props.max} step={0.5}
             value={props.value} onChange={e => props.onChange(+e.target.value)} />
      <button className="ettl-btn step" onClick={() => step(1)}>+</button>
      <input className="ettl-num" type="number" step={0.5}
             value={typed ?? props.value.toFixed(1)}
             onChange={e => setTyped(e.target.value)}
             onKeyDown={e => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); } }}
             onBlur={commit} />
      <span className="ettl-dim">°</span>
    </div>
  );
}

function FrameCard(props: {
  f: Frame; i: number; selected: boolean; playing: boolean; dragOver: boolean;
  globalSpeed: number; globalDelay: number; globalHold: number; plan?: FramePlan;
  onSelect: () => void; onGo: () => void; onDup: () => void; onDel: () => void; onPlayFrom: () => void;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void; onDragEnd: () => void;
}) {
  const { f, i } = props;
  const n = Object.keys(f.pose).length;
  return (
    <div
      className={`ettl-frame${props.selected ? ' sel' : ''}${props.playing ? ' playing' : ''}${props.dragOver ? ' over' : ''}`}
      draggable
      onDragStart={props.onDragStart}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      onDragEnd={props.onDragEnd}
      onClick={props.onSelect}
      title="drag to reorder · click to edit"
    >
      <div className="ettl-frame-top">
        <span className="ettl-frame-n">{i + 1}</span>
        <span className="ettl-frame-name">{f.name}</span>
      </div>
      <div className="ettl-frame-meta">
        <span>{n} joint{n === 1 ? '' : 's'}</span>
        <span className={f.speed != null ? 'ov' : ''}>spd {f.speed ?? props.globalSpeed}</span>
        <span className={f.delayMs != null ? 'ov' : ''}
              title={props.plan?.stretched ? `needs at least ${props.plan.minMs} ms at this speed` : undefined}
              style={props.plan?.stretched ? { color: 'var(--warn, #f59e0b)' } : undefined}>
          {(() => {
            const req = f.delayMs ?? props.globalDelay;
            const p = props.plan;
            if (!p) return `${req} ms`;
            if (req === 0) return `auto ≈${p.ms} ms`;
            return p.stretched ? `⚠ ${req} → ${p.ms} ms` : `${req} ms`;
          })()}
        </span>
        {(f.holdMs ?? props.globalHold) > 0 && <span className={f.holdMs != null ? 'ov' : ''}>+{f.holdMs ?? props.globalHold} pause</span>}
      </div>
      <div className="ettl-frame-btns" onClick={e => e.stopPropagation()}>
        <button className="ettl-btn tiny" onClick={props.onGo} title="send the arm to this pose">go</button>
        <button className="ettl-btn tiny" onClick={props.onPlayFrom} title="play from here">▶</button>
        <button className="ettl-btn tiny" onClick={props.onDup} title="duplicate">⧉</button>
        <button className="ettl-btn tiny danger" onClick={props.onDel} title="delete">✕</button>
      </div>
    </div>
  );
}
