/**
 * AnalysisModeButtons — top-left overlay selector on the Analysis page. Switches
 * what the stress/load heatmap (and legend/peak readout) colours by:
 *   motor    — % of each servo's torque limit  (default)
 *   material — structural stress in the link    (von Mises ÷ yield)
 *   current  — % of each servo's stall current
 */
import './AnalysisPanel.css';
import { useEditorStore } from '@/state/editorStore';

const MODES: { id: 'motor' | 'material' | 'current'; label: string; title: string }[] = [
  { id: 'motor',    label: 'Motor limit',   title: 'Colour by motor load — % of each joint\'s torque limit' },
  { id: 'material', label: 'Material stress', title: 'Colour by structural stress in the link (von Mises ÷ yield)' },
  { id: 'current',  label: 'Current',        title: 'Colour by current draw — % of each motor\'s stall current' },
];

export default function AnalysisModeButtons() {
  const mode = useEditorStore((s) => s.analysisMode);
  const setMode = useEditorStore((s) => s.setAnalysisMode);
  return (
    <div className="an-modebar">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`an-modebtn${mode === m.id ? ' an-modebtn--on' : ''}`}
          onClick={() => setMode(m.id)}
          title={m.title}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
