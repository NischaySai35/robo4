/**
 * IkIndicator — a PERMANENT pill at the top of the canvas (next to Home) that toggles
 * drag-from-tip IK mode. When ON it glows + blinks in the accent colour ("· ON");
 * when OFF it's a plain, un-glowing button ("· OFF"). It only renders when the model
 * has a movable chain to drive (otherwise IK is meaningless).
 */
import './HomeButton.css';
import { useEditorStore } from '@/state/editorStore';
import { useModelStore } from '@/state/modelStore';

export default function IkIndicator() {
  const ikDrag = useEditorStore((s) => s.ikDrag);
  const hasMovable = useModelStore(
    (s) => Object.values(s.doc.joints).some((j) => j.type !== 'fixed'),
  );
  if (!hasMovable) return null;
  return (
    <button
      className={`canvas-ik-btn ${ikDrag ? 'on' : 'off'}`}
      onClick={() => useEditorStore.getState().toggleIkDrag()}
      title="Drag the end-effector in the viewport to pose the arm (click to toggle)"
    >
      <span className="canvas-ik-dot" />
      Drag tip to move · {ikDrag ? 'ON' : 'OFF'}
    </button>
  );
}
