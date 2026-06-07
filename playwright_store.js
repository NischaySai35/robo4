const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Intercept Zustand store creation by patching before ES module loads
  await page.addInitScript(() => {
    // Zustand v4: create() returns a hook function but also attaches getState/setState
    // The store module exports { useArmStore } which is both a hook AND has getState()
    // We intercept by patching the zustand 'create' export

    // Strategy: intercept via module system by hooking into dynamic imports
    // or by intercepting Object.defineProperty when zustand defines getState on the store

    // The cleanest approach: Vite uses a module registry we can access
    // Look for __vite__ or similar
    const orig_fetch = window.fetch;
    window.fetch = function(...args) { return orig_fetch.apply(this, args); };

    // Intercept ES module evaluation by hooking into the import.meta mechanism
    // This doesn't work from addInitScript.

    // Real solution: intercept when the Zustand store hook is called from React
    // React calls the store.subscribe in components -> we can find it via useState hook
    // But the armStore uses Zustand external store, not React state.

    // Most practical: use Vite's __vite_plugin_react_preamble_installed__ marker
    // and access modules via __vite__

    window.__storeIntercepted = false;
    // Patch Proxy to intercept any object with getState method
    const origProxy = window.Proxy;
    // Don't use Proxy to intercept — too broad.

    // Alternative: hook into requestAnimationFrame to find the store
    // The RenderLoop calls requestAnimationFrame. We can intercept RAF
    // to get access to the callback closure.
    const origRAF = window.requestAnimationFrame;
    window.__rafCallbacks = [];
    window.requestAnimationFrame = function(cb) {
      window.__rafCallbacks.push(cb);
      if (window.__rafCallbacks.length === 1) {
        // Store first RAF callback — this is the render loop
        window.__firstRafCb = cb;
      }
      return origRAF.call(window, cb);
    };
  });

  await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Check the RAF callbacks
  const rafInfo = await page.evaluate(() => {
    const cbs = window.__rafCallbacks;
    if (!cbs || cbs.length === 0) return 'no RAF callbacks captured';

    // The first RAF callback is the render loop's `loop` function
    // It's a closure that captures `renderLoop`. Let's inspect it.
    const cb = cbs[0];
    const src = cb.toString().substring(0, 200);

    // Try to access the renderLoop via the closure
    // We can't directly, but we can inspect the function's scope chain in some cases
    return { cbCount: cbs.length, cbSource: src };
  });
  console.log('RAF info:', JSON.stringify(rafInfo, null, 2));

  // Try a completely different approach: use CDP to access the JS context
  // and find the store via the runtime evaluation
  const cdpClient = await page.context().newCDPSession(page);

  // Evaluate in the main world to find all objects with getState method
  const findStoreViaCDP = await cdpClient.send('Runtime.evaluate', {
    expression: `
      (() => {
        // Search for Zustand store by looking at module-level variables
        // Vite exposes module graph via __vite__
        const vite = window.__vite__;
        if (vite) return 'vite found';

        // Try webpack/vite module registry
        for (const key of Object.keys(window)) {
          if (key.startsWith('webpackChunk') || key.startsWith('__vite_')) {
            return 'module system: ' + key;
          }
        }

        // Inspect the first RAF callback's closure
        const rls = window.__rafCallbacks;
        if (rls && rls.length > 0) {
          return 'RAF cb type: ' + typeof rls[0] + ', name: ' + rls[0].name;
        }
        return 'nothing found';
      })()
    `,
    returnByValue: true
  });
  console.log('CDP find store:', findStoreViaCDP.result?.value);

  // Try Vite's HMR module graph
  const viteModules = await cdpClient.send('Runtime.evaluate', {
    expression: `
      (() => {
        // Vite dev server injects __vite_plugin_react_preamble_installed__
        // and a module graph. Let's try to find zustand modules.
        const keys = [];
        // Check for importmap or module registry
        if (window.__vite_ssr_import__) keys.push('__vite_ssr_import__');
        if (window.__vite_plugin_react_preamble_installed__) keys.push('react_preamble');

        // In Vite dev mode, modules are loaded as ES module scripts
        // We can find them via document.querySelectorAll('script[type=module]')
        const scripts = document.querySelectorAll('script[type=module]');
        return {
          keys,
          scriptCount: scripts.length,
          viteKeys: Object.keys(window).filter(k => k.includes('vite')),
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Vite modules:', JSON.stringify(viteModules.result?.value, null, 2));

  // Final approach: use CDP's Runtime.globalLexicalScopeNames to find stores
  // Or use the page's JavaScript module by evaluating in module context

  // Actually the simplest: let's inject a script tag that imports the store
  const storeAccess = await page.evaluate(async () => {
    try {
      // Dynamic import of the store module
      const mod = await import('/src/store/armStore.js');
      if (mod && mod.useArmStore) {
        window.__armStore = mod.useArmStore;
        const state = mod.useArmStore.getState();
        return {
          found: true,
          nodeCount: state.nodePositions.length,
          mode: state.mode,
          status: state.status
        };
      }
      return { found: false, mod: Object.keys(mod || {}) };
    } catch(e) {
      return { error: e.message };
    }
  });
  console.log('Store via dynamic import:', JSON.stringify(storeAccess, null, 2));

  if (storeAccess.found) {
    console.log('\n*** Store accessed directly via dynamic import! ***');

    // Now we can manipulate the store to simulate drag
    await page.keyboard.press('Home');
    await page.waitForTimeout(1500);

    // Get initial state
    const initialState = await page.evaluate(() => {
      const state = window.__armStore.getState();
      return {
        nodes: state.nodePositions,
        mode: state.mode,
        rootRodIndex: state.rootRodIndex,
        jointLimit: state.jointLimit
      };
    });
    console.log('Initial state:', JSON.stringify(initialState));

    // Test: simulate IK by directly setting node positions
    // This bypasses the RenderLoop but tests the UI rendering
    // First, let's import the fabrik solver too
    const fabrikAccess = await page.evaluate(async () => {
      try {
        const mod = await import('/src/math/fabrik.js');
        window.__solveIK = mod.solveIK;
        window.__extractJointAngles = mod.extractJointAngles;
        return { found: true };
      } catch(e) {
        return { error: e.message };
      }
    });
    console.log('Fabrik access:', fabrikAccess);

    if (fabrikAccess.found) {
      // Now simulate the full drag pipeline
      console.log('\n=== SLOW DRAG SIMULATION ===');
      const SEG_LENS = [1.6, 1.6, 1.6, 1.6];
      let snapDetected = false;
      let prevAngles = null;
      let limitHitStep = null;

      for (let step = 0; step <= 60; step++) {
        const z = -step * 0.05;
        const dragTarget = { x: 3.2, y: 0, z };

        const result = await page.evaluate(({ z, step, SEG_LENS }) => {
          const store = window.__armStore.getState();
          const nodes = store.nodePositions;
          const JOINT_LIMIT = Math.PI * (100 / 180);

          const result = window.__solveIK(nodes, SEG_LENS, store.rootRodIndex, 4,
            { x: 3.2, y: 0, z }, store.mode, JOINT_LIMIT);

          // Update the store
          window.__armStore.setState({ nodePositions: result.nodes });

          const angles = window.__extractJointAngles(result.nodes, store.mode);
          const toDeg = r => (r * 180 / Math.PI).toFixed(1);

          return {
            angles: angles.map(toDeg),
            limitHits: result.limitHits,
            anyLimit: result.limitHits.some(Boolean)
          };
        }, { z, step, SEG_LENS });

        if (result.anyLimit && limitHitStep === null) {
          limitHitStep = step;
          console.log(`LIMIT HIT at step ${step} (z=${z.toFixed(2)}): angles=${JSON.stringify(result.angles)}`);
        }

        if (prevAngles && result.angles) {
          for (let j = 0; j < result.angles.length; j++) {
            const diff = Math.abs(parseFloat(result.angles[j]) - parseFloat(prevAngles[j]));
            if (diff > 80) {
              snapDetected = true;
              console.log(`SNAP at step ${step}, joint ${j}: ${prevAngles[j]}° -> ${result.angles[j]}° (diff ${diff.toFixed(1)}°)`);
            }
          }
        }
        prevAngles = result.angles;

        if (step % 15 === 0) {
          console.log(`Step ${step}/60: z=${z.toFixed(2)}, angles=[${result.angles.join(', ')}]°, limitHit=${result.anyLimit}`);
        }

        if (step === 30) {
          await page.screenshot({ path: 'd:/robo4/drag_mid.png' });
          console.log('Screenshot: mid slow drag');
        }

        await page.waitForTimeout(16);
      }

      await page.screenshot({ path: 'd:/robo4/drag_at_limit.png' });
      console.log('Screenshot: at/near limit');

      console.log(`\nSlow drag: snapDetected=${snapDetected}, limitHitAtStep=${limitHitStep}`);

      // Fast drag test
      console.log('\n=== FAST DRAG SIMULATION (with smoothing) ===');
      await page.keyboard.press('Home');
      await page.waitForTimeout(1500);

      // Simulate the LERP smoothing
      let smoothedZ = 0;
      const rawZ = -2.0; // mouse jumped 2 world units instantly
      const LERP = 0.18;
      const MAX_D = 0.042;

      const fastResult = await page.evaluate(async ({ rawZ, LERP, MAX_D, SEG_LENS }) => {
        const JOINT_LIMIT = Math.PI * (100 / 180);
        let smoothedZ = 0;
        const frameResults = [];

        for (let frame = 0; frame < 30; frame++) {
          // Smooth the target (one frame of smoothing)
          const dz = rawZ - smoothedZ;
          const dist = Math.abs(dz);
          if (dist > 1e-6) {
            const step = Math.min(dist * LERP, MAX_D);
            smoothedZ += (dz / dist) * step;
          }

          const store = window.__armStore.getState();
          const result = window.__solveIK(store.nodePositions, SEG_LENS, store.rootRodIndex, 4,
            { x: 3.2, y: 0, z: smoothedZ }, store.mode, JOINT_LIMIT);

          window.__armStore.setState({ nodePositions: result.nodes });

          const angles = window.__extractJointAngles(result.nodes, store.mode);
          const toDeg = r => (r * 180 / Math.PI).toFixed(1);
          frameResults.push({
            frame, smoothedZ: smoothedZ.toFixed(3), rawZ,
            lag: Math.abs(rawZ - smoothedZ).toFixed(3),
            angles: angles.map(toDeg)
          });

          await new Promise(r => setTimeout(r, 16));
        }

        return frameResults;
      }, { rawZ, LERP, MAX_D, SEG_LENS });

      // Print first 10 and last 5
      const printFrames = [...fastResult.slice(0, 8), ...fastResult.slice(-3)];
      console.log('Fast drag (mouse jumped to z=-2.0 instantly):');
      for (const f of printFrames) {
        console.log(`  Frame ${f.frame}: smoothZ=${f.smoothedZ}, lag=${f.lag}, angles=[${f.angles.join(', ')}]°`);
      }

      await page.screenshot({ path: 'd:/robo4/drag_fast.png' });
      console.log('Screenshot: fast drag (several frames after)');

      const firstLag = parseFloat(fastResult[0].lag);
      const lastLag = parseFloat(fastResult[fastResult.length - 1].lag);
      console.log(`\nFast drag: initial lag=${firstLag.toFixed(3)}, final lag=${lastLag.toFixed(3)}`);
      console.log('Damping confirmed:', firstLag > 0.03 ? 'YES' : 'NO');

      console.log('\n=== FINAL SUMMARY ===');
      console.log('Snap/flip during slow drag:', snapDetected ? 'YES (BUG!)' : 'NO (good)');
      console.log('Joint limit hit during slow drag:', limitHitStep !== null ? `YES at step ${limitHitStep}` : 'Not hit in 60 steps');
      console.log('Drag damping visible:', firstLag > 0.03 ? 'YES - arm lags behind fast mouse' : 'NO');
    }
  }

  await page.waitForTimeout(1500);
  await browser.close();
})();
