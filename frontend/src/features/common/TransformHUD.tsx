import './TransformHUD.css';
import { useTransformHudStore } from '@/state/transformHudStore';

const MODE_LABEL: Record<string, string> = {
  translate: 'GRAB',
  rotate: 'ROTATE',
  scale: 'SCALE',
};

function formatValue(live: number, mode: string | null): string {
  if (mode === 'translate') return `${live.toFixed(3)} m`;
  if (mode === 'rotate') return `${live.toFixed(1)}°`;
  if (mode === 'scale') return `${live.toFixed(2)}×`;
  return live.toFixed(3);
}

export default function TransformHUD() {
  const { visible, mode, axis, buffer, live } = useTransformHudStore();

  if (!visible || !mode) return null;

  const axisLabel = axis ? axis.toUpperCase() : 'Free';
  const axisClass = axis ?? 'free';

  let valueText: string;
  if (buffer) {
    valueText = buffer;
  } else if (live !== null) {
    valueText = formatValue(live, mode);
  } else {
    valueText = '—';
  }

  return (
    <div className="transform-hud">
      <div className={`transform-hud-mode ${mode}`}>{MODE_LABEL[mode] ?? mode}</div>
      <div className={`transform-hud-axis ${axisClass}`}>
        {axis ? `Axis: ${axisLabel}` : 'Free'}
      </div>
      <div className="transform-hud-value">
        {valueText}
        {buffer ? <span className="cursor" /> : null}
      </div>
      <div className="transform-hud-hint">
        X Y Z axis · Type value · Enter confirm · Esc cancel
      </div>
    </div>
  );
}
