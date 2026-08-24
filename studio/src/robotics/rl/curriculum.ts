/**
 * curriculum — automatic task difficulty scheduler.
 *
 * WHY: Training on maximum difficulty from the start causes the agent to never
 * get positive reward → no learning signal. Curriculum learning starts easy
 * (target nearby, short episode, no noise) and automatically advances when the
 * agent is consistently succeeding. Used by ANYmal, Isaac Lab locomotion, and
 * DeepMimic — responsible for humanoids learning complex terrain in hours vs
 * never converging with fixed difficulty.
 *
 * CurriculumScheduler tracks a rolling window of recent eval returns and
 * advances the stage when the moving average exceeds the threshold. Stages
 * also control domain randomization scale so the robot learns to be robust
 * gradually rather than being overwhelmed by noise from generation 1.
 */

export interface CurriculumStage {
  label: string;
  /** For reach: max distance of random target from origin (meters). */
  targetRadius: number;
  /** For navigate: arena radius. */
  arenaRadius: number;
  /** [0..1] scale applied to domain randomization (0 = no rand, 1 = full). */
  domainRandScale: number;
  /** Max steps per episode (shorter = faster, easier). */
  maxSteps: number;
  /** Avg eval return required (over window) before advancing to next stage. */
  advanceThreshold: number;
}

export class CurriculumScheduler {
  private stage = 0;
  private window: number[] = [];
  readonly windowSize: number;

  constructor(private stages: CurriculumStage[], windowSize = 20) {
    this.windowSize = windowSize;
  }

  /** Call after each generation with the eval return. */
  update(evalReturn: number): boolean {
    this.window.push(evalReturn);
    if (this.window.length > this.windowSize) this.window.shift();
    if (this.stage >= this.stages.length - 1) return false;
    if (this.window.length < this.windowSize) return false;
    const avg = this.window.reduce((s, v) => s + v, 0) / this.window.length;
    if (avg >= this.stages[this.stage].advanceThreshold) {
      this.stage++;
      this.window = [];
      return true; // advanced
    }
    return false;
  }

  current(): CurriculumStage    { return this.stages[this.stage]; }
  stageIndex(): number           { return this.stage; }
  stageCount(): number           { return this.stages.length; }
  progress(): number             { return this.stage / (this.stages.length - 1); }
  windowAvg(): number {
    if (!this.window.length) return 0;
    return this.window.reduce((s, v) => s + v, 0) / this.window.length;
  }
  isMaxStage(): boolean          { return this.stage >= this.stages.length - 1; }
}

// ── Per-task curricula ────────────────────────────────────────────────────────

export const REACH_CURRICULUM: CurriculumStage[] = [
  { label: 'Close',    targetRadius: 0.15, arenaRadius: 1.0, domainRandScale: 0.0, maxSteps: 40,  advanceThreshold: 2.5  },
  { label: 'Near',     targetRadius: 0.30, arenaRadius: 1.0, domainRandScale: 0.2, maxSteps: 55,  advanceThreshold: 2.0  },
  { label: 'Mid',      targetRadius: 0.55, arenaRadius: 1.0, domainRandScale: 0.5, maxSteps: 70,  advanceThreshold: 1.5  },
  { label: 'Far',      targetRadius: 0.85, arenaRadius: 1.0, domainRandScale: 0.8, maxSteps: 90,  advanceThreshold: 1.2  },
  { label: 'Full',     targetRadius: 1.10, arenaRadius: 1.0, domainRandScale: 1.0, maxSteps: 100, advanceThreshold: 99.0 },
];

export const NAV_CURRICULUM: CurriculumStage[] = [
  { label: 'Tiny',     targetRadius: 0.5,  arenaRadius: 0.8,  domainRandScale: 0.0, maxSteps: 60,  advanceThreshold: 6.0  },
  { label: 'Small',    targetRadius: 1.0,  arenaRadius: 1.2,  domainRandScale: 0.2, maxSteps: 80,  advanceThreshold: 5.0  },
  { label: 'Medium',   targetRadius: 1.8,  arenaRadius: 2.0,  domainRandScale: 0.5, maxSteps: 100, advanceThreshold: 4.0  },
  { label: 'Full',     targetRadius: 2.5,  arenaRadius: 2.5,  domainRandScale: 1.0, maxSteps: 120, advanceThreshold: 99.0 },
];

export const LOCO_CURRICULUM: CurriculumStage[] = [
  { label: 'Flat',     targetRadius: 1.0,  arenaRadius: 1.0, domainRandScale: 0.0, maxSteps: 40,  advanceThreshold: 1.5  },
  { label: 'Perturb',  targetRadius: 1.0,  arenaRadius: 1.0, domainRandScale: 0.3, maxSteps: 60,  advanceThreshold: 2.5  },
  { label: 'Rough',    targetRadius: 1.0,  arenaRadius: 1.0, domainRandScale: 0.7, maxSteps: 80,  advanceThreshold: 3.5  },
  { label: 'Expert',   targetRadius: 1.0,  arenaRadius: 1.0, domainRandScale: 1.0, maxSteps: 100, advanceThreshold: 99.0 },
];

export const POSE_CURRICULUM: CurriculumStage[] = [
  { label: 'Easy',     targetRadius: 0.3,  arenaRadius: 1.0, domainRandScale: 0.0, maxSteps: 40,  advanceThreshold: 2.0  },
  { label: 'Medium',   targetRadius: 0.6,  arenaRadius: 1.0, domainRandScale: 0.3, maxSteps: 60,  advanceThreshold: 1.5  },
  { label: 'Hard',     targetRadius: 1.0,  arenaRadius: 1.0, domainRandScale: 0.7, maxSteps: 80,  advanceThreshold: 1.0  },
  { label: 'Full',     targetRadius: 1.5,  arenaRadius: 1.0, domainRandScale: 1.0, maxSteps: 100, advanceThreshold: 99.0 },
];

// `targetRadius` is reused as the module scatter radius (meters) for the
// assemble task — how far apart modules start each episode.
export const ASSEMBLE_CURRICULUM: CurriculumStage[] = [
  { label: 'Touching', targetRadius: 0.15, arenaRadius: 1.0, domainRandScale: 0.0, maxSteps: 60,  advanceThreshold: 8.0  },
  { label: 'Near',     targetRadius: 0.35, arenaRadius: 1.0, domainRandScale: 0.3, maxSteps: 100, advanceThreshold: 6.0  },
  { label: 'Scattered',targetRadius: 0.6,  arenaRadius: 1.0, domainRandScale: 0.6, maxSteps: 150, advanceThreshold: 4.0  },
  { label: 'Full',     targetRadius: 1.0,  arenaRadius: 1.0, domainRandScale: 1.0, maxSteps: 200, advanceThreshold: 99.0 },
];

export const MORPH_CURRICULUM: CurriculumStage[] = [
  { label: '1 config',  targetRadius: 0.3,  arenaRadius: 1.0, domainRandScale: 0.0, maxSteps: 50,  advanceThreshold: 2.0  },
  { label: '2 configs', targetRadius: 0.5,  arenaRadius: 1.0, domainRandScale: 0.2, maxSteps: 70,  advanceThreshold: 1.5  },
  { label: '4 configs', targetRadius: 0.8,  arenaRadius: 1.0, domainRandScale: 0.5, maxSteps: 90,  advanceThreshold: 1.2  },
  { label: 'All',       targetRadius: 1.2,  arenaRadius: 1.0, domainRandScale: 1.0, maxSteps: 120, advanceThreshold: 99.0 },
];
