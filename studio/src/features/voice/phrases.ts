/**
 * phrases — what the app says for each thing the operator does. Kept free of store
 * imports so espTtlStore can use it without a cycle.
 *
 * Matching is on the request path of the call that just SUCCEEDED, so every button on the
 * ESP-TTL page speaks without each one having to know about voice.
 */
import { speak } from './speech';

const q = (path: string) => new URLSearchParams(path.split('?')[1] ?? '');

/** Spoken ids read better as "servo 3" than "servo three-teen"; just say the number. */
const servoWord = (id: string | null) => (id && id !== 'all' ? `servo ${id}` : 'all servos');

type Rule = (p: string, a: URLSearchParams) => { text: string; urgent?: boolean; key?: string; cooldownMs?: number } | null;

const RULES: Rule[] = [
  (p, a) => p.startsWith('/api/command') && a.get('cmd') === 'estop'
    ? { text: 'Emergency stop!', urgent: true } : null,
  (p, a) => {
    if (!p.startsWith('/api/command')) return null;
    const who = servoWord(a.get('servo'));
    switch (a.get('cmd')) {
      case 'stop':        return { text: `${who} stopped` };
      case 'torqueon':    return { text: `Torque on, ${who}` };
      case 'torqueoff':   return { text: `Torque off, ${who}` };
      case 'torquetoggle':return { text: `Torque toggled, ${who}` };
      case 'home':        return { text: `${who} going home` };
      default:            return null;                       // pos: silent, it fires while dragging
    }
  },
  (p, a) => p.startsWith('/api/torque') ? { text: a.get('on') === '1' ? 'Torque on' : 'Torque off' } : null,
  (p, a) => {
    if (p.startsWith('/api/home/manual') || (p.split('?')[0] === '/api/home' && a.get('manual') === '1'))
      return { text: 'Going to manual home' };
    if (p.split('?')[0] === '/api/home') return { text: 'Going home, one eighty degrees' };
    return null;
  },
  (p, a) => p.startsWith('/api/servo/home')
    ? { text: a.get('to180') ? `Servo ${a.get('id')} to one eighty` : `Servo ${a.get('id')} going home`, key: 'servo-home' } : null,
  (p, a) => p.startsWith('/api/home/set')
    ? { text: a.get('clear') ? 'Home positions cleared' : 'Home position saved' } : null,
  (p) => p.startsWith('/api/servo/tune') ? { text: 'Re-tuning hold' } : null,
  (p) => p.startsWith('/api/servo/deadband') ? { text: 'Hold freedom applied' } : null,
  (p, a) => p.startsWith('/api/identify') ? { text: `Identifying servo ${a.get('id')}` } : null,
  (p) => p.startsWith('/api/scan') && !p.includes('/status') ? { text: 'Scanning the bus' } : null,
  (p) => p.startsWith('/api/servo/setid') ? { text: 'Servo I D changed' } : null,
  (p) => p.startsWith('/api/servo/setbaud') ? { text: 'Baud rate written' } : null,
  (p) => p.startsWith('/api/servo/center') ? { text: 'Centre position set' } : null,
  (p) => p.startsWith('/api/servo/ofs') ? { text: 'Offset written' } : null,
  (p) => p.startsWith('/api/servo/write') ? { text: 'Register written' } : null,
  (p) => p.startsWith('/api/config/set') ? { text: 'Configuration saved' } : null,
  (p) => p.startsWith('/api/wifi/set') ? { text: 'Wi-Fi saved' } : null,
  (p) => p.startsWith('/api/wifi/reconnect') ? { text: 'Reconnecting Wi-Fi' } : null,
  (p) => p.startsWith('/api/reboot') ? { text: 'Rebooting module' } : null,
  (p) => p.startsWith('/api/batch') ? { text: 'Moving all joints', key: 'batch' } : null,
  (p) => p.startsWith('/api/anim/play') ? { text: 'Playing animation' } : null,
  (p) => p.startsWith('/api/anim/stop') ? { text: 'Animation stopped' } : null,
  (p) => p.startsWith('/api/anim/load') ? { text: 'Animation uploaded to the module' } : null,
];

/** Speak the confirmation for a request that just succeeded (no-op for unknown paths). */
export function speakForPath(path: string) {
  const a = q(path);
  for (const r of RULES) {
    const hit = r(path, a);
    if (hit) { speak(hit.text, { urgent: hit.urgent, key: hit.key, cooldownMs: hit.cooldownMs }); return; }
  }
}

/** Phrases worth rendering ahead of time once the voice is ready. */
export const WARM_PHRASES = [
  'Module detected, connected!', 'Module disconnected', 'Emergency stop!', 'Torque on', 'Torque off',
  'Going home, one eighty degrees', 'Going to manual home', 'Uploading firmware over the air',
  'Firmware uploaded. Module is rebooting', 'Home position saved', 'Scanning the bus',
];
