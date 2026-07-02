/**
 * mateBridge — lets a panel (Auto-Snap / manual Mate) ask the live viewport to
 * PLAY the mating motion (approach → align → insert → latch) instead of
 * teleporting the module to its final pose. The heavy lifting lives in
 * ModelEditor (it owns the meshes and the per-frame tick); this is just the thin
 * hand-off so the React side stays framework-only and doesn't touch THREE meshes.
 *
 * If nothing has registered `play` (e.g. a page with no ModelEditor mounted),
 * callers fall back to committing instantly — the animation is pure polish, the
 * final result is identical either way.
 */
export interface MateAnimBody {
  id: string;
  goalPos: [number, number, number];
  goalQuat: [number, number, number, number];
}

export interface MateAnimRequest {
  bodies: MateAnimBody[];
  axis: [number, number, number]; // world mating axis (A's outward normal) to back off along
  gap: number;                    // pre-insertion stand-off distance, world units (e.g. 0.02 = 20mm)
  commit: () => void;             // apply the real patches + joint once the motion finishes
  // Collision guard: `partnerId` is connector A's body — excluded from obstacle
  // checks because the key is MEANT to interlock with it. During the insert slide
  // the moving module is tested against every other body; if it would ram one,
  // the motion aborts (no commit) and `onBlocked` fires instead of `commit`.
  partnerId?: string;
  onBlocked?: (obstacleId: string) => void;
}

export const mateBridge: { play: ((req: MateAnimRequest) => void) | null } = {
  play: null,
};
