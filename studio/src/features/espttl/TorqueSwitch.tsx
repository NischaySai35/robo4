/**
 * ESP-TTL binding for the shared TorqueSwitch (components/torque): the shown module's telemetry in, /api/torque out
 * (Control tab), or with `all` every online module (Animation tab, which moves all of them).
 *
 * REUSE-CHECKED: torque switch -> the look is components/torque/TorqueSwitch; this only wires the ESP-TTL store.
 */
import TorqueSwitch from '@/components/torque/TorqueSwitch';
import { useEspTtlStore, ttlTry, ttlTryAll, liveBoards } from '@/state/espTtlStore';
import { useEspNodesStore } from '@/state/espNodesStore';

export default function EspTorqueSwitch({ say, all = false }: { say: (m: string) => void; all?: boolean }) {
  const tel = useEspTtlStore(s => s.tel);   // select the object itself: a fresh `?? []` each time would redraw forever
  const online = useEspTtlStore(s => s.online);
  useEspNodesStore(s => s.nodes);           // redraw when any module changes (for `all`)
  const set = async (on: boolean) => {
    const what = `torque ${on ? 'on' : 'off'}`, path = `/api/torque?on=${on ? 1 : 0}`;
    if (all) {                               // the modules picked at the top (default all), asked first if one is offline
      const r = await ttlTryAll(path);
      if (r.error !== 'cancelled') say(r.ok ? `${what} ok` : `${what}: ${r.error}`);
      return;
    }
    const r = await ttlTry(path);
    say(r.ok ? `${what} ok` : `${what} failed: ${r.error}`);
  };
  const servos = all ? liveBoards().flatMap(b => b.tel.servos ?? []) : (tel?.servos ?? []);
  return <TorqueSwitch torque={servos.map(s => !!s.torque)} online={all ? servos.length > 0 : online} onSet={set} />;
}
