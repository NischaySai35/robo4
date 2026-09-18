/**
 * ComposeTab.tsx — place modules yourself, by hand.
 *
 * WHY THIS EXISTS
 * Describing what a wall should look like turned out to be far harder than
 * building one. The fitter kept producing slabs that were wrong in ways that
 * took a paragraph to explain and a second to point at — a hairbrush, then a
 * picture frame — so this tab lets a structure be DEMONSTRATED instead of
 * described, and read back into the algorithm afterwards: "here is what I mean,
 * now make the fitter do that."
 *
 * Add a module, choose one of its six connectors, weld the next one on, bend
 * the joints. The viewport draws it through exactly the same geometry path a
 * fitted build uses, so what is on screen is what the hardware would really do.
 *
 * NOTHING HERE IS ENFORCED. A hand-placed module that passes through another,
 * or whose joint is driven past its limit, is drawn anyway and merely noted.
 * The fitter's rules exist to stop a SEARCH proposing nonsense; a person
 * placing a module on purpose is making a claim about what the hardware should
 * do, and refusing to draw it would defeat the whole point of the tab.
 */
import React, { useMemo, useRef, useState } from 'react';

import { useMsrrStore } from '@/state/msrrStore';
import type { ConnectorEnd } from '@/robotics/msrr/modulink';
import {
  type ManualBuild,
  ALL_ENDS, JOINTS,
  addRoot, attachTo, setAngle, setRoll, removeModule, emptyManual,
  checkManual, manualCells, manualToJSON, manualFromJSON,
} from '@/robotics/msrr/manualBuild';
import { Section, Row } from './MsrrPanel';

const deg = (rad: number) => Math.round((rad * 180) / Math.PI);

export function ComposeTab() {
  const manual = useMsrrStore((s) => s.manual);
  const setManual = useMsrrStore((s) => s.setManual);
  const selected = useMsrrStore((s) => s.manualSelected);
  const select = useMsrrStore((s) => s.selectManual);
  const setConfigCells = useMsrrStore((s) => s.setConfigCells);
  const setTarget = useMsrrStore((s) => s.setTarget);
  const pushLog = useMsrrStore((s) => s.pushLog);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [end, setEnd] = useState<ConnectorEnd>('B');
  const [roll, setRollChoice] = useState<0 | 1 | 2 | 3>(0);

  const current = manual.modules.find((m) => m.id === selected) ?? null;
  const notes = useMemo(() => checkManual(manual), [manual]);
  const cells = useMemo(() => manualCells(manual), [manual]);

  const edit = (next: ManualBuild) => setManual(next);

  const add = () => {
    const next = current ? attachTo(manual, current.id, end, roll) : addRoot(manual);
    edit(next);
    select(next.modules[next.modules.length - 1].id);
  };

  const save = () => {
    const blob = new Blob([manualToJSON(manual)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `msrr-by-hand-${manual.modules.length}modules.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    pushLog(`saved ${manual.modules.length} hand-placed module(s)`);
  };

  const load = async (file: File) => {
    try {
      const next = manualFromJSON(await file.text());
      edit(next);
      select(next.modules[0]?.id ?? null);
      pushLog(`loaded ${next.modules.length} hand-placed module(s)`);
    } catch (e) {
      pushLog(`could not read that file: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <Section title="Build it yourself" info={
        <>
          <p className="msrr-note">
            Add a module, pick one of its six connectors, weld the next module onto it,
            and bend the joints however you like. The viewport draws real hardware
            geometry — the same rods, knuckles and domes a fitted build gets.
          </p>
          <p className="msrr-note warn">
            Nothing here is checked. Modules may pass through each other and joints may
            be driven past their limits; both are drawn, and listed below as notes rather
            than refused, because the point is to be able to show the algorithm a
            structure it would not have proposed.
          </p>
        </>
      }>
        <div className="msrr-chips">
          <span className="msrr-chip"><b>{manual.modules.length}</b> modules</span>
          <span className="msrr-chip"><b>{cells.length}</b> cubes</span>
          <span className={`msrr-chip ${notes.length ? 'warn' : 'ok'}`}>
            {notes.length ? `${notes.length} note(s)` : 'nothing to flag'}
          </span>
        </div>

        <div className="msrr-row-btns">
          <button className="msrr-btn primary" onClick={add}>
            {current ? `Add module on ${current.id}.${end}` : 'Add first module'}
          </button>
          <button
            className="msrr-btn ghost"
            disabled={!current}
            onClick={() => {
              if (!current) return;
              edit(removeModule(manual, current.id));
              select(null);
            }}
          >
            Delete {current?.id ?? ''}
          </button>
          <button
            className="msrr-btn ghost"
            disabled={!manual.modules.length}
            onClick={() => { edit(emptyManual()); select(null); }}
          >
            Clear
          </button>
        </div>

        {current && (
          <>
            <Row label="Weld the next one to">
              <select
                className="msrr-select"
                value={end}
                onChange={(e) => setEnd(e.target.value as ConnectorEnd)}
              >
                {ALL_ENDS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Row>
            <Row label={`Its roll about that lock: ${roll * 90}°`}>
              <input
                type="range" min={0} max={3} step={1} value={roll}
                onChange={(e) => setRollChoice(Number(e.target.value) as 0 | 1 | 2 | 3)}
              />
            </Row>
          </>
        )}
      </Section>

      <Section title="Modules">
        <div className="msrr-manual-list">
          {manual.modules.map((m) => (
            <button
              key={m.id}
              className={`msrr-manual-item ${m.id === selected ? 'on' : ''}`}
              onClick={() => select(m.id)}
            >
              <b>{m.id}</b>
              <span>{m.attach ? `on ${m.attach.parentId}.${m.attach.end}` : 'root'}</span>
              <span className="msrr-manual-angles">{m.angles.map(deg).join(' / ')}</span>
            </button>
          ))}
          {!manual.modules.length && (
            <p className="msrr-note">No modules yet — add the first one.</p>
          )}
        </div>
      </Section>

      {current && (
        <Section title={`${current.id} joints`} info={
          <p className="msrr-note">
            Six joints in chain order. The twists roll the chain about its own axis and
            only seat every 90° on real hardware — the connectors are four-fold
            symmetric — so they step in quarters. The bends pitch, and the hardware
            allows ±90° on each.
          </p>
        }>
          {JOINTS.map((j) => (
            <Row key={j.index} label={`${j.label}: ${deg(current.angles[j.index])}°`}>
              <input
                type="range"
                min={j.kind === 'twist' ? 0 : -90}
                max={j.kind === 'twist' ? 270 : 90}
                step={j.kind === 'twist' ? 90 : 5}
                value={deg(current.angles[j.index])}
                onChange={(e) => edit(setAngle(
                  manual, current.id, j.index, (Number(e.target.value) * Math.PI) / 180,
                ))}
              />
            </Row>
          ))}
          <div className="msrr-row-btns">
            <button className="msrr-btn ghost" onClick={() => {
              let next = manual;
              for (const j of JOINTS) next = setAngle(next, current.id, j.index, 0);
              edit(next);
            }}>
              Straighten
            </button>
            {current.attach && (
              <button className="msrr-btn ghost" onClick={() => edit(setRoll(
                manual, current.id, ((current.attach!.roll + 1) % 4) as 0 | 1 | 2 | 3,
              ))}>
                Roll 90°
              </button>
            )}
          </div>
        </Section>
      )}

      <Section title="Hand it to the algorithm" info={
        <p className="msrr-note">
          Save writes the weld TREE — which module hangs off which connector, and every
          joint angle in degrees — rather than the resolved positions, so it stays
          readable and stays correct when an upstream joint moves. "Use as the shape"
          takes the cubes this structure occupies and makes them the current diagram, so
          the fitter can be pointed at the same shape and compared against what you
          built.
        </p>
      }>
        <div className="msrr-row-btns">
          <button className="msrr-btn" disabled={!manual.modules.length} onClick={save}>
            Save JSON
          </button>
          <button className="msrr-btn ghost" onClick={() => fileRef.current?.click()}>
            Load JSON
          </button>
          <input
            ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="msrr-row-btns">
          <button
            className="msrr-btn ghost" disabled={!cells.length}
            onClick={() => {
              setConfigCells(cells);
              pushLog(`${cells.length} cubes taken from the hand-built structure`);
            }}
          >
            Use as the shape
          </button>
          <button
            className="msrr-btn ghost" disabled={!cells.length}
            onClick={() => {
              setTarget(cells);
              pushLog('target set from the hand-built structure');
            }}
          >
            Use as the target
          </button>
        </div>
      </Section>

      {notes.length > 0 && (
        <Section title="Notes" info={
          <p className="msrr-note">
            What the fitter's rules would say about this structure. Reported, never
            enforced — see the warning at the top of the tab.
          </p>
        }>
          <ul className="msrr-notes">
            {notes.slice(0, 12).map((n, i) => (
              <li key={`${n.moduleId}-${i}`}><b>{n.moduleId}</b> — {n.text}</li>
            ))}
          </ul>
          {notes.length > 12 && (
            <p className="msrr-note">…and {notes.length - 12} more.</p>
          )}
        </Section>
      )}
    </>
  );
}
