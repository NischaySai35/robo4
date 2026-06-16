import { create } from 'zustand';

let _nextId = 1;

const makeModule = (id, label, zOffset = 0) => ({
  id,
  label,
  angles: [0, 0, 0, 0, 0, 0],
  activeRootId: 'R1',
  position:   { x: 0, y: 0, z: zOffset },
  quaternion: { x: 0, y: 0, z: 0, w: 1 },
  mode: 'horizontal',
});

export const useMultiStore = create((set, get) => ({
  modules: [makeModule('module-0', 'Module 1', 0)],
  activeModuleId: 'module-0',

  // Connect-mode face selection
  connectMode:   false,
  face1:         null,   // { moduleId, faceKey }
  face2:         null,
  connectError:  null,

  // Delete-mode: user clicks a module in the viewport to delete it
  deleteMode: false,
  setDeleteMode(active) {
    set({ deleteMode: active });
  },

  // Disconnect-mode module selection
  disconnectMode: false,
  dSel1:          null,   // moduleId of first selected module
  dSel2:          null,   // moduleId of second selected module
  disconnectError: null,

  // Delete a module — at least one must remain
  removeModule(id) {
    const { modules, activeModuleId } = get();
    if (modules.length <= 1) return;
    const remaining = modules
      .filter(m => m.id !== id)
      .map((m, i) => ({ ...m, label: `Module ${i + 1}` })); // renumber
    const newActive = activeModuleId === id ? remaining[0].id : activeModuleId;
    set({ modules: remaining, activeModuleId: newActive });
  },

  addModule() {
    const current = get().modules;
    // Find the first z-slot (multiples of 4) not occupied by any existing module
    const usedSlots = new Set(current.map(m => Math.round(m.position.z / 4)));
    let slot = 0;
    while (usedSlots.has(slot)) slot++;
    const id    = `module-${_nextId++}`;
    const label = `Module ${current.length + 1}`;
    const zOff  = slot * 4.0;
    set(s => ({ modules: [...s.modules, makeModule(id, label, zOff)] }));
    return id;
  },

  setActiveModule(id) {
    set({ activeModuleId: id });
  },

  // Called when switching away from a module to persist its live Three.js state
  saveModuleState(id, { angles, activeRootId, position, quaternion, mode }) {
    set(s => ({
      modules: s.modules.map(m =>
        m.id === id ? { ...m, angles, activeRootId, position, quaternion, mode } : m,
      ),
    }));
  },

  setConnectMode(active) {
    set({ connectMode: active, face1: null, face2: null, connectError: null });
  },

  setDisconnectMode(active) {
    set({ disconnectMode: active, dSel1: null, dSel2: null, disconnectError: null });
  },
  setDSel1(id)          { set({ dSel1: id, disconnectError: null }); },
  setDSel2(id)          { set({ dSel2: id, disconnectError: null }); },
  clearDSelections()    { set({ dSel1: null, dSel2: null, disconnectError: null }); },
  setDisconnectError(m) { set({ disconnectError: m }); },

  // Move moduleId back to the first unoccupied z-slot and reset quaternion
  applyDisconnect(moduleId) {
    set(s => {
      const usedSlots = new Set(
        s.modules.filter(m => m.id !== moduleId).map(m => Math.round(m.position.z / 4))
      );
      let slot = 0;
      while (usedSlots.has(slot)) slot++;
      return {
        modules: s.modules.map(m =>
          m.id === moduleId
            ? { ...m,
                position:   { x: 0, y: 0, z: slot * 4.0 },
                quaternion: { x: 0, y: 0, z: 0, w: 1  },
              }
            : m,
        ),
        disconnectMode: false,
        dSel1: null,
        dSel2: null,
        disconnectError: null,
      };
    });
  },

  setFace1(info)  { set({ face1: info,  connectError: null }); },
  setFace2(info)  { set({ face2: info,  connectError: null }); },
  clearFaces()    { set({ face1: null,  face2: null, connectError: null }); },
  setConnectError(msg) { set({ connectError: msg }); },

  // Apply the computed world transform to the joined module and exit connect mode
  applyJoin(moduleId, newPos, newQuat) {
    set(s => ({
      modules: s.modules.map(m =>
        m.id === moduleId
          ? { ...m,
              position:   { x: newPos.x,  y: newPos.y,  z: newPos.z },
              quaternion: { x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w },
            }
          : m,
      ),
      connectMode: false,
      face1: null,
      face2: null,
      connectError: null,
    }));
  },
}));
