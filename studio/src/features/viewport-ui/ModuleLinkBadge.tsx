/**
 * ModuleLinkBadge — in Properties, for the selected body or joint (Nischay 12 Nov): which sim module it belongs to (M1 of 2,
 * its name) and the real board that module drives (mod1), with the link's live state: Sync on + online / offline, sim only,
 * or Sync off. Reads the same links Sync uses (syncAssign.boardOfModule), so what it says is what gets sent.
 * REUSE-CHECKED: module badge|moduleLabel|ModuleStrip -> ModuleStrip (the ESP-TTL board picker bar, a whole strip of boards),
 * nothing shows a part's module + its board; this is new and only reads syncAssign.
 */
import './SyncUi.css';
import { useModelStore } from '@/state/modelStore';
import { useEspNodesStore } from '@/state/espNodesStore';
import { useHardwareStore } from '@/state/hardwareStore';
import { usePageStore } from '@/state/pageStore';
import { simModules, boardOfModule, boardName } from '@/features/connection/syncAssign';
import { usePoseSync } from '@/features/connection/poseSync';

const hostOf = (u: string) => { try { return new URL(u).host; } catch { return u; } };

type State = 'live' | 'held' | 'offline' | 'simonly' | 'off';

export default function ModuleLinkBadge({ moduleId }: { moduleId: string | null }) {
  const doc = useModelStore((s) => s.doc);
  const streaming = useHardwareStore((s) => s.streaming);
  const page = usePageStore((s) => s.page);
  const syncOn = streaming && page !== 'msrr';
  // one primitive string from the board list: telemetry ticks ~8/s, the badge redraws only when the link changes
  const link = useEspNodesStore(() => { const n = boardOfModule(doc, moduleId); return n ? `${boardName(n)}|${n.connected ? 1 : 0}|${hostOf(n.url)}` : ''; });
  const [board, up, host] = link.split('|');
  // the sender's own word: HOLD (no contact for long / restarted: never resumes by itself) wins over "online"
  const held = usePoseSync((s) => (host ? (s.sync?.modules?.[host]?.held as string) || '' : ''));
  const mods = simModules(doc);
  const me = mods.find((m) => m.id === moduleId);
  if (!me) return null;
  const state: State = !syncOn ? 'off' : !board ? 'simonly' : held ? 'held' : up === '1' ? 'live' : 'offline';
  const text = {
    live: `${board} · live`,
    held: `${board} · HOLD`,
    offline: `${board} · offline`,
    simonly: 'sim only · no real board',
    off: board ? `${board} · sync off` : 'sync off',
  }[state];
  const tip = {
    live: `Sync is on: this module's joints are sent to ${board} now.`,
    held: `${held}. Press Resume in the SIM → ESP window (or SYNC off and on).`,
    offline: `Linked to ${board}, but it is not answering. Nothing moves until it is back.`,
    simonly: 'Sync is on, but there are fewer real boards online than sim modules: this one only moves in the sim.',
    off: board ? `Will drive ${board}. Turn SYNC on to send (modules are linked again in order: M1 → first online board).` : 'Turn SYNC on: sim modules are linked to the online boards in order (M1 → mod1, M2 → mod2).',
  }[state];
  return (
    <div className="mod-link" data-testid="module-link">
      <span className="mod-link-tag">M{me.index}</span>
      <span className="mod-link-name" title={me.name}>{mods.length > 1 ? `of ${mods.length} · ` : ''}{me.name}</span>
      <span className={`mod-link-state mod-link-state--${state}`} title={tip}>
        <span className="mod-link-dot" />{text}
      </span>
    </div>
  );
}
