/**
 * TorqueSwitch — the torque ON / OFF pair, lit by what the servos REALLY report.
 *
 * Only the look lives here. Each page passes in its own servo states and its own send
 * function (ESP-TTL: one board; Motor Control: every module board), so the state shown is
 * always the telemetry, never the last button pressed.
 * Green ON = holding; amber OFF = limp (can be posed by hand); neither lit = mixed.
 *
 * REUSE-CHECKED: TorqueSwitch|TorqueToggle|torque -> espttl/TorqueSwitch (one board) and the
 * plain pair in servo/ServoController GroupControl; both now feed this one component.
 */
import { Button } from '@/components/ui/button';
import './TorqueSwitch.css';

export default function TorqueSwitch({ torque, online = true, onSet, size = 'sm' }: {
  /** One entry per servo: does it report torque on? */
  torque: boolean[];
  online?: boolean;
  onSet: (on: boolean) => void;
  size?: 'xs' | 'sm';
}) {
  const on = torque.filter(Boolean).length, n = torque.length;
  const state = !online || !n ? 'unknown' : on === n ? 'on' : on === 0 ? 'off' : 'mixed';
  const label = { on: 'holding', off: 'limp', mixed: `mixed · ${on}/${n} on`, unknown: 'no data' }[state];
  return (
    <span className={`ettl-torque ${state}`} role="group" aria-label="Torque">
      <span className="ettl-torque-lbl"><i />Torque: <b>{label}</b></span>
      <Button variant="outline" size={size} className="on" aria-pressed={state === 'on'}
              title="Servos hold their position" onClick={() => onSet(true)}>ON</Button>
      <Button variant="outline" size={size} className="off" aria-pressed={state === 'off'}
              title="Servos go limp, so you can pose the arm by hand" onClick={() => onSet(false)}>OFF (limp)</Button>
    </span>
  );
}
