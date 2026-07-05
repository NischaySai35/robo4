import './AnimLeftPanel.css';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useAnimSceneStore } from '@/state/animSceneStore';
import { useAnimationStore } from '@/state/animationStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { groundBody } from '@/features/rigid/groundBody';
import { commands } from '@/core/commands/index';
import { uid } from '@/core/model/index';
import type { Connector, AssemblyMate } from '@/core/model/index';
import { findBestSnapCandidate, computeSnapPatches, getConnectorWorld, bodiesConnected, computeMateBend, computeUnlockBend } from '@/features/assembly/connectorSnap';
import { mateBridge } from '@/features/assembly/mateBridge';
import { connectorHighlight } from '@/features/assembly/connectorHighlight';
import { computeFK } from '@/kinematics/modelFK';
import { bridge } from '@/viewport/cameraBridge';
import { withJointValues } from '@/control/motionRuntime';
import { useAutoGround } from '@/features/rigid/useAutoGround';

// ── Global Rotate helper ──────────────────────────────────────────────────────
function rotateVec3AroundAxis(v: THREE.Vector3, axis: 'x' | 'y' | 'z', angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const q = new THREE.Quaternion();
  const axVec = axis === 'x' ? new THREE.Vector3(1, 0, 0)
              : axis === 'y' ? new THREE.Vector3(0, 1, 0)
                             : new THREE.Vector3(0, 0, 1);
  q.setFromAxisAngle(axVec, rad);
  return v.clone().applyQuaternion(q);
}

// ── Connector face auto-label ───────────────────────────────────────────────────
// Name each connector by the world/local axis its normal points along (+X … −Z),
// so the 6 faces of a module read at a glance without hand-naming them.
const FACE_AXES: [string, [number, number, number]][] = [
  ['+X', [1, 0, 0]], ['−X', [-1, 0, 0]],
  ['+Y', [0, 1, 0]], ['−Y', [0, -1, 0]],
  ['+Z', [0, 0, 1]], ['−Z', [0, 0, -1]],
];
function faceLabel(normal: number[]): string {
  let best = '?', bestDot = -Infinity;
  for (const [name, v] of FACE_AXES) {
    const d = v[0] * (normal[0] ?? 0) + v[1] * (normal[1] ?? 0) + v[2] * (normal[2] ?? 0);
    if (d > bestDot) { bestDot = d; best = name; }
  }
  return best;
}

// ── Flat connector picker ────────────────────────────────────────────────────────
// One dropdown listing every connector across all bodies (grouped per body).
// Hovering an item highlights that connector's marker in the 3D viewport; clicking
// selects it into the mate slot. Custom (not a native <select>) so per-item hover
// events work.
interface ConnItem { bodyId: string; connectorId: string; body: string; face: string; name: string }
function ConnectorPicker({ value, bodies, onPick, onHover }: {
  value: string; // `${bodyId}::${connectorId}` or ''
  bodies: any[];
  onPick: (bodyId: string, connectorId: string) => void;
  onHover: (bodyId: string | null, connectorId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Close on click-outside / Escape (NOT on mouse-leave — the menu extends below the
  // button's box, so leave-to-close made it vanish before you could reach an item).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const items: ConnItem[] = [];
  for (const b of bodies) {
    const conns: Connector[] = (b.meta?.connectors as Connector[] | undefined) ?? [];
    conns.forEach((c, i) => items.push({
      bodyId: b.id, connectorId: c.id, body: b.name,
      face: faceLabel(c.normal), name: c.name ?? `Connector ${i + 1}`,
    }));
  }
  const current = items.find((it) => `${it.bodyId}::${it.connectorId}` === value) ?? null;
  return (
    <div className="alp-conn-picker" ref={rootRef} onMouseLeave={() => onHover(null, null)}>
      <button type="button" className="alp-mate-select alp-conn-btn" onClick={() => setOpen((o) => !o)}>
        <span>{current ? `${current.body} · ${current.face}` : 'Connector…'}</span>
        <span className="alp-conn-caret">▾</span>
      </button>
      {open && (
        <div className="alp-conn-menu">
          {items.length === 0 && <div className="alp-conn-empty">No connectors — add some in the Editor</div>}
          {items.map((it) => {
            const composite = `${it.bodyId}::${it.connectorId}`;
            return (
              <div
                key={composite}
                className={`alp-conn-item${composite === value ? ' sel' : ''}`}
                onMouseEnter={() => onHover(it.bodyId, it.connectorId)}
                onClick={() => { onPick(it.bodyId, it.connectorId); setOpen(false); }}
              >
                <span className="alp-conn-face">{it.face}</span>
                <span className="alp-conn-body">{it.body}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Axis button ───────────────────────────────────────────────────────────────
function AxisBtn({ axis, active, onClick }: { axis: string; active: boolean; onClick: () => void }) {
  const colors: Record<string, string> = { x: '#ef4444', y: '#22c55e', z: '#3b82f6' };
  const c = colors[axis] ?? 'var(--accent)';
  return (
    <button
      className={`alp-axis-btn${active ? ' alp-axis-btn--on' : ''}`}
      style={active ? { background: c, borderColor: c, color: '#fff' } : { borderColor: c, color: c }}
      onClick={onClick}
      title={`Rotate around ${axis.toUpperCase()} axis`}
    >
      {axis.toUpperCase()}
    </button>
  );
}

export default function AnimLeftPanel({ style }: { style?: React.CSSProperties }) {
  const doc      = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select        = useSelectionStore((s) => s.select);
  const selectedId    = useSelectionStore((s) => s.selectedId);
  const selIds        = useSelectionStore((s) => s.ids);
  const hoveredBodyId = useSelectionStore((s) => s.hoveredBodyId);

  // Rigid mode is now the SAME state the Editor uses (workspaceStore.bodyMode /
  // activeBodyId), so the two pages stay in sync and the drag actually drives
  // graph FK (computeFK reads workspaceStore). The old per-page animSceneStore
  // rigid state is gone — it never fed FK, which is why Animation was "wrong".
  const bodyMode           = useWorkspaceStore((s) => s.bodyMode);
  const rigidMode          = bodyMode === 'rigid';
  const activeBodyId       = useWorkspaceStore((s) => s.activeBodyId);
  const setBodyMode        = useWorkspaceStore((s) => s.setBodyMode);
  const setActiveBodyId    = useWorkspaceStore((s) => s.setActiveBodyId);
  const selectedCompId     = useAnimSceneStore((s) => s.selectedCompId);
  const globalRotateActive = useAnimSceneStore((s) => s.globalRotateActive);
  const globalRotateAxis   = useAnimSceneStore((s) => s.globalRotateAxis);
  const globalRotateAngle  = useAnimSceneStore((s) => s.globalRotateAngle);
  const mateSlotA          = useAnimSceneStore((s) => s.mateSlotA);
  const mateSlotB          = useAnimSceneStore((s) => s.mateSlotB);
  const gravityOn          = useAnimSceneStore((s) => s.gravityOn);
  const {
    setSelectedComp,
    toggleGlobalRotate, setGlobalRotateAxis, setGlobalRotateAngle, resetGlobalRotate,
    setMateSlotA, setMateSlotB, clearMateSlots, toggleGravity,
  } = useAnimSceneStore.getState();

  const bodies = Object.values(doc.bodies);
  const joints = Object.values(doc.joints);
  const comps  = Object.values(doc.components ?? {});

  const [collapsedComps, setCollapsedComps] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; bodyId: string } | null>(null);
  const [jointCtx, setJointCtx] = useState<{ x: number; y: number; jointId: string } | null>(null);

  // Auto-ground: keep the grounded body at whichever is nearest the live CoM.
  const autoBase = useWorkspaceStore((s) => s.autoBase);
  const setAutoBase = useWorkspaceStore((s) => s.setAutoBase);
  useAutoGround();
  const closeCtx = useCallback(() => setCtxMenu(null), []);
  const [snapStatus, setSnapStatus] = useState<string | null>(null);

  // Collapsible panel sections (persisted). Click a section title to fold it away.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => { try { return new Set(JSON.parse(localStorage.getItem('alp:collapsed') || '[]')); } catch { return new Set(); } });
  const toggleSec = (key: string) => setCollapsed((s) => {
    const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key);
    localStorage.setItem('alp:collapsed', JSON.stringify([...n]));
    return n;
  });
  const secTitle = (key: string, label: React.ReactNode) => (
    <div className={`alp-section-title alp-section-title--toggle${collapsed.has(key) ? ' alp-section-title--collapsed' : ''}`}
      onClick={() => toggleSec(key)}>
      <span className="alp-sec-chevron">▶</span>{label}
    </div>
  );

  // Play the approach → align → insert → latch motion in the viewport, then run
  // `commit`. Falls back to an instant commit if no viewport is registered. Shared
  // by Auto-Snap and the manual Assembly Mate so both animate identically (manual
  // just commits repositioning instead of a joint).
  // Animate the existing joints bending from their current values to the IK-solved
  // "closed loop" values (approach → align → seat), then commit the locking joint. Uses
  // transient joint-value updates each frame so it plays live without spamming undo.
  const bendRafRef = useRef<number | null>(null);
  /** Animate the joints through an ordered list of waypoint poses (each a jointId→value
   *  map) starting from the current live pose, then run `commit`. Used for the mate's
   *  approach→align (to the standoff pose) then insert (to the seated pose), mirroring
   *  Auto-Snap. Transient updates each frame so it plays live without spamming undo. */
  const animateBend = (segments: { vals: Record<string, number>; ms: number }[], commit: () => void) => {
    if (bendRafRef.current != null) cancelAnimationFrame(bendRafRef.current);
    if (segments.length === 0) { commit(); return; }
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
    const d0 = useModelStore.getState().doc;
    let fromVals: Record<string, number> = {};
    const allIds = new Set<string>();
    segments.forEach((s) => Object.keys(s.vals).forEach((id) => allIds.add(id)));
    for (const id of allIds) fromVals[id] = d0.joints[id]?.state?.value ?? 0;
    let seg = 0;
    let t0 = performance.now();
    const step = () => {
      const s = segments[seg];
      const p = Math.min(1, (performance.now() - t0) / s.ms);
      const k = ease(p);
      const vals: Record<string, number> = {};
      for (const id of allIds) vals[id] = fromVals[id] + ((s.vals[id] ?? fromVals[id]) - fromVals[id]) * k;
      useModelStore.getState().applyTransient((d) => withJointValues(d, vals));
      if (p < 1) { bendRafRef.current = requestAnimationFrame(step); return; }
      // Segment done → advance (its end pose becomes the next segment's start).
      fromVals = { ...vals };
      seg++;
      if (seg < segments.length) { t0 = performance.now(); bendRafRef.current = requestAnimationFrame(step); }
      else { bendRafRef.current = null; commit(); }
    };
    bendRafRef.current = requestAnimationFrame(step);
  };

  const playMate = (patches: [string, any][], axisNormal: THREE.Vector3, partnerId: string, commit: () => void) => {
    if (!mateBridge.play) { commit(); return; }
    const bodies_ = patches.map(([id, p]) => ({ id, goalPos: p.transform.position, goalQuat: p.transform.quaternion }));
    // Exclude the ENTIRE target module (the partner's component) from collision
    // checks — its bodies come flush against the moving module as they mate, so
    // none of them should count as an obstacle. Only truly unrelated bodies block.
    const partnerComp = doc.bodies[partnerId]?.componentId;
    const ignoreIds = partnerComp
      ? Object.values(doc.bodies).filter((b) => b.componentId === partnerComp).map((b) => b.id)
      : [partnerId];
    mateBridge.play({
      bodies: bodies_, axis: [axisNormal.x, axisNormal.y, axisNormal.z], gap: 0.02, commit, ignoreIds,
      onBlocked: (obsId) => setSnapStatus(`Insertion blocked by ${doc.bodies[obsId]?.name ?? 'an obstacle'} — clear the path and retry.`),
    });
  };

  // Scan every connector pair for the closest facing/touching match across two
  // DIFFERENT modules and physically join them (see connectorSnap.ts). Click again
  // to snap additional pairs one at a time.
  const autoSnapConnectors = () => {
    const fk = computeFK(doc); // live world poses, so posed/rotated modules mate where they appear
    const candidate = findBestSnapCandidate(doc, fk);
    if (!candidate) { setSnapStatus('No connectors close enough to lock.'); return; }
    const { patches, joint } = computeSnapPatches(doc, candidate, fk);
    playMate(patches as [string, any][], candidate.worldA.normal, candidate.a.bodyId, () => dispatch(commands.snapAndJoin(patches, joint)));
    const nameA = doc.bodies[candidate.a.bodyId]?.name ?? '?';
    const nameB = doc.bodies[candidate.b.bodyId]?.name ?? '?';
    setSnapStatus(`Locked ${nameA} ↔ ${nameB} (${(candidate.distance * 1000).toFixed(1)} mm apart)`);
  };

  // True for joints created by connector snapping (they can be unlocked/detached).
  const isSnapJoint = (j: any) => !!j?.meta?.generatedFromConnector;

  // Unlock a snap joint: slide the detached module straight back out along the
  // mating normal (mirror of the insert), then remove the joint — the reverse of
  // Auto-Snap. Works from the joint card or a lock body's right-click menu.
  const unlockSnapJoint = (jointId: string) => {
    const joint = doc.joints[jointId];
    if (!joint?.parentBodyId || !joint?.childBodyId) return;
    const fk = computeFK(doc);
    const worldA = getConnectorWorld(doc, joint.parentBodyId, String(joint.meta?.connectorA ?? ''), fk);
    const axis = (worldA ? worldA.normal.clone() : new THREE.Vector3(0, 1, 0)).normalize();
    const childBody = doc.bodies[joint.childBodyId];
    const pA = joint.parentBodyId, pB = joint.childBodyId;
    // Remove ONLY lock joints between the SAME two bodies as the clicked one — so two
    // connectors doubled on this exact pair both release, but OTHER connections (e.g. a
    // different lock between other bodies of the same components) are left intact.
    const jointIds = Object.values(doc.joints)
      .filter((j: any) => j.meta?.generatedFromConnector
        && ((j.parentBodyId === pA && j.childBodyId === pB) || (j.parentBodyId === pB && j.childBodyId === pA)))
      .map((j: any) => j.id);
    if (!jointIds.includes(jointId)) jointIds.push(jointId);

    const SEP = 0.02; // 20 mm — matches the lock's standoff, so unlock is its mirror image

    // If the two modules stay connected through ANOTHER lock after removing these, a rigid
    // slide would fight that lock and snap back — instead BEND the joints so the unlocked
    // connector opens a small gap while the other lock stays intact.
    const stillConnected = bodiesConnected(
      { ...doc, joints: Object.fromEntries(Object.entries(doc.joints).filter(([id]) => !jointIds.includes(id))) } as any,
      pA, pB);
    if (stillConnected) {
      const rigidRoot = rigidMode ? activeBodyId : null;
      const seatConn = String(joint.meta?.connectorA ?? '');
      const childConn = String(joint.meta?.connectorB ?? joint.meta?.connectorA ?? '');
      const bendVals = computeUnlockBend(
        doc, jointIds,
        { bodyId: pA, connectorId: seatConn },
        { bodyId: pB, connectorId: childConn },
        SEP, rigidRoot);
      if (bendVals && Object.keys(bendVals).length) {
        animateBend([{ vals: bendVals, ms: 600 }], () => dispatch(commands.detachAndBend(jointIds, bendVals)));
        setSnapStatus('Unlocked — bent to separate (other lock kept).');
        return;
      }
      // Couldn't bend (no movable chain) → fall through to rigid slide.
    }

    // Slide out the child's module (whole component if assigned) for the detach animation.
    const movedIds = childBody?.componentId
      ? Object.values(doc.bodies).filter((x) => x.componentId === childBody.componentId).map((x) => x.id)
      : [joint.childBodyId];
    const patches: [string, any][] = movedIds.map((id) => {
      const w = fk.get(id);
      const p = (w?.position ?? doc.bodies[id].transform.position) as [number, number, number];
      const q = (w?.quaternion ?? doc.bodies[id].transform.quaternion) as [number, number, number, number];
      return [id, { transform: { ...doc.bodies[id].transform, position: [p[0] + axis.x * SEP, p[1] + axis.y * SEP, p[2] + axis.z * SEP], quaternion: q } }];
    });
    const commit = () => dispatch(commands.detachManyAndSeparate(jointIds, patches));
    const animBodies = patches.map(([id, p]) => ({ id, goalPos: p.transform.position, goalQuat: p.transform.quaternion }));
    if (mateBridge.play) mateBridge.play({ bodies: animBodies, axis: [axis.x, axis.y, axis.z], gap: 0, commit, ignoreIds: movedIds });
    else commit();
    setSnapStatus(jointIds.length > 1 ? `Unlocked (${jointIds.length} locks removed).` : 'Unlocked.');
  };

  const addConnector = (bodyId: string) => {
    const body = doc.bodies[bodyId];
    if (!body) return;
    const existing: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    const con: Connector = { id: uid('con'), name: `Connector ${existing.length + 1}`, position: [0, 0, 0], normal: [0, 0, 1] };
    dispatch(commands.updateBody(bodyId, { meta: { ...body.meta, connectors: [...existing, con] } }));
    select(bodyId, 'body');
    closeCtx();
  };

  const deleteConnector = (bodyId: string, conId: string) => {
    const body = doc.bodies[bodyId];
    if (!body) return;
    const existing: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    dispatch(commands.updateBody(bodyId, { meta: { ...body.meta, connectors: existing.filter((c) => c.id !== conId) } }));
  };

  const smartMenuPos = (x: number, y: number) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    return { left: x + 210 > vw - 8 ? Math.max(8, x - 210) : x, top: y + 320 > vh - 8 ? Math.max(8, y - 320) : y };
  };

  // ── Global Rotate apply ───────────────────────────────────────────────────
  const applyGlobalRotate = (axis: 'x' | 'y' | 'z') => {
    const deg = parseFloat(globalRotateAngle);
    if (isNaN(deg)) return;

    const targetComp = selectedCompId ? (doc.components ?? {})[selectedCompId] : null;
    const compBodies = targetComp
      ? bodies.filter((b) => b.componentId === selectedCompId)
      : bodies; // if no comp selected, rotate all

    if (compBodies.length === 0) return;

    // Compute bounding center of the component
    const center = new THREE.Vector3();
    for (const b of compBodies) {
      const [x, y, z] = b.transform.position;
      center.add(new THREE.Vector3(x, y, z));
    }
    center.divideScalar(compBodies.length);

    // Quaternion for the rotation
    const rad = (deg * Math.PI) / 180;
    const axVec = axis === 'x' ? new THREE.Vector3(1, 0, 0)
                : axis === 'y' ? new THREE.Vector3(0, 1, 0)
                               : new THREE.Vector3(0, 0, 1);
    const rotQ = new THREE.Quaternion().setFromAxisAngle(axVec, rad);

    const patches: [string, any][] = compBodies.map((b) => {
      const [px, py, pz] = b.transform.position;
      const [qx, qy, qz, qw] = b.transform.quaternion;

      // Rotate position around center
      const rel = new THREE.Vector3(px - center.x, py - center.y, pz - center.z);
      const rotated = rel.clone().applyQuaternion(rotQ);
      const newPos: [number, number, number] = [
        center.x + rotated.x,
        center.y + rotated.y,
        center.z + rotated.z,
      ];

      // Compose rotation into body quaternion
      const bodyQ = new THREE.Quaternion(qx, qy, qz, qw);
      const newQ = rotQ.clone().multiply(bodyQ);

      return [b.id, {
        transform: {
          ...b.transform,
          position: newPos,
          quaternion: [newQ.x, newQ.y, newQ.z, newQ.w] as [number, number, number, number],
        },
      }];
    });

    dispatch(commands.updateBodies(patches));
    resetGlobalRotate();
  };

  // ── Row click (rigid mode + normal) ─────────────────────────────────────
  const onBodyClick = (bodyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (rigidMode) {
      if (selIds.includes(bodyId)) {
        // Already selected → toggle it as THE grounded/active body (single, like Editor)
        groundBody(activeBodyId === bodyId ? null : bodyId);
      } else {
        select(bodyId, 'body');
      }
    } else {
      select(bodyId, 'body');
    }
  };

  // ── Component tree renderer ───────────────────────────────────────────────
  const renderBodyRow = (b: any) => {
    const isSel    = selIds.includes(b.id);
    const isActive = activeBodyId === b.id;
    const isHovered = b.id === hoveredBodyId && !isSel;
    return (
      <div
        key={b.id}
        className={[
          'alp-row',
          isSel ? 'alp-row--sel' : '',
          isActive ? 'alp-row--active' : '',
          isHovered ? 'alp-row--hover' : '',
        ].filter(Boolean).join(' ')}
        onClick={(e) => onBodyClick(b.id, e)}
        onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, bodyId: b.id }); }}
        title={rigidMode ? 'Click to select · click again to activate (drag in 3D)' : 'Right-click for options'}
      >
        <span className="alp-dot alp-dot--body" />
        <span className="alp-name">{b.name}</span>
        {isActive && <span className="alp-badge alp-badge--active">ACTIVE</span>}
      </div>
    );
  };

  // The two connectors a snap-joint links (from its meta), for hover-highlighting.
  const jointConnPairs = (j: any): { bodyId: string; connectorId: string }[] => {
    const cA = j.meta?.connectorA, cB = j.meta?.connectorB;
    if (!cA || !cB) return [];
    return [{ bodyId: j.parentBodyId, connectorId: cA }, { bodyId: j.childBodyId, connectorId: cB }];
  };

  const renderJointRow = (j: any) => {
    const isSel = selIds.includes(j.id);
    return (
      <div
        key={j.id}
        className={`alp-row${isSel ? ' alp-row--sel' : ''}`}
        onClick={(e) => { e.stopPropagation(); select(j.id, 'joint'); connectorHighlight.set(jointConnPairs(j)); }}
        onMouseEnter={() => connectorHighlight.set(jointConnPairs(j))}
        onMouseLeave={() => connectorHighlight.set([])}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setJointCtx({ x: e.clientX, y: e.clientY, jointId: j.id }); }}
        title="Click to select · right-click to delete"
      >
        <span className="alp-dot alp-dot--joint" />
        <span className="alp-name">{j.name}</span>
        <span className="alp-type">{j.type}</span>
      </div>
    );
  };

  const renderCompTree = () => {
    const unassignedBodies = bodies.filter((b) => !b.componentId || !(doc.components ?? {})[b.componentId]);
    const unassignedJoints = joints.filter((j) => !j.componentId || !(doc.components ?? {})[j.componentId]);

    return (
      <>
        {comps.length === 0 && unassignedBodies.length === 0 && (
          <div className="alp-empty">No bodies yet — add some in the Editor page.</div>
        )}

        {comps.map((comp) => {
          const compBodies = bodies.filter((b) => b.componentId === comp.id);
          const compJoints = joints.filter((j) => j.componentId === comp.id);
          const isCollapsed   = collapsedComps.has(comp.id);
          const isSelected    = selectedCompId === comp.id;

          return (
            <div key={comp.id} className={`alp-comp${isSelected ? ' alp-comp--sel' : ''}`}>
              <div
                className="alp-comp-hdr"
                onClick={() => {
                  const nowSelected = !isSelected;
                  setSelectedComp(nowSelected ? comp.id : null);
                  // Select the component's bodies as a group (kind 'body') so the
                  // gizmo + M/R/S transform shortcuts act on the whole component —
                  // same behaviour as the Editor's Project Explorer.
                  if (nowSelected && compBodies.length) {
                    useSelectionStore.getState().selectMany(compBodies.map((b) => b.id), 'body');
                  } else {
                    useSelectionStore.getState().clear();
                  }
                  setCollapsedComps((s) => {
                    const next = new Set(s);
                    next.has(comp.id) ? next.delete(comp.id) : next.add(comp.id);
                    return next;
                  });
                }}
              >
                <span className={`alp-chevron${isCollapsed ? '' : ' alp-chevron--open'}`}>▶</span>
                <span className="alp-comp-name">{comp.name}</span>
                <span className="alp-comp-count">{compBodies.length}B·{compJoints.length}J</span>
              </div>

              {!isCollapsed && (
                <div className="alp-comp-children">
                  {compBodies.map(renderBodyRow)}
                  {compJoints.map(renderJointRow)}
                  {compBodies.length === 0 && compJoints.length === 0 && (
                    <div className="alp-empty alp-indent">Empty component.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {(unassignedBodies.length > 0 || unassignedJoints.length > 0) && (
          <div className="alp-comp">
            <div className="alp-comp-hdr alp-comp-hdr--dim">
              <span className="alp-comp-name" style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>Unassigned</span>
              <span className="alp-comp-count">{unassignedBodies.length}B·{unassignedJoints.length}J</span>
            </div>
            <div className="alp-comp-children">
              {unassignedBodies.map(renderBodyRow)}
              {unassignedJoints.map(renderJointRow)}
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Resizable height ──────────────────────────────────────────────────────
  const [pxHeight, setPxHeight] = useState(() => {
    const v = parseInt(localStorage.getItem('tetrobot:alp:height') || '', 10);
    return Number.isFinite(v) ? Math.max(80, v) : 360;
  });
  const pxRef = useRef(pxHeight);
  pxRef.current = pxHeight;
  const startResize = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY, startH = pxRef.current;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(80, Math.min(700, startH + (ev.clientY - startY)));
      pxRef.current = next; setPxHeight(next);
      localStorage.setItem('tetrobot:alp:height', String(next));
    };
    const onUp = () => {
      document.body.style.cursor = ''; document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  // ── Assembly Mate: snap math ───────────────────────────────────────────────
  // Move componentB (or a lone body) so its connector seats onto A's, in live FK
  // world space. Shared with Auto-Snap so keyed locking + posed-module handling
  // behave identically; the only difference is manual mate doesn't add a joint.
  // Build the same move-patches + detachable FIXED joint Auto-Snap produces, but
  // for the two USER-chosen connectors. Manual Snap thus physically locks the
  // modules (not just aligns them), identical to Auto-Snap.
  const mkMatePatches = (aRef: { bodyId: string; connectorId: string }, bRef: { bodyId: string; connectorId: string }) => {
    const fk = computeFK(doc);
    const wA = getConnectorWorld(doc, aRef.bodyId, aRef.connectorId, fk);
    const wB = getConnectorWorld(doc, bRef.bodyId, bRef.connectorId, fk);
    if (!wA || !wB) return null;
    const candidate = {
      a: { bodyId: aRef.bodyId, connectorId: aRef.connectorId, componentId: doc.bodies[aRef.bodyId]?.componentId ?? null },
      b: { bodyId: bRef.bodyId, connectorId: bRef.connectorId, componentId: doc.bodies[bRef.bodyId]?.componentId ?? null },
      worldA: wA, worldB: wB, distance: wA.position.distanceTo(wB.position),
    };
    const { patches, joint } = computeSnapPatches(doc, candidate, fk);
    return { patches: patches as [string, any][], joint, axisNormal: wA.normal, partnerId: aRef.bodyId };
  };

  /** Mate two connectors. If they're already connected through the model, BEND the
   *  existing joints to close the loop (holding A fixed) instead of rigidly moving a
   *  component — which would tear the connected structure apart. If the joints can't
   *  reach, refuse and leave everything in place. Separate modules use the rigid snap. */
  const doMate = (aRef: { bodyId: string; connectorId: string }, bRef: { bodyId: string; connectorId: string }) => {
    if (bodiesConnected(doc, aRef.bodyId, bRef.bodyId)) {
      const bend = computeMateBend(doc, aRef, bRef, rigidMode ? activeBodyId : null);
      if (!bend) {
        alert('These connectors are already linked through the model, but there\'s no movable joint chain between them to bend. Nothing moved.');
        return;
      }
      if (bend.residual > 0.03) {
        alert(
          `Can't fully close: nearest the joints can get is a ${(bend.residual * 100).toFixed(1)} cm gap ` +
          `(started ${(bend.startGap * 100).toFixed(1)} cm, ${bend.chainLen} movable joint${bend.chainLen === 1 ? '' : 's'} between them). ` +
          `The modules stay where they are.`);
        return;
      }
      // Approach & align to the standoff pose, then insert & lock — like Auto-Snap.
      animateBend(
        [{ vals: bend.standoffValues, ms: 850 }, { vals: bend.jointValues, ms: 530 }],
        () => dispatch(commands.bendAndJoin(bend.jointValues, bend.joint)),
      );
      clearMateSlots();
      return;
    }
    // Separate modules → align rigidly and join (the original behaviour).
    const m = mkMatePatches(aRef, bRef);
    if (m) playMate(m.patches, m.axisNormal, m.partnerId, () => dispatch(commands.snapAndJoin(m.patches, m.joint)));
  };

  const snapMate = () => {
    if (!mateSlotA || !mateSlotB) return;
    doMate(mateSlotA, mateSlotB);
  };

  const saveMate = () => {
    if (!mateSlotA || !mateSlotB) return;
    const mate: AssemblyMate = {
      id: uid('mate'),
      a: mateSlotA,
      b: mateSlotB,
      label: `${doc.bodies[mateSlotA.bodyId]?.name ?? '?'} ↔ ${doc.bodies[mateSlotB.bodyId]?.name ?? '?'}`,
    };
    dispatch(commands.addAssemblyMate(mate));
    clearMateSlots();
  };

  const reapplyMate = (mate: AssemblyMate) => {
    doMate(mate.a, mate.b); // same smart path: bend if connected, rigid-snap if separate
  };

  // ── Center of Mass ─────────────────────────────────────────────────────────
  const computeCoM = () => {
    let totalMass = 0;
    const com = new THREE.Vector3();
    for (const b of bodies) {
      const m = b.inertial?.mass ?? 0.05;
      const [px, py, pz] = b.transform.position;
      com.add(new THREE.Vector3(px * m, py * m, pz * m));
      totalMass += m;
    }
    if (totalMass > 0) com.divideScalar(totalMass);
    return { com, totalMass };
  };

  const { com, totalMass } = computeCoM();
  const r3 = (v: number) => Math.round(v * 1000) / 1000;

  // Connector slot label helper
  const slotLabel = (slot: { bodyId: string; connectorId: string } | null) => {
    if (!slot) return '—';
    const b = doc.bodies[slot.bodyId];
    if (!b) return '?';
    const con = ((b.meta?.connectors as Connector[] | undefined) ?? []).find((c) => c.id === slot.connectorId);
    return `${b.name} › ${con?.name ?? '?'}`;
  };

  return (
    <aside className="anim-left-panel fade-in" style={style}>

      {/* ── Project Explorer ── */}
      <div className="alp-section">
        <div className="alp-section-title">PROJECT EXPLORER</div>
        <div className="alp-scroll" style={{ height: pxHeight }}>
          {renderCompTree()}
        </div>
      </div>
      <div className="alp-vdivider" onMouseDown={startResize} />

      {/* ── Rigid Mode (shared with Editor's BODY MODE) ── */}
      <div className="alp-section">
        {secTitle('rigid', 'RIGID MODE · shared with Editor')}
        <button
          className={`alp-toggle-btn${rigidMode ? ' alp-toggle-btn--on' : ''}`}
          onClick={() => setBodyMode(rigidMode ? 'free' : 'rigid')}
          title="Rigid mode grounds one body as the fixed base; graph FK propagates outward. This is the SAME toggle as the Editor's Free Float / Rigid."
        >
          {rigidMode ? '⬤ Rigid Mode ON' : '○ Rigid Mode OFF'}
        </button>
        {rigidMode && (
          <>
            <button
              className={`alp-toggle-btn${autoBase ? ' alp-toggle-btn--on' : ''}`}
              onClick={() => setAutoBase(!autoBase)}
              title="Auto-ground: keep the base at the body nearest the center of mass, re-picking as the model moves (follows CoM while you drag). Turn off to pick the base manually."
              style={{ marginTop: 6 }}
            >
              {autoBase ? '⚖ Auto-ground: CoM' : '⚖ Auto-ground: OFF (manual)'}
            </button>
            <div className="alp-rigid-hint">
              {autoBase
                ? <>Base auto-follows the <strong>center of mass</strong> as the model moves. Turn on <strong>Drag tip to move</strong> to drag a link.</>
                : <>Click a body to select, click again to set it as the <strong>grounded base</strong> (or right-click it in 3D). Turn on <strong>Drag tip to move</strong> to drag another body.</>}
              {activeBodyId && (
                <div className="alp-active-count">
                  Base: <strong>{doc.bodies[activeBodyId]?.name ?? '—'}</strong>
                  {!autoBase && <> — <button className="alp-link" onClick={() => setActiveBodyId(null)}>clear</button></>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Global Rotate ── */}
      <div className="alp-section">
        {secTitle('grotate', 'GLOBAL ROTATE')}
        {/* Orient the selected module's long axis to a world axis (whole connected group
            follows; only when the module is at home). Same as the Editor's Inspector. */}
        <div className="alp-comp-hint">Orient selected module's long axis to:</div>
        <div className="alp-axis-row">
          {(['x', 'y', 'z'] as const).map((ax) => (
            <AxisBtn key={`orient-${ax}`} axis={ax} active={false}
              onClick={() => { const r = bridge.orientSelectionAxis?.(ax); if (r && !r.ok) alert(r.error); }} />
          ))}
        </div>
        {selectedCompId && (doc.components ?? {})[selectedCompId] && (
          <div className="alp-comp-hint">
            Component: <strong>{(doc.components ?? {})[selectedCompId].name}</strong>
          </div>
        )}
        {!selectedCompId && (
          <div className="alp-comp-hint alp-comp-hint--warn">
            Select a component above to scope the rotation. Currently rotates all bodies.
          </div>
        )}
        <button
          className={`alp-toggle-btn${globalRotateActive ? ' alp-toggle-btn--on' : ''}`}
          onClick={toggleGlobalRotate}
          title="Activate global rotate, then pick an axis and type an angle"
        >
          {globalRotateActive ? '⬤ Global Rotate ON' : '○ Global Rotate'}
        </button>

        {globalRotateActive && (
          <div className="alp-rotate-ui">
            <div className="alp-axis-row">
              {(['x', 'y', 'z'] as const).map((ax) => (
                <AxisBtn
                  key={ax}
                  axis={ax}
                  active={globalRotateAxis === ax}
                  onClick={() => setGlobalRotateAxis(globalRotateAxis === ax ? null : ax)}
                />
              ))}
            </div>
            <div className="alp-angle-row">
              <input
                className="alp-angle-input"
                type="number"
                value={globalRotateAngle}
                onChange={(e) => setGlobalRotateAngle(e.target.value)}
                placeholder="90"
                title="Rotation angle in degrees"
              />
              <span className="alp-angle-unit">deg</span>
            </div>
            <button
              className="alp-apply-btn"
              disabled={!globalRotateAxis}
              onClick={() => globalRotateAxis && applyGlobalRotate(globalRotateAxis)}
              title="Apply rotation"
            >
              Apply
            </button>
            <div className="alp-rotate-hint">
              Pick axis (X/Y/Z), set angle, then Apply. Or press X·Y·Z keys when active.
            </div>
          </div>
        )}
      </div>

      {/* ── Auto-Snap Connectors ── */}
      <div className="alp-section">
        {secTitle('autolock', 'AUTO-LOCK CONNECTORS')}
        <div className="alp-snap-hint">
          Drag two modules' connectors close together (facing each other), then click Auto-Lock —
          it aligns them and adds a real joint linking the two modules.
        </div>
        <button className="alp-apply-btn" onClick={autoSnapConnectors} title="Find the closest facing pair of connectors and join them">
          ⚡ Auto-Lock Nearby Connectors
        </button>
        {snapStatus && <div className="alp-snap-status">{snapStatus}</div>}
      </div>

      {/* ── Assembly Mates ── */}
      <div className="alp-section">
        {secTitle('mates', 'ASSEMBLY MATES')}

        {/* Slot pickers */}
        <div className="alp-mate-slots">
          {([['A', mateSlotA, setMateSlotA], ['B', mateSlotB, setMateSlotB]] as const).map(([label, slot, setSlot]) => (
            <div key={label} className="alp-mate-slot">
              <span className="alp-mate-slot-lbl">{label}</span>
              <div className="alp-mate-slot-picks">
                <ConnectorPicker
                  value={slot?.bodyId && slot?.connectorId ? `${slot.bodyId}::${slot.connectorId}` : ''}
                  bodies={bodies}
                  onPick={(bodyId, connectorId) => { setSlot({ bodyId, connectorId }); select(`${bodyId}::${connectorId}`, 'connector'); }}
                  onHover={(bodyId, connectorId) => {
                    if (bodyId && connectorId) select(`${bodyId}::${connectorId}`, 'connector');
                    else if (slot?.bodyId && slot?.connectorId) select(`${slot.bodyId}::${slot.connectorId}`, 'connector'); // restore committed pick
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="alp-mate-actions">
          <button
            className="alp-apply-btn"
            disabled={!mateSlotA?.connectorId || !mateSlotB?.connectorId}
            onClick={snapMate}
            title="Lock component B so its connector aligns with connector A"
          >
            Lock
          </button>
          <button
            className="alp-apply-btn alp-apply-btn--save"
            disabled={!mateSlotA?.connectorId || !mateSlotB?.connectorId}
            onClick={saveMate}
            title="Save this mate relationship for later re-application"
          >
            Save Lock
          </button>
          {(mateSlotA || mateSlotB) && (
            <button className="alp-link" onClick={clearMateSlots}>clear</button>
          )}
        </div>

        {/* Saved mates */}
        {(doc.mates ?? []).length > 0 && (
          <div className="alp-mates-list">
            {(doc.mates ?? []).map((m) => (
              <div key={m.id} className="alp-mate-item">
                <span className="alp-mate-label">{m.label}</span>
                <div className="alp-mate-btns">
                  <button title="Re-apply this mate (snap)" onClick={() => reapplyMate(m)}>↺</button>
                  <button title="Delete mate" onClick={() => dispatch(commands.removeAssemblyMate(m.id))}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Center of Mass ── */}
      <div className="alp-section">
        {secTitle('com', 'CENTER OF MASS')}
        <button
          className={`alp-toggle-btn${gravityOn ? ' alp-toggle-btn--on' : ''}`}
          onClick={toggleGravity}
          title="Toggle gravity visualization"
        >
          {gravityOn ? '⬤ Gravity ON' : '○ Gravity OFF'}
        </button>
        <div className="alp-com-grid">
          <span className="alp-com-lbl">Total mass</span>
          <span className="alp-com-val">{(totalMass * 1000).toFixed(1)} g</span>
          <span className="alp-com-lbl">CoM X</span>
          <span className="alp-com-val">{r3(com.x)} m</span>
          <span className="alp-com-lbl">CoM Y</span>
          <span className="alp-com-val">{r3(com.y)} m</span>
          <span className="alp-com-lbl">CoM Z</span>
          <span className="alp-com-val">{r3(com.z)} m</span>
        </div>
        {gravityOn && com.y > 0.5 && (
          <div className="alp-com-warn">
            ⚠ CoM is high ({r3(com.y)} m). Check stability before running.
          </div>
        )}
      </div>

      {/* ── Controls hint ── */}
      <div className="alp-section alp-section--controls">
        {secTitle('animctrl', 'ANIMATION CONTROLS')}
        <div className="alp-ctrl-grid">
          <kbd>Click body</kbd>    <span>select in 3D</span>
          <kbd>Rigid + click×2</kbd> <span>activate for dragging</span>
          <kbd>Global Rotate</kbd>  <span>rotate component at center</span>
          <kbd>Space</kbd>          <span>play/pause timeline</span>
          <kbd>Ctrl+Z</kbd>         <span>undo</span>
        </div>
      </div>

      {/* ── Context menu (portal so it's never clipped) ── */}
      {ctxMenu && createPortal(
        (() => {
          const ctxBody = doc.bodies[ctxMenu.bodyId];
          const ctxConns: Connector[] = (ctxBody?.meta?.connectors as Connector[] | undefined) ?? [];
          const pos = smartMenuPos(ctxMenu.x, ctxMenu.y);
          return (
            <>
              <div className="px-ctx-backdrop" onMouseDown={closeCtx} onContextMenu={(e) => { e.preventDefault(); closeCtx(); }} />
              <div className="px-ctx-menu" style={pos}>
                <div className="px-ctx-header">{ctxBody?.name ?? '—'}</div>
                <div className="px-ctx-sep" />
                <button onClick={() => { select(ctxMenu.bodyId, 'body'); closeCtx(); }}>✎ Select</button>
                {Object.values(doc.joints)
                  .filter((j: any) => isSnapJoint(j) && (j.parentBodyId === ctxMenu.bodyId || j.childBodyId === ctxMenu.bodyId))
                  .map((j: any) => (
                    <button key={j.id} onClick={() => { unlockSnapJoint(j.id); closeCtx(); }}>⇋ Unlock “{j.name}”</button>
                  ))}
                <div className="px-ctx-sep" />
                <div className="px-ctx-section">Connectors</div>
                {ctxConns.map((c) => (
                  <div key={c.id} className="px-ctx-con-row">
                    <span className="px-ctx-con-name">◈ {c.name}</span>
                    <button title="Set as Mate A" onClick={(e) => { e.stopPropagation(); setMateSlotA({ bodyId: ctxMenu.bodyId, connectorId: c.id }); closeCtx(); }}>A</button>
                    <button title="Set as Mate B" onClick={(e) => { e.stopPropagation(); setMateSlotB({ bodyId: ctxMenu.bodyId, connectorId: c.id }); closeCtx(); }}>B</button>
                    <button className="danger" title="Delete connector" onClick={(e) => { e.stopPropagation(); deleteConnector(ctxMenu.bodyId, c.id); }}>✕</button>
                  </div>
                ))}
                <button onClick={() => addConnector(ctxMenu.bodyId)}>+ Add Connector</button>
              </div>
            </>
          );
        })(),
        document.body,
      )}

      {/* Joint row right-click menu */}
      {jointCtx && createPortal(
        (() => {
          const j = doc.joints[jointCtx.jointId];
          const pos = smartMenuPos(jointCtx.x, jointCtx.y);
          const close = () => { setJointCtx(null); connectorHighlight.set([]); };
          return (
            <>
              <div className="px-ctx-backdrop" onMouseDown={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
              <div className="px-ctx-menu" style={pos}>
                <div className="px-ctx-header">{j?.name ?? '—'}</div>
                <div className="px-ctx-sep" />
                <button onClick={() => { select(jointCtx.jointId, 'joint'); close(); }}>✎ Select</button>
                {isSnapJoint(j) && <button onClick={() => { unlockSnapJoint(jointCtx.jointId); close(); }}>⇋ Unlock (detach)</button>}
                {/* Animatable connect/disconnect: key this joint's attach state at the playhead. */}
                <div className="px-ctx-sep" />
                <div className="px-ctx-section">Animate connection</div>
                <button onClick={() => { useAnimationStore.getState().addConnectionKey(jointCtx.jointId, true); close(); }}>◆ Key CONNECTED here</button>
                <button onClick={() => { useAnimationStore.getState().addConnectionKey(jointCtx.jointId, false); close(); }}>◆ Key DISCONNECTED here</button>
                <div className="px-ctx-sep" />
                <button className="danger" onClick={() => { dispatch(commands.removeJoint(jointCtx.jointId)); close(); }}>✕ Delete joint</button>
              </div>
            </>
          );
        })(),
        document.body,
      )}
    </aside>
  );
}
