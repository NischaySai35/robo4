/**
 * GizmoModeButtons — the Move/Rotate/Scale button row, shared by every panel
 * that lets you pick which gizmo mode drives the viewport transform (bodies get
 * all three; joints and connectors only get translate/rotate). One component
 * instead of one hand-copied JSX block per selection kind.
 *
 * Styling (.lp-mode-toggle / .lp-mode-btn / .lp-xform*) lives in LeftPanel.css —
 * those classes are already shared by LeftPanel's other toggle rows (Object/Edit,
 * Free Float/Rigid), so this component doesn't own a stylesheet of its own; it's
 * only ever rendered from within LeftPanel, which already loads that CSS.
 */

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
    <div className="lp-mode-toggle lp-xform">
      {modes.map((m) => (
        <button key={m.id}
          className={`lp-mode-btn ${active && activeMode === m.id ? 'lp-mode-btn--on' : ''}`}
          onClick={() => onSelect(m.id)}
          title={`${m.label} (${m.key})`}>
          {m.label} <kbd className="lp-xform-key">{m.key}</kbd>
        </button>
      ))}
    </div>
  );
}
