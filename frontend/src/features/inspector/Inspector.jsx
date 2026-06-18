/**
 * Inspector — data-driven property editor for the selected entity.
 *
 * Every field edits the model through a command (updateBody / updateJoint /
 * setJointValue), so each change is undoable and the viewport updates instantly.
 * This is the seed of the "every URDF tag is a GUI control" goal — Phase 5 grows
 * the joint side into the full tag set (dynamics, mimic, effort, etc.).
 */
import './Inspector.css';
import { useModelStore } from '@/state/modelStore.js';
import { useSelectionStore } from '@/state/selectionStore.js';
import { commands } from '@/core/commands/index.js';
import { JointType, GeometryType, makeMaterial } from '@/core/model/index.js';
import { quatArrToEulerDeg, eulerDegToQuatArr } from '@/shared/rotation.js';
import { duplicate, mirror, array } from '@/features/ops/bodyOps.js';
import * as THREE from 'three';
import { computeFK, movePivotKeepingChild } from '@/kinematics/modelFK.js';
import { solveModelIK, chainJoints } from '@/kinematics/modelIK.js';
import { useState } from 'react';

const r3 = (v) => Math.round((v ?? 0) * 1000) / 1000;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('');
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function Num({ label, value, onChange, step = 0.1 }) {
  return (
    <label className="in-num">
      <span>{label}</span>
      <input type="number" step={step} value={r3(value)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </label>
  );
}

function Vec3({ label, value, onChange, step = 0.1 }) {
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

function IkSection({ body, doc, dispatch }) {
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

function BodyInspector({ body, doc, dispatch, select }) {
  const id = body.id;
  const [uniformScale, setUniformScale] = useState(true);
  const up = (patch) => dispatch(commands.updateBody(id, patch));
  const upT = (patch) => up({ transform: { ...body.transform, ...patch } });

  // Scale handler: with "Uniform" on, editing any axis scales all three by the
  // same ratio (so the shape keeps its proportions); off → per-axis as before.
  const onScale = (v) => {
    if (!uniformScale) { upT({ scale: v }); return; }
    const old = body.transform.scale;
    const i = v.findIndex((x, idx) => x !== old[idx]);
    if (i < 0) { upT({ scale: v }); return; }
    const next = old[i] !== 0
      ? old.map((s) => Math.round((s * (v[i] / old[i])) * 1000) / 1000)
      : [v[i], v[i], v[i]];
    upT({ scale: next });
  };
  const g = body.visual?.geometry ?? {};
  const upGeo = (geo) => up({ visual: { ...body.visual, geometry: { ...g, ...geo } } });

  const mat = body.visual?.materialId ? doc.materials[body.visual.materialId] : null;
  const color = mat?.color ?? [0.62, 0.66, 0.72, 1];
  const editMat = (patch) => {
    if (mat) dispatch(commands.updateMaterial(mat.id, patch));
    else dispatch(commands.setBodyMaterial(id, makeMaterial({ color, ...patch })));
  };
  const addOne = (b) => { dispatch(commands.addBody(b)); select(b.id, 'body'); };

  return (
    <>
      <label className="in-field">
        <span>Name</span>
        <input className="in-text" value={body.name} onChange={(e) => up({ name: e.target.value })} />
      </label>

      <div className="in-group">TRANSFORM</div>
      <Vec3 label="Position" value={body.transform.position} onChange={(v) => upT({ position: v })} />
      <Vec3 label="Rotation (deg)" value={quatArrToEulerDeg(body.transform.quaternion)}
        onChange={(v) => upT({ quaternion: eulerDegToQuatArr(v) })} step={5} />
      <Vec3 label="Scale" value={body.transform.scale} onChange={onScale} step={0.05} />
      <label className="in-check in-uniform">
        <input type="checkbox" checked={uniformScale} onChange={(e) => setUniformScale(e.target.checked)} />
        <span>Uniform scale</span>
      </label>

      <div className="in-group">GEOMETRY · {g.type}</div>
      {g.type === GeometryType.BOX && (
        <Vec3 label="Size" value={g.size ?? [1, 1, 1]} onChange={(v) => upGeo({ size: v })} step={0.05} />
      )}
      {(g.type === GeometryType.CYLINDER || g.type === GeometryType.CAPSULE) && (
        <div className="in-row2">
          <Num label="Radius" value={g.radius} onChange={(v) => upGeo({ radius: v })} step={0.05} />
          <Num label="Length" value={g.length} onChange={(v) => upGeo({ length: v })} step={0.05} />
        </div>
      )}
      {g.type === GeometryType.SPHERE && (
        <Num label="Radius" value={g.radius} onChange={(v) => upGeo({ radius: v })} step={0.05} />
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

      <div className="in-group">INERTIAL</div>
      <Num label="Mass (kg)" value={body.inertial?.mass} onChange={(v) =>
        up({ inertial: { ...body.inertial, mass: v } })} step={0.1} />

      <div className="in-group">OPERATIONS</div>
      <div className="in-ops">
        <button onClick={() => addOne(duplicate(body))}>Duplicate</button>
        <button onClick={() => addOne(mirror(body, 0))}>Mirror X</button>
        <button onClick={() => addOne(mirror(body, 1))}>Mirror Y</button>
        <button onClick={() => addOne(mirror(body, 2))}>Mirror Z</button>
        <button onClick={() => dispatch(commands.addBodies(array(body, 3, [0.8, 0, 0])))}>Array ×3</button>
      </div>

      <IkSection body={body} doc={doc} dispatch={dispatch} />
    </>
  );
}

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;
const rDeg = (rad) => Math.round((rad ?? 0) * RAD2DEG * 10) / 10;

function JointInspector({ joint, doc, dispatch }) {
  const id = joint.id;
  const up = (patch) => dispatch(commands.updateJoint(id, patch));
  const lim = joint.limit ?? { lower: -Math.PI, upper: Math.PI, effort: 0, velocity: 0 };
  const dyn = joint.dynamics ?? { damping: 0, friction: 0 };
  const origin = joint.origin ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  const mimic = joint.mimic;
  const meta = joint.meta ?? {};
  const upMeta = (patch) => up({ meta: { ...meta, ...patch } });
  const bodies = Object.values(doc.bodies);
  const otherJoints = Object.values(doc.joints).filter((j) => j.id !== id);

  const hasLimits = joint.type === 'revolute' || joint.type === 'prismatic';
  const setValue = (v) => dispatch(commands.setJointValue(id, v));
  const setAxis = (a) => up({ axis: a });

  const childRest = joint.childRest ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  // Move ONLY the pivot — Body 2 stays where it is (childRest compensates).
  const movePivot = (newOrigin) => up({ origin: newOrigin, childRest: movePivotKeepingChild(joint, newOrigin) });
  // Place the pivot at a world point (e.g. a body's origin / the midpoint), keeping
  // both bodies fixed.
  const fkAll = computeFK(doc);
  const w1 = fkAll.get(joint.parentBodyId);
  const w2 = fkAll.get(joint.childBodyId);
  const setPivotWorld = (pWorld) => {
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
      <Vec3 label="Position (m)" value={origin.position} onChange={(v) => movePivot({ ...origin, position: v })} />
      <Vec3 label="Rotation (deg)" value={quatArrToEulerDeg(origin.quaternion)}
        onChange={(v) => movePivot({ ...origin, quaternion: eulerDegToQuatArr(v) })} step={5} />
      <div className="in-ops in-axis-presets">
        <button onClick={() => w1 && setPivotWorld(w1.position)} title="Put the pivot on Body 1">◐ Body 1</button>
        <button onClick={() => w2 && setPivotWorld(w2.position)} title="Put the pivot on Body 2">◑ Body 2</button>
        <button
          onClick={() => w1 && w2 && setPivotWorld(w1.position.map((c, i) => (c + w2.position[i]) / 2))}
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
        <button onClick={() => setAxis(joint.axis.map((c) => -c))} title="Flip direction">⇄ Flip</button>
      </div>

      {hasLimits && (
        <>
          <div className="in-group">LIMITS {joint.type === 'prismatic' ? '(m)' : '(°)'}</div>
          <div className="in-row2">
            {joint.type === 'prismatic' ? (
              <>
                <Num label="Lower" value={lim.lower} onChange={(v) => up({ limit: { ...lim, lower: v } })} />
                <Num label="Upper" value={lim.upper} onChange={(v) => up({ limit: { ...lim, upper: v } })} />
              </>
            ) : (
              <>
                <Num label="Lower°" value={rDeg(lim.lower)} step={5}
                  onChange={(v) => up({ limit: { ...lim, lower: v * DEG2RAD } })} />
                <Num label="Upper°" value={rDeg(lim.upper)} step={5}
                  onChange={(v) => up({ limit: { ...lim, upper: v * DEG2RAD } })} />
              </>
            )}
          </div>
          <div className="in-row2">
            <Num label="Effort (N·m)" value={lim.effort} onChange={(v) => up({ limit: { ...lim, effort: v } })} />
            <Num label="Velocity" value={lim.velocity} onChange={(v) => up({ limit: { ...lim, velocity: v } })} />
          </div>
        </>
      )}

      <div className="in-group">DYNAMICS</div>
      <div className="in-row2">
        <Num label="Damping" value={dyn.damping} onChange={(v) => up({ dynamics: { ...dyn, damping: v } })} step={0.01} />
        <Num label="Friction" value={dyn.friction} onChange={(v) => up({ dynamics: { ...dyn, friction: v } })} step={0.01} />
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
            <Num label="Multiplier" value={mimic.multiplier} onChange={(v) => up({ mimic: { ...mimic, multiplier: v } })} step={0.1} />
            <Num label="Offset" value={mimic.offset} onChange={(v) => up({ mimic: { ...mimic, offset: v } })} step={0.1} />
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
              onChange={(v) => upMeta({ servoId: Math.max(0, Math.round(v)) || null })} />
            <Num label="Offset (°)" value={meta.servoOffsetDeg ?? 0} step={1}
              onChange={(v) => upMeta({ servoOffsetDeg: v })} />
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
  const kind = useSelectionStore((s) => s.kind);
  const select = useSelectionStore((s) => s.select);

  const entity = selectedId
    ? (kind === 'body' ? doc.bodies[selectedId] : doc.joints[selectedId])
    : null;

  return (
    <div className="in-panel">
      <div className="in-head">
        <span className="in-titletxt">INSPECTOR</span>
        {kind === 'body' && entity && (
          <div className="in-gizmo">
            {['translate', 'rotate', 'scale'].map((m) => (
              <button key={m} title={m}
                className={`in-gz ${gizmoMode === m ? 'in-gz--on' : ''}`}
                onClick={() => setGizmoMode(m)}>
                {m === 'translate' ? '✥' : m === 'rotate' ? '⟳' : '⤢'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="in-body">
        {!entity && <div className="in-empty">Select a body or joint in the Model panel.</div>}
        {entity && kind === 'body' && <BodyInspector body={entity} doc={doc} dispatch={dispatch} select={select} />}
        {entity && kind === 'joint' && <JointInspector joint={entity} doc={doc} dispatch={dispatch} />}
      </div>
    </div>
  );
}
