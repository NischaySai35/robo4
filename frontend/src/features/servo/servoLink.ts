/**
 * servoLink — routes servo commands to the correct module ESP (multi-ESP).
 *
 * A joint's servo lives on ONE module's board. Routing is (joint → module →
 * ESP node → local servo id 1..7). Local ids repeat across boards, so the same
 * id 1 exists on every ESP; only the target URL differs.
 *
 * Local id source: `joint.meta.servoId` if set (the Hardware panel's "Auto 1…N"),
 * else the joint's 1-based position AMONG ITS OWN MODULE's movable joints.
 */
import type { Document } from '@/core/model/index';
import { useEspNodesStore, type EspNode } from '@/state/espNodesStore';

export interface ServoRoute {
  jointId: string;
  moduleId: string | null;
  nodeId: string | null;
  url: string | null;
  localId: number;
}

/** The module a joint's servo belongs to: the joint's own component, else its
 *  parent body's, else its child body's. */
function moduleOfJoint(doc: Document, joint: any): string | null {
  return (
    joint.componentId
    ?? doc.bodies[joint.parentBodyId]?.componentId
    ?? doc.bodies[joint.childBodyId]?.componentId
    ?? null
  );
}

/** Map every movable joint → its route. Local ids are assigned per module so each
 *  board sees 1..N; an explicit meta.servoId always wins. */
export function servoRouting(doc: Document): Map<string, ServoRoute> {
  const { nodes } = useEspNodesStore.getState();
  const byModule = new Map<string | null, EspNode>();
  for (const nd of nodes) if (nd.componentId) byModule.set(nd.componentId, nd);
  // A single unbound node acts as the catch-all board for unassigned joints.
  const fallback = nodes.find((n) => !n.componentId) ?? (nodes.length === 1 ? nodes[0] : undefined);

  const out = new Map<string, ServoRoute>();
  const seqByModule = new Map<string | null, number>();
  const movable = Object.values(doc.joints).filter((j) => j.type !== 'fixed');
  for (const j of movable) {
    const moduleId = moduleOfJoint(doc, j);
    const seq = (seqByModule.get(moduleId) ?? 0) + 1;
    seqByModule.set(moduleId, seq);
    const explicit = Number((j.meta as any)?.servoId);
    const localId = Number.isFinite(explicit) && explicit > 0 ? explicit : seq;
    const node = (moduleId && byModule.get(moduleId)) || fallback || null;
    out.set(j.id, {
      jointId: j.id, moduleId,
      nodeId: node?.id ?? null,
      url: node?.url ?? null,
      localId,
    });
  }
  return out;
}

/** Send one command for a joint's servo to its module's ESP. Resolves the route each
 *  call so it always uses the current node bindings. Returns a short result string. */
export async function sendServoCmd(
  doc: Document, jointId: string, cmd: string, extra: Record<string, any> = {},
): Promise<{ ok: boolean; detail: string }> {
  const route = servoRouting(doc).get(jointId);
  if (!route || !route.url) return { ok: false, detail: 'no ESP bound for this joint\'s module' };
  const qs = new URLSearchParams({ servo: String(route.localId), cmd, ...toStr(extra) });
  try {
    const res = await fetch(`${route.url}/api/command?${qs}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(res.statusText);
    return { ok: true, detail: `${route.url} servo ${route.localId} ${cmd}` };
  } catch (e: any) {
    return { ok: false, detail: `${route.url} — ${e?.message ?? e}` };
  }
}

/** Send a batch of joint angles, grouped into one /api/batch per module ESP so each
 *  board's servos start together. `angles` maps jointId → degrees. */
export async function sendServoBatch(
  doc: Document, angles: Record<string, number>, opts: { speed?: number; acc?: number } = {},
): Promise<{ sent: number; nodes: number; errors: string[] }> {
  const routing = servoRouting(doc);
  // Group angles by node url.
  const perUrl = new Map<string, { qs: URLSearchParams; count: number }>();
  for (const [jointId, deg] of Object.entries(angles)) {
    const r = routing.get(jointId);
    if (!r || !r.url) continue;
    let g = perUrl.get(r.url);
    if (!g) { g = { qs: new URLSearchParams({ speed: String(opts.speed ?? 5), acc: String(opts.acc ?? 20) }), count: 0 }; perUrl.set(r.url, g); }
    g.qs.append(String(r.localId), Number(deg).toFixed(2));
    g.count++;
  }
  const errors: string[] = [];
  let sent = 0;
  await Promise.all([...perUrl.entries()].map(async ([url, g]) => {
    try {
      const res = await fetch(`${url}/api/batch?${g.qs}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(res.statusText);
      sent += g.count;
    } catch (e: any) { errors.push(`${url}: ${e?.message ?? e}`); }
  }));
  return { sent, nodes: perUrl.size, errors };
}

/** Emergency stop across every board. */
export async function estopAllNodes(): Promise<void> {
  const { nodes } = useEspNodesStore.getState();
  await Promise.all(nodes.map((nd) =>
    fetch(`${nd.url}/api/command?servo=all&cmd=estop`, { signal: AbortSignal.timeout(5000) }).catch(() => {}),
  ));
}

function toStr(o: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) if (v != null) out[k] = String(v);
  return out;
}
