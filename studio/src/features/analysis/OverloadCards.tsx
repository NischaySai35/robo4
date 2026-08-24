/**
 * OverloadCards — top-left alert cards on the Analysis page for every joint whose
 * motor is over its torque limit (>100% load). One card per joint, sorted worst
 * first, updating live. Shows angle, load %, torque (N·m and kg·cm) and current.
 */
import './AnalysisPanel.css';
import { useMemo } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useEditorStore } from '@/state/editorStore';
import { computeFK } from '@/kinematics/modelFK';
import { jointLoads } from '@/kinematics/analysis';
import { getJointActuator } from '@/core/model/index';
import { getMotorSpec } from '@/kinematics/motorDatabase';

const NM_TO_KGCM = 10.1972; // 1 N·m = 10.1972 kg·cm

export default function OverloadCards() {
  const doc = useModelStore((s) => s.doc);
  const show = useEditorStore((s) => s.showAnalysis);

  const { critical, warning } = useMemo(() => {
    const fk = computeFK(doc);
    const loads = jointLoads(doc, fk);
    const crit: any[] = [], warn: any[] = [];
    for (const j of Object.values(doc.joints)) {
      if (j.type === 'fixed') continue;
      const act = getJointActuator(doc, j);
      const limit = act.torqueLimit ?? getMotorSpec(act.motorType).stallTorque;
      const l = loads.get(j.id);
      if (!l || limit <= 0) continue;
      const frac = Math.abs(l.torque) / limit;
      if (frac <= 0.8) continue;
      const prof = j.profileId ? (doc.jointProfiles ?? {})[j.profileId]?.name : '';
      const card = { id: j.id, name: j.name, type: prof ?? '', angle: (j.state?.value ?? 0) * 180 / Math.PI, torque: l.torque, current: l.current, frac };
      (frac > 1 ? crit : warn).push(card);
    }
    crit.sort((a, b) => b.frac - a.frac);
    warn.sort((a, b) => b.frac - a.frac);
    return { critical: crit, warning: warn };
  }, [doc]);

  if (!show || (critical.length === 0 && warning.length === 0)) return null;

  const card = (o: any, kind: 'crit' | 'warn') => (
    <div
      key={o.id}
      className={`an-overload-card an-overload-card--${kind}`}
      title={`${o.name}${o.type ? ` · ${o.type}` : ''} — ${Math.round(o.frac * 100)}% of limit\nAngle ${o.angle.toFixed(0)}° · Torque ${Math.abs(o.torque).toFixed(2)} N·m (${(Math.abs(o.torque) * NM_TO_KGCM).toFixed(1)} kg·cm) · Current ${o.current.toFixed(2)} A`}
    >
      <span className="an-ol-name">{o.name}{o.type ? ` · ${o.type}` : ''}</span>
      <span className={`an-ol-pct an-ol-pct--${kind}`}>{Math.round(o.frac * 100)}%</span>
      <span className="an-ol-sep">·</span>
      <span className="an-ol-v">{o.angle.toFixed(0)}°</span>
      <span className="an-ol-v">{Math.abs(o.torque).toFixed(2)} N·m</span>
      <span className="an-ol-v an-ol-dim">{(Math.abs(o.torque) * NM_TO_KGCM).toFixed(1)} kg·cm</span>
      <span className="an-ol-v">{o.current.toFixed(2)} A</span>
    </div>
  );

  return (
    <div className="an-overload-cards">
      {critical.length > 0 && (
        <>
          <div className="an-overload-title an-overload-title--crit">⚠ {critical.length} joint{critical.length > 1 ? 's' : ''} over limit</div>
          {critical.map((o) => card(o, 'crit'))}
        </>
      )}
      {warning.length > 0 && (
        <>
          <div className="an-overload-title an-overload-title--warn">⚠ {warning.length} near limit (&gt;80%)</div>
          {warning.map((o) => card(o, 'warn'))}
        </>
      )}
    </div>
  );
}
