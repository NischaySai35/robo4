const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Patch: intercept Zustand's create function to expose the store
  await page.addInitScript(() => {
    // Zustand uses a global __ZUSTAND__ or similar for devtools
    // Let's intercept the create function by patching the module system
    // Vite wraps ES modules — we can hook into them via the module cache

    // The most reliable way: intercept Object.defineProperty to catch module exports
    // Actually, let's use a simpler approach:
    // Find the Zustand store by looking for objects with getState/setState methods
    // on any closure that React refs hold

    // Hook into useEffect via React's __SECRET_INTERNALS
    const origDefineProperty = Object.defineProperty;

    // Intercept when Zustand creates a store (it calls Object.defineProperty on the hook fn)
    window.__zustandStores = [];

    // Actually let's just look for the store via React internals after mount
    window.__findStore = () => {
      // Zustand v4 stores have getState, setState, subscribe, destroy
      // They're plain objects with those methods
      // They might be assigned to module-level variables that React components capture in closures

      // Since SimCanvas uses useArmStore.getState(), the store must be accessible
      // Let's find it by traversing the canvas's React fiber closures

      const canvas = document.querySelector('canvas');
      if (!canvas) return 'no canvas';

      const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
      if (!fiberKey) return 'no fiber';

      let fiber = canvas[fiberKey];

      // Walk up the fiber tree
      while (fiber) {
        // Check memoizedState for useRef hooks
        let stateNode = fiber.memoizedState;
        while (stateNode) {
          const ms = stateNode.memoizedState;
          // useRef returns { current: value }
          if (ms && ms.current !== null && ms.current !== undefined) {
            // Check if it's a RenderLoop (has _DRAG_LERP)
            if (typeof ms.current === 'object' && '_DRAG_LERP' in ms.current) {
              window.__renderLoop = ms.current;
              return 'found RenderLoop in fiber memoizedState';
            }
            // Check cleanupRef
            if (typeof ms.current === 'function') {
              // could be the cleanup function
            }
          }
          stateNode = stateNode.next;
        }

        // Check stateNode (class component state)
        if (fiber.stateNode && fiber.stateNode._DRAG_LERP !== undefined) {
          window.__renderLoop = fiber.stateNode;
          return 'found RenderLoop as stateNode';
        }

        fiber = fiber.return;
      }

      return 'not found in fiber';
    };
  });

  await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Try to find the store
  const findResult = await page.evaluate(() => window.__findStore());
  console.log('Find result:', findResult);

  const hasRL = await page.evaluate(() => !!window.__renderLoop);
  console.log('Has renderLoop:', hasRL);

  if (!hasRL) {
    // Different approach: directly look at the fiber's hook linked list for the SimCanvas component
    const detailedSearch = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
      let fiber = canvas[fiberKey];

      const results = [];

      while (fiber) {
        const name = fiber.type && (typeof fiber.type === 'function' ? fiber.type.name : null);

        if (name === 'SimCanvas') {
          // Found SimCanvas fiber — examine its hooks
          let state = fiber.memoizedState;
          let hookIdx = 0;
          while (state) {
            const ms = state.memoizedState;
            let info = `hook[${hookIdx}]: `;
            if (ms === null) info += 'null';
            else if (ms === undefined) info += 'undefined';
            else if (typeof ms !== 'object') info += typeof ms + ': ' + String(ms).substring(0, 50);
            else if (ms.current !== undefined) {
              const cur = ms.current;
              if (cur === null) info += 'ref(null)';
              else if (typeof cur === 'function') info += 'ref(function ' + cur.name + ')';
              else if (typeof cur === 'object') {
                const keys = Object.keys(cur).slice(0, 8).join(',');
                info += `ref({${keys}})`;
                // Check for _DRAG_LERP
                if ('_DRAG_LERP' in cur) {
                  window.__renderLoop = cur;
                  info += ' [RenderLoop!]';
                }
              }
              else info += 'ref(' + typeof cur + ')';
            }
            else {
              const keys = Object.keys(ms).slice(0, 5).join(',');
              info += `{${keys}}`;
            }
            results.push(info);
            state = state.next;
            hookIdx++;
          }
          break;
        }

        fiber = fiber.return;
      }

      return results;
    });
    console.log('SimCanvas hooks:', detailedSearch);
  }

  const hasRL2 = await page.evaluate(() => !!window.__renderLoop);
  console.log('Has renderLoop after detail search:', hasRL2);

  if (hasRL2) {
    // Run the drag tests
    await page.keyboard.press('Home');
    await page.waitForTimeout(1500);

    const getAngles = () => page.evaluate(() =>
      Array.from(document.querySelectorAll('.stat-val')).map(e => e.textContent.trim()).slice(0, 9)
    );

    console.log('\n=== SLOW DRAG TEST ===');
    await page.evaluate(() => {
      const rl = window.__renderLoop;
      rl._dragActive = true;
      rl._dragNodeIndex = 4;
      rl._rawDragTarget = { x: 3.2, y: 0, z: 0 };
      rl._dragTarget    = { x: 3.2, y: 0, z: 0 };
      rl._draggedType = 'endcap';
      rl._draggedIndex = 1;
    });

    let snapDetected = false;
    let prevAngles = null;

    for (let i = 1; i <= 60; i++) {
      const z = -i * 0.05;
      await page.evaluate((z) => {
        window.__renderLoop._rawDragTarget = { x: 3.2, y: 0, z };
      }, z);
      await page.waitForTimeout(30);

      if (i % 10 === 0 || i === 30) {
        const angles = await getAngles();
        console.log(`Step ${i}/60: z=${z.toFixed(2)}, angles=${JSON.stringify(angles.slice(0,3))}`);

        if (prevAngles) {
          for (let j = 0; j < 3; j++) {
            const a = parseFloat(prevAngles[j*3]?.replace(/[^0-9.-]/g,'') || '0');
            const b = parseFloat(angles[j*3]?.replace(/[^0-9.-]/g,'') || '0');
            if (Math.abs(b - a) > 80) {
              snapDetected = true;
              console.log(`SNAP at step ${i}, joint ${j}: ${prevAngles[j*3]} -> ${angles[j*3]}`);
            }
          }
        }
        prevAngles = angles;

        if (i === 30) {
          await page.screenshot({ path: 'd:/robo4/z_mid_slow.png' });
          console.log('Screenshot: mid slow drag');
        }
      }
    }

    await page.screenshot({ path: 'd:/robo4/z_at_limit.png' });
    console.log('Screenshot: at limit');
    const limitAngles = await getAngles();
    console.log('Angles at limit:', limitAngles.slice(0, 9));

    // Check status (should be 'limit_hit' or 'solving')
    const status = await page.evaluate(() => {
      const statusEl = document.querySelector('[class*="status"], .status, #status');
      if (statusEl) return statusEl.textContent.trim();
      // Find the status badge
      const allEls = Array.from(document.querySelectorAll('*'));
      const badge = allEls.find(el => el.children.length === 0 &&
        ['IDLE', 'SOLVING', 'LIMIT_HIT', 'limit_hit', 'solving', 'idle'].includes(el.textContent.trim().toLowerCase()));
      return badge ? badge.textContent.trim() : 'not found';
    });
    console.log('Status at limit:', status);

    // End drag
    await page.evaluate(() => {
      window.__renderLoop._dragActive = false;
      window.__renderLoop._dragNodeIndex = null;
    });
    await page.waitForTimeout(500);

    // Reset
    await page.keyboard.press('Home');
    await page.waitForTimeout(1500);

    console.log('\n=== FAST DRAG TEST ===');
    await page.evaluate(() => {
      const rl = window.__renderLoop;
      rl._dragActive = true;
      rl._dragNodeIndex = 4;
      rl._rawDragTarget = { x: 3.2, y: 0, z: 0 };
      rl._dragTarget    = { x: 3.2, y: 0, z: 0 };
      rl._draggedType = 'endcap';
      rl._draggedIndex = 1;
    });

    // 4 fast jumps to z=-2
    for (let i = 1; i <= 4; i++) {
      await page.evaluate((z) => {
        window.__renderLoop._rawDragTarget = { x: 3.2, y: 0, z };
      }, -i * 0.5);
      await page.waitForTimeout(16);
    }

    await page.waitForTimeout(200);

    const fastAngles = await getAngles();
    const lagInfo = await page.evaluate(() => {
      const rl = window.__renderLoop;
      return {
        raw: { ...rl._rawDragTarget },
        smoothed: { ...rl._dragTarget },
        lag: Math.abs(rl._rawDragTarget.z - rl._dragTarget.z).toFixed(3)
      };
    });
    console.log('After fast drag: angles=', fastAngles.slice(0,3));
    console.log('Lag info:', lagInfo);
    console.log('Damping visible:', parseFloat(lagInfo.lag) > 0.05 ? 'YES - arm lags behind mouse' : 'NO - converged already');

    await page.screenshot({ path: 'd:/robo4/z_fast_drag.png' });
    console.log('Screenshot: fast drag');

    await page.evaluate(() => {
      window.__renderLoop._dragActive = false;
      window.__renderLoop._dragNodeIndex = null;
    });

    console.log('\n=== SUMMARY ===');
    console.log('Snap detected during slow drag:', snapDetected);
  } else {
    console.log('Could not find RenderLoop — cannot test 3D interaction via fiber');
  }

  await page.waitForTimeout(1000);
  await browser.close();
})();
