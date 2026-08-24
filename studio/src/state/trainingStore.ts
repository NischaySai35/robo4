/**
 * trainingStore — UI state for the RL Training panel's interactive REACH TARGET: the
 * point in space you want the trained brain to drive the arm's tip to. The viewport
 * draws a marker at `target`, and while `picking` is on a canvas click places it.
 */
import { create } from 'zustand';

interface TrainingState {
  target: [number, number, number] | null;
  picking: boolean;
  running: boolean;
  setTarget: (t: [number, number, number] | null) => void;
  setPicking: (v: boolean) => void;
  setRunning: (v: boolean) => void;
}

export const useTrainingStore = create<TrainingState>((set) => ({
  target: null,
  picking: false,
  running: false,
  setTarget: (target) => set({ target }),
  setPicking: (picking) => set({ picking }),
  setRunning: (running) => set({ running }),
}));
