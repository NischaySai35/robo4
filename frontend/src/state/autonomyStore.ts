/**
 * autonomyStore — shared state for the Autonomy stack (navigation goal/path,
 * LiDAR scan, status). The Autonomy panel writes goals & plans; SimCanvas draws
 * the overlay and runs LiDAR; HumanoidActionBar consumes the path to steer-walk.
 */
import { create } from 'zustand';
import type { LidarScan } from '@/robotics/sensors/lidar';
import type { Grid } from '@/robotics/nav/occupancyGrid';

export type NavStatus = 'idle' | 'planning' | 'navigating' | 'arrived' | 'failed';

interface AutonomyState {
  goal: [number, number] | null;     // world [x, z]
  path: number[][] | null;           // [x, z] waypoints
  status: NavStatus;
  navigating: boolean;
  settingGoal: boolean;              // click-to-set-goal mode
  lidar: LidarScan | null;
  showLidar: boolean;
  map: Grid | null;                  // occupancy map built from LiDAR
  setGoal: (g: [number, number] | null) => void;
  setPath: (p: number[][] | null) => void;
  setStatus: (s: NavStatus) => void;
  setNavigating: (v: boolean) => void;
  setSettingGoal: (v: boolean) => void;
  setLidar: (s: LidarScan | null) => void;
  toggleLidar: () => void;
  setMap: (g: Grid | null) => void;
}

export const useAutonomyStore = create<AutonomyState>((set) => ({
  goal: null,
  path: null,
  status: 'idle',
  navigating: false,
  settingGoal: false,
  lidar: null,
  showLidar: true,
  map: null,
  setGoal: (goal) => set({ goal }),
  setPath: (path) => set({ path }),
  setStatus: (status) => set({ status }),
  setNavigating: (navigating) => set({ navigating }),
  setSettingGoal: (settingGoal) => set({ settingGoal }),
  setLidar: (lidar) => set({ lidar }),
  toggleLidar: () => set((s) => ({ showLidar: !s.showLidar })),
  setMap: (map) => set({ map }),
}));
