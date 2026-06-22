/**
 * policyStore — persist a trained brain INSIDE the model document, so a robot keeps
 * its learned skill: it serializes with the .nischay project, reloads, and can be
 * replayed or deployed to hardware. A robot can hold several skills keyed by name
 * ("reach", "walk", "roll"). Pure (immutable doc transforms), node-testable.
 */
import type { PolicySpec } from './policy';

export interface StoredSkill {
  name: string;                 // "reach", "walk", …
  robotId?: string;             // tip/root body this skill drives (optional)
  policy: PolicySpec;           // the trained brain (arch + weights)
  task: string;                 // task id it was trained on
  rewardWeights?: Record<string, number>;
  meta?: { generations: number; bestReturn: number; trainedAt: number };
}

type DocLike = { meta?: Record<string, unknown> } & Record<string, unknown>;

/** All skills stored in the doc. */
export function listSkills(doc: DocLike): StoredSkill[] {
  const m = (doc.meta ?? {}) as any;
  return (m.skills ?? []) as StoredSkill[];
}

/** Immutably add/replace a skill (matched by name) in the doc. */
export function putSkill(doc: DocLike, skill: StoredSkill): DocLike {
  const meta = { ...(doc.meta ?? {}) } as any;
  const skills: StoredSkill[] = [...(meta.skills ?? [])];
  const i = skills.findIndex((s) => s.name === skill.name);
  if (i >= 0) skills[i] = skill; else skills.push(skill);
  meta.skills = skills;
  return { ...doc, meta };
}

export function removeSkill(doc: DocLike, name: string): DocLike {
  const meta = { ...(doc.meta ?? {}) } as any;
  meta.skills = (meta.skills ?? []).filter((s: StoredSkill) => s.name !== name);
  return { ...doc, meta };
}

export function getSkill(doc: DocLike, name: string): StoredSkill | undefined {
  return listSkills(doc).find((s) => s.name === name);
}
