/** MarginChips: the torque, CoG and joint margin readout shared by the planner v2 tabs. */
import { CONFIG, PLAN_BEND_DEG } from '@/robotics/msrr2/model';

export function MarginChips({ m, ok }: { m: { maxTorquePct: number; cogMarginMm: number; minJointMarginDeg: number; sagMm?: number; tipPushN?: number }; ok?: boolean }) {
  const t = m.maxTorquePct, c = m.cogMarginMm, j = m.minJointMarginDeg;
  return (
    <div className="msrr-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
      {ok !== undefined && <span className={`msrr-chip ${ok ? 'ok' : 'bad'}`}><b>{ok ? 'PASS' : 'FAIL'}</b></span>}
      <span className={`msrr-chip ${t <= CONFIG.limits.torqueBudgetPct ? (t > 50 ? 'warn' : 'ok') : 'bad'}`} title="worst joint gravity torque as % of the ST3215 stall torque (budget 70%)">
        torque <b>{t.toFixed(0)}%</b>
      </span>
      <span className={`msrr-chip ${c >= CONFIG.limits.cogMarginMm ? 'ok' : 'bad'}`} title="how far the centre of gravity is inside the support polygon (needs ≥ 15 mm); 'anchored' = held by a floor receiver">
        CoG <b>{c >= 999 ? 'anchored' : `${c.toFixed(0)} mm`}</b>
      </span>
      <span className={`msrr-chip ${j >= 90 - PLAN_BEND_DEG ? 'ok' : 'bad'}`} title="closest any joint gets to its stop">
        joint margin <b>{j.toFixed(1)}°</b>
      </span>
      {m.sagMm !== undefined && (
        <span className={`msrr-chip ${m.sagMm < 30 ? 'ok' : m.sagMm < 60 ? 'warn' : 'bad'}`} title="how far the real robot sits from the drawn pose under its own weight: servo droop, gear slop, PLA flex, receiver play (measured MuJoCo module)">
          sag <b>{m.sagMm.toFixed(0)} mm</b>
        </span>
      )}
      {m.tipPushN !== undefined && m.tipPushN < 999 && (
        <span className={`msrr-chip ${m.tipPushN >= CONFIG.robustness.minTipPushN ? 'ok' : 'warn'}`} title={`the push at the top that tips it over; below ${CONFIG.robustness.minTipPushN} N (a light touch, estimate) it still stands but is FRAGILE`}>
          {m.tipPushN >= CONFIG.robustness.minTipPushN ? 'tips at' : 'fragile, tips at'} <b>{m.tipPushN.toFixed(1)} N</b>
        </span>
      )}
    </div>
  );
}
