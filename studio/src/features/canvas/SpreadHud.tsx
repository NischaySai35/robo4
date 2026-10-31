/**
 * SpreadHud — single-line VSEPR spread readout, stacked above the EEVEE stats box by
 * .vp-hud-stack (see SimCanvas). Deliberately NOT absolutely positioned.
 * Shows only the repulsion energy (Σ 1/dist between body centres): LOWER = more spread out.
 * Updates live as you drag; the number tints green while it's dropping, red while it climbs.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useModelStore } from '@/state/modelStore';
import { spreadScore, spreadFromPoints } from '@/assembly/connectorSnap';
import { bridge } from '@/bridge/cameraBridge';

/** Bodies drawn by the active viewport. MSRR's robot isn't in the document, and it moves with live physics, so this polls. */
function useViewportCentres(on: boolean) {
  const [pts, setPts] = useState<THREE.Vector3[]>([]);
  useEffect(() => {
    if (!on) return;
    const read = () => setPts((bridge.getBodyCentres?.() ?? []).map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    read();
    const t = setInterval(read, 250);
    return () => clearInterval(t);
  }, [on]);
  return pts;
}

export default function SpreadHud({ source = 'document' }: { source?: 'document' | 'viewport' }) {
  const doc = useModelStore((s) => s.doc);
  const pts = useViewportCentres(source === 'viewport');
  const prev = useRef<number | null>(null);

  const s = source === 'viewport' ? spreadFromPoints(pts) : spreadScore(doc);
  if (s.bodies < 2) return null;

  const better = prev.current != null && s.energy < prev.current - 1e-6;
  const worse = prev.current != null && s.energy > prev.current + 1e-6;
  prev.current = s.energy;
  const color = better ? '#4ade80' : worse ? '#f87171' : 'rgba(255,255,255,0.85)';

  // No absolute positioning / magic offset: this is a flow item inside .vp-hud-stack, so
  // the stats box below can grow (RAM, Load, the CPU/GPU expansion) without colliding.
  const box: React.CSSProperties = {
    alignSelf: 'flex-start',
    background: 'rgba(30,30,30,0.38)', backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '5px 10px',
    font: '10px/1 var(--font-mono, ui-monospace, monospace)', letterSpacing: '0.05em',
    color: 'rgba(255,255,255,0.45)', pointerEvents: 'none', whiteSpace: 'nowrap',
  };

  return (
    <div style={box}>
      VSEPR SCORE — <span style={{ color, fontWeight: 700, fontSize: 11 }}>{s.energy}</span>
    </div>
  );
}
