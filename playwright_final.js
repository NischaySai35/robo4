const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Screenshot 1: Initial state
  await page.screenshot({ path: 'd:/robo4/final_1_initial.png' });
  console.log('Screenshot 1: Initial state');

  // Measure CSS
  const cssData = await page.evaluate(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const panelW = cs.getPropertyValue('--panel-w').trim();
    const panel = document.querySelector('.left-panel');
    const panelWidth = panel ? panel.getBoundingClientRect().width : null;

    // Find stat values (joint angle display)
    const statVals = document.querySelectorAll('.stat-val');
    let statValFs = statVals.length > 0 ? getComputedStyle(statVals[0]).fontSize : null;

    // Find joint name labels
    const jointNames = document.querySelectorAll('.joint-name');
    let jointNameFs = jointNames.length > 0 ? getComputedStyle(jointNames[0]).fontSize : null;

    // Find stat labels (ANG, VEL, ACC)
    const statLabels = document.querySelectorAll('.stat-label');
    let statLabelFs = statLabels.length > 0 ? getComputedStyle(statLabels[0]).fontSize : null;

    return { panelW, panelWidth, statValFs, jointNameFs, statLabelFs };
  });
  console.log('CSS measurements:', JSON.stringify(cssData, null, 2));

  // Inject a programmatic drag by directly calling the Interaction's internal event
  // handlers after patching the raycaster to return a fake hit.
  // This approach: add a global before page load would be ideal, but we're past that.
  // Instead, let's try patching THREE.Raycaster prototype via window.THREE

  const threeAvailable = await page.evaluate(() => {
    return typeof window.THREE !== 'undefined';
  });
  console.log('THREE global available:', threeAvailable);

  // Try to find it via module exports inspection
  // Alternative: directly set node positions via the Zustand store
  const storePatched = await page.evaluate(() => {
    // Zustand stores are created with create() — they expose a getState/setState via
    // the returned hook. We need to find the hook function.
    // In the browser, module-level variables aren't exposed globally by default.
    // BUT: Zustand stores often attach themselves to React's context or we can find
    // them via module registry.

    // Try: look for __vite__ module registry
    if (window.__vite__) {
      return 'vite found';
    }

    // Vite exposes modules via import.meta internally but not on window
    return 'no direct access';
  });
  console.log('Store access:', storePatched);

  // The best approach: use page.addInitScript to patch THREE before the app loads
  // But we already loaded. Let's restart with a script injection.

  await browser.close();

  // Restart with init script
  const browser2 = await chromium.launch({ headless: false });
  const page2 = await browser2.newPage();
  await page2.setViewportSize({ width: 1400, height: 900 });

  // Inject patch before page load
  await page2.addInitScript(() => {
    // We'll intercept the Raycaster.intersectObjects method
    window.__patchedRaycaster = false;
    window.__fakeDragActive = false;
    window.__fakeDragInfo = null;

    // Intercept THREE when it loads by hooking into the module system
    // We'll use a proxy on window to detect when THREE is assigned
    // Actually THREE isn't on window — it's imported as ES module

    // Alternative: hook into canvas addEventListener to intercept the Interaction class
    const origAddEventListener = EventTarget.prototype.addEventListener;
    window.__interactionListeners = {};

    EventTarget.prototype.addEventListener = function(type, handler, options) {
      if (this instanceof HTMLCanvasElement && ['mousedown', 'mousemove', 'mouseup'].includes(type)) {
        if (!window.__interactionListeners[type]) {
          window.__interactionListeners[type] = [];
        }
        window.__interactionListeners[type].push({ target: this, handler });
      }
      return origAddEventListener.call(this, type, handler, options);
    };
  });

  await page2.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page2.waitForTimeout(3000);

  // Check what listeners were captured
  const listenerInfo = await page2.evaluate(() => {
    const info = {};
    for (const type of ['mousedown', 'mousemove', 'mouseup']) {
      info[type] = window.__interactionListeners[type] ?
        window.__interactionListeners[type].length : 0;
    }
    return info;
  });
  console.log('Captured listeners:', listenerInfo);

  // Now simulate a drag by calling the captured handlers directly
  // with a fake event that includes a patched raycaster result
  await page2.keyboard.press('Home');
  await page2.waitForTimeout(1500);

  const beforeAngles = await page2.evaluate(() => {
    return Array.from(document.querySelectorAll('.stat-val')).map(e => e.textContent.trim()).slice(0, 3);
  });
  console.log('Angles before injected drag:', beforeAngles);

  // We need to patch THREE.Raycaster.prototype.intersectObjects
  // Since it's an ES module, let's find it differently
  // Try injecting a simulated drag via the canvas's internal THREE raycaster patch

  const dragResult = await page2.evaluate(() => {
    // Find the Interaction instance by inspecting canvas event listeners
    // We captured them via the addEventListener proxy
    const listeners = window.__interactionListeners;
    if (!listeners.mousedown || listeners.mousedown.length === 0) {
      return { error: 'no mousedown listeners captured' };
    }

    // Get the first mousedown listener (Interaction's _onMouseDown)
    const { target: canvas, handler } = listeners.mousedown[0];

    // The THREE.Raycaster in _onMouseDown calls intersectObjects.
    // We need to patch it. Find THREE via the canvas's __r3f or similar
    const r3fKey = Object.keys(canvas).find(k => k.includes('r3f') || k.includes('fiber') || k.includes('three'));
    return {
      r3fKey,
      canvasKeys: Object.keys(canvas).filter(k => k.startsWith('__')).slice(0, 10),
      listenerCount: listeners.mousedown.length
    };
  });
  console.log('Drag result:', JSON.stringify(dragResult));

  // Let's try a completely different approach: use the WebGL info to find objects
  // Actually, let's check if the arm moves when we use the proper pixel position.
  // From the screenshots: the arm center is at viewport (1400/2 + 340/2) = 870px x, y=450
  // The right end-cap (golden cube) at the far right = 870 + (3.2/max_reach * scene_width)
  // ROD_LENGTH=1.6, 4 rods, arm spans x from -3.2 to 3.2
  // The camera's projection: let's try multiple y values (the arm might be slightly off y=440)

  const dragTest = async (cx, cy, desc) => {
    await page2.keyboard.press('Home');
    await page2.waitForTimeout(800);

    const before = await page2.evaluate(() =>
      Array.from(document.querySelectorAll('.stat-val')).map(e => e.textContent.trim()).slice(0, 3)
    );

    // Use dispatchEvent with all necessary fields
    await page2.evaluate(({ x, y }) => {
      const canvas = document.querySelector('canvas');
      // Simulate mousedown
      canvas.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true, cancelable: true, view: window,
        clientX: x, clientY: y, button: 0, buttons: 1,
        movementX: 0, movementY: 0
      }));
    }, { x: cx, y: cy });

    await page2.waitForTimeout(50);

    // Move up in steps
    for (let i = 1; i <= 30; i++) {
      const y = cy - i * 5;
      await page2.evaluate(({ x, y }) => {
        const canvas = document.querySelector('canvas');
        canvas.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true, cancelable: true, view: window,
          clientX: x, clientY: y, button: 0, buttons: 1
        }));
      }, { x: cx, y });
      await page2.waitForTimeout(20);
    }

    const after = await page2.evaluate(() =>
      Array.from(document.querySelectorAll('.stat-val')).map(e => e.textContent.trim()).slice(0, 3)
    );

    const changed = JSON.stringify(before) !== JSON.stringify(after);
    console.log(`${desc}: before=${JSON.stringify(before)}, after=${JSON.stringify(after)}, CHANGED=${changed}`);

    await page2.evaluate(({ x, y }) => {
      const canvas = document.querySelector('canvas');
      canvas.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true, cancelable: true, view: window,
        clientX: x, clientY: y, button: 0, buttons: 0
      }));
    }, { x: cx, y: cy - 150 });

    return changed;
  };

  // Test various positions
  const positions = [
    [1100, 440], [1095, 435], [1090, 445], [1085, 440],
    [1080, 440], [1075, 440], [1060, 440], [1040, 440],
    [870, 440],  [730, 440],  [600, 440],  [595, 440],
    [600, 445],  [1100, 430], [1100, 450], [1100, 455],
  ];

  for (const [x, y] of positions) {
    const changed = await dragTest(x, y, `pos(${x},${y})`);
    if (changed) {
      console.log(`\n*** FOUND DRAGGABLE POSITION: (${x}, ${y}) ***`);
      break;
    }
  }

  await page2.screenshot({ path: 'd:/robo4/final_2_state.png' });
  console.log('Final screenshot taken');

  await browser2.close();
})();
