/**
 * appOps — the Studio's operators and its one shortcut table (docs/design/p6-operators.md).
 * Importing this file registers them.
 */
import { defineOperator, runOperator, canRun, listOperators } from '@/core/ops/registry';
import { findBindings, bindingText, type Binding } from '@/core/ops/keymap';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useEditModeStore } from '@/state/editModeStore';
import { useTransformHudStore } from '@/state/transformHudStore';
import { usePageStore, type Page } from '@/state/pageStore';
import { useThemeStore } from '@/state/themeStore';
import { useHistoryStore } from '@/state/historyStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { editBridge } from '@/viewport/editBridge';
import { bridge } from '@/bridge/cameraBridge';
import { saveProject, saveProjectAs } from '@/core/serialization/projectActions';
import { deleteSelectedEntity } from '@/features/editing/deleteSelected';
import { commands } from '@/core/commands/index';
import { duplicateInPlace, duplicateJointInPlace, reassignServoIds } from '@/features/ops/bodyOps';
import { bodiesOfComponent, jointsOfComponent, uid } from '@/core/model/index';
import { resetLayout } from '@/features/shell/layouts';

/** Copy selected bodies to the clipboard. If the selection is exactly every body
 *  of one Component, copy that whole component (with its joints) as a unit. */
type Clipboard =
  | { kind: 'bodies'; bodies: any[] }
  | { kind: 'component'; component: any; bodies: any[]; joints: any[] };
let _clipboard: Clipboard | null = null;
function copySelected() {
  const { ids, kind } = useSelectionStore.getState();
  if (kind !== 'body' || !ids.length) return;
  const { doc } = useModelStore.getState();
  const bodies = ids.map((id) => doc.bodies[id]).filter(Boolean);
  if (!bodies.length) return;

  const compId = bodies[0].componentId;
  if (compId && bodies.every((b) => b.componentId === compId)) {
    const comp = doc.components[compId];
    const allCompBodies = bodiesOfComponent(doc, compId);
    if (comp && allCompBodies.length === bodies.length) {
      _clipboard = { kind: 'component', component: comp, bodies: allCompBodies, joints: jointsOfComponent(doc, compId) };
      return;
    }
  }
  _clipboard = { kind: 'bodies', bodies };
}

/** Paste the clipboard. A component clipboard rebuilds a whole new Component with
 *  duplicated bodies + joints (ids remapped) as one undo step; a plain body
 *  clipboard duplicates each body in place as before. */
function pasteClipboard() {
  if (!_clipboard) return;
  const { dispatch } = useModelStore.getState();

  if (_clipboard.kind === 'component') {
    const { component, bodies, joints } = _clipboard;
    const newComponent = { ...structuredClone(component), id: uid('comp'), name: `${component.name} copy` };
    const bodyIdRemap = new Map<string, string>();
    const jointIdRemap = new Map<string, string>();
    const newBodies = bodies.map((b: any) => {
      const copy = duplicateInPlace(b);
      copy.componentId = newComponent.id;
      bodyIdRemap.set(b.id, copy.id);
      return copy;
    });
    for (const j of joints) jointIdRemap.set(j.id, uid('joint'));
    let newJoints = joints.map((j: any) => {
      const copy = duplicateJointInPlace(j, bodyIdRemap, jointIdRemap);
      copy.componentId = newComponent.id;
      return copy;
    });
    // Give the copies their own servo ids — otherwise they'd point at the same
    // physical servos as the originals (duplicate keys in Motor Control, and two
    // joints fighting over one real motor).
    newJoints = reassignServoIds(newJoints, useModelStore.getState().doc);
    dispatch(commands.addEntities([newComponent, ...newBodies, ...newJoints], `Paste ${newComponent.name}`));
    useSelectionStore.getState().selectMany(newBodies.map((b: any) => b.id), 'body');
    return;
  }

  const copies: string[] = [];
  for (const body of _clipboard.bodies) {
    const copy = duplicateInPlace(body);
    dispatch(commands.addBody(copy));
    copies.push(copy.id);
  }
  if (!copies.length) return;
  useSelectionStore.getState().selectMany(copies, 'body');
}

/** Duplicate the selected body/bodies in place, select the copies, and enter move mode. */
function duplicateSelectedInPlace() {
  const { selectedId, ids, kind } = useSelectionStore.getState();
  if (kind !== 'body') return;
  const targets = ids && ids.length ? ids : (selectedId ? [selectedId] : []);
  const { doc, dispatch } = useModelStore.getState();
  const copies: string[] = [];
  for (const id of targets) {
    const body = doc.bodies[id];
    if (!body) continue;
    const copy = duplicateInPlace(body);
    dispatch(commands.addBody(copy));
    copies.push(copy.id);
  }
  if (!copies.length) return;
  useSelectionStore.getState().selectMany(copies, 'body');
}

/** Select every body in the document (Ctrl+A in the editor). */
function selectAllBodies() {
  const ids = Object.keys(useModelStore.getState().doc.bodies);
  if (ids.length) useSelectionStore.getState().selectMany(ids, 'body');
}


// ── context ────────────────────────────────────────────────────────────────────
const page = () => usePageStore.getState().page;
const shared3D = () => { const p = page(); return p !== 'motor' && p !== 'msrr' && p !== 'esptt'; };
const editing = () => useEditModeStore.getState().active;
const objectMode = () => shared3D() && !editing();
const sel = () => useSelectionStore.getState();
const bodySelected = () => objectMode() && sel().kind === 'body' && !!sel().selectedId;
const axisModal = () => !!useTransformHudStore.getState().axis;

let ui = { togglePalette: () => {}, toggleHelp: () => {}, toggleConn: () => {} };
export const setUiActions = (a: typeof ui) => { ui = a; };

// ── operators ──────────────────────────────────────────────────────────────────
const PAGES: [Page, string][] = [['editor', 'Editor'], ['analysis', 'Analysis'], ['training', 'Training'], ['animation', 'Animation'], ['msrr', 'MSRR Experiments'], ['esptt', 'ESP-TTL'], ['motor', 'Motor Control']];
for (const [id, name] of PAGES) defineOperator({ id: `page.${id}`, label: `Go to ${name}`, group: 'View', poll: () => !editing(), exec: () => usePageStore.getState().setPage(id) });

defineOperator({ id: 'view.fit', label: 'Fit view to scene', group: 'View', poll: () => !editing() || !shared3D(), exec: () => bridge.fitCamera?.() });
defineOperator({ id: 'view.resetLayout', label: 'Reset layout of this page', group: 'View', exec: () => resetLayout(page()) });
defineOperator({ id: 'view.toggleTheme', label: 'Switch light or dark theme', group: 'View', exec: () => useThemeStore.getState().toggleTheme() });
defineOperator({ id: 'ui.palette', label: 'Command palette', group: 'App', hidden: true, exec: () => ui.togglePalette() });
defineOperator({ id: 'ui.help', label: 'Keyboard shortcuts', group: 'App', exec: () => ui.toggleHelp() });
defineOperator({ id: 'ui.connection', label: 'Toggle connection window', group: 'Hardware', exec: () => ui.toggleConn() });

defineOperator({ id: 'edit.undo', label: 'Undo', group: 'Edit', poll: () => useHistoryStore.getState().canUndo, exec: () => bridge.undo?.() });
defineOperator({ id: 'edit.redo', label: 'Redo', group: 'Edit', poll: () => useHistoryStore.getState().canRedo, exec: () => bridge.redo?.() });
defineOperator({ id: 'file.save', label: 'Save project', group: 'File', interactive: true, exec: () => saveProject() });
defineOperator({ id: 'file.saveAs', label: 'Save project as', group: 'File', interactive: true, exec: () => saveProjectAs() });

const simulated = () => useModelStore.getState().showingSimulation;
defineOperator({ id: 'pose.apply', label: 'Keep the simulated pose as the design', group: 'Edit', poll: simulated, exec: () => useModelStore.getState().bus.applyShownPose() });
defineOperator({ id: 'pose.revert', label: 'Back to the design pose', group: 'Edit', poll: simulated, exec: () => useModelStore.getState().bus.revertToDesign() });

defineOperator({ id: 'select.all', label: 'Select all bodies', group: 'Selection', poll: objectMode, exec: () => { if (page() === 'editor') selectAllBodies(); } });
defineOperator({ id: 'clipboard.copy', label: 'Copy', group: 'Edit', poll: () => objectMode() && page() === 'editor', exec: copySelected });
defineOperator({ id: 'clipboard.paste', label: 'Paste', group: 'Edit', poll: () => objectMode() && page() === 'editor', exec: pasteClipboard });
defineOperator({ id: 'body.duplicate', label: 'Duplicate in place', group: 'Build', poll: bodySelected, exec: duplicateSelectedInPlace });
defineOperator({ id: 'entity.delete', label: 'Delete selected', group: 'Build', poll: () => objectMode() && !!sel().selectedId, exec: () => deleteSelectedEntity() });
// X moves along X when a body is selected, so as a delete key it only applies to joints.
defineOperator({ id: 'joint.delete', label: 'Delete selected joint', group: 'Build', hidden: true, poll: () => objectMode() && !!sel().selectedId && sel().kind !== 'body', exec: () => deleteSelectedEntity() });

defineOperator({ id: 'modal.cancel', label: 'Cancel axis move', group: 'Transform', hidden: true, poll: axisModal, exec: () => bridge.cancelAxisModal?.() });
defineOperator({ id: 'edit.exit', label: 'Leave Edit Mode', group: 'Edit Mode', hidden: true, poll: editing, exec: () => useEditModeStore.getState().exit() });
defineOperator({ id: 'select.clear', label: 'Clear selection', group: 'Selection', hidden: true, poll: () => shared3D() && !!sel().selectedId, exec: () => sel().clear() });
defineOperator({ id: 'edit.enter', label: 'Enter Edit Mode', group: 'Edit Mode', poll: bodySelected, exec: () => useEditModeStore.getState().enter(sel().selectedId!) });

const gizmo = (mode: 'translate' | 'rotate' | 'scale') => () => {
  const s = sel();
  if (s.gizmoMode === mode && s.showGizmo) s.hideGizmo();
  else { s.setGizmoMode(mode); if (!s.showGizmo) s.revealGizmo(); }
};
defineOperator({ id: 'gizmo.move', label: 'Move', group: 'Transform', poll: bodySelected, exec: gizmo('translate') });
defineOperator({ id: 'gizmo.rotate', label: 'Rotate', group: 'Transform', poll: bodySelected, exec: gizmo('rotate') });
defineOperator({ id: 'gizmo.scale', label: 'Scale', group: 'Transform', poll: bodySelected, exec: gizmo('scale') });
for (const a of ['x', 'y', 'z'] as const) defineOperator({ id: `axis.${a}`, label: `Constrain to ${a.toUpperCase()} axis`, group: 'Transform', hidden: true, poll: bodySelected, exec: () => bridge.startAxisModal?.(a) });

const inEdit = () => shared3D() && editing();
const MESH: [string, string, () => void][] = [
  ['delete', 'Delete faces', () => editBridge.deleteSelection()], ['extrude', 'Extrude', () => editBridge.extrude()], ['selectSimilar', 'Select similar', () => editBridge.selectSimilar()],
  ['move', 'Two-point move', () => editBridge.startTwoPointMove()], ['loopCut', 'Loop cut', () => editBridge.loopCut()], ['selectAll', 'Select all faces', () => editBridge.selectAll()],
  ['fill', 'Fill', () => editBridge.fill()], ['connect', 'Connect', () => editBridge.connect()], ['bevel', 'Bevel', () => editBridge.bevel()], ['selectLinked', 'Select linked', () => editBridge.selectLinked()], ['inset', 'Inset', () => editBridge.inset()],
];
for (const [id, label, exec] of MESH) defineOperator({ id: `mesh.${id}`, label, group: 'Edit Mode', hidden: true, poll: inEdit, exec });

// ── the one shortcut table. For one key, the first operator whose poll passes runs. ──
export const KEYMAP: Binding[] = [
  { key: 'k', ctrl: true, op: 'ui.palette', whileTyping: true }, { key: 'p', ctrl: true, op: 'ui.palette', whileTyping: true },
  { key: 'a', ctrl: true, op: 'select.all' }, { key: 'c', ctrl: true, op: 'clipboard.copy' }, { key: 'v', ctrl: true, op: 'clipboard.paste' },
  { key: 's', ctrl: true, op: 'file.save' }, { key: 's', ctrl: true, shift: true, op: 'file.saveAs' },
  { key: 'z', ctrl: true, op: 'edit.undo' }, { key: 'y', ctrl: true, op: 'edit.redo' }, { key: 'z', ctrl: true, shift: true, op: 'edit.redo' },
  { key: '?', anyShift: true, op: 'ui.help', label: '?' }, { key: '/', op: 'ui.help', label: '/' },
  { key: 'escape', anyShift: true, op: 'modal.cancel' }, { key: 'escape', anyShift: true, op: 'edit.exit' }, { key: 'escape', anyShift: true, op: 'select.clear' },
  { key: 'tab', op: 'edit.exit' }, { key: 'tab', op: 'edit.enter' },
  { key: 'delete', anyShift: true, op: 'mesh.delete' }, { key: 'backspace', anyShift: true, op: 'mesh.delete' }, { key: 'x', anyShift: true, op: 'mesh.delete' },
  { key: 'e', op: 'mesh.extrude' }, { key: 'g', shift: true, op: 'mesh.selectSimilar' }, { key: 'g', op: 'mesh.move' }, { key: 'r', ctrl: true, op: 'mesh.loopCut' },
  { key: 'a', op: 'mesh.selectAll' }, { key: 'f', op: 'mesh.fill' }, { key: 'j', op: 'mesh.connect' }, { key: 'b', op: 'mesh.bevel' }, { key: 'l', op: 'mesh.selectLinked' }, { key: 'i', op: 'mesh.inset' },
  { key: 'd', op: 'body.duplicate' }, { key: 'm', op: 'gizmo.move' }, { key: 'r', op: 'gizmo.rotate' }, { key: 's', op: 'gizmo.scale' },
  { key: 'x', op: 'axis.x' }, { key: 'y', op: 'axis.y' }, { key: 'z', op: 'axis.z' },
  { key: 'f', op: 'view.fit' },
  { key: 'delete', anyShift: true, op: 'entity.delete' }, { key: 'backspace', anyShift: true, op: 'entity.delete' }, { key: 'x', anyShift: true, op: 'joint.delete' },
];

export const shortcutsFor = (opId: string) => KEYMAP.filter((b) => b.op === opId).map((b: any) => b.label ?? bindingText(b));

const isTyping = (e: any) => {
  const t = e.target, ae: any = document.activeElement;
  return ['INPUT', 'TEXTAREA'].includes(t?.tagName) || t?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(ae?.tagName) || ae?.isContentEditable;
};

/** Typing a number during an axis move sees keys first, like a Blender modal handler. */
function axisModalKey(e: KeyboardEvent) {
  const hud = useTransformHudStore.getState();
  if (!hud.axis) return false;
  const k = e.key.toLowerCase();
  if (/^[0-9.]$/.test(k) || (k === '-' && !hud.buffer)) { hud.appendChar(k); return true; }
  if (e.key === 'Backspace') { hud.backspace(); return true; }
  if (e.key === 'Enter') { const v = parseFloat(hud.buffer); bridge.commitAxisModal?.(isNaN(v) ? undefined : v); return true; } // raw value: the modal converts mm, deg or ×
  return false;
}

export function handleKey(e: KeyboardEvent) {
  const typing = isTyping(e);
  if (!typing && shared3D() && axisModalKey(e)) { e.preventDefault(); return; }
  for (const b of findBindings(KEYMAP, e)) {
    if (typing && !b.whileTyping) continue;
    if (!canRun(b.op)) continue;
    e.preventDefault();
    const r = runOperator(b.op, b.props);
    if (!r.ok) console.error(r.error);
    return;
  }
}

if (typeof window !== 'undefined') (window as any).tetrobotOps = { run: runOperator, list: listOperators, canRun };
