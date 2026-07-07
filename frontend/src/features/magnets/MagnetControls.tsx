/**
 * MagnetControls — electromagnet UI, two variants sharing magnetStore + magnetModel:
 *   • variant="compact" — for the Animation page left panel. Per module, its end
 *     magnets with an Auto/On/Off cycle, a live level bar, and a % slider when manual.
 *   • variant="full"    — for the Motor Control page. Adds the grab→hold power profile
 *     editor, the master hardware switch, and the multi-ESP node registry.
 */
import { useModelStore } from '@/state/modelStore';
import { useMagnetStore, type MagnetMode } from '@/state/magnetStore';
import { useEspNodesStore } from '@/state/espNodesStore';
import { magnetsByModule, type MagnetRef } from './magnetModel';
import './MagnetControls.css';

const MODE_CYCLE: MagnetMode[] = ['auto', 'on', 'off'];
const MODE_LABEL: Record<MagnetMode, string> = { auto: 'AUTO', on: 'ON', off: 'OFF' };

function LevelBar({ level, phase }: { level: number; phase: string }) {
  const col = phase === 'grab' ? '#f59e0b' : phase === 'hold' ? '#22c55e' : '#6b7280';
  return (
    <div className="mag-bar">
      <div className="mag-bar-fill" style={{ width: `${level}%`, background: col }} />
      <span className="mag-bar-txt">{level > 0 ? `${Math.round(level)}%` : 'off'}</span>
    </div>
  );
}

function MagnetRow({ m, full }: { m: MagnetRef; full: boolean }) {
  const runtime  = useMagnetStore((s) => s.runtime[m.magnetId]);
  const override = useMagnetStore((s) => s.overrides[m.magnetId]);
  const profile  = useMagnetStore((s) => s.profiles[m.magnetId] ?? s.defaultProfile);
  const { setMode, setManualLevel, setProfile } = useMagnetStore.getState();

  const mode: MagnetMode = override?.mode ?? 'auto';
  const level = runtime?.level ?? 0;
  const phase = runtime?.phase ?? 'off';
  const cycleMode = () => setMode(m.magnetId, MODE_CYCLE[(MODE_CYCLE.indexOf(mode) + 1) % MODE_CYCLE.length]);

  return (
    <div className="mag-row">
      <div className="mag-row-head">
        <span className="mag-name" title={m.name}>◈ {m.name}</span>
        <button className={`mag-mode mag-mode--${mode}`} onClick={cycleMode} title="Cycle Auto → On → Off">
          {MODE_LABEL[mode]}
        </button>
      </div>
      <LevelBar level={level} phase={phase} />

      {mode === 'on' && (
        <div className="mag-slider-row">
          <span className="mag-slider-lbl">manual</span>
          <input
            type="range" min={0} max={100} value={override?.level ?? profile.holdPct}
            onChange={(e) => setManualLevel(m.magnetId, Number(e.target.value))}
          />
          <span className="mag-slider-val">{override?.level ?? profile.holdPct}%</span>
        </div>
      )}

      {full && (
        <div className="mag-profile">
          <label>grab<input type="number" min={0} max={100} value={profile.grabPct}
            onChange={(e) => setProfile(m.magnetId, { grabPct: Number(e.target.value) })} />%</label>
          <label>for<input type="number" min={0} max={60000} step={100} value={profile.grabMs}
            onChange={(e) => setProfile(m.magnetId, { grabMs: Number(e.target.value) })} />ms</label>
          <label>hold<input type="number" min={0} max={100} value={profile.holdPct}
            onChange={(e) => setProfile(m.magnetId, { holdPct: Number(e.target.value) })} />%</label>
        </div>
      )}
    </div>
  );
}

function NodeRegistry() {
  const doc = useModelStore((s) => s.doc);
  const nodes = useEspNodesStore((s) => s.nodes);
  const { addNode, updateNode, removeNode } = useEspNodesStore.getState();
  const comps = Object.values(doc.components ?? {});

  return (
    <div className="mag-nodes">
      <div className="mag-nodes-head">
        <span>ESP32 NODES (one per module · servos + magnets)</span>
        <button className="mag-btn" onClick={() => addNode()}>+ Add</button>
      </div>
      {nodes.length === 0 && <div className="mag-empty">No boards yet. Add one ESP32-C3 per module and bind it to a component.</div>}
      {nodes.map((nd) => (
        <div key={nd.id} className="mag-node">
          <span className={`mag-node-dot ${nd.connected ? 'ok' : 'bad'}`} />
          <input className="mag-node-name" value={nd.name} onChange={(e) => updateNode(nd.id, { name: e.target.value })} />
          <input className="mag-node-url" value={nd.url} onChange={(e) => updateNode(nd.id, { url: e.target.value })}
            placeholder="http://module1.local" />
          <select className="mag-node-comp" value={nd.componentId ?? ''}
            onChange={(e) => updateNode(nd.id, { componentId: e.target.value || null })}>
            <option value="">— module —</option>
            {comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="mag-node-lat">{nd.latencyMs != null ? `${nd.latencyMs}ms` : nd.connected ? '' : 'offline'}</span>
          <button className="mag-node-del" onClick={() => removeNode(nd.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

export default function MagnetControls({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const doc = useModelStore((s) => s.doc);
  const hardwareEnabled = useMagnetStore((s) => s.hardwareEnabled);
  const setHardwareEnabled = useMagnetStore((s) => s.setHardwareEnabled);
  const full = variant === 'full';
  const byModule = magnetsByModule(doc);
  const comps = doc.components ?? {};

  if (byModule.size === 0) {
    return <div className="mag-empty">No end-lock magnets. Add connectors to an end-lock module (end_lock / endlock).</div>;
  }

  return (
    <div className={`mag-controls mag-controls--${variant}`}>
      {full && <NodeRegistry />}

      <label className="mag-master">
        <input type="checkbox" checked={hardwareEnabled} onChange={(e) => setHardwareEnabled(e.target.checked)} />
        Drive real magnets {hardwareEnabled ? '' : '(simulation only)'}
      </label>

      {[...byModule.entries()].map(([moduleId, mags]) => (
        <div key={moduleId} className="mag-module">
          <div className="mag-module-title">{comps[moduleId]?.name ?? mags[0]?.moduleName ?? 'Module'}</div>
          {mags.map((m) => <MagnetRow key={m.magnetId} m={m} full={full} />)}
        </div>
      ))}
    </div>
  );
}
