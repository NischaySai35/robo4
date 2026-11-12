/**
 * syncAssign — which real board each sim module drives while Sync is on (Nischay 12 Nov).
 *
 * Sync ON: the sim's modules (in the model's order: M1, M2 ...) are linked to the ONLINE boards in their number order
 * (mod1, mod2 ...). More real boards than sim modules: the first ones are linked, the rest stay still and a small notice at
 * the top says so; more sim modules than boards: the extra sim modules are sim-only, same notice. While Sync stays on, a board
 * that comes online fills a free sim module; nothing already linked is reshuffled under a moving robot.
 * REUSE-CHECKED: assign|binding|componentId|nodeForModule -> the link IS espNodesStore's node.componentId (servoRouting already
 * routes joint -> module -> board by it); nothing in the Studio set it yet. This sets it; poseSync.modelPose reads it.
 */
import { create } from 'zustand';
import type { Document } from '@/core/model/index';
import { useModelStore } from '@/state/modelStore';
import { useEspNodesStore, type EspNode } from '@/state/espNodesStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { usePageStore } from '@/state/pageStore';
import { moduleOfJoint } from '@/features/servo/servoLink';
import { moduleNumber } from '@/features/servo/espPoll';

export interface SimModule { id: string | null; name: string; index: number }   // index: 1-based, "M1"
export interface RealBoard { node: EspNode; num: number }

/** the sim's modules: components that own a movable joint, in the model's order. No components at all = one module (id null). */
export function simModules(doc: Document): SimModule[] {
  const owning = new Set<string | null>();
  for (const j of Object.values(doc.joints)) if (j.type !== 'fixed') owning.add(moduleOfJoint(doc, j));
  const ids: (string | null)[] = Object.keys(doc.components ?? {}).filter((id) => owning.has(id));
  if (!ids.length && owning.size) ids.push(null);
  return ids.map((id, i) => ({ id, name: id ? doc.components[id]?.name ?? `Module ${i + 1}` : 'Model', index: i + 1 }));
}

/** the boards, lowest module number first; online only by default */
export function realBoards(onlineOnly = true): RealBoard[] {
  return useEspNodesStore.getState().nodes
    .map((node, i) => ({ node, num: moduleNumber(node.url, node.name, i) }))
    .filter((b) => !onlineOnly || b.node.connected)
    .sort((a, b) => a.num - b.num);
}

export const boardName = (node: EspNode | null | undefined): string => {
  if (!node) return '';
  const nodes = useEspNodesStore.getState().nodes;
  return `mod${moduleNumber(node.url, node.name, Math.max(0, nodes.indexOf(node)))}`;
};

/** the board a sim module drives: the one linked to it; a model with ONE module may also use an unlinked board (an online one
 *  first), as servoRouting's catch-all does. Several modules: an unlinked module drives nothing (never someone else's board). */
export function boardOfModule(doc: Document, moduleId: string | null): EspNode | null {
  const nodes = useEspNodesStore.getState().nodes;
  const linked = moduleId ? nodes.find((n) => n.componentId === moduleId) : undefined;
  if (linked) return linked;
  if (simModules(doc).length > 1) return null;
  const free = nodes.filter((n) => !n.componentId);
  return free.find((n) => n.connected) ?? free[0] ?? (nodes.length === 1 ? nodes[0] : null);
}

export type NoticeKind = 'ok' | 'warn' | 'info';
export interface SyncNotice { kind: NoticeKind; title: string; lines: string[]; key: string; at: number }

export const useSyncAssign = create<{ onAt: number; notice: SyncNotice | null; dismissed: string }>(() => ({ onAt: 0, notice: null, dismissed: '' }));
export const dismissSyncNotice = () => useSyncAssign.setState((s) => ({ dismissed: s.notice?.key ?? '', notice: null }));

/** link sim modules to online boards. fresh = Sync was just switched on: every link is made again in order. */
let assigning = false;                 // its own store writes must not re-enter it through the watcher below
export function autoAssign(fresh: boolean) {
  if (assigning) return; assigning = true;
  try { assign(fresh); } finally { assigning = false; }
}
function assign(fresh: boolean) {
  const doc = useModelStore.getState().doc;
  const sims = simModules(doc);
  const st = useEspNodesStore.getState();
  const simIds = new Set(sims.map((s) => s.id).filter(Boolean) as string[]);
  for (const n of st.nodes)                                              // fresh: all links; later: only links to modules gone from the sim
    if (n.componentId && (fresh || !simIds.has(n.componentId))) st.updateNode(n.id, { componentId: null });
  const linked = new Set(useEspNodesStore.getState().nodes.map((n) => n.componentId).filter(Boolean));
  const free = realBoards(true).filter((b) => !b.node.componentId);
  for (const s of sims) {
    if (!s.id || linked.has(s.id)) continue;
    const b = free.shift(); if (!b) break;
    st.updateNode(b.node.id, { componentId: s.id }); linked.add(s.id);
  }
}

/** what is linked to what, and what is left over */
export function linkReport(doc: Document = useModelStore.getState().doc) {
  const sims = simModules(doc), online = realBoards(true);
  const pairs = sims.map((s) => ({ sim: s, node: boardOfModule(doc, s.id) }));
  const used = new Set(pairs.map((p) => p.node?.id).filter(Boolean));
  return {
    sims, online, pairs,
    spareReal: online.filter((b) => !used.has(b.node.id)),
    simOnly: pairs.filter((p) => !p.node || !p.node.connected).map((p) => p.sim),
  };
}

/** the Sync box's row name for a board address: "M1 · mod1" (which sim module drives it), else just "mod1" */
export function hostLabel(host: string): string {
  const r = linkReport();
  const hostOf = (u: string) => { try { return new URL(u).host; } catch { return u; } };
  const p = r.pairs.find((x) => x.node && hostOf(x.node.url) === host);
  if (p) return `M${p.sim.index} · ${boardName(p.node)}`;
  const n = useEspNodesStore.getState().nodes.find((x) => hostOf(x.url) === host);
  return n ? boardName(n) : host;
}

function makeNotice(): SyncNotice | null {
  const r = linkReport();
  const link = r.pairs.filter((p) => p.node?.connected).map((p) => `M${p.sim.index} → ${boardName(p.node)}`);
  const linkLine = link.length ? `Linked: ${link.join(', ')}` : '';
  let n: Omit<SyncNotice, 'key' | 'at'>;
  if (!r.online.length)
    n = { kind: 'warn', title: 'No real module answering', lines: ['Sync is on and shows what it would send. Nothing moves until a board is online.'] };
  else if (!r.sims.length)
    n = { kind: 'warn', title: `${r.online.length} real module${r.online.length > 1 ? 's' : ''} found, the sim has none`, lines: ['Add a module to the sim to drive them.'] };
  else if (r.spareReal.length)
    n = { kind: 'warn', title: `${r.online.length} real modules, ${r.sims.length} in the sim`,
          lines: [linkLine, `Not driven (stay still): ${r.spareReal.map((b) => `mod${b.num}`).join(', ')}`].filter(Boolean) };
  else if (r.simOnly.length)
    n = { kind: 'warn', title: `${r.sims.length} modules in the sim, ${r.online.length} real online`,
          lines: [linkLine, `Sim only: ${r.simOnly.map((s) => `M${s.index}`).join(', ')}`].filter(Boolean) };
  else n = { kind: 'ok', title: 'Sync linked', lines: [linkLine] };
  return { ...n, key: `${n.kind}|${n.title}|${n.lines.join('|')}`, at: Date.now() };
}

// ── the watcher: Sync ON/OFF, boards coming and going, modules added/removed ─────────────────────────────────────────────
const FIRST_NOTICE_MS = 1500;          // boards report within ~1 s of Sync: no "none found" flash before the first replies
let started = false, noticeTimer: ReturnType<typeof setTimeout> | null = null;
const mine = () => usePageStore.getState().page !== 'msrr';           // MSRR has its own sender with its own board list
const live = () => useHardwareStore.getState().streaming && mine();

function refreshNotice() {
  if (!live()) { useSyncAssign.setState({ notice: null }); return; }
  if (Date.now() - useSyncAssign.getState().onAt < FIRST_NOTICE_MS) return;
  const n = makeNotice(); const cur = useSyncAssign.getState();
  if (!n || n.key === cur.notice?.key || n.key === cur.dismissed) return;
  useSyncAssign.setState({ notice: n });
}

export function startSyncAssign() {
  if (started) return; started = true;
  let wasOn = live();
  const onChange = () => {
    const on = live();
    if (on && !wasOn) {
      useSyncAssign.setState({ onAt: Date.now(), notice: null, dismissed: '' });
      autoAssign(true);
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(refreshNotice, FIRST_NOTICE_MS + 20);
    } else if (!on && wasOn) useSyncAssign.setState({ onAt: 0, notice: null });
    wasOn = on;
  };
  useHardwareStore.subscribe(onChange);
  usePageStore.subscribe(onChange);
  // a board coming online / going offline, or the sim's module set changing, while Sync is on
  let sig = '';
  const watch = () => {
    if (assigning) return;
    if (!live()) { sig = ''; return; }
    const doc = useModelStore.getState().doc;
    const s = simModules(doc).map((m) => m.id).join(',') + '|' + realBoards(true).map((b) => b.node.id).join(',');
    if (s === sig) return; sig = s;
    autoAssign(false); refreshNotice();
  };
  useEspNodesStore.subscribe(watch);
  useModelStore.subscribe((st, prev) => { if (st.doc.components !== prev.doc.components || st.doc.joints !== prev.doc.joints) watch(); });
}
startSyncAssign();
