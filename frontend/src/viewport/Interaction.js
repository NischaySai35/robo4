/**
 * Interaction — hover and click/drag detection for the arm rods.
 *
 * Raycasts ALL modules' rods (not just the active one) and reports which module
 * each hit belongs to, so the active assembly can be driven across modules.
 *
 * Callbacks:
 *   onHoverChange(moduleId, rodId, active)        — rod mesh entered/left hover
 *   onRootClick(moduleId, rodId)                  — rod clicked (no movement)
 *   onDragStart(moduleId, rodId, ndc)
 *   onDrag(moduleId, rodId, dx, dy, ndc)
 *   onDragEnd()
 *
 * Rod meshes must have userData = { type: 'rod', id: 'R1' ... }; the owning
 * module is resolved via the injected resolveModuleId(object) function.
 */

import * as THREE from 'three';

const _raycaster = new THREE.Raycaster();

export class Interaction {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {THREE.Camera}      camera
   * @param {Function}          getInteractables  — () => THREE.Object3D[] (all modules)
   * @param {Function}          resolveModuleId   — (object) => moduleId | null
   * @param {Object}            callbacks
   */
  constructor(canvas, camera, getInteractables, resolveModuleId, callbacks) {
    this.canvas           = canvas;
    this.camera           = camera;
    this.getInteractables = getInteractables;
    this.resolveModuleId  = resolveModuleId;
    this.callbacks        = callbacks;

    this._mouseDownPos  = new THREE.Vector2();
    this._dragLastNDC   = new THREE.Vector2();
    this._hitId         = null;   // rodId under mousedown
    this._hitModuleId   = null;   // moduleId under mousedown
    this._hoveredId     = null;   // currently hovered rodId
    this._hoveredModuleId = null; // currently hovered moduleId
    this._dragging      = false;  // true once drag threshold exceeded
    this.paused         = false;  // set true to suppress all callbacks (e.g. connect mode)

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove  = this._onTouchMove.bind(this);
    this._onTouchEnd   = this._onTouchEnd.bind(this);

    canvas.addEventListener('mousedown',  this._onMouseDown);
    canvas.addEventListener('mousemove',  this._onMouseMove);
    canvas.addEventListener('mouseup',    this._onMouseUp);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   this._onTouchEnd);
  }

  _getNDC(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  * 2 - 1,
      -((clientY - rect.top)  / rect.height) * 2 + 1,
    );
  }

  // Returns { rodId, moduleId } for the nearest hit, or { rodId:null, moduleId:null }.
  _raycastHit(ndc) {
    _raycaster.setFromCamera(ndc, this.camera);
    const hits = _raycaster.intersectObjects(this.getInteractables(), false);
    if (!hits.length) return { rodId: null, moduleId: null };
    const obj = hits[0].object;
    let rodId = null;
    let o = obj;
    while (o) {
      if (o.userData?.id) { rodId = o.userData.id; break; }
      o = o.parent;
    }
    const moduleId = this.resolveModuleId ? this.resolveModuleId(obj) : null;
    return { rodId, moduleId };
  }

  _onMouseDown(e) {
    if (e.button !== 0 || this.paused) return;
    const ndc = this._getNDC(e.clientX, e.clientY);
    this._mouseDownPos.copy(ndc);
    this._dragLastNDC.copy(ndc);
    const hit = this._raycastHit(ndc);
    this._hitId       = hit.rodId;
    this._hitModuleId = hit.moduleId;
    this._dragging = false;
  }

  _onMouseMove(e) {
    if (this.paused) return;
    const ndc = this._getNDC(e.clientX, e.clientY);

    // Active drag — threshold of 0.015 NDC before starting
    if (this._hitId) {
      if (!this._dragging && ndc.distanceTo(this._mouseDownPos) > 0.015) {
        this._dragging = true;
        this.callbacks.onDragStart?.(this._hitModuleId, this._hitId, ndc);
        this.canvas.style.cursor = 'grabbing';
      }
      if (this._dragging) {
        const dx = ndc.x - this._dragLastNDC.x;
        const dy = ndc.y - this._dragLastNDC.y;
        this.callbacks.onDrag?.(this._hitModuleId, this._hitId, dx, dy, ndc);
        this._dragLastNDC.copy(ndc);
        return; // skip hover update during drag
      }
    }

    // Hover detection (only when not dragging)
    if (!this._dragging) {
      const { rodId, moduleId } = this._raycastHit(ndc);
      if (rodId !== this._hoveredId || moduleId !== this._hoveredModuleId) {
        if (this._hoveredId) this.callbacks.onHoverChange?.(this._hoveredModuleId, this._hoveredId, false);
        this._hoveredId       = rodId;
        this._hoveredModuleId = moduleId;
        if (rodId) {
          this.callbacks.onHoverChange?.(moduleId, rodId, true);
          this.canvas.style.cursor = 'grab';
        } else {
          this.canvas.style.cursor = 'default';
        }
      }
    }
  }

  _onMouseUp(e) {
    if (e.button !== 0 || this.paused) return;

    // Capture and clear interaction state FIRST, so that even if a callback throws
    // the gesture is fully released (no stuck drag / stuck cursor on the next move).
    const wasDragging = this._dragging;
    const hitId       = this._hitId;
    const hitModuleId = this._hitModuleId;
    this._dragging    = false;
    this._hitId       = null;
    this._hitModuleId = null;

    if (wasDragging) {
      this.canvas.style.cursor = this._hoveredId ? 'grab' : 'default';
      this.callbacks.onDragEnd?.();
    } else {
      const ndc   = this._getNDC(e.clientX, e.clientY);
      const moved = ndc.distanceTo(this._mouseDownPos);
      if (moved < 0.015 && hitId) {
        this.callbacks.onRootClick?.(hitModuleId, hitId);
      }
    }
  }

  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const ndc = this._getNDC(t.clientX, t.clientY);
    this._mouseDownPos.copy(ndc);
    this._dragLastNDC.copy(ndc);
    const hit = this._raycastHit(ndc);
    this._hitId       = hit.rodId;
    this._hitModuleId = hit.moduleId;
    this._dragging = false;
  }

  _onTouchMove(e) {
    if (!this._hitId || e.touches.length !== 1) return;
    e.preventDefault();
    const t   = e.touches[0];
    const ndc = this._getNDC(t.clientX, t.clientY);
    if (!this._dragging && ndc.distanceTo(this._mouseDownPos) > 0.015) {
      this._dragging = true;
      this.callbacks.onDragStart?.(this._hitModuleId, this._hitId, ndc);
    }
    if (this._dragging) {
      const dx = ndc.x - this._dragLastNDC.x;
      const dy = ndc.y - this._dragLastNDC.y;
      this.callbacks.onDrag?.(this._hitModuleId, this._hitId, dx, dy, ndc);
      this._dragLastNDC.copy(ndc);
    }
  }

  _onTouchEnd(e) {
    if (this._dragging) {
      this._dragging = false;
      this.callbacks.onDragEnd?.();
    } else if (this._hitId) {
      this.callbacks.onRootClick?.(this._hitModuleId, this._hitId);
    }
    this._hitId       = null;
    this._hitModuleId = null;
  }

  dispose() {
    this.canvas.removeEventListener('mousedown',  this._onMouseDown);
    this.canvas.removeEventListener('mousemove',  this._onMouseMove);
    this.canvas.removeEventListener('mouseup',    this._onMouseUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove',  this._onTouchMove);
    this.canvas.removeEventListener('touchend',   this._onTouchEnd);
  }
}
