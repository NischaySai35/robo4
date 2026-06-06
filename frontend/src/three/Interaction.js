/**
 * Interaction — mouse/touch drag handling for the arm.
 *
 * Responsibilities:
 *   • Raycasting against arm objects on mousedown
 *   • Computing drag plane perpendicular to camera through the hit point
 *   • Updating the drag target on mousemove
 *   • Notifying via callbacks (onDragStart, onDragMove, onDragEnd, onRootClick)
 *
 * No store imports — purely geometric; the RenderLoop bridges to the store.
 */

import * as THREE from 'three';

const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _planeNormal = new THREE.Vector3();
const _dragPlane = new THREE.Plane();
const _intersect = new THREE.Vector3();

export class Interaction {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {THREE.Camera}      camera
   * @param {Function} getInteractables   () => THREE.Object3D[]
   * @param {Object}   callbacks
   *   .onDragStart(type, index, worldPoint)
   *   .onDragMove(worldPoint)
   *   .onDragEnd()
   *   .onRootClick(rodIndex)   — called when rod clicked without drag
   */
  constructor(canvas, camera, getInteractables, callbacks) {
    this.canvas = canvas;
    this.camera = camera;
    this.getInteractables = getInteractables;
    this.callbacks = callbacks;

    this._dragging = false;
    this._mouseDownPos = new THREE.Vector2();
    this._hitObject = null;
    this._hoveredInfo = null; // { type, index } of currently hovered object

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd);
  }

  _getNDC(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  _raycast(ndc) {
    _raycaster.setFromCamera(ndc, this.camera);
    const hits = _raycaster.intersectObjects(this.getInteractables(), false);
    return hits.length > 0 ? hits[0] : null;
  }

  _setupDragPlane(worldPoint) {
    // Plane faces the camera through the hit point
    _planeNormal.copy(this.camera.position).sub(worldPoint).normalize();
    _dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, worldPoint);
  }

  _getDragWorldPos(ndc) {
    _raycaster.setFromCamera(ndc, this.camera);
    _raycaster.ray.intersectPlane(_dragPlane, _intersect);
    return _intersect.clone();
  }

  _getObjectInfo(obj) {
    // Walk up to find the userData we want
    let cur = obj;
    while (cur) {
      if (cur.userData && cur.userData.type) return cur.userData;
      cur = cur.parent;
    }
    return null;
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    const ndc = this._getNDC(e.clientX, e.clientY);
    this._mouseDownPos.copy(ndc);
    const hit = this._raycast(ndc);
    if (!hit) return;

    const info = this._getObjectInfo(hit.object);
    if (!info) return;

    this._hitObject = info;
    this._setupDragPlane(hit.point);
    this._pendingDrag = true; // will confirm on first move
  }

  _onMouseMove(e) {
    const ndc = this._getNDC(e.clientX, e.clientY);

    if (this._pendingDrag) {
      // Check if moved enough to confirm drag
      const delta = ndc.distanceTo(this._mouseDownPos);
      if (delta > 0.008) {
        this._pendingDrag = false;
        this._dragging = true;
        this._clearHover(); // drag state takes over from hover
        this.canvas.style.cursor = 'grabbing';
        const wp = this._getDragWorldPos(ndc);
        this.callbacks.onDragStart?.(this._hitObject.type, this._hitObject.index, wp);
      }
    } else if (this._dragging) {
      const wp = this._getDragWorldPos(ndc);
      if (wp) this.callbacks.onDragMove?.(wp);
    } else {
      // Hover detection — raycast every move to find what's under cursor
      this._updateHover(ndc);
    }
  }

  _updateHover(ndc) {
    const hit = this._raycast(ndc);
    const newInfo = hit ? this._getObjectInfo(hit.object) : null;

    const prevKey = this._hoveredInfo ? `${this._hoveredInfo.type}-${this._hoveredInfo.index}` : null;
    const newKey  = newInfo           ? `${newInfo.type}-${newInfo.index}`                      : null;

    if (prevKey === newKey) return; // nothing changed

    // Clear previous hover
    if (this._hoveredInfo) {
      this.callbacks.onHoverChange?.(this._hoveredInfo.type, this._hoveredInfo.index, false);
    }

    this._hoveredInfo = newInfo;

    if (newInfo) {
      this.callbacks.onHoverChange?.(newInfo.type, newInfo.index, true);
      // Cursor: rods use pointer (clickable + draggable), others use grab
      this.canvas.style.cursor = newInfo.type === 'rod' ? 'pointer' : 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  _clearHover() {
    if (this._hoveredInfo) {
      this.callbacks.onHoverChange?.(this._hoveredInfo.type, this._hoveredInfo.index, false);
      this._hoveredInfo = null;
    }
    this.canvas.style.cursor = 'default';
  }

  _onMouseUp(e) {
    if (this._pendingDrag && this._hitObject) {
      // It was a click, not a drag
      if (this._hitObject.type === 'rod') {
        this.callbacks.onRootClick?.(this._hitObject.index);
      }
    }
    if (this._dragging) {
      this.callbacks.onDragEnd?.();
      this.canvas.style.cursor = 'default';
    }
    this._dragging = false;
    this._pendingDrag = false;
    this._hitObject = null;
    // Re-detect hover at current position after drag ends
    const ndc = this._getNDC(e.clientX, e.clientY);
    this._updateHover(ndc);
  }

  // Touch equivalents
  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const ndc = this._getNDC(t.clientX, t.clientY);
    this._mouseDownPos.copy(ndc);
    const hit = this._raycast(ndc);
    if (!hit) return;
    const info = this._getObjectInfo(hit.object);
    if (!info) return;
    this._hitObject = info;
    this._setupDragPlane(hit.point);
    this._pendingDrag = true;
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const ndc = this._getNDC(t.clientX, t.clientY);
    if (this._pendingDrag) {
      const delta = ndc.distanceTo(this._mouseDownPos);
      if (delta > 0.01) {
        this._pendingDrag = false;
        this._dragging = true;
        const wp = this._getDragWorldPos(ndc);
        this.callbacks.onDragStart?.(this._hitObject.type, this._hitObject.index, wp);
      }
    } else if (this._dragging) {
      const wp = this._getDragWorldPos(ndc);
      if (wp) this.callbacks.onDragMove?.(wp);
    }
  }

  _onTouchEnd() {
    if (this._pendingDrag && this._hitObject?.type === 'rod') {
      this.callbacks.onRootClick?.(this._hitObject.index);
    }
    if (this._dragging) this.callbacks.onDragEnd?.();
    this._dragging = false;
    this._pendingDrag = false;
    this._hitObject = null;
    this._clearHover();
  }

  get isDragging() { return this._dragging; }

  dispose() {
    const c = this.canvas;
    c.removeEventListener('mousedown', this._onMouseDown);
    c.removeEventListener('mousemove', this._onMouseMove);
    c.removeEventListener('mouseup', this._onMouseUp);
    c.removeEventListener('touchstart', this._onTouchStart);
    c.removeEventListener('touchmove', this._onTouchMove);
    c.removeEventListener('touchend', this._onTouchEnd);
  }
}
