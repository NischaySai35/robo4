/**
 * Inspector — data-driven property editor for the selected entity.
 *
 * Every field edits the model through a command (updateBody / updateJoint /
 * setJointValue), so each change is undoable and the viewport updates instantly.
 * This is the seed of the "every URDF tag is a GUI control" goal — Phase 5 grows
 * the joint side into the full tag set (dynamics, mimic, effort, etc.).
 */
import './Inspector.css';
import type { Document, Connector } from '@/core/model/index';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { commands } from '@/core/commands/index';
import { JointType, GeometryType, makeMaterial, uid } from '@/core/model/index';
import { quatArrToEulerDeg, eulerDegToQuatArr } from '@/shared/rotation';
import { duplicate, mirror, array } from '@/features/ops/bodyOps';
import * as THREE from 'three';
import { computeFK, movePivotKeepingChild } from '@/kinematics/modelFK';
import { solveModelIK, chainJoints } from '@/kinematics/modelIK';
import { useState, useCallback } from 'react';
import { getAllDrivers, saveCustomDriver, type DriverDef } from '@/features/driver/DriverRegistry';

const r3 = (v: any) => Math.round((v ?? 0) * 1000) / 1000;
const clamp01 = (v: any) => Math.max(0, Math.min(1, v));
const rgbToHex = ([r, g, b]: any) =>
  '#' + [r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('');
const hexToRgb = (hex: any) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function Num({ label, value, onChange, step = 0.1 }: any) {
  return (
    <label className="in-num">
      <span>{label}</span>
      <input type="number" step={step} value={r3(value)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </label>
  );
}

function Vec3({ label, value, onChange, step = 0.1 }: any) {
  return (
    <div className="in-vec">
      <div className="in-vec-label">{label}</div>
      <div className="in-vec-fields">
        {['X', 'Y', 'Z'].map((ax, i) => (
          <label key={ax} className="in-axis">
            <span>{ax}</span>
            <input type="number" step={step} value={r3(value[i])}
              onChange={(e) => { const v = [...value]; v[i] = parseFloat(e.target.value) || 0; onChange(v); }} />
          </label>
        ))}
      </div>
    </div>
  );
}

function IkSection({ body, doc, dispatch }: any) {
  const [target, setTarget] = useState(null);
  const chain = chainJoints(doc, body.id);
  if (chain.length === 0) return null;
  const tip = computeFK(doc).get(body.id)?.position ?? [0, 0, 0];
  const t = target ?? tip;
  const solve = () => {
    const res = solveModelIK(doc, body.id, t);
    if (res) dispatch(commands.setJointValues(res));
  };
  return (
    <>
      <div className="in-group">INVERSE KINEMATICS · {chain.length} DOF</div>
      <Vec3 label="Target (world)" value={t} onChange={setTarget} />
      <div className="in-ops">
        <button onClick={solve}>Solve IK</button>
        <button onClick={() => setTarget(null)}>Reset target</button>
      </div>
    </>
  );
}

// ── Physics Section ────────────────────────────────────────────────────────────
function PhysicsSection({ body, up }: { body: any; up: (patch: any) => void }) {
  const meta = body.meta ?? {};
  const upMeta = (patch: any) => up({ meta: { ...meta, ...patch } });
  const mass = body.inertial?.mass ?? 0.05;

  return (
    <>
      <div className="in-group">PHYSICS</div>
      <Num label="Mass (kg)" value={mass} step={0.001}
        onChange={(v: any) => up({ inertial: { ...body.inertial, mass: Math.max(0, v) } })} />
      <div className="in-row2">
        <Num label="I-min (mA)" value={meta.currentLimitMin ?? 6} step={1}
          onChange={(v: any) => upMeta({ currentLimitMin: Math.max(0, v) })} />
        <Num label="I-max (mA)" value={meta.currentLimitMax ?? 1000} step={10}
          onChange={(v: any) => upMeta({ currentLimitMax: Math.max(0, v) })} />
      </div>
      <Num label="Torque limit (N·m)" value={meta.torqueLimit ?? 2.5} step={0.1}
        onChange={(v: any) => upMeta({ torqueLimit: Math.max(0, v) })} />
    </>
  );
}

// ── Driver Section ─────────────────────────────────────────────────────────────
function DriverSection({ body, up }: { body: any; up: (patch: any) => void }) {
  const meta = body.meta ?? {};
  const upMeta = (patch: any) => up({ meta: { ...meta, ...patch } });

  const [allDrivers, setAllDrivers] = useState(() => getAllDrivers());
  const [customName, setCustomName] = useState('');

  const driverType: string = meta.driverType ?? 'normal';
  const driverProps: Record<string, any> = meta.driverProps ?? {};
  const def: DriverDef | undefined = allDrivers[driverType];

  const applyDefaults = () => {
    if (!def) return;
    const d = def.defaults;
    up({
      inertial: { ...body.inertial, mass: d.mass },
      meta: { ...meta, driverType, currentLimitMin: d.currentLimitMin, currentLimitMax: d.currentLimitMax, torqueLimit: d.torqueLimit },
    });
  };

  const addCustomDriver = useCallback(() => {
    const id = customName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!id || allDrivers[id]) return;
    const newDef: DriverDef = {
      label: customName.trim(), icon: '◆',
      defaults: { mass: 0.05, currentLimitMin: 6, currentLimitMax: 1000, torqueLimit: 2.5 },
      props: [],
    };
    saveCustomDriver(id, newDef);
    setAllDrivers(getAllDrivers());
    setCustomName('');
    upMeta({ driverType: id });
  }, [customName, allDrivers, upMeta]);

  return (
    <>
      <div className="in-group">DRIVER TYPE</div>
      <div className="in-driver-row">
        <select className="in-text" value={driverType}
          onChange={(e) => upMeta({ driverType: e.target.value })}>
          {Object.entries(allDrivers).map(([k, d]) => (
            <option key={k} value={k}>{d.icon} {d.label}</option>
          ))}
        </select>
        <button className="in-btn-sm" onClick={applyDefaults} title="Apply this driver's default physics values">
          Apply defaults
        </button>
      </div>

      {def && def.props.length > 0 && (
        <div className="in-driver-props">
          {def.props.map((p) => (
            p.type === 'number' ? (
              <Num key={p.key}
                label={`${p.label}${p.unit ? ` (${p.unit})` : ''}`}
                value={driverProps[p.key] ?? p.default}
                onChange={(v: any) => upMeta({ driverProps: { ...driverProps, [p.key]: v } })} />
            ) : p.type === 'boolean' ? (
              <label key={p.key} className="in-check">
                <input type="checkbox"
                  checked={!!(driverProps[p.key] ?? p.default)}
                  onChange={(e) => upMeta({ driverProps: { ...driverProps, [p.key]: e.target.checked } })} />
                <span>{p.label}</span>
              </label>
            ) : (
              <label key={p.key} className="in-field">
                <span>{p.label}{p.unit ? ` (${p.unit})` : ''}</span>
                <input className="in-text" type="text"
                  value={String(driverProps[p.key] ?? p.default)}
                  onChange={(e) => upMeta({ driverProps: { ...driverProps, [p.key]: e.target.value } })} />
              </label>
            )
          ))}
        </div>
      )}

      <div className="in-custom-driver">
        <input className="in-text" placeholder="New driver name…" value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCustomDriver(); }} />
        <button className="in-btn-sm" onClick={addCustomDriver} disabled={!customName.trim()}>
          + Add
        </button>
      </div>
    </>
  );
}

// ── Connectors Section ─────────────────────────────────────────────────────────
function ConnectorsSection({ body, up }: { body: any; up: (patch: any) => void }) {
  const meta = body.meta ?? {};
  const connectors: Connector[] = (meta.connectors as Connector[] | undefined) ?? [];

  const setConnectors = (next: Connector[]) => up({ meta: { ...meta, connectors: next } });

  const addConnector = () => {
    const c: Connector = {
      id: uid('con'),
      name: `Connector ${connectors.length + 1}`,
      position: [0, 0, 0],
      normal: [0, 0, 1],
    };
    setConnectors([...connectors, c]);
  };

  const updateConnector = (idx: number, patch: Partial<Connector>) => {
    setConnectors(connectors.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  const removeConnector = (idx: number) => {
    setConnectors(connectors.filter((_, i) => i !== idx));
  };

  return (
    <>
      <div className="in-group in-group--row">
        CONNECTORS
        <button className="in-btn-xs" onClick={addConnector} title="Add connector point">＋</button>
      </div>

      {connectors.length === 0 && (
        <div className="in-hint">No connectors. Add one to enable component assembly alignment.</div>
      )}

      {connectors.map((c, idx) => (
        <div key={c.id} className="in-connector">
          <div className="in-connector-hdr">
            <input className="in-text in-connector-name" value={c.name}
              onChange={(e) => updateConnector(idx, { name: e.target.value })} />
            <button className="in-btn-xs in-btn-danger" onClick={() => removeConnector(idx)} title="Remove connector">✕</button>
          </div>
          <Vec3 label="Position" value={c.position}
            onChange={(v: any) => updateConnector(idx, { position: v })} step={0.05} />
          <Vec3 label="Normal" value={c.normal}
            onChange={(v: any) => updateConnector(idx, { normal: v })} step={0.1} />
        </div>
      ))}
    </>
  );
}

function BodyInspector({ body, doc, dispatch, select }: any) {
  const id = body.id;
  const [uniformScale, setUniformScale] = useState(true);
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [arrayOpen, setArrayOpen] = useState(false);
  const [arrayCount, setArrayCount] = useState(2);
  const [arrayAxis, setArrayAxis] = useState(0);
  const [arrayGap, setArrayGap] = useState(1);
  const up = (patch: any) => dispatch(commands.updateBody(id, patch));
  const upT = (patch: any) => up({ transform: { ...body.transform, ...patch } });

  // Scale handler: with "Uniform" on, editing any axis scales all three by the
  // same ratio (so the shape keeps its proportions); off → per-axis as before.
  const onScale = (v: any) => {
    if (!uniformScale) { upT({ scale: v }); return; }
    const old = body.transform.scale;
    const i = v.findIndex((x: any, idx: any) => x !== old[idx]);
    if (i < 0) { upT({ scale: v }); return; }
    const next = old[i] !== 0
      ? old.map((s: any) => Math.round((s * (v[i] / old[i])) * 1000) / 1000)
      : [v[i], v[i], v[i]];
    upT({ scale: next });
  };
  const g = body.visual?.geometry ?? {};
  const upGeo = (geo: any) => up({ visual: { ...body.visual, geometry: { ...g, ...geo } } });

  const mat = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
  const color = mat?.color ?? [0.62, 0.66, 0.72, 1];
  const editMat = (patch: any) => {
    if (mat) dispatch(commands.updateMaterial(mat.id, patch));
    else dispatch(commands.setBodyMaterial(id, makeMaterial({ color, ...patch })));
  };
  const addOne = (b: any) => { dispatch(commands.addBody(b)); select(b.id, 'body'); };

  return (
    <>
      <label className="in-field">
        <span>Name</span>
        <input className="in-text" value={body.name} onChange={(e) => up({ name: e.target.value })} />
      </label>

      <div className="in-group">TRANSFORM</div>
      <Vec3 label="Position" value={body.transform.position} onChange={(v: any) => upT({ position: v })} />
      <Vec3 label="Rotation (deg)" value={quatArrToEulerDeg(body.transform.quaternion)}
        onChange={(v: any) => upT({ quaternion: eulerDegToQuatArr(v) })} step={5} />
      <Vec3 label="Scale" value={body.transform.scale} onChange={onScale} step={0.05} />
      <label className="in-check in-uniform">
        <input type="checkbox" checked={uniformScale} onChange={(e) => setUniformScale(e.target.checked)} />
        <span>Uniform scale</span>
      </label>

      <div className="in-group">GEOMETRY · {g.type}</div>
      {g.type === GeometryType.BOX && (
        <Vec3 label="Size" value={g.size ?? [1, 1, 1]} onChange={(v: any) => upGeo({ size: v })} step={0.05} />
      )}
      {(g.type === GeometryType.CYLINDER || g.type === GeometryType.CAPSULE || g.type === GeometryType.CONE) && (
        <div className="in-row2">
          <Num label="Radius" value={g.radius} onChange={(v: any) => upGeo({ radius: v })} step={0.05} />
          <Num label="Length" value={g.length} onChange={(v: any) => upGeo({ length: v })} step={0.05} />
        </div>
      )}
      {(g.type === GeometryType.SPHERE || g.type === GeometryType.CIRCLE) && (
        <Num label="Radius" value={g.radius} onChange={(v: any) => upGeo({ radius: v })} step={0.05} />
      )}
      {g.type === GeometryType.TORUS && (
        <div className="in-row2">
          <Num label="Radius" value={g.radius} onChange={(v: any) => upGeo({ radius: v })} step={0.05} />
          <Num label="Tube" value={g.tube} onChange={(v: any) => upGeo({ tube: v })} step={0.02} />
        </div>
      )}
      {g.type === GeometryType.PLANE && (
        <div className="in-row2">
          <Num label="Width"  value={(g.size ?? [1, 1])[0]} onChange={(v: any) => upGeo({ size: [v, (g.size ?? [1, 1])[1]] })} step={0.05} />
          <Num label="Height" value={(g.size ?? [1, 1])[1]} onChange={(v: any) => upGeo({ size: [(g.size ?? [1, 1])[0], v] })} step={0.05} />
        </div>
      )}

      <div className="in-group">MATERIAL</div>
      <div className="in-mat">
        <label className="in-mat-color">
          <span>Color</span>
          <input type="color" value={rgbToHex(color)}
            onChange={(e) => editMat({ color: [...hexToRgb(e.target.value), color[3]] })} />
        </label>
        <div className="in-slider">
          <span className="in-mat-lbl">Metal</span>
          <input type="range" min="0" max="1" step="0.05" value={mat?.metalness ?? 0.45}
            onChange={(e) => editMat({ metalness: parseFloat(e.target.value) })} />
        </div>
        <div className="in-slider">
          <span className="in-mat-lbl">Rough</span>
          <input type="range" min="0" max="1" step="0.05" value={mat?.roughness ?? 0.45}
            onChange={(e) => editMat({ roughness: parseFloat(e.target.value) })} />
        </div>
        <div className="in-slider">
          <span className="in-mat-lbl">Opacity</span>
          <input type="range" min="0" max="1" step="0.05" value={color[3]}
            onChange={(e) => editMat({ color: [color[0], color[1], color[2], parseFloat(e.target.value)] })} />
        </div>
      </div>

      <PhysicsSection body={body} up={up} />
      <DriverSection body={body} up={up} />
      <ConnectorsSection body={body} up={up} />

      <div className="in-group">OPERATIONS</div>
      <div className="in-ops">
        <button onClick={() => addOne(duplicate(body))}>Duplicate</button>
        <button
          className={mirrorOpen ? 'in-ops-active' : ''}
          onClick={() => { setMirrorOpen((o) => !o); setArrayOpen(false); }}
        >Mirror {mirrorOpen ? '▴' : '▾'}</button>
        <button
          className={arrayOpen ? 'in-ops-active' : ''}
          onClick={() => { setArrayOpen((o) => !o); setMirrorOpen(false); }}
        >Array {arrayOpen ? '▴' : '▾'}</button>
      </div>
      {arrayOpen && (
        <div className="in-ops-array">
          <div className="in-ops-array-row">
            <span>Count</span>
            <input type="number" min={2} value={arrayCount}
              onChange={(e) => setArrayCount(Math.max(2, parseInt(e.target.value) || 2))} />
            <span>Axis</span>
            <select value={arrayAxis} onChange={(e) => setArrayAxis(parseInt(e.target.value))}>
              <option value={0}>X</option>
              <option value={1}>Y</option>
              <option value={2}>Z</option>
            </select>
            <span>Gap</span>
            <input type="number" step={0.1} value={arrayGap}
              onChange={(e) => setArrayGap(parseFloat(e.target.value) || 1)} />
          </div>
          <button className="in-ops-apply" onClick={() => {
            const off: [number, number, number] = [0, 0, 0];
            off[arrayAxis] = arrayGap;
            dispatch(commands.addBodies(array(body, arrayCount, off)));
            setArrayOpen(false);
          }}>Apply</button>
        </div>
      )}

      <IkSection body={body} doc={doc} dispatch={dispatch} />
    </>
  );
}

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;
const rDeg = (rad: any) => Math.round((rad ?? 0) * RAD2DEG * 10) / 10;

function JointInspector({ joint, doc, dispatch }: { joint: any; doc: Document; dispatch: any }) {
  const id = joint.id;
  const up = (patch: any) => dispatch(commands.updateJoint(id, patch));
  const lim = joint.limit ?? { lower: -Math.PI, upper: Math.PI, effort: 0, velocity: 0 };
  const dyn = joint.dynamics ?? { damping: 0, friction: 0 };
  const origin = joint.origin ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  const mimic = joint.mimic;
  const meta = joint.meta ?? {};
  const upMeta = (patch: any) => up({ meta: { ...meta, ...patch } });
  const bodies = Object.values(doc.bodies);
  const otherJoints = Object.values(doc.joints).filter((j) => j.id !== id);

  const hasLimits = joint.type === 'revolute' || joint.type === 'prismatic';
  const setValue = (v: any) => dispatch(commands.setJointValue(id, v));
  const setAxis = (a: any) => up({ axis: a });

  const childRest = joint.childRest ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  // Move ONLY the pivot — Body 2 stays where it is (childRest compensates).
  const movePivot = (newOrigin: any) => up({ origin: newOrigin, childRest: movePivotKeepingChild(joint, newOrigin) });
  // Place the pivot at a world point (e.g. a body's origin / the midpoint), keeping
  // both bodies fixed.
  const fkAll = computeFK(doc);
  const w1 = fkAll.get(joint.parentBodyId);
  const w2 = fkAll.get(joint.childBodyId);
  const setPivotWorld = (pWorld: any) => {
    if (!w1) return;
    const local = new THREE.Vector3(pWorld[0], pWorld[1], pWorld[2]).applyMatrix4(w1.matrix.clone().invert());
    const newOrigin = { position: [local.x, local.y, local.z], quaternion: origin.quaternion };
    up({ origin: newOrigin, childRest: movePivotKeepingChild(joint, newOrigin) });
  };
  const distBody1 = Math.round(Math.hypot(...origin.position) * 1000);     // mm, pivot ← Body 1
  const distBody2 = Math.round(Math.hypot(...childRest.position) * 1000);  // mm, pivot → Body 2

  return (
    <>
      <label className="in-field">
        <span>Name</span>
        <input className="in-text" value={joint.name} onChange={(e) => up({ name: e.target.value })} />
      </label>
      <label className="in-field">
        <span>Type</span>
        <select className="in-text" value={joint.type} onChange={(e) => up({ type: e.target.value })}>
          {Object.values(JointType).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <div className="in-group">BODIES · connected pair (equal — not parent/child)</div>
      <label className="in-field">
        <span>Body 1</span>
        <select className="in-text" value={joint.parentBodyId ?? ''} onChange={(e) => up({ parentBodyId: e.target.value })}>
          {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>
      <label className="in-field">
        <span>Body 2</span>
        <select className="in-text" value={joint.childBodyId ?? ''} onChange={(e) => up({ childBodyId: e.target.value })}>
          {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>

      <div className="in-group">PIVOT · moves the joint only — both parts stay put</div>
      <Vec3 label="Position (m)" value={origin.position} onChange={(v: any) => movePivot({ ...origin, position: v })} />
      <Vec3 label="Rotation (deg)" value={quatArrToEulerDeg(origin.quaternion)}
        onChange={(v: any) => movePivot({ ...origin, quaternion: eulerDegToQuatArr(v) })} step={5} />
      <div className="in-ops in-axis-presets">
        <button onClick={() => w1 && setPivotWorld(w1.position)} title="Put the pivot on Body 1">◐ Body 1</button>
        <button onClick={() => w2 && setPivotWorld(w2.position)} title="Put the pivot on Body 2">◑ Body 2</button>
        <button
          onClick={() => w1 && w2 && setPivotWorld(w1.position.map((c: any, i: any) => (c + w2.position[i]) / 2))}
          title="Put the pivot midway between the parts">◎ Middle</button>
      </div>
      <div className="in-servo-hint">
        Pivot distance — from Body 1: <strong>{distBody1} mm</strong> · from Body 2: <strong>{distBody2} mm</strong>.
        Editing Position moves the pivot only; both parts hold their place.
      </div>

      <div className="in-group">AXIS · rotation / slide direction</div>
      <Vec3 label="Axis" value={joint.axis} onChange={setAxis} step={1} />
      <div className="in-ops in-axis-presets">
        <button onClick={() => setAxis([1, 0, 0])}>X</button>
        <button onClick={() => setAxis([0, 1, 0])}>Y</button>
        <button onClick={() => setAxis([0, 0, 1])}>Z</button>
        <button onClick={() => setAxis(joint.axis.map((c: any) => -c))} title="Flip direction">⇄ Flip</button>
      </div>

      {hasLimits && (
        <>
          <div className="in-group">LIMITS {joint.type === 'prismatic' ? '(m)' : '(°)'}</div>
          <div className="in-row2">
            {joint.type === 'prismatic' ? (
              <>
                <Num label="Lower" value={lim.lower} onChange={(v: any) => up({ limit: { ...lim, lower: v } })} />
                <Num label="Upper" value={lim.upper} onChange={(v: any) => up({ limit: { ...lim, upper: v } })} />
              </>
            ) : (
              <>
                <Num label="Lower°" value={rDeg(lim.lower)} step={5}
                  onChange={(v: any) => up({ limit: { ...lim, lower: v * DEG2RAD } })} />
                <Num label="Upper°" value={rDeg(lim.upper)} step={5}
                  onChange={(v: any) => up({ limit: { ...lim, upper: v * DEG2RAD } })} />
              </>
            )}
          </div>
          <div className="in-row2">
            <Num label="Effort (N·m)" value={lim.effort} onChange={(v: any) => up({ limit: { ...lim, effort: v } })} />
            <Num label="Velocity" value={lim.velocity} onChange={(v: any) => up({ limit: { ...lim, velocity: v } })} />
          </div>
        </>
      )}

      <div className="in-group">DYNAMICS</div>
      <div className="in-row2">
        <Num label="Damping" value={dyn.damping} onChange={(v: any) => up({ dynamics: { ...dyn, damping: v } })} step={0.01} />
        <Num label="Friction" value={dyn.friction} onChange={(v: any) => up({ dynamics: { ...dyn, friction: v } })} step={0.01} />
      </div>

      <div className="in-group">MIMIC</div>
      <label className="in-check">
        <input type="checkbox" checked={!!mimic}
          onChange={(e) => up({ mimic: e.target.checked ? { jointId: otherJoints[0]?.id ?? '', multiplier: 1, offset: 0 } : null })} />
        <span>Mirror another joint</span>
      </label>
      {mimic && (
        <>
          <label className="in-field">
            <span>Source joint</span>
            <select className="in-text" value={mimic.jointId} onChange={(e) => up({ mimic: { ...mimic, jointId: e.target.value } })}>
              {otherJoints.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </label>
          <div className="in-row2">
            <Num label="Multiplier" value={mimic.multiplier} onChange={(v: any) => up({ mimic: { ...mimic, multiplier: v } })} step={0.1} />
            <Num label="Offset" value={mimic.offset} onChange={(v: any) => up({ mimic: { ...mimic, offset: v } })} step={0.1} />
          </div>
        </>
      )}

      <div className="in-group">VALUE {joint.type === 'prismatic' ? '(m)' : '(°)'}</div>
      <div className="in-slider">
        <input type="range"
          min={hasLimits ? lim.lower : -Math.PI} max={hasLimits ? lim.upper : Math.PI} step={0.01}
          value={joint.state?.value ?? 0}
          onChange={(e) => setValue(parseFloat(e.target.value))} />
        <span className="in-slider-val">
          {joint.type === 'prismatic' ? r3(joint.state?.value) : `${rDeg(joint.state?.value)}°`}
        </span>
      </div>
      {joint.type !== 'fixed' && (
        <div className="in-ops in-jog">
          {hasLimits && <button onClick={() => setValue(lim.lower)} title="Go to lower limit">⤓ Min</button>}
          <button onClick={() => setValue(0)} title="Go to home / default (0)">⌂ Home</button>
          {hasLimits && <button onClick={() => setValue(lim.upper)} title="Go to upper limit">⤒ Max</button>}
        </div>
      )}

      {joint.type !== 'fixed' && (
        <>
          <div className="in-group">SERVO · drives this joint on hardware</div>
          <div className="in-row2">
            <Num label="Servo ID" value={meta.servoId ?? 0} step={1}
              onChange={(v: any) => upMeta({ servoId: Math.max(0, Math.round(v)) || null })} />
            <Num label="Offset (°)" value={meta.servoOffsetDeg ?? 0} step={1}
              onChange={(v: any) => upMeta({ servoOffsetDeg: v })} />
          </div>
          <label className="in-check">
            <input type="checkbox" checked={!!meta.servoInvert}
              onChange={(e) => upMeta({ servoInvert: e.target.checked })} />
            <span>Invert direction (servo turns opposite)</span>
          </label>
          <div className="in-servo-hint">
            {meta.servoId
              ? `Joint angle → servo #${meta.servoId} in degrees. Assign/stream in the Hardware panel.`
              : 'No servo assigned. Set an ID so the Hardware panel can drive a real ST3215.'}
          </div>
        </>
      )}
    </>
  );
}

export default function Inspector() {
  const doc = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const gizmoMode = useSelectionStore((s) => s.gizmoMode);
  const setGizmoMode = useSelectionStore((s) => s.setGizmoMode);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const ids = useSelectionStore((s) => s.ids);
  const kind = useSelectionStore((s) => s.kind);
  const select = useSelectionStore((s) => s.select);
  const pivotMode = useSelectionStore((s) => s.pivotMode);
  const setPivotMode = useSelectionStore((s) => s.setPivotMode);

  const entity = selectedId
    ? (kind === 'body' ? doc.bodies[selectedId] : doc.joints[selectedId])
    : null;
  const multi = kind === 'body' && ids.length > 1;

  return (
    <div className="in-panel">
      <div className="in-head">
        {entity && (
          <div className="in-gizmo">
            {(kind === 'body' ? ['translate', 'rotate', 'scale'] : ['translate', 'rotate']).map((m) => (
              <button key={m} title={kind === 'joint' ? `${m} pivot` : m}
                className={`in-gz ${gizmoMode === m ? 'in-gz--on' : ''}`}
                onClick={() => setGizmoMode(m as 'translate' | 'rotate' | 'scale')}>
                {m === 'translate' ? '✥' : m === 'rotate' ? '⟳' : '⤢'}
              </button>
            ))}
          </div>
        )}
      </div>

      {multi && (
        <div className="in-multi">
          <div className="in-multi-title">{ids.length} bodies selected</div>
          <div className="in-multi-sub">Transform pivot</div>
          <div className="in-pivot-row">
            {[
              { id: 'median', label: 'Median', hint: 'Around the group centre' },
              { id: 'individual', label: 'Individual', hint: 'Each around its own origin' },
              { id: 'active', label: 'Active', hint: 'Around the last-clicked body' },
            ].map((p) => (
              <button key={p.id} title={p.hint}
                className={`in-pivot-btn ${pivotMode === p.id ? 'in-pivot-btn--on' : ''}`}
                onClick={() => setPivotMode(p.id as any)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="in-multi-hint">
            Editing the fields below changes the <strong>active</strong> body. Use M / R / S in
            the viewport to transform the whole group around the chosen pivot.
          </div>
        </div>
      )}

      <div className="in-body">
        {!entity && <div className="in-empty">Select a body or joint in the Model panel.</div>}
        {entity && kind === 'body' && <BodyInspector body={entity} doc={doc} dispatch={dispatch} select={select} />}
        {entity && kind === 'joint' && <JointInspector joint={entity} doc={doc} dispatch={dispatch} />}
      </div>
    </div>
  );
}