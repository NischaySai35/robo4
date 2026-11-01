/**
 * GizmoModeButtons — the Move/Rotate/Scale button row, shared by every panel
 * that lets you pick which gizmo mode drives the viewport transform (bodies get
 * all three; joints and connectors only get translate/rotate). One component
 * instead of one hand-copied JSX block per selection kind.
 *
 * Built on the shared Button (P7). Unlike Segmented, no mode may be lit: the chosen one lights only while the gizmo shows.
 */
import { Button } from '@/components/ui/button';

export type GizmoModeId = 'translate' | 'rotate' | 'scale';
export interface GizmoModeSpec { id: GizmoModeId; label: string; key: string }

export const BODY_GIZMO_MODES: GizmoModeSpec[] = [
  { id: 'translate', label: 'Move',   key: 'M' },
  { id: 'rotate',    label: 'Rotate', key: 'R' },
  { id: 'scale',     label: 'Scale',  key: 'S' },
];
export const POINT_GIZMO_MODES: GizmoModeSpec[] = [
  { id: 'translate', label: 'Move',   key: 'M' },
  { id: 'rotate',    label: 'Rotate', key: 'R' },
];

export default function GizmoModeButtons({ modes, activeMode, active, onSelect }: {
  modes: GizmoModeSpec[];
  activeMode: string;
  active: boolean; // showGizmo — only the mode button matching activeMode lights up while true
  onSelect: (id: GizmoModeId) => void;
}) {
  return (
    <div className="tw:flex tw:gap-1">
      {modes.map((m) => {
        const on = active && activeMode === m.id;
        return (
          <Button key={m.id} size="sm" className="tw:flex-1" variant={on ? 'default' : 'outline'} aria-pressed={on}
            onClick={() => onSelect(m.id)} title={`${m.label} (${m.key})`}>
            {m.label} <kbd className="tw:text-[10px] tw:opacity-60">{m.key}</kbd>
          </Button>
        );
      })}
    </div>
  );
}
