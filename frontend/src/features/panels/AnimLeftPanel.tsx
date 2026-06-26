import './AnimLeftPanel.css';
import { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useAnimSceneStore } from '@/state/animSceneStore';
import { commands } from '@/core/commands/index';
import { uid } from '@/core/model/index';
import type { Connector, AssemblyMate } from '@/core/model/index';

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
  const select   = useSelectionStore((s) => s.select);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selIds   = useSelectionStore((s) => s.ids);

  const rigidMode          = useAnimSceneStore((s) => s.rigidMode);
  const activeBodyIds      = useAnimSceneStore((s) => s.activeBodyIds);
  const selectedCompId     = useAnimSceneStore((s) => s.selectedCompId);
  const globalRotateActive = useAnimSceneStore((s) => s.globalRotateActive);
  const globalRotateAxis   = useAnimSceneStore((s) => s.globalRotateAxis);
  const globalRotateAngle  = useAnimSceneStore((s) => s.globalRotateAngle);
  const mateSlotA          = useAnimSceneStore((s) => s.mateSlotA);
  const mateSlotB          = useAnimSceneStore((s) => s.mateSlotB);
  const gravityOn          = useAnimSceneStore((s) => s.gravityOn);
  const {
    toggleRigidMode, toggleBodyActive, setSelectedComp,
    toggleGlobalRotate, setGlobalRotateAxis, setGlobalRotateAngle, resetGlobalRotate,
    setMateSlotA, setMateSlotB, clearMateSlots, toggleGravity,
  } = useAnimSceneStore.getState();

  const bodies = Object.values(doc.bodies);
  const joints = Object.values(doc.joints);
  const comps  = Object.values(doc.components ?? {});

  const [collapsedComps, setCollapsedComps] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; bodyId: string } | null>(null);
  const closeCtx = useCallback(() => setCtxMenu(null), []);

  const addConnector = (bodyId: string) => {
    const body = doc.bodies[bodyId];
    if (!body) return;
    const existing: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    const con: Connector = {
      id: uid('con'),
      name: `Connector ${existing.length + 1}`,
      position: [0, 0, 0],
      normal: [0, 0, 1],
    };
    dispatch(commands.updateBody(bodyId, {
      meta: { ...body.meta, connectors: [...existing, con] },
    }));
    select(bodyId, 'body');
    closeCtx();
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
        // Already selected → toggle active
        toggleBodyActive(bodyId);
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
    const isActive = activeBodyIds.has(b.id);
    return (
      <div
        key={b.id}
        className={[
          'alp-row',
          isSel ? 'alp-row--sel' : '',
          isActive ? 'alp-row--active' : '',
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

  const renderJointRow = (j: any) => {
    const isSel = selIds.includes(j.id);
    return (
      <div
        key={j.id}
        className={`alp-row${isSel ? ' alp-row--sel' : ''}`}
        onClick={(e) => { e.stopPropagation(); select(j.id, 'joint'); }}
        title="Click to select joint"
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
                  setSelectedComp(isSelected ? null : comp.id);
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
  const getConnectorWorld = (bodyId: string, connectorId: string) => {
    const body = doc.bodies[bodyId];
    if (!body) return null;
    const conns: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    const con = conns.find((c) => c.id === connectorId);
    if (!con) return null;
    const [qx, qy, qz, qw] = body.transform.quaternion;
    const bodyQ = new THREE.Quaternion(qx, qy, qz, qw);
    const [bx, by, bz] = body.transform.position;
    const localPos = new THREE.Vector3(...con.position).applyQuaternion(bodyQ);
    const worldNormal = new THREE.Vector3(...con.normal).applyQuaternion(bodyQ).normalize();
    return {
      position: new THREE.Vector3(bx + localPos.x, by + localPos.y, bz + localPos.z),
      normal: worldNormal,
      body,
    };
  };

  const snapMate = () => {
    if (!mateSlotA || !mateSlotB) return;
    const wA = getConnectorWorld(mateSlotA.bodyId, mateSlotA.connectorId);
    const wB = getConnectorWorld(mateSlotB.bodyId, mateSlotB.connectorId);
    if (!wA || !wB) return;

    // Align connB onto connA: rotate B so that connB.normal → −connA.normal, then translate
    const targetNormal = wA.normal.clone().negate(); // connectors face each other
    const R_delta = new THREE.Quaternion().setFromUnitVectors(wB.normal, targetNormal);

    // Determine which bodies to move (all bodies in componentB, or just bodyB if unassigned)
    const compId = wB.body.componentId;
    const movedBodies = compId
      ? bodies.filter((b) => b.componentId === compId)
      : [wB.body];

    // For each body: new_pos = connA_pos + R_delta * (body_pos - connB_world_pos)
    const patches: [string, any][] = movedBodies.map((b) => {
      const [px, py, pz] = b.transform.position;
      const [qx, qy, qz, qw] = b.transform.quaternion;
      const rel = new THREE.Vector3(px - wB.position.x, py - wB.position.y, pz - wB.position.z);
      const rotRel = rel.applyQuaternion(R_delta);
      const newPos: [number, number, number] = [
        wA.position.x + rotRel.x,
        wA.position.y + rotRel.y,
        wA.position.z + rotRel.z,
      ];
      const bodyQ = new THREE.Quaternion(qx, qy, qz, qw);
      const newQ = R_delta.clone().multiply(bodyQ);
      return [b.id, {
        transform: { ...b.transform, position: newPos, quaternion: [newQ.x, newQ.y, newQ.z, newQ.w] as [number, number, number, number] },
      }];
    });

    dispatch(commands.updateBodies(patches));
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
    setMateSlotA(mate.a);
    setMateSlotB(mate.b);
    // snap immediately using captured slots
    const wA = getConnectorWorld(mate.a.bodyId, mate.a.connectorId);
    const wB = getConnectorWorld(mate.b.bodyId, mate.b.connectorId);
    if (!wA || !wB) return;
    const targetNormal = wA.normal.clone().negate();
    const R_delta = new THREE.Quaternion().setFromUnitVectors(wB.normal, targetNormal);
    const compId = wB.body.componentId;
    const movedBodies = compId ? bodies.filter((b) => b.componentId === compId) : [wB.body];
    const patches: [string, any][] = movedBodies.map((b) => {
      const [px, py, pz] = b.transform.position;
      const [qx, qy, qz, qw] = b.transform.quaternion;
      const rel = new THREE.Vector3(px - wB.position.x, py - wB.position.y, pz - wB.position.z).applyQuaternion(R_delta);
      const newPos: [number, number, number] = [wA.position.x + rel.x, wA.position.y + rel.y, wA.position.z + rel.z];
      const newQ = R_delta.clone().multiply(new THREE.Quaternion(qx, qy, qz, qw));
      return [b.id, { transform: { ...b.transform, position: newPos, quaternion: [newQ.x, newQ.y, newQ.z, newQ.w] as [number, number, number, number] } }];
    });
    dispatch(commands.updateBodies(patches));
    clearMateSlots();
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

      {/* ── Rigid Mode ── */}
      <div className="alp-section">
        <div className="alp-section-title">MANUAL RIGID MODE</div>
        <button
          className={`alp-toggle-btn${rigidMode ? ' alp-toggle-btn--on' : ''}`}
          onClick={toggleRigidMode}
          title="When ON: click body to select, click again to activate for free dragging. Multiple can be active."
        >
          {rigidMode ? '⬤ Rigid Mode ON' : '○ Rigid Mode OFF'}
        </button>
        {rigidMode && (
          <div className="alp-rigid-hint">
            Click a body to select it. Click it again to <strong>activate</strong> (can drag in 3D).
            Multiple bodies can be active. Click active body to deactivate.
            {activeBodyIds.size > 0 && (
              <div className="alp-active-count">
                {activeBodyIds.size} active — <button className="alp-link" onClick={() => useAnimSceneStore.getState().clearActive()}>clear all</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Global Rotate ── */}
      <div className="alp-section">
        <div className="alp-section-title">GLOBAL ROTATE</div>
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

      {/* ── Assembly Mates ── */}
      <div className="alp-section">
        <div className="alp-section-title">ASSEMBLY MATES</div>

        {/* Slot pickers */}
        <div className="alp-mate-slots">
          {([['A', mateSlotA, setMateSlotA], ['B', mateSlotB, setMateSlotB]] as const).map(([label, slot, setSlot]) => {
            const bodyList = bodies;
            const selectedBody = slot ? doc.bodies[slot.bodyId] : null;
            const conns: Connector[] = selectedBody
              ? ((selectedBody.meta?.connectors as Connector[] | undefined) ?? [])
              : [];
            return (
              <div key={label} className="alp-mate-slot">
                <span className="alp-mate-slot-lbl">{label}</span>
                <div className="alp-mate-slot-picks">
                  <select
                    className="alp-mate-select"
                    value={slot?.bodyId ?? ''}
                    onChange={(e) => setSlot(e.target.value ? { bodyId: e.target.value, connectorId: '' } : null)}
                  >
                    <option value="">Body…</option>
                    {bodyList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select
                    className="alp-mate-select"
                    value={slot?.connectorId ?? ''}
                    disabled={!selectedBody || conns.length === 0}
                    onChange={(e) => slot && setSlot({ ...slot, connectorId: e.target.value })}
                  >
                    <option value="">Connector…</option>
                    {conns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="alp-mate-actions">
          <button
            className="alp-apply-btn"
            disabled={!mateSlotA?.connectorId || !mateSlotB?.connectorId}
            onClick={snapMate}
            title="Snap component B so its connector aligns with connector A"
          >
            Snap
          </button>
          <button
            className="alp-apply-btn alp-apply-btn--save"
            disabled={!mateSlotA?.connectorId || !mateSlotB?.connectorId}
            onClick={saveMate}
            title="Save this mate relationship for later re-application"
          >
            Save Mate
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
        <div className="alp-section-title">CENTER OF MASS</div>
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
        <div className="alp-section-title">ANIMATION CONTROLS</div>
        <div className="alp-ctrl-grid">
          <kbd>Click body</kbd>    <span>select in 3D</span>
          <kbd>Rigid + click×2</kbd> <span>activate for dragging</span>
          <kbd>Global Rotate</kbd>  <span>rotate component at center</span>
          <kbd>Space</kbd>          <span>play/pause timeline</span>
          <kbd>Ctrl+Z</kbd>         <span>undo</span>
        </div>
      </div>

      {/* ── Context menu ── */}
      {ctxMenu && (() => {
        const ctxBody = doc.bodies[ctxMenu.bodyId];
        const ctxConns: Connector[] = (ctxBody?.meta?.connectors as Connector[] | undefined) ?? [];
        return (
          <>
            <div className="px-ctx-backdrop" onClick={closeCtx} onContextMenu={(e) => { e.preventDefault(); closeCtx(); }} />
            <div className="px-ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
              <button onClick={() => { select(ctxMenu.bodyId, 'body'); closeCtx(); }}>✎ Select body</button>
              <button onClick={() => { addConnector(ctxMenu.bodyId); }}>◈ Add Connector</button>
              {ctxConns.length > 0 && <div className="px-ctx-sep" />}
              {ctxConns.map((c) => (
                <button key={c.id} onClick={() => {
                  setMateSlotA({ bodyId: ctxMenu.bodyId, connectorId: c.id });
                  closeCtx();
                }} title="Use as mate slot A">
                  A ← {ctxBody?.name} › {c.name}
                </button>
              ))}
              {ctxConns.map((c) => (
                <button key={`b-${c.id}`} onClick={() => {
                  setMateSlotB({ bodyId: ctxMenu.bodyId, connectorId: c.id });
                  closeCtx();
                }} title="Use as mate slot B">
                  B ← {ctxBody?.name} › {c.name}
                </button>
              ))}
            </div>
          </>
        );
      })()}
    </aside>
  );
}
