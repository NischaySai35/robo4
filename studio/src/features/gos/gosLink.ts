/**
 * gosLink — the Studio as a GOS client (GOS G5). A script's server sends commands, which run through the same
 * operators as the buttons, and joint poses, which show on screen without entering the undo history.
 */
import { create } from 'zustand';
import { listOperators, runOperator, defineOperator } from '@/core/ops/registry';
import { useModelStore } from '@/state/modelStore';
import { usePageStore } from '@/state/pageStore';
import { withJointValues } from '@/core/model/index';
import { spreadScore } from '@/assembly/connectorSnap';
import { exportMjcf } from '@/core/gos/graphCore';
import { bridge } from '@/bridge/cameraBridge';

type Status = 'off' | 'connecting' | 'on' | 'error';
export const useGosStore = create<{ status: Status; message: string }>(() => ({ status: 'off', message: 'Not connected.' }));
const say = (status: Status, message: string) => useGosStore.setState({ status, message });

let socket: WebSocket | null = null;
// MuJoCo joint name to Studio joint id: the exporter renames repeated joints, so ask it rather than guess.
let jointIds = new Map<string, string>();

function rememberJointNames() {
  const doc = useModelStore.getState().doc;
  jointIds = new Map(Object.entries(exportMjcf(doc, 'robot').jointNames).map(([id, name]) => [name, id]));
}

function handle(m: any): unknown {
  switch (m.type) {
    case 'run': {
      const r = runOperator(m.op, m.props ?? undefined);
      if (!r.ok) throw new Error(r.error);
      return null;
    }
    case 'load': {
      useModelStore.getState().loadDocument(m.doc);
      usePageStore.getState().setPage('editor');
      rememberJointNames();
      bridge.requestRender?.(4);
      setTimeout(() => bridge.fitCamera?.(), 200);
      return null;
    }
    case 'read': {
      const doc = useModelStore.getState().doc;
      return { bodies: Object.keys(doc.bodies).length, joints: Object.values<any>(doc.joints).map((j) => [j.name, j.state?.value ?? 0]), vsepr: spreadScore(doc).energy, page: usePageStore.getState().page };
    }
    default: throw new Error(`The Studio doesn't know the message type "${m.type}". Update the app or the gos package.`);
  }
}

export function connectGos(url: string, token: string) {
  disconnectGos();
  if (!/^ws:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)) { say('error', 'Only this computer can connect for now: use ws://127.0.0.1:PORT.'); return; }
  say('connecting', `Connecting to ${url}...`);
  const ws = socket = new WebSocket(url);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', token, operators: listOperators().map((o) => o.id) }));
  ws.onerror = () => say('error', `Couldn't reach ${url}. Is the Python script still running?`);
  ws.onclose = () => { if (socket === ws) { socket = null; if (useGosStore.getState().status === 'on') say('off', 'The script ended, so the link closed.'); } };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === 'welcome') { rememberJointNames(); say('on', `Connected to ${url}.`); return; }
    if (m.type === 'denied') { say('error', m.error); ws.close(); return; }
    if (m.type === 'joints') {
      const values: Record<string, number> = {};
      m.names.forEach((n: string, i: number) => { const id = jointIds.get(n); if (id) values[id] = m.q[i]; });
      useModelStore.getState().applyTransient((d) => withJointValues(d, values));
      return;
    }
    let reply: any;
    try { reply = { type: 'reply', id: m.id, ok: true, value: handle(m) }; }
    catch (err: any) { reply = { type: 'reply', id: m.id, ok: false, error: err?.message ?? String(err) }; }
    ws.send(JSON.stringify(reply));
  };
}

export function disconnectGos() {
  const ws = socket;
  socket = null;
  ws?.close();
  say('off', 'Not connected.');
}

defineOperator({ id: 'gos.disconnect', label: 'Disconnect from GOS', group: 'GOS', poll: () => useGosStore.getState().status === 'on', exec: disconnectGos });

/** Opening the Studio with ?gos=ws://...&token=... connects straight away. */
export function connectFromAddressBar() {
  const q = new URLSearchParams(location.search);
  const url = q.get('gos');
  if (url) connectGos(url, q.get('token') ?? '');
}
