/** One undo step of a project: the immutable document by reference, and the animation as compact text. */
export interface ProjectStep { model: any; animation: string }

/** Top-level collections are shared when nothing in them changed, so comparing references is enough for the model. */
export function projectStepsSame(a: ProjectStep, b: ProjectStep) {
  if (a.animation !== b.animation) return false;
  if (a.model === b.model) return true;
  const ka = Object.keys(a.model), kb = Object.keys(b.model);
  return ka.length === kb.length && ka.every((k) => a.model[k] === b.model[k]);
}
