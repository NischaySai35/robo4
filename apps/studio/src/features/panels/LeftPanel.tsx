import './LeftPanel.css';
import { useCallback, useRef } from 'react';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useEditorStore } from '@/state/editorStore';
import { useEditModeStore } from '@/state/editModeStore';
import { useDockStore } from '@/state/dockStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { groundBody } from '@/features/rigid/groundBody';
import { setBodyModePreservingPose } from '@/features/rigid/bodyModeAction';
import { commands } from '@/core/commands/index';
import {
  makeBody, makeJoint, makeGeometry, GeometryType, JointType, identityOrigin, makeComponent, uid,
  bodiesOfComponent, jointsOfComponent,
} from '@/core/model/index';
import type { Connector } from '@/core/model/index';
import { jointFramesForBodies } from '@/kinematics/modelFK';
import { buildDefaultModuleEntities, getDefaultModuleDoc, moduleDocToProject, saveDefaultModule } from '@/core/factory/defaultModule';
import { bridge } from '@/viewport/cameraBridge';
import { deleteSelectedEntity } from '@/features/editing/deleteSelected';
import { duplicateInPlace, duplicateJointInPlace, reassignServoIds } from '@/features/ops/bodyOps';
import GizmoModeButtons, { BODY_GIZMO_MODES, POINT_GIZMO_MODES, type GizmoModeId } from '@/features/common/GizmoModeButtons';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

  // ── Workspace-persisted state ────────────────────────────────────────────────
  const buildOpen    = useWorkspaceStore((s) => s.buildOpen);
  const setBuildOpen = useWorkspaceStore((s) => s.setBuildOpen);
  const controlsOpen    = useWorkspaceStore((s) => s.controlsOpen);
  const setControlsOpen = useWorkspaceStore((s) => s.setControlsOpen);
  const pxHeight    = useWorkspaceStore((s) => s.pxHeight);
  const setPxHeight = useWorkspaceStore((s) => s.setPxHeight);
  const collapsedCompIds    = useWorkspaceStore((s) => s.collapsedComponents);
  const setCollapsedCompIds = useWorkspaceStore((s) => s.setCollapsedComponents);
  const collapsedComps = new Set(collapsedCompIds);
  const hiddenBodyIds       = useWorkspaceStore((s) => s.hiddenBodyIds);
  const toggleBodyVisibility = useWorkspaceStore((s) => s.toggleBodyVisibility);
  const hiddenSet = new Set(hiddenBodyIds);
  const bodyMode        = useWorkspaceStore((s) => s.bodyMode);
  const activeBodyId    = useWorkspaceStore((s) => s.activeBodyId);
  const setActiveBodyId = useWorkspaceStore((s) => s.setActiveBodyId);
  const hoveredBodyId   = useSelectionStore((s) => s.hoveredBodyId);

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
  const [editing, setEditing]   = useState<any>(null);
  const [searchQ, setSearchQ]   = useState('');
  const [targetCompId, setTargetCompId] = useState<string | null>(null);
  const [dragKey,  setDragKey]  = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<'body' | 'joint' | null>(null);
  const [dropTarget,     setDropTarget]     = useState<string | null>(null);
  const [compDropTarget, setCompDropTarget] = useState<string | null>(null);

  // ── Build actions ────────────────────────────────────────────────────────────
  const addPrimitive = (type: any, params: any) => {
    const n = bodies.length;
    const compEntries = Object.values(doc.components ?? {});
    let compId = targetCompId && (doc.components ?? {})[targetCompId] ? targetCompId : null;
    if (!compId && compEntries.length > 0) compId = compEntries[0].id;

    // Spawn just to the right of the ACTUAL rightmost existing body, not at
    // bodyCount*1.3 — with many bodies the old count-based X put new primitives
    // metres away from where the model actually sits (huge "gap nearby").
    let spawnX = 0;
    let maxRight = -Infinity;
    for (const b of bodies) {
      const px = b?.transform?.position?.[0];
      if (typeof px === 'number') maxRight = Math.max(maxRight, px);
    }
    if (maxRight > -Infinity) spawnX = maxRight + 1.3;

    const body = makeBody({
      name: `${cap(type)} ${n + 1}`,
      visual: { geometry: makeGeometry(type, params), materialId: null, origin: identityOrigin() },
      transform: { position: [spawnX, 0.6, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
      componentId: compId,
    });

    if (!compId) {
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
    // If exactly 2 bodies are multi-selected, use them as the joint pair.
    const twoSelected = selKind === 'body' && selIds.length === 2
      && selIds.every((id) => doc.bodies[id]);
    const b1 = twoSelected ? doc.bodies[selIds[0]]
      : (selectedId && doc.bodies[selectedId]) ? doc.bodies[selectedId] : bodies[bodies.length - 2];
    const b2 = twoSelected ? doc.bodies[selIds[1]] : bodies.find((b) => b.id !== b1.id);
    if (!b2) return;
    const { origin, childRest } = jointFramesForBodies(b1, b2);
    const compId = b1.componentId ?? null;
    const existingNames = new Set(joints.map((j: any) => j.name));
    let n = 1; while (existingNames.has(`Joint ${n}`)) n++;
    const j = makeJoint({
      name: `Joint ${n}`, type: JointType.REVOLUTE,
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
    const next = new Set(collapsedComps); next.delete(comp.id);
    setCollapsedCompIds(Array.from(next));
  };

  /** Add another copy of the base module (a whole Component: bodies + joints),
   *  offset clear of the original so repeated clicks stack modules side by side
   *  instead of piling up on top of each other. Always copies the FIRST component
   *  in the project (the hand-built original), not whichever copy was added last —
   *  otherwise repeated clicks would chain off each other ("Module 2 2 2 …"). */
  const addModule = () => {
    const templateId = comps[0]?.id;
    const template = templateId ? doc.components[templateId] : null;
    const templateBodies = templateId ? bodiesOfComponent(doc, templateId) : [];
    // No module in THIS project → instantiate the global default module (the
    // bundled hand-built one, or the user's saved override) so Add Module works
    // in every project, not just the one that contains the original.
    if (!template || !templateBodies.length) {
      const { entities, componentName } = buildDefaultModuleEntities(doc);
      if (!entities.length) { alert('No default module available.'); return; }
      dispatch(commands.addEntities(entities, `Add ${componentName}`));
      const newBodyIds = entities.filter((e: any) => e.kind === 'body').map((e: any) => e.id);
      useSelectionStore.getState().selectMany(newBodyIds, 'body');
      setAddOpen(false);
      return;
    }
    const templateJoints = jointsOfComponent(doc, templateId!);

    // Offset along +X by the template's own width (+ a margin), stepped further out
    // for each existing copy so modules line up side by side without overlapping.
    let minX = Infinity, maxX = -Infinity;
    for (const b of templateBodies) {
      minX = Math.min(minX, b.transform.position[0]);
      maxX = Math.max(maxX, b.transform.position[0]);
    }
    const spacing = Math.max(0.15, maxX - minX) + 0.25;
    const existingCopies = comps.filter((c) => c.name === template.name || c.name.startsWith(`${template.name} `)).length;
    const offsetX = spacing * existingCopies;

    const newComponent = { ...structuredClone(template), id: uid('comp'), name: `${template.name} ${existingCopies + 1}` };
    const bodyIdRemap = new Map<string, string>();
    const newBodies = templateBodies.map((b) => {
      const copy = duplicateInPlace(b);
      copy.componentId = newComponent.id;
      copy.transform = { ...copy.transform, position: [copy.transform.position[0] + offsetX, copy.transform.position[1], copy.transform.position[2]] };
      bodyIdRemap.set(b.id, copy.id);
      return copy;
    });
    const jointIdRemap = new Map<string, string>();
    for (const j of templateJoints) jointIdRemap.set(j.id, uid('joint'));
    let newJoints = templateJoints.map((j) => {
      const copy = duplicateJointInPlace(j, bodyIdRemap, jointIdRemap);
      copy.componentId = newComponent.id;
      return copy;
    });
    // New module copy gets its own servo ids, continuing from whatever's already
    // assigned — otherwise it'd collide with the template module's real servos.
    newJoints = reassignServoIds(newJoints, doc);

    dispatch(commands.addEntities([newComponent, ...newBodies, ...newJoints], `Add ${newComponent.name}`));
    const next = new Set(collapsedComps); next.delete(newComponent.id);
    setCollapsedCompIds(Array.from(next));
    useSelectionStore.getState().selectMany(newBodies.map((b) => b.id), 'body');
    setAddOpen(false);
  };

  // Open the default module as its own editable project. Edit its geometry /
  // connectors / joints in the normal Editor, then "Save as Default Module" to
  // make those edits the source for future Add Module calls (in any project).
  const editDefaultModule = () => {
    if (!confirm('Open the default module for editing? Any unsaved changes in the current project will be replaced.')) return;
    bridge.loadScene?.(moduleDocToProject(getDefaultModuleDoc()));
    setAddOpen(false);
  };

  // Save the CURRENT project's document as the default module (override the
  // bundled one). Add Module will then instantiate this edited module everywhere.
  const saveAsDefaultModule = () => {
    saveDefaultModule(doc);
    alert('Saved the current project as the default module. Add Module will now use it in every project.');
    setAddOpen(false);
  };

  // ── Project explorer actions ─────────────────────────────────────────────────
  const openInspectorFor = (id: any, kind: any) => { select(id, kind); openPanel('inspector'); };

  // The rename box is an UNCONTROLLED input read via this ref on commit. A controlled
  // input dropped keystrokes here: the panel re-renders on unrelated store changes
  // (hover, doc updates) and React kept re-applying the stale `value`, wiping whatever
  // was typed — only Backspace appeared to "work". Uncontrolled = React never resets it.
  const renameRef = useRef<HTMLInputElement | null>(null);
  const attachRename = (el: HTMLInputElement | null) => {
    renameRef.current = el;
    if (el && document.activeElement !== el) { el.focus(); el.select(); }
  };

  // A body/joint name must be unique within its component; a component name unique
  // among components. Returns true if `name` collides with a *different* sibling.
  const isDuplicateName = (id: any, kind: any, name: string) => {
    const lc = name.toLowerCase();
    if (kind === 'component') {
      return comps.some((c: any) => c.id !== id && (c.name ?? '').toLowerCase() === lc);
    }
    const list: any[] = kind === 'body' ? bodies : joints;
    const self = list.find((e) => e.id === id);
    const compId = self?.componentId ?? null;
    return list.some((e) => e.id !== id
      && (e.componentId ?? null) === compId
      && (e.name ?? '').toLowerCase() === lc);
  };

  const startRename = (id: any, kind: any, name: any) => setEditing({ id, kind, text: name });
  const commitRename = () => {
    if (!editing) return;
    const name = (renameRef.current?.value ?? editing.text).trim();
    if (name) {
      if (isDuplicateName(editing.id, editing.kind, name)) {
        // eslint-disable-next-line no-restricted-globals, no-alert
        alert(`A ${editing.kind} named "${name}" already exists here. Keeping the previous name.`);
        setEditing(null);
        return;
      }
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

  // Close on Escape key anywhere
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCtx(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ctxMenu, closeCtx]);

  const addConnector = (bodyId: string) => {
    closeCtx();
    const body = doc.bodies[bodyId];
    if (!body) return;
    const existing: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    const con: Connector = { id: uid('con'), name: `Connector ${existing.length + 1}`, position: [0, 0, 0], normal: [0, 0, 1] };
    dispatch(commands.updateBody(bodyId, { meta: { ...body.meta, connectors: [...existing, con] } }));
    select(bodyId, 'body');
    openPanel('inspector');
  };

  const deleteConnector = (bodyId: string, conId: string) => {
    const body = doc.bodies[bodyId];
    if (!body) return;
    const existing: Connector[] = (body.meta?.connectors as Connector[] | undefined) ?? [];
    dispatch(commands.updateBody(bodyId, { meta: { ...body.meta, connectors: existing.filter((c) => c.id !== conId) } }));
  };

  const smartMenuPos = (x: number, y: number) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    return {
      left: x + 210 > vw - 8 ? Math.max(8, x - 210) : x,
      top:  y + 300 > vh - 8 ? Math.max(8, y - 300) : y,
    };
  };

  // ── Row renderer ─────────────────────────────────────────────────────────────
  const renderRow = (
    entity: any, kind: any, ids: any, idx: any, collection: any, extra: any, indented = false,
  ) => {
    const isSel        = selIds.includes(entity.id);
    const isActive     = selectedId === entity.id;
    const isEditing    = editing && editing.id === entity.id;
    const isDropHere   = dropTarget === entity.id && dragKey !== entity.id;
    const isHidden     = kind === 'body' && hiddenSet.has(entity.id);
    const isGrounded   = kind === 'body' && bodyMode === 'rigid' && entity.id === activeBodyId;
    const isHovered    = kind === 'body' && entity.id === hoveredBodyId && !isSel;
    return (
      <div
        key={entity.id}
        className={[
          'px-row',
          indented ? 'px-indent' : '',
          isSel ? 'px-row--sel' : '',
          isActive ? 'px-row--active' : '',
          isDropHere ? 'px-row--drop' : '',
          isHidden ? 'px-row--hidden' : '',
          isGrounded ? 'px-row--grounded' : '',
          isHovered ? 'px-row--hover' : '',
        ].filter(Boolean).join(' ')}
        draggable={!isEditing}
        onContextMenu={kind === 'body' ? (e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, bodyId: entity.id }); } : undefined}
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
          e.stopPropagation();
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
            key={editing.id}
            ref={attachRename}
            draggable={false}
            defaultValue={editing.text}
            onChange={(e) => { const v = e.target.value; setEditing((prev: any) => (prev ? { ...prev, text: v } : prev)); }}
            onBlur={commitRename}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(null); }}
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
          {kind === 'body' && (
            <button
              className={`px-mini px-eye${hiddenSet.has(entity.id) ? ' px-eye--hidden' : ''}`}
              title={hiddenSet.has(entity.id) ? 'Show body' : 'Hide body'}
              onClick={(e) => { e.stopPropagation(); toggleBodyVisibility(entity.id); }}
            >
              {hiddenSet.has(entity.id) ? '🔕' : '👁'}
            </button>
          )}
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
          const isCollapsed   = collapsedComps.has(comp.id);
          const isEditingComp = editing?.id === comp.id && editing?.kind === 'component';
          const isDropTarget  = compDropTarget === comp.id;
          const isTarget      = targetCompId === comp.id;

          return (
            <div
              key={comp.id}
              className={`px-comp${isDropTarget ? ' px-comp--drop' : ''}${isTarget ? ' px-comp--target' : ''}`}
              onDragOver={(e) => { if (dragKey) { e.preventDefault(); setCompDropTarget(comp.id); } }}
              onDragLeave={() => setCompDropTarget((t) => (t === comp.id ? null : t))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragKey && dragKind) {
                  // Move ALL selected items of the same kind, not just the one being dragged.
                  const sel = useSelectionStore.getState();
                  const idsToMove = (sel.kind === dragKind && sel.ids.includes(dragKey))
                    ? sel.ids
                    : [dragKey];
                  const cmd = dragKind === 'body' ? commands.moveBodyToComponent : commands.moveJointToComponent;
                  for (const id of idsToMove) dispatch(cmd(id, comp.id));
                }
                setDragKey(null); setDragKind(null); setCompDropTarget(null); setDropTarget(null);
              }}
            >
              {/* Component header */}
              <div
                className="px-comp-hdr"
                onClick={() => {
                  setTargetCompId(comp.id);
                  const next = new Set(collapsedComps);
                  next.has(comp.id) ? next.delete(comp.id) : next.add(comp.id);
                  setCollapsedCompIds(Array.from(next));
                }}
              >
                <span className={`px-comp-chevron${isCollapsed ? '' : ' px-comp-chevron--open'}`}>▶</span>
                {isEditingComp ? (
                  <input
                    className="px-rename"
                    key={editing.id}
                    ref={attachRename}
                    draggable={false}
                    defaultValue={editing.text}
                    onChange={(e) => { const v = e.target.value; setEditing((prev: any) => (prev ? { ...prev, text: v } : prev)); }}
                    onBlur={commitRename}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(null); }}
                  />
                ) : (
                  <span
                    className="px-comp-name"
                    title="Click to select the whole component (move/rotate/copy as one rigid group)"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!compBodies.length) return;
                      const sel = useSelectionStore.getState();
                      const compIds = compBodies.map((b) => b.id);
                      // Toggle: if this component's bodies are already exactly the current
                      // selection, clicking again deselects. Otherwise select them all.
                      const already = sel.kind === 'body'
                        && sel.ids.length === compIds.length
                        && compIds.every((id) => sel.ids.includes(id));
                      if (already) sel.clear();
                      else sel.selectMany(compIds, 'body');
                    }}
                  >
                    {comp.name}
                  </span>
                )}
                <span className="px-comp-count">{compBodies.length}B·{compJoints.length}J</span>
                <div className="px-comp-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="px-mini" title="Rename" onClick={() => startRename(comp.id, 'component', comp.name)}>✎</button>
                  <button className="px-mini px-mini--danger" title="Unassign — removes the component, keeps its bodies/joints (they move to Unassigned)"
                    onClick={() => {
                      // eslint-disable-next-line no-restricted-globals
                      if (confirm(`Unassign "${comp.name}"? Its members will move to Unassigned (nothing is deleted).`)) {
                        dispatch(commands.removeComponent(comp.id));
                        if (targetCompId === comp.id) setTargetCompId(null);
                      }
                    }}>✕</button>
                  <button className="px-mini px-mini--danger" title="Delete everything — the component AND all its bodies/joints"
                    onClick={() => {
                      // eslint-disable-next-line no-restricted-globals
                      if (confirm(`Delete "${comp.name}" AND everything inside it (${compBodies.length} bodies, ${compJoints.length} joints)? This cannot be undone after closing the project.`)) {
                        dispatch(commands.removeComponentAndContents(comp.id));
                        if (targetCompId === comp.id) setTargetCompId(null);
                      }
                    }}>🗑</button>
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
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [setPxHeight]);

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

      {/* ── Body Mode (Free Float ↔ Rigid) ── */}
      <div className="section">
        <div className="section-title">BODY MODE</div>
        <div className="lp-mode-toggle">
          <button
            className={`lp-mode-btn ${bodyMode === 'free' ? 'lp-mode-btn--on' : ''}`}
            onClick={() => setBodyModePreservingPose('free')}
            title="Free Float — no grounded body; FK uses first-wins tree">
            Free Float
          </button>
          <button
            className={`lp-mode-btn lp-mode-btn--rigid ${bodyMode === 'rigid' ? 'lp-mode-btn--on' : ''}`}
            onClick={() => setBodyModePreservingPose('rigid')}
            title="Rigid — right-click any body to set it as the fixed base; graph FK propagates outward">
            Rigid
          </button>
        </div>
        {bodyMode === 'rigid' && (
          <div className="lp-rigid-hint">
            {activeBodyId
              ? <><span className="lp-rigid-dot" /> Active: <strong>{doc.bodies[activeBodyId]?.name ?? '—'}</strong></>
              : <><span className="lp-rigid-dot lp-rigid-dot--none" /> Right-click a body to set it as active</>}
          </div>
        )}
      </div>

      {/* ── Transform (when body selected) ── */}
      {!editActive && selKind === 'body' && isBodySelected && (
        <div className="section">
          <div className="section-title">TRANSFORM</div>
          <GizmoModeButtons
            modes={BODY_GIZMO_MODES}
            activeMode={gizmoMode}
            active={showGizmo}
            onSelect={(id: GizmoModeId) => setGizmoMode(id)}
          />
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

      {/* ── Transform (when a connector marker is selected) ── */}
      {!editActive && selKind === 'connector' && selectedId && (
        <div className="section">
          <div className="section-title">CONNECTOR TRANSFORM</div>
          <GizmoModeButtons
            modes={POINT_GIZMO_MODES}
            activeMode={gizmoMode}
            active={showGizmo}
            onSelect={(id: GizmoModeId) => setGizmoMode(id)}
          />
          <div className="lp-pivot-label">Move repositions it on the body; Rotate re-aims its facing normal.</div>
        </div>
      )}

      {!editActive && (
        <>
          {/* ── Build (collapsible, open by default) ── */}
          <div className="section">
            <div
              className="section-title section-title--toggle"
              onClick={() => setBuildOpen(!buildOpen)}
              title={buildOpen ? 'Collapse' : 'Expand'}
            >
              BUILD
              <span className={`section-chevron${buildOpen ? ' section-chevron--open' : ''}`}>▶</span>
            </div>
            {buildOpen && (
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
                      <div className="lp-add-title">MODULE</div>
                      <div className="lp-add-grid">
                        <button
                          className="lp-add-item lp-add-item--module"
                          onClick={addModule}
                          title="Add a module: copies this project's module if it has one, otherwise the global default module. Placed offset so it never overlaps.">
                          ⛓ Add Module
                        </button>
                        <button
                          className="lp-add-item"
                          onClick={editDefaultModule}
                          title="Open the default module in the editor to change its geometry / connectors / joints, then Save as Default.">
                          ✎ Edit Default
                        </button>
                        <button
                          className="lp-add-item"
                          onClick={saveAsDefaultModule}
                          title="Save the current project as the default module — Add Module will use it in every project.">
                          ★ Save as Default
                        </button>
                      </div>
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
                  disabled={!selectedId} title="Delete selected (Del / Backspace)">
                  <I><path d="M3 5h14M7 5V3h6v2M6 8v6M10 8v6M14 8v6M4 5l1 12h10l1-12" /></I>
                </button>
              </div>
            )}
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

      {/* ── Controls (collapsible, closed by default) ── */}
      <div className="instructions">
        <div
          className="section-title section-title--toggle"
          onClick={() => setControlsOpen(!controlsOpen)}
          title={controlsOpen ? 'Collapse' : 'Expand'}
        >
          CONTROLS
          <span className={`section-chevron${controlsOpen ? ' section-chevron--open' : ''}`}>▶</span>
        </div>
        {controlsOpen && (
          <div className="ctrl-grid">
            <kbd>Click</kbd>        <span>select · again → gizmo</span>
            <kbd>Ctrl/Shift</kbd>   <span>multi-select · <kbd>A</kbd> all</span>
            <kbd>M · R · S</kbd>    <span>move · rotate · scale</span>
            <kbd>Del</kbd>          <span>delete selected</span>
            <kbd>Scroll</kbd>       <span>zoom · <kbd>RMB</kbd> orbit</span>
            <kbd>Ctrl+Z</kbd>       <span>undo · <kbd>Ctrl+K</kbd> cmds</span>
          </div>
        )}
      </div>

      {/* ── Context menu — rendered via portal so position:fixed works correctly ── */}
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
                {bodyMode === 'rigid' && (
                  <button onClick={() => { groundBody(activeBodyId === ctxMenu.bodyId ? null : ctxMenu.bodyId); closeCtx(); }}>
                    {activeBodyId === ctxMenu.bodyId ? '⬛ Unset Active Body' : '⬛ Set as Active Body'}
                  </button>
                )}
                <button onClick={() => { select(ctxMenu.bodyId, 'body'); closeCtx(); }}>✎ Select</button>
                <button onClick={() => { closeCtx(); select(ctxMenu.bodyId, 'body'); openPanel('inspector'); }}>📋 Open Inspector</button>
                <div className="px-ctx-sep" />
                {ctxConns.length > 0 && (
                  <>
                    <div className="px-ctx-section">Connectors</div>
                    {ctxConns.map((c) => (
                      <div key={c.id} className="px-ctx-con-row">
                        <span className="px-ctx-con-name">◈ {c.name}</span>
                        <button className="danger" title="Delete connector" onClick={(e) => { e.stopPropagation(); deleteConnector(ctxMenu.bodyId, c.id); }}>✕</button>
                      </div>
                    ))}
                  </>
                )}
                <button onClick={() => addConnector(ctxMenu.bodyId)}>+ Add Connector</button>
              </div>
            </>
          );
        })(),
        document.body,
      )}
    </aside>
  );
}
