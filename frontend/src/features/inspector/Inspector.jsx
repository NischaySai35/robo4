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
import { JointType, GeometryType } from '@/core/model/index.js';

const r3 = (v) => Math.round((v ?? 0) * 1000) / 1000;

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

function BodyInspector({ body, dispatch }) {
  const id = body.id;
  const up = (patch) => dispatch(commands.updateBody(id, patch));
  const upT = (patch) => up({ transform: { ...body.transform, ...patch } });
  const g = body.visual?.geometry ?? {};
  const upGeo = (geo) => up({ visual: { ...body.visual, geometry: { ...g, ...geo } } });

  return (
    <>
      <label className="in-field">
        <span>Name</span>
        <input className="in-text" value={body.name} onChange={(e) => up({ name: e.target.value })} />
      </label>

      <div className="in-group">TRANSFORM</div>
      <Vec3 label="Position" value={body.transform.position} onChange={(v) => upT({ position: v })} />
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

      <div className="in-group">INERTIAL</div>
      <Num label="Mass (kg)" value={body.inertial?.mass} onChange={(v) =>
        up({ inertial: { ...body.inertial, mass: v } })} step={0.1} />
    </>
  );
}

function JointInspector({ joint, dispatch }) {
  const id = joint.id;
  const up = (patch) => dispatch(commands.updateJoint(id, patch));
  const lim = joint.limit ?? { lower: -Math.PI, upper: Math.PI };

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

      <div className="in-group">AXIS</div>
      <Vec3 label="Axis" value={joint.axis} onChange={(v) => up({ axis: v })} step={1} />

      <div className="in-group">LIMITS (rad)</div>
      <div className="in-row2">
        <Num label="Lower" value={lim.lower} onChange={(v) => up({ limit: { ...lim, lower: v } })} />
        <Num label="Upper" value={lim.upper} onChange={(v) => up({ limit: { ...lim, upper: v } })} />
      </div>

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
        {entity && kind === 'body' && <BodyInspector body={entity} dispatch={dispatch} />}
        {entity && kind === 'joint' && <JointInspector joint={entity} dispatch={dispatch} />}
      </div>
    </div>
  );
}
