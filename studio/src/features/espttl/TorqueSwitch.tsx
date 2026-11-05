/**
 * ESP-TTL binding for the shared TorqueSwitch (components/torque): this one board's
 * telemetry in, /api/torque out. Used by the Control and Animation tabs.
 *
 * REUSE-CHECKED: torque switch -> the look is components/torque/TorqueSwitch; this only wires the ESP-TTL store.
 */
import TorqueSwitch from '@/components/torque/TorqueSwitch';
import { useEspTtlStore, ttlTry } from '@/state/espTtlStore';

export default function EspTorqueSwitch({ say }: { say: (m: string) => void }) {
  const tel = useEspTtlStore(s => s.tel);   // select the object itself: a fresh `?? []` each time would redraw forever
  const online = useEspTtlStore(s => s.online);
  const set = async (on: boolean) => {
    const r = await ttlTry(`/api/torque?on=${on ? 1 : 0}`);
    say(r.ok ? `torque ${on ? 'on' : 'off'} ok` : `torque ${on ? 'on' : 'off'} failed: ${r.error}`);
  };
  return <TorqueSwitch torque={(tel?.servos ?? []).map(s => !!s.torque)} online={online} onSet={set} />;
}
