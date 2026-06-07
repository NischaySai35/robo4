const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.addInitScript(() => {
    // Intercept addEventListener to capture the canvas Interaction handlers
    const origAEL = EventTarget.prototype.addEventListener;
    window.__canvasHandlers = {};
    EventTarget.prototype.addEventListener = function(type, handler, opts) {
      if (this instanceof HTMLCanvasElement && ['mousedown', 'mousemove', 'mouseup'].includes(type)) {
        if (!window.__canvasHandlers[type]) window.__canvasHandlers[type] = [];
        window.__canvasHandlers[type].push(handler.toString().substring(0, 100));
      }
      return origAEL.call(this, type, handler, opts);
    };

    // Hook into THREE.Raycaster when it's created to patch intersectObjects
    // We'll intercept the module by patching Object.defineProperty or similar
    // Actually: monkey-patch the global Proxy to intercept class instantiation
    // This is complex. Let's try a different approach.
    //
    // Instead: patch the canvas's dispatchEvent to intercept the raycaster call
    // by intercepting when mousedown happens and forcing a fake hit via the
    // interaction's _pendingDrag mechanism.

    // We'll store the interaction's callbacks by intercepting the canvas
    window.__dragActive = false;
    window.__triggerFakeDrag = null;
  });

  await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Try to access the Interaction instance via React fiber on canvas
  const interactionFound = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'no canvas';

    // Find React fiber key
    const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
    if (!fiberKey) return 'no fiber';

    // Walk up the fiber tree to find the SimCanvas component which owns the Interaction
    function getFiberInfo(fiber, depth) {
      if (!fiber || depth > 100) return null;
      const name = fiber.type && (fiber.type.name || fiber.type.displayName);
      // Check memoizedState (hooks)
      if (fiber.memoizedState) {
        // Look for refs that might contain the interaction
        let state = fiber.memoizedState;
        while (state) {
          if (state.memoizedState && typeof state.memoizedState === 'object') {
            const ms = state.memoizedState;
            if (ms && ms.current && typeof ms.current._onMouseDown === 'function') {
              return { found: 'interaction ref', name };
            }
            if (ms && ms.current && ms.current.interaction && typeof ms.current.interaction._onMouseDown === 'function') {
              return { found: 'renderLoop ref with interaction', name };
            }
          }
          state = state.next;
        }
      }

      return getFiberInfo(fiber.child, depth + 1) || getFiberInfo(fiber.return, depth + 1);
    }

    const fiber = canvas[fiberKey];
    // Walk return chain up to app root
    let cur = fiber;
    const componentNames = [];
    for (let i = 0; i < 50 && cur; i++) {
      const name = cur.type && (typeof cur.type === 'function' ? cur.type.name : null);
      if (name) componentNames.push(name);

      // Check memoizedState for hooks
      let state = cur.memoizedState;
      while (state) {
        if (state.memoizedState && state.memoizedState !== null && typeof state.memoizedState === 'object') {
          const ms = state.memoizedState;
          if (ms.current) {
            const cur2 = ms.current;
            // Check if this looks like a RenderLoop instance
            if (cur2._DRAG_LERP !== undefined) {
              window.__renderLoop = cur2;
              return { found: 'RenderLoop via fiber', component: name, DRAG_LERP: cur2._DRAG_LERP };
            }
            // Check if Interaction instance
            if (typeof cur2._onMouseDown === 'function') {
              window.__interaction = cur2;
              return { found: 'Interaction via fiber', component: name };
            }
          }
        }
        state = state.next;
      }

      cur = cur.return;
    }
    return { notFound: true, componentNames: componentNames.slice(0, 15) };
  });

  console.log('Interaction search:', JSON.stringify(interactionFound, null, 2));

  // If we found the RenderLoop, we can directly trigger a fake drag
  const canTrigger = await page.evaluate(() => {
    return {
      hasRenderLoop: !!window.__renderLoop,
      hasInteraction: !!window.__interaction,
    };
  });
  console.log('Direct access:', canTrigger);

  if (canTrigger.hasRenderLoop) {
    console.log('Testing drag via RenderLoop direct access...');

    await page.keyboard.press('Home');
    await page.waitForTimeout(1500);

    // Trigger fake drag start
    const testResult = await page.evaluate(() => {
      const rl = window.__renderLoop;
      if (!rl) return 'no renderLoop';

      // Simulate drag start: set _dragActive, _dragNodeIndex, _dragTarget
      rl._dragActive = true;
      rl._dragNodeIndex = 4; // right end-cap
      rl._rawDragTarget = { x: 3.2, y: 0, z: 0 }; // node 4 rest position
      rl._dragTarget = { x: 3.2, y: 0, z: 0 };
      rl._draggedType = 'endcap';
      rl._draggedIndex = 1;

      return 'drag started';
    });
    console.log('Drag start result:', testResult);

    await page.waitForTimeout(100);

    // Now move the raw target upward in steps
    console.log('Running slow drag (60 steps, z from 0 to -3)...');
    for (let i = 1; i <= 60; i++) {
      const z = -i * 0.05;
      await page.evaluate((z) => {
        if (window.__renderLoop) {
          window.__renderLoop._rawDragTarget = { x: 3.2, y: 0, z };
        }
      }, z);
      await page.waitForTimeout(30);

      if (i === 30) {
        const midAngles = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.stat-val')).map(e => e.textContent.trim()).slice(0, 3)
        );
        console.log(`Mid drag (step 30): angles=${JSON.stringify(midAngles)}`);
        await page.screenshot({ path: 'd:/robo4/fb_mid_slow_drag.png' });
      }
    }

    const limitAngles = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.stat-val')).map(e => e.textContent.trim()).slice(0, 9)
    );
    console.log('At limit angles:', limitAngles);
    await page.screenshot({ path: 'd:/robo4/fb_at_limit.png' });

    // End drag
    await page.evaluate(() => {
      if (window.__renderLoop) {
        window.__renderLoop._dragActive = false;
        window.__renderLoop._dragNodeIndex = null;
      }
    });

    await page.waitForTimeout(500);

    // Reset
    await page.keyboard.press('Home');
    await page.waitForTimeout(1500);

    // Fast drag test
    console.log('\nRunning fast drag (200 units in 4 steps)...');
    await page.evaluate(() => {
      const rl = window.__renderLoop;
      rl._dragActive = true;
      rl._dragNodeIndex = 4;
      rl._rawDragTarget = { x: 3.2, y: 0, z: 0 };
      rl._dragTarget = { x: 3.2, y: 0, z: 0 };
      rl._draggedType = 'endcap';
      rl._draggedIndex = 1;
    });

    // 4 fast steps — jump to z=-2 in 4 frames
    for (let i = 1; i <= 4; i++) {
      await page.evaluate((z) => {
        if (window.__renderLoop) window.__renderLoop._rawDragTarget = { x: 3.2, y: 0, z };
      }, -i * 0.5);
      await page.waitForTimeout(16); // ~1 frame
    }

    await page.waitForTimeout(100);
    const fastAngles = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.stat-val')).map(e => e.textContent.trim()).slice(0, 9)
    );
    console.log('After fast drag (angles):', fastAngles);

    // Also read the smoothed vs raw target gap
    const lagInfo = await page.evaluate(() => {
      const rl = window.__renderLoop;
      if (!rl) return null;
      return {
        raw: { ...rl._rawDragTarget },
        smoothed: { ...rl._dragTarget },
      };
    });
    console.log('Lag info (raw vs smoothed):', JSON.stringify(lagInfo));

    await page.screenshot({ path: 'd:/robo4/fb_fast_drag.png' });

    // End drag
    await page.evaluate(() => {
      if (window.__renderLoop) {
        window.__renderLoop._dragActive = false;
        window.__renderLoop._dragNodeIndex = null;
      }
    });
  }

  await page.waitForTimeout(1000);
  await browser.close();
})();
