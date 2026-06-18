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
import { computeFK } from '@/kinematics/modelFK.js';
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
  const up = (patch) => dispatch(commands.updateBody(id, patch));
  const upT = (patch) => up({ transform: { ...body.transform, ...patch } });
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
      <Vec3 label="Scale" value={body.transform.scale} onChange={(v) => upT({ scale: v })} step={0.05} />

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

function JointInspector({ joint, doc, dispatch }) {
  const id = joint.id;
  const up = (patch) => dispatch(commands.updateJoint(id, patch));
  const lim = joint.limit ?? { lower: -Math.PI, upper: Math.PI, effort: 0, velocity: 0 };
  const dyn = joint.dynamics ?? { damping: 0, friction: 0 };
  const origin = joint.origin ?? { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  const mimic = joint.mimic;
  const bodies = Object.values(doc.bodies);
  const otherJoints = Object.values(doc.joints).filter((j) => j.id !== id);

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

      <div className="in-group">RELATION</div>
      <label className="in-field">
        <span>Parent body</span>
        <select className="in-text" value={joint.parentBodyId ?? ''} onChange={(e) => up({ parentBodyId: e.target.value })}>
          {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>
      <label className="in-field">
        <span>Child body</span>
        <select className="in-text" value={joint.childBodyId ?? ''} onChange={(e) => up({ childBodyId: e.target.value })}>
          {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>

      <div className="in-group">ORIGIN (in parent)</div>
      <Vec3 label="Position" value={origin.position} onChange={(v) => up({ origin: { ...origin, position: v } })} />
      <Vec3 label="Rotation (deg)" value={quatArrToEulerDeg(origin.quaternion)}
        onChange={(v) => up({ origin: { ...origin, quaternion: eulerDegToQuatArr(v) } })} step={5} />

      <div className="in-group">AXIS</div>
      <Vec3 label="Axis" value={joint.axis} onChange={(v) => up({ axis: v })} step={1} />

      <div className="in-group">LIMITS</div>
      <div className="in-row2">
        <Num label="Lower (rad)" value={lim.lower} onChange={(v) => up({ limit: { ...lim, lower: v } })} />
        <Num label="Upper (rad)" value={lim.upper} onChange={(v) => up({ limit: { ...lim, upper: v } })} />
      </div>
      <div className="in-row2">
        <Num label="Effort" value={lim.effort} onChange={(v) => up({ limit: { ...lim, effort: v } })} />
        <Num label="Velocity" value={lim.velocity} onChange={(v) => up({ limit: { ...lim, velocity: v } })} />
      </div>

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

      <div className="in-group">VALUE</div>
      <div className="in-slider">
        <input type="range" min={lim.lower} max={lim.upper} step={0.01}
          value={joint.state?.value ?? 0}
          onChange={(e) => dispatch(commands.setJointValue(id, parseFloat(e.target.value)))} />
        <span className="in-slider-val">{r3(joint.state?.value)}</span>
      </div>
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
