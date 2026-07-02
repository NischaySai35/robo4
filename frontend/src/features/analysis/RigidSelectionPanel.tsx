/**
 * RigidSelectionPanel — lets you select a rigid body (or a whole Component, per
 * the Editor's whole-component selection) directly from the Analysis page and
 * move/rotate it. The 3D pick + gizmo themselves are handled by the shared
 * ModelEditor viewport controller (same one the Editor page uses — click-to-pick
 * isn't page-gated); this just surfaces the Move/Rotate controls here too, since
 * the Inspector dock (where they normally live) isn't shown on this page.
 *
 * Moving a body updates the model doc, which AnalysisPanel's useMemo already
 * depends on — so mass/CoM/FoS/stress recompute live as you drag.
 */
import './AnalysisPanel.css';
import { useModelStore } from '@/state/modelStore';
import { useSelectionStore } from '@/state/selectionStore';
import { bodiesOfComponent, jointsOfComponent } from '@/core/model/index';

export default function RigidSelectionPanel() {
  const doc = useModelStore((s) => s.doc);
  const kind = useSelectionStore((s) => s.kind);
  const ids = useSelectionStore((s) => s.ids);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const gizmoMode = useSelectionStore((s) => s.gizmoMode);
  const setGizmoMode = useSelectionStore((s) => s.setGizmoMode);
  const pivotMode = useSelectionStore((s) => s.pivotMode);
  const setPivotMode = useSelectionStore((s) => s.setPivotMode);

  if (kind !== 'body' || !ids.length) {
    return (
      <div className="an-rigid an-rigid--empty">
        Click a body in the viewport to select it, then Move/Rotate — mass, CoM, and stress update live.
      </div>
    );
  }

  const multi = ids.length > 1;
  const compId = doc.bodies[ids[0]]?.componentId;
  const component = multi && compId
    && ids.every((id) => doc.bodies[id]?.componentId === compId)
    && bodiesOfComponent(doc, compId).length === ids.length
    ? doc.components[compId]
    : null;
  const jointCount = component ? jointsOfComponent(doc, component.id).length : 0;
  const activeBody = selectedId ? doc.bodies[selectedId] : null;

  const label = component
    ? `Component: ${component.name} (${ids.length}B·${jointCount}J)`
    : multi
      ? `${ids.length} bodies selected`
      : activeBody?.name ?? 'Body';

  return (
    <div className="an-rigid">
      <div className="an-rigid-row">
        <span className="an-rigid-label">{label}</span>
        <div className="an-rigid-gizmo">
          <button
            className={`an-rigid-btn${gizmoMode === 'translate' ? ' an-rigid-btn--on' : ''}`}
            title="Move (M)"
            onClick={() => setGizmoMode('translate')}
          >✥</button>
          <button
            className={`an-rigid-btn${gizmoMode === 'rotate' ? ' an-rigid-btn--on' : ''}`}
            title="Rotate (R)"
            onClick={() => setGizmoMode('rotate')}
          >⟳</button>
        </div>
      </div>
      {multi && (
        <div className="an-rigid-pivot">
          {[
            { id: 'median', label: 'Median' },
            { id: 'individual', label: 'Individual' },
            { id: 'active', label: 'Active' },
          ].map((p) => (
            <button
              key={p.id}
              className={`an-rigid-pivot-btn${pivotMode === p.id ? ' an-rigid-pivot-btn--on' : ''}`}
              onClick={() => setPivotMode(p.id as 'median' | 'individual' | 'active')}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
