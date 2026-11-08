/**
 * poseSync — the SYNC switch on EVERY page other than MSRR (Nischay 5 Nov: "every tab ... smooth, wifi, hold").
 *
 * The page's model joints (Editor, Analysis, Training, Animation, ESP-TTL, Motor ... whatever drives the shared model) go
 * to the physics service, whose real_sync.PoseSync sends them to the robot through the SAME link the MSRR tab uses: one
 * set of joint directions for every module (data/real_robot.json), a smooth speed, Wi-Fi naps tolerated, hold after a long
 * gap, E-STOP. No physics extras here (no sag correction, random robot, air): those stay MSRR-only.
 * REUSE-CHECKED: sync|streaming|queueAngles|sendServoBatch|real_sync -> the old browser sender (SimTransmitPanel ->
 * integrationStore.queueAngles -> ServoController -> servoLink.sendServoBatch) had none of that and its own directions; this
 * replaces it for Sync and reuses servoLink.servoRouting (which board each joint is on) and sim/real_sync.py (the sender).
 */
import { create } from 'zustand';
import { useHardwareStore } from '@/state/hardwareStore';
import { useModelStore } from '@/state/modelStore';
import { usePageStore } from '@/state/pageStore';
import { servoRouting } from '@/features/servo/servoLink';
import { physicsFetch } from '@/robotics/msrr2/simScene';

const SEND_MS = 80;           // the robot link itself runs at ~16/s and moves smoothly between poses
const VIEW_MS = 600;          // Sync off: still ask, so the box shows online / offline
const CODE = /(?:^|_)(L1|L2|T1|T2|T3|B1|B2|B3|B4)(?:_|$)/;

export const usePoseSync = create<{ sync: any; err: string }>(() => ({ sync: null, err: '' }));

/** the model's joints, per board: {host: {T1: deg, ...}} with 0 = straight (the same convention as the MSRR sim) */
export function modelPose(): Record<string, Record<string, number>> {
  const doc = useModelStore.getState().doc; const routes = servoRouting(doc); const out: Record<string, Record<string, number>> = {};
  for (const j of Object.values(doc.joints) as any[]) {
    if (j.type === 'fixed') continue;
    const m = CODE.exec(j.name ?? '') ?? CODE.exec(j.meta?.cadJoint ?? ''); if (!m) continue;
    const url = routes.get(j.id)?.url; let host = 'mod1.local';
    try { if (url) host = new URL(url).host; } catch { /* keep the default board */ }
    const b = (out[host] ??= {}); if (m[1] in b) continue;          // two modules on one board: the first one counts
    b[m[1]] = (j.state?.value ?? 0) * 180 / Math.PI;
  }
  return out;
}

export async function poseCmd(op?: 'on' | 'off' | 'stop') {
  try {
    const r = await physicsFetch('/sync/pose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pose: modelPose(), op }) });
    const j = await r.json(); usePoseSync.setState({ sync: j.sync ?? null, err: j.ok === false ? j.error ?? '' : '' });
    return j;
  } catch (e: any) { usePoseSync.setState({ err: `physics service not answering (${e?.message ?? e})` }); return null; }
}

let wasOn = false, busy = false, lastView = 0, timer: ReturnType<typeof setInterval> | null = null;
function pump() {
  const mine = usePageStore.getState().page !== 'msrr';               // MSRR has its own source (the live physics session)
  const on = mine && useHardwareStore.getState().streaming;
  if (busy) return;
  if (on || wasOn) {
    busy = true; const op = on && !wasOn ? 'on' : !on && wasOn ? 'off' : undefined; wasOn = on;
    poseCmd(op).finally(() => { busy = false; });
  } else if (mine && Date.now() - lastView > VIEW_MS) {
    lastView = Date.now(); busy = true; poseCmd().finally(() => { busy = false; });
  }
}
export function startPoseSync() { if (!timer) timer = setInterval(pump, SEND_MS); }
startPoseSync();
