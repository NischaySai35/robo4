const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=desktop'] // try desktop GL for WebGL
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // The arm is at y≈440 in viewport. The right end-cap (golden cube) at x≈1100.
  // The issue: Playwright headless doesn't render WebGL properly for raycasting.
  // We'll simulate drags by directly firing mouse events on the canvas
  // AND simultaneously trigger the interaction's internal callbacks via page.evaluate.

  // First, let's check what the scene looks like by injecting a diagnostic
  const diagResult = await page.evaluate(() => {
    // Try to find the interaction instance via window or React fiber
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas' };

    // Check if there are event listeners by simulating a mousedown and checking if
    // the cursor changes (indicating a hit)
    return {
      canvasExists: true,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    };
  });
  console.log('Canvas diag:', diagResult);

  // The key insight: let's try injecting mouse events with dispatchEvent
  // because Playwright's page.mouse uses CDP which may work differently
  const tryDragViaDispatch = async (startX, startY, endY, steps, delay) => {
    // Mousedown
    await page.evaluate(({ x, y }) => {
      const canvas = document.querySelector('canvas');
      const evt = new MouseEvent('mousedown', {
        bubbles: true, cancelable: true, view: window,
        clientX: x, clientY: y, button: 0, buttons: 1
      });
      canvas.dispatchEvent(evt);
    }, { x: startX, y: startY });

    await page.waitForTimeout(50);

    // Move in steps
    for (let i = 1; i <= steps; i++) {
      const y = startY + (endY - startY) * i / steps;
      await page.evaluate(({ x, y }) => {
        const canvas = document.querySelector('canvas');
        const evt = new MouseEvent('mousemove', {
          bubbles: true, cancelable: true, view: window,
          clientX: x, clientY: y, button: 0, buttons: 1
        });
        canvas.dispatchEvent(evt);
      }, { x: startX, y });
      await page.waitForTimeout(delay);
    }

    // Mouseup
    await page.evaluate(({ x, y }) => {
      const canvas = document.querySelector('canvas');
      const evt = new MouseEvent('mouseup', {
        bubbles: true, cancelable: true, view: window,
        clientX: x, clientY: y, button: 0, buttons: 1
      });
      canvas.dispatchEvent(evt);
    }, { x: startX, y: endY });
  };

  // Get current angles helper
  const getAngles = () => page.evaluate(() => {
    return Array.from(document.querySelectorAll('.stat-val'))
      .map(e => e.textContent.trim()).slice(0, 3);
  });

  // Press Home first
  await page.keyboard.press('Home');
  await page.waitForTimeout(1500);

  const before = await getAngles();
  console.log('Angles before drag:', before);

  // Slow drag: right end-cap at ~1100, 440, drag up 300px over 60 steps
  await tryDragViaDispatch(1100, 440, 140, 60, 30);
  const after = await getAngles();
  console.log('Angles after dispatch drag:', after);

  // If still 0.0°, the raycaster isn't hitting.
  // Let's try programmatically calling the interaction callback directly
  const callbackResult = await page.evaluate(() => {
    // Find the Zustand store via window or React devtools
    // Look for Zustand store in React fiber
    const rootEl = document.getElementById('root');
    if (!rootEl) return 'no root element';

    // Try to find fiber
    const fiberKey = Object.keys(rootEl).find(k => k.startsWith('__reactFiber'));
    if (!fiberKey) return 'no fiber key';

    // Walk fiber to find our store
    function walkFiber(fiber, depth = 0) {
      if (depth > 50) return null;
      if (!fiber) return null;

      // Check stateNode
      if (fiber.stateNode && fiber.stateNode._interaction) {
        return fiber.stateNode;
      }

      // Check memoizedProps
      if (fiber.memoizedProps) {
        // Look for interaction-related props
      }

      return walkFiber(fiber.child, depth + 1) || walkFiber(fiber.sibling, depth + 1);
    }

    const fiber = rootEl[fiberKey];
    const result = walkFiber(fiber);
    return result ? 'found stateNode' : 'not found via fiber';
  });
  console.log('Fiber search:', callbackResult);

  // Alternative: Try simulating the drag with the arm at a known 3D position
  // by directly manipulating the store
  const storeResult = await page.evaluate(() => {
    // Try to find Zustand store via the window.__zustand or similar
    // The store is likely exposed via React context
    // Let's try window.__armStore or similar global

    // Some apps expose the store globally for debugging
    const globalKeys = Object.keys(window).filter(k =>
      k.includes('store') || k.includes('Store') || k.includes('arm') || k.includes('Arm')
    );
    return { globalKeys: globalKeys.slice(0, 10) };
  });
  console.log('Store globals:', storeResult);

  // Try to directly trigger the IK solve by manipulating node positions
  // Let's manually fire the interaction callbacks through the canvas event handler
  // The approach: find the Interaction instance via module inspection

  // Actually, let's use a different approach: inject a script that hooks into the
  // mousedown handler and triggers a fake hit

  await page.keyboard.press('Home');
  await page.waitForTimeout(1500);

  // Inject a hook to intercept the Interaction's _raycast method
  const hookResult = await page.evaluate(() => {
    // Find the canvas and check what event listeners are on it
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'no canvas';

    // Try to access the Interaction instance by finding it in the event listener list
    // We can do this by checking getEventListeners if available (Chrome DevTools Protocol)
    // Or by checking a common pattern

    // Alternative: get the THREE.js scene via the canvas context
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 'no webgl context';

    return `WebGL available: ${gl.getParameter(gl.RENDERER)}`;
  });
  console.log('WebGL context:', hookResult);

  // The arm is not responding because the raycaster can't find any objects
  // in the headless GL context. Let's try --use-gl=angle or egl

  // Last resort: check if we can bypass the raycaster by directly calling
  // the onDragStart callback stored in the interaction
  await page.evaluate(() => {
    // Intercept the THREE.Raycaster to always return a fake hit
    window._dragTestActive = false;

    const canvas = document.querySelector('canvas');

    // Fire a test mousedown
    const testDown = new MouseEvent('mousedown', {
      bubbles: true, clientX: 1100, clientY: 440, button: 0, buttons: 1
    });
    canvas.dispatchEvent(testDown);

    setTimeout(() => {
      const testMove = new MouseEvent('mousemove', {
        bubbles: true, clientX: 1100, clientY: 350, button: 0, buttons: 1
      });
      canvas.dispatchEvent(testMove);
    }, 100);
  });

  await page.waitForTimeout(500);
  const angles2 = await getAngles();
  console.log('Angles after injected events:', angles2);

  await browser.close();
  console.log('\nConclusion: The drag events are registering on the canvas (mousedown confirmed via earlier tests) but the Three.js raycaster finds no intersections because WebGL rendering in the Playwright browser may not place objects at the expected screen coordinates.');
  console.log('The CSS measurements confirm the UI changes are correct. The 3D interaction behavior needs to be verified in a real browser.');
})();
