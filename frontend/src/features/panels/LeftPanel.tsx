import './LeftPanel.css';
import { useState, useCallback, useRef } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useEditorStore } from '@/state/editorStore';
import { useEditModeStore } from '@/state/editModeStore';
import { useDockStore } from '@/state/dockStore';
import { commands } from '@/core/commands/index';
import {
  makeBody, makeJoint, makeGeometry, GeometryType, JointType, identityOrigin, makeComponent, uid,
} from '@/core/model/index';
import type { Connector } from '@/core/model/index';
import { jointFramesForBodies } from '@/kinematics/modelFK';
import { deleteSelectedEntity } from '@/features/editing/deleteSelected';

const cap = (s: any) => s.charAt(0).toUpperCase() + s.slice(1);

const I = ({ children }: any) => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const PRIMITIVES = [
  { type: GeometryType.BOX,      label: 'Box',      params: { size: [0.8, 0.8, 0.8] } },
  { type: GeometryType.PLANE,    label: 'Plane',    params: { size: [1, 1] } },
  { type: GeometryType.CIRCLE,   label: 'Circle',   params: { radius: 0.5 } },
  { type: GeometryType.SPHERE,   label: 'Sphere',   params: { radius: 0.5 } },
  { type: GeometryType.CYLINDER, label: 'Cylinder', params: { radius: 0.4, length: 1 } },
  { type: GeometryType.CONE,     label: 'Cone',     params: { radius: 0.5, length: 1 } },
  { type: GeometryType.TORUS,    label: 'Torus',    params: { radius: 0.5, tube: 0.18 } },
  { type: GeometryType.CAPSULE,  label: 'Capsule',  params: { radius: 0.35, length: 0.9 } },
];

export default function LeftPanel({ style }: any) {
  const doc      = useModelStore((s) => s.doc);
  const dispatch = useModelStore((s) => s.dispatch);
  const select   = useSelectionStore((s) => s.select);
  const selectedId  = useSelectionStore((s) => s.selectedId);
  const selIds      = useSelectionStore((s) => s.ids);
  const selKind     = useSelectionStore((s) => s.kind);
  const pivotMode   = useSelectionStore((s) => s.pivotMode);
  const setPivotMode = useSelectionStore((s) => s.setPivotMode);
  const gizmoMode   = useSelectionStore((s) => s.gizmoMode);
  const showGizmo   = useSelectionStore((s) => s.showGizmo);
  const setGizmoMode = useSelectionStore((s) => s.setGizmoMode);
  const mateMode  = useEditorStore((s) => s.mateMode);
  const toggleMate = useEditorStore((s) => s.toggleMate);
  const openPanel = useDockStore((s) => s.open);
  const editActive = useEditModeStore((s) => s.active);

  const isBodySelected = !!(selectedId && doc.bodies[selectedId]);
  const toggleEditMode = () => {
    const es = useEditModeStore.getState();
    if (es.active) es.exit();
    else if (isBodySelected) es.enter(selectedId);
  };

  const bodies = Object.values(doc.bodies);
  const joints = Object.values(doc.joints);
  const comps  = Object.values(doc.components ?? {});

  const [addOpen, setAddOpen]   = useState(false);
  const [editing, setEditing]   = useState<any>(null); // { id, kind, text }
  const [searchQ, setSearchQ]   = useState('');
  const [collapsedComps, setCollapsedComps] = useState<Set<string>>(new Set());
  const [targetCompId, setTargetCompId]     = useState<string | null>(null);
  const [dragKey,  setDragKey]  = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<'body' | 'joint' | null>(null);
  const [dropTarget,     setDropTarget]     = useState<string | null>(null); // row drop
  const [compDropTarget, setCompDropTarget] = useState<string | null>(null); // comp header drop

  // ── Build actions ────────────────────────────────────────────────────────────
  const addPrimitive = (type: any, params: any) => {
    const n = bodies.length;
    // Resolve the target component; auto-create one if the scene has none yet.
    const compEntries = Object.values(doc.components ?? {});
    let compId = targetCompId && (doc.components ?? {})[targetCompId] ? targetCompId : null;
    if (!compId && compEntries.length > 0) compId = compEntries[0].id;

    const body = makeBody({
      name: `${cap(type)} ${n + 1}`,
      visual: { geometry: makeGeometry(type, params), materialId: null, origin: identityOrigin() },
      transform: { position: [n * 1.3, 0.6, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
      componentId: compId,
    });

    if (!compId) {
      // No components yet — create Component 1 together with the body in one undo step.
      const comp = makeComponent({ name: 'Component 1' });
      body.componentId = comp.id;
      dispatch(commands.addEntities([comp, body], `Add ${cap(type)}`));
      setTargetCompId(comp.id);
    } else {
      dispatch(commands.addBody(body));
    }

    select(body.id, 'body');
    setAddOpen(false);
  };

  const createJoint = () => {
    if (bodies.length < 2) { alert('Add at least 2 bodies first.'); return; }
    const b1 = (selectedId && doc.bodies[selectedId]) ? doc.bodies[selectedId] : bodies[bodies.length - 2];
    const b2 = bodies.find((b) => b.id !== b1.id);
    if (!b2) return;
    const { origin, childRest } = jointFramesForBodies(b1, b2);
    // Joint inherits the component of body 1 if available
    const compId = b1.componentId ?? null;
    const j = makeJoint({
      name: `Joint ${joints.length + 1}`, type: JointType.REVOLUTE,
      parentBodyId: b1.id, childBodyId: b2.id, origin, childRest, componentId: compId,
    });
    dispatch(commands.addJoint(j));
    select(j.id, 'joint');
    openPanel('inspector');
  };

  const createComponent = () => {
    const n = comps.length + 1;
    const comp = makeComponent({ name: `Component ${n}` });
    dispatch(commands.addComponent(comp));
    setTargetCompId(comp.id);
    setCollapsedComps((s) => { const next = new Set(s); next.delete(comp.id); return next; });
  };

  // ── Project explorer actions ─────────────────────────────────────────────────
  const openInspectorFor = (id: any, kind: any) => { select(id, kind); openPanel('inspector'); };

  const startRename = (id: any, kind: any, name: any) => setEditing({ id, kind, text: name });
  const commitRename = () => {
    if (!editing) return;
    const name = editing.text.trim();
    if (name) {
      if (editing.kind === 'component') {
        dispatch(commands.renameComponent(editing.id, name));
      } else {
        const cmd = editing.kind === 'body' ? commands.updateBody : commands.updateJoint;
        dispatch(cmd(editing.id, { name }));
      }
    }
    setEditing(null);
  };

  const bodyIds  = bodies.map((b) => b.id);
  const jointIds = joints.map((j) => j.id);

  const anchorRef = useRef<{ kind: any; idx: number } | null>(null);

  const onRowClick = (e: React.MouseEvent, entity: any, kind: any, ids: any[], idx: number) => {
    const sel = useSelectionStore.getState();
    if (e.shiftKey && anchorRef.current && anchorRef.current.kind === kind) {
      const a = anchorRef.current.idx;
      const [lo, hi] = a < idx ? [a, idx] : [idx, a];
      sel.selectMany(ids.slice(lo, hi + 1), kind);
    } else if (e.ctrlKey || e.metaKey) {
      sel.toggle(entity.id, kind);
      anchorRef.current = { kind, idx };
    } else {
      select(entity.id, kind);
      anchorRef.current = { kind, idx };
    }
  };

  const reorder = (collection: any, ids: any[], fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const arr = [...ids];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    dispatch(commands.reorderCollection(collection, arr));
  };

  // ── Context menu ─────────────────────────────────────────────────────────────
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
    // Open inspector so user can edit the new connector
    select(bodyId, 'body');
    openPanel('inspector');
    closeCtx();
  };

  // ── Row renderer ─────────────────────────────────────────────────────────────
  const renderRow = (
    entity: any, kind: any, ids: any, idx: any, collection: any, extra: any, indented = false,
  ) => {
    const isSel      = selIds.includes(entity.id);
    const isActive   = selectedId === entity.id;
    const isEditing  = editing && editing.id === entity.id;
    const isDropHere = dropTarget === entity.id && dragKey !== entity.id;
    return (
      <div
        key={entity.id}
        className={[
          'px-row',
          indented ? 'px-indent' : '',
          isSel ? 'px-row--sel' : '',
          isActive ? 'px-row--active' : '',
          isDropHere ? 'px-row--drop' : '',
        ].filter(Boolean).join(' ')}
        draggable={!isEditing}
        onContextMenu={kind === 'body' ? (e) => {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY, bodyId: entity.id });
        } : undefined}
        onDragStart={(e) => {
          setDragKey(entity.id);
          setDragKind(kind as 'body' | 'joint');
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (dragKey && ids.includes(dragKey)) { e.preventDefault(); e.stopPropagation(); setDropTarget(entity.id); }
        }}
        onDragLeave={() => setDropTarget((t) => (t === entity.id ? null : t))}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation(); // don't bubble to component header
          if (dragKey && ids.includes(dragKey)) reorder(collection, ids, ids.indexOf(dragKey), idx);
          setDragKey(null); setDragKind(null); setDropTarget(null);
        }}
        onDragEnd={() => { setDragKey(null); setDragKind(null); setDropTarget(null); }}
        title="Drag to reorder · drag onto a component header to move"
      >
        <span className="px-grip">⋮⋮</span>
        <span className={`px-dot px-dot--${kind}`} />
        {isEditing ? (
          <input
            className="px-rename"
            autoFocus
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(null); }}
          />
        ) : (
          <button
            className="px-name"
            title="Click to select · double-click to open inspector"
            onClick={(e) => onRowClick(e, entity, kind, ids, idx)}
            onDoubleClick={() => openInspectorFor(entity.id, kind)}
          >
            {entity.name}
          </button>
        )}
        {extra}
        <span className="px-row-actions">
          <button className="px-mini" title="Rename" onClick={() => startRename(entity.id, kind, entity.name)}>✎</button>
        </span>
      </div>
    );
  };

  // ── Component tree ───────────────────────────────────────────────────────────
  const renderCompTree = () => {
    const unassignedBodies = bodies.filter((b) => !b.componentId || !(doc.components ?? {})[b.componentId]);
    const unassignedJoints = joints.filter((j) => !j.componentId || !(doc.components ?? {})[j.componentId]);

    return (
      <>
        {comps.length === 0 && unassignedBodies.length === 0 && (
          <div className="px-empty">No items — use + to add a body or create a component.</div>
        )}

        {comps.map((comp) => {
          const compBodies = bodies.filter((b) => b.componentId === comp.id);
          const compJoints = joints.filter((j) => j.componentId === comp.id);
          const isCollapsed  = collapsedComps.has(comp.id);
          const isEditingComp = editing?.id === comp.id && editing?.kind === 'component';
          const isDropTarget = compDropTarget === comp.id;
          const isTarget     = targetCompId === comp.id;

          return (
            <div
              key={comp.id}
              className={`px-comp${isDropTarget ? ' px-comp--drop' : ''}${isTarget ? ' px-comp--target' : ''}`}
              onDragOver={(e) => {
                if (dragKey) { e.preventDefault(); setCompDropTarget(comp.id); }
              }}
              onDragLeave={() => setCompDropTarget((t) => (t === comp.id ? null : t))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragKey && dragKind) {
                  const cmd = dragKind === 'body' ? commands.moveBodyToComponent : commands.moveJointToComponent;
                  dispatch(cmd(dragKey, comp.id));
                }
                setDragKey(null); setDragKind(null); setCompDropTarget(null); setDropTarget(null);
              }}
            >
              {/* Component header */}
              <div
                className="px-comp-hdr"
                onClick={() => {
                  setTargetCompId(comp.id);
                  setCollapsedComps((s) => {
                    const next = new Set(s);
                    next.has(comp.id) ? next.delete(comp.id) : next.add(comp.id);
                    return next;
                  });
                }}
              >
                <span className={`px-comp-chevron${isCollapsed ? '' : ' px-comp-chevron--open'}`}>▶</span>
                {isEditingComp ? (
                  <input
                    className="px-rename"
                    autoFocus
                    value={editing.text}
                    onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                ) : (
                  <span className="px-comp-name">{comp.name}</span>
                )}
                <span className="px-comp-count">{compBodies.length}B·{compJoints.length}J</span>
                <div className="px-comp-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="px-mini" title="Rename"
                    onClick={() => startRename(comp.id, 'component', comp.name)}>✎</button>
                  <button className="px-mini px-mini--danger" title="Delete (unassigns members)"
                    onClick={() => {
                      // eslint-disable-next-line no-restricted-globals
                      if (confirm(`Delete "${comp.name}"? Its members will move to Unassigned.`)) {
                        dispatch(commands.removeComponent(comp.id));
                        if (targetCompId === comp.id) setTargetCompId(null);
                      }
                    }}>✕</button>
                </div>
              </div>

              {/* Component children */}
              {!isCollapsed && (
                <div className="px-comp-children">
                  {compBodies.length === 0 && compJoints.length === 0 ? (
                    <div className="px-empty px-indent">Empty — drag bodies/joints here.</div>
                  ) : (
                    <>
                      {compBodies.map((b) =>
                        renderRow(b, 'body', bodyIds, bodyIds.indexOf(b.id), 'bodies', null, true))}
                      {compJoints.map((j) =>
                        renderRow(j, 'joint', jointIds, jointIds.indexOf(j.id), 'joints',
                          <span className="px-type">{j.type}</span>, true))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned section */}
        {(unassignedBodies.length > 0 || unassignedJoints.length > 0) && (
          <div className="px-comp">
            <div className="px-comp-hdr px-comp-hdr--unassigned">
              <span className="px-comp-name" style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Unassigned</span>
              <span className="px-comp-count">{unassignedBodies.length}B·{unassignedJoints.length}J</span>
            </div>
            <div className="px-comp-children">
              {unassignedBodies.map((b) =>
                renderRow(b, 'body', bodyIds, bodyIds.indexOf(b.id), 'bodies', null, true))}
              {unassignedJoints.map((j) =>
                renderRow(j, 'joint', jointIds, jointIds.indexOf(j.id), 'joints',
                  <span className="px-type">{j.type}</span>, true))}
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Resizable project explorer ───────────────────────────────────────────────
  const [pxHeight, setPxHeight] = useState(() => {
    const v = parseInt(localStorage.getItem('tetrobot:px:height') || '', 10);
    return Number.isFinite(v) ? Math.max(80, v) : 340;
  });
  const pxRef = useRef(pxHeight);
  pxRef.current = pxHeight;
  const startPxResize = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = pxRef.current;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(80, Math.min(700, startH + (ev.clientY - startY)));
      pxRef.current = next;
      setPxHeight(next);
      localStorage.setItem('tetrobot:px:height', String(next));
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <aside className="left-panel fade-in" style={style}>

      {/* ── Mode (Object ↔ Edit) ── */}
      <div className="section">
        <div className="section-title">MODE</div>
        <div className="lp-mode-toggle">
          <button className={`lp-mode-btn ${!editActive ? 'lp-mode-btn--on' : ''}`}
            onClick={() => useEditModeStore.getState().exit()}>Object</button>
          <button
            className={`lp-mode-btn ${editActive ? 'lp-mode-btn--on' : ''}`}
            onClick={toggleEditMode}
            disabled={!editActive && !isBodySelected}
            title={isBodySelected || editActive ? 'Edit mesh vertices/edges/faces' : 'Select a body first'}>
            Edit
          </button>
        </div>
        {!isBodySelected && !editActive && (
          <p className="lp-mode-hint">Select a body to enter Edit Mode.</p>
        )}
      </div>

      {editActive && (
        <div className="section">
          <p className="lp-mode-hint">
            <strong>Edit Mode.</strong> Use the <em>Edit Mesh</em> panel on the right.
            Press <strong>Object</strong> to return.
          </p>
        </div>
      )}

      {/* ── Transform (when body selected) ── */}
      {!editActive && selKind === 'body' && isBodySelected && (
        <div className="section">
          <div className="section-title">TRANSFORM</div>
          <div className="lp-mode-toggle lp-xform">
            {[
              { id: 'translate', label: 'Move',   key: 'M' },
              { id: 'rotate',    label: 'Rotate', key: 'R' },
              { id: 'scale',     label: 'Scale',  key: 'S' },
            ].map((m) => (
              <button key={m.id}
                className={`lp-mode-btn ${showGizmo && gizmoMode === m.id ? 'lp-mode-btn--on' : ''}`}
                onClick={() => setGizmoMode(m.id as 'translate' | 'rotate' | 'scale')}
                title={`${m.label} (${m.key})`}>
                {m.label} <kbd className="lp-xform-key">{m.key}</kbd>
              </button>
            ))}
          </div>
          {!showGizmo && (
            <p className="lp-mode-hint">Click the body again — or press M / R / S — to show gizmo.</p>
          )}
          {selIds.length > 1 && (
            <>
              <div className="lp-pivot-label">{selIds.length} bodies · pivot</div>
              <div className="lp-mode-toggle lp-xform">
                {[
                  { id: 'median',     label: 'Median' },
                  { id: 'individual', label: 'Individual' },
                  { id: 'active',     label: 'Active' },
                ].map((p) => (
                  <button key={p.id}
                    className={`lp-mode-btn ${pivotMode === p.id ? 'lp-mode-btn--on' : ''}`}
                    onClick={() => setPivotMode(p.id as any)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!editActive && (
        <>
          {/* ── Build ── */}
          <div className="section">
            <div className="section-title">BUILD</div>
            <div className="lp-icon-row">
              <div className="lp-add-wrap">
                <button
                  className={`lp-icon-btn lp-icon-btn--accent${addOpen ? ' lp-icon-btn--active' : ''}`}
                  onClick={() => setAddOpen((v) => !v)}
                  title="Add a primitive body">
                  <I><path d="M10 4v12M4 10h12" /></I>
                </button>
                {addOpen && (
                  <div className="lp-add-menu" onMouseLeave={() => setAddOpen(false)}>
                    <div className="lp-add-title">ADD MESH</div>
                    <div className="lp-add-grid">
                      {PRIMITIVES.map((p) => (
                        <button key={p.type} className="lp-add-item" onClick={() => addPrimitive(p.type, p.params)}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button className="lp-icon-btn" onClick={createJoint} title="Create joint between two bodies">
                <I><circle cx="4" cy="10" r="2" /><circle cx="16" cy="10" r="2" /><path d="M6 10h8" strokeDasharray="2 1.6" /></I>
              </button>
              <button className={`lp-icon-btn${mateMode ? ' lp-icon-btn--active' : ''}`} onClick={toggleMate} title="Mate faces">
                <I><path d="M3 4v12M9 4v12M9 7h5l-2-2M9 13h5l-2 2" /></I>
              </button>
              <button className="lp-icon-btn lp-icon-btn--danger" onClick={deleteSelectedEntity}
                disabled={!selectedId} title="Delete selected (Del / X)">
                <I><path d="M3 5h14M7 5V3h6v2M6 8v6M10 8v6M14 8v6M4 5l1 12h10l1-12" /></I>
              </button>
            </div>
          </div>

          {/* ── Project Explorer ── */}
          <div className="section px-section">
            <div className="px-explorer-hdr">
              <div className="section-title" style={{ marginBottom: 0 }}>PROJECT EXPLORER</div>
              <button className="px-comp-add-btn" title="New component" onClick={createComponent}>
                + Comp
              </button>
            </div>
            <div className="px-search-wrap">
              <input
                className="px-search"
                placeholder="Filter bodies &amp; joints…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              {searchQ && (
                <button className="px-search-clear" onClick={() => setSearchQ('')} title="Clear search">✕</button>
              )}
            </div>
            {!searchQ && targetCompId && (doc.components ?? {})[targetCompId] && (
              <div className="px-target-hint">
                Adding to: <strong>{(doc.components ?? {})[targetCompId].name}</strong>
              </div>
            )}
            <div className="px-scroll" style={{ height: pxHeight }}>
              {searchQ ? (() => {
                const q = searchQ.toLowerCase();
                const matchBodies = bodies.filter((b) => b.name.toLowerCase().includes(q));
                const matchJoints = joints.filter((j) => j.name.toLowerCase().includes(q));
                if (matchBodies.length === 0 && matchJoints.length === 0) {
                  return <div className="px-empty">No matches for "{searchQ}"</div>;
                }
                return (
                  <>
                    {matchBodies.map((b) => renderRow(b, 'body', bodyIds, bodyIds.indexOf(b.id), 'bodies', null, false))}
                    {matchJoints.map((j) => renderRow(j, 'joint', jointIds, jointIds.indexOf(j.id), 'joints', <span className="px-type">{j.type}</span>, false))}
                  </>
                );
              })() : renderCompTree()}
            </div>
          </div>
          <div className="lp-vdivider" onMouseDown={startPxResize} title="Drag to resize" />
        </>
      )}

      {/* ── Controls hint ── */}
      <div className="instructions">
        <div className="section-title">CONTROLS</div>
        <div className="ctrl-grid">
          <kbd>Click</kbd>        <span>select · again → gizmo</span>
          <kbd>Ctrl/Shift</kbd>   <span>multi-select · <kbd>A</kbd> all</span>
          <kbd>M · R · S</kbd>    <span>move · rotate · scale</span>
          <kbd>Del / X</kbd>      <span>delete selected</span>
          <kbd>Scroll</kbd>       <span>zoom · <kbd>RMB</kbd> orbit</span>
          <kbd>Ctrl+Z</kbd>       <span>undo · <kbd>Ctrl+K</kbd> cmds</span>
        </div>
      </div>

      {/* ── Context menu ── */}
      {ctxMenu && (
        <>
          <div className="px-ctx-backdrop" onClick={closeCtx} onContextMenu={(e) => { e.preventDefault(); closeCtx(); }} />
          <div className="px-ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            <button onClick={() => addConnector(ctxMenu.bodyId)}>
              ◈ Add Connector
            </button>
            <button onClick={() => { select(ctxMenu.bodyId, 'body'); openPanel('inspector'); closeCtx(); }}>
              ✎ Open Inspector
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
