/**
 * Interaction — hover and click detection for the arm rods.
 *
 * No drag logic — FK mode uses panel arc-drag for joint control.
 *
 * Callbacks:
 *   onHoverChange(rodId, active)  — rod mesh entered/left hover
 *   onRootClick(rodId)            — rod clicked (mousedown + mouseup, no movement)
 *
 * Rod meshes must have userData = { type: 'rod', id: 'R1' ... }
 */

import * as THREE from 'three';

const _raycaster = new THREE.Raycaster();

export class Interaction {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {THREE.Camera}      camera
   * @param {Function}          getInteractables  — () => THREE.Object3D[]
   * @param {Object}            callbacks
   */
  constructor(canvas, camera, getInteractables, callbacks) {
    this.canvas           = canvas;
    this.camera           = camera;
    this.getInteractables = getInteractables;
    this.callbacks        = callbacks;

    this._mouseDownPos  = new THREE.Vector2();
    this._dragLastNDC   = new THREE.Vector2();
    this._hitId         = null;   // rodId under mousedown
    this._hoveredId     = null;   // currently hovered rodId
    this._dragging      = false;  // true once drag threshold exceeded

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

  _raycastId(ndc) {
    _raycaster.setFromCamera(ndc, this.camera);
    const hits = _raycaster.intersectObjects(this.getInteractables(), false);
    if (!hits.length) return null;
    // Walk up to find userData.id
    let obj = hits[0].object;
    while (obj) {
      if (obj.userData?.id) return obj.userData.id;
      obj = obj.parent;
    }
    return null;
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    const ndc = this._getNDC(e.clientX, e.clientY);
    this._mouseDownPos.copy(ndc);
    this._dragLastNDC.copy(ndc);
    this._hitId   = this._raycastId(ndc);
    this._dragging = false;
  }

  _onMouseMove(e) {
    const ndc = this._getNDC(e.clientX, e.clientY);

    // Active drag — threshold of 0.015 NDC before starting
    if (this._hitId) {
      if (!this._dragging && ndc.distanceTo(this._mouseDownPos) > 0.015) {
        this._dragging = true;
        this.callbacks.onDragStart?.(this._hitId);
        this.canvas.style.cursor = 'grabbing';
      }
      if (this._dragging) {
        const dx = ndc.x - this._dragLastNDC.x;
        const dy = ndc.y - this._dragLastNDC.y;
        this.callbacks.onDrag?.(this._hitId, dx, dy, ndc);
        this._dragLastNDC.copy(ndc);
        return; // skip hover update during drag
      }
    }

    // Hover detection (only when not dragging)
    if (!this._dragging) {
      const id = this._raycastId(ndc);
      if (id !== this._hoveredId) {
        if (this._hoveredId) this.callbacks.onHoverChange?.(this._hoveredId, false);
        this._hoveredId = id;
        if (id) {
          this.callbacks.onHoverChange?.(id, true);
          this.canvas.style.cursor = 'grab';
        } else {
          this.canvas.style.cursor = 'default';
        }
      }
    }
  }

  _onMouseUp(e) {
    if (e.button !== 0) return;

    if (this._dragging) {
      this._dragging = false;
      this.callbacks.onDragEnd?.();
      this.canvas.style.cursor = this._hoveredId ? 'grab' : 'default';
    } else {
      const ndc   = this._getNDC(e.clientX, e.clientY);
      const moved = ndc.distanceTo(this._mouseDownPos);
      if (moved < 0.015 && this._hitId) {
        this.callbacks.onRootClick?.(this._hitId);
      }
    }

    this._hitId = null;
  }

  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const ndc = this._getNDC(t.clientX, t.clientY);
    this._mouseDownPos.copy(ndc);
    this._dragLastNDC.copy(ndc);
    this._hitId   = this._raycastId(ndc);
    this._dragging = false;
  }

  _onTouchMove(e) {
    if (!this._hitId || e.touches.length !== 1) return;
    e.preventDefault();
    const t   = e.touches[0];
    const ndc = this._getNDC(t.clientX, t.clientY);
    if (!this._dragging && ndc.distanceTo(this._mouseDownPos) > 0.015) {
      this._dragging = true;
      this.callbacks.onDragStart?.(this._hitId);
    }
    if (this._dragging) {
      const dx = ndc.x - this._dragLastNDC.x;
      const dy = ndc.y - this._dragLastNDC.y;
      this.callbacks.onDrag?.(this._hitId, dx, dy, ndc);
      this._dragLastNDC.copy(ndc);
    }
  }

  _onTouchEnd(e) {
    if (this._dragging) {
      this._dragging = false;
      this.callbacks.onDragEnd?.();
    } else if (this._hitId) {
      this.callbacks.onRootClick?.(this._hitId);
    }
    this._hitId = null;
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
