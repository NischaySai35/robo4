const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // non-headless to see actual rendering
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Screenshot initial state
  await page.screenshot({ path: 'd:/robo4/ss_initial.png' });
  console.log('Initial screenshot taken');

  // Check CSS var and font sizes
  const cssData = await page.evaluate(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const panelW = cs.getPropertyValue('--panel-w').trim();

    // Find stat-val (joint angle values) font size
    const statVals = document.querySelectorAll('.stat-val');
    let statValFs = null;
    if (statVals.length > 0) statValFs = getComputedStyle(statVals[0]).fontSize;

    // Find joint labels
    const jointLabels = document.querySelectorAll('.joint-name, .stat-label, [class*="label"]');
    let labelFs = null;
    for (const el of jointLabels) {
      const fs = getComputedStyle(el).fontSize;
      const fsPx = parseFloat(fs);
      if (fsPx >= 10 && fsPx <= 14) {
        labelFs = fs;
        break;
      }
    }

    // Panel actual width
    const panel = document.querySelector('.left-panel');
    const panelWidth = panel ? panel.getBoundingClientRect().width : null;

    return { panelW, statValFs, labelFs, panelWidth };
  });
  console.log('CSS data:', JSON.stringify(cssData));

  // Press Home first
  await page.keyboard.press('Home');
  await page.waitForTimeout(1500);

  // Inject hook to detect drag activity
  const dragResult = await page.evaluate(() => {
    // Check if there are any pointer/mouse event listeners on the canvas
    const canvas = document.querySelector('canvas');
    return {
      hasCanvas: !!canvas,
      canvasListeners: canvas ? 'check devtools' : 'no canvas'
    };
  });
  console.log('Drag result:', dragResult);

  // Try clicking different positions along the arm to find a draggable element
  // From screenshot: arm spans from about x=590 to x=1110
  // Let's try x=1095 (right end-cap), y=440

  // Monitor angle changes during drag
  const monitorAngles = async () => {
    return await page.evaluate(() => {
      const vals = Array.from(document.querySelectorAll('.stat-val'));
      return vals.map(v => v.textContent.trim()).slice(0, 3);
    });
  };

  // Try multiple x positions for the right cube end-cap
  const testPositions = [
    { x: 1095, y: 440, label: 'right end-cap area' },
    { x: 1070, y: 440, label: 'slightly left of right end' },
    { x: 975, y: 440, label: 'joint 3' },
    { x: 845, y: 440, label: 'center/joint 2' },
    { x: 730, y: 440, label: 'joint 1' },
  ];

  for (const pos of testPositions) {
    await page.keyboard.press('Home');
    await page.waitForTimeout(800);

    const before = await monitorAngles();

    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(pos.x, pos.y - 50);
    await page.waitForTimeout(100);
    await page.mouse.move(pos.x, pos.y - 100);
    await page.waitForTimeout(100);

    const after = await monitorAngles();
    await page.mouse.up();
    await page.waitForTimeout(200);

    const changed = JSON.stringify(before) !== JSON.stringify(after);
    console.log(`Position ${pos.label} (${pos.x}, ${pos.y}): before=${JSON.stringify(before)}, after=${JSON.stringify(after)}, CHANGED=${changed}`);

    if (changed) {
      console.log('FOUND DRAGGABLE POSITION!');
      break;
    }
  }

  // One more attempt: check the actual Three.js scene objects via window
  const sceneInfo = await page.evaluate(() => {
    // Look for Three.js or React Three Fiber globals
    const keys = Object.keys(window).filter(k =>
      k.includes('three') || k.includes('Three') || k.includes('fiber') ||
      k.includes('scene') || k.includes('robot') || k.includes('arm')
    );
    return keys.slice(0, 20);
  });
  console.log('Window keys related to 3D:', sceneInfo);

  // Now run the proper slow drag test
  await page.keyboard.press('Home');
  await page.waitForTimeout(1000);

  // Use the right end-cap at x=1095, y=440 (most likely position from screenshot)
  const eX = 1095, eY = 440;

  console.log('\n--- SLOW DRAG TEST (60 steps, 300px upward) ---');
  await page.mouse.move(eX, eY);
  await page.mouse.down();

  let prevAngles = await monitorAngles();
  let flipped = false;
  let snapDetected = false;

  for (let i = 0; i <= 60; i++) {
    const y = eY - (300 * i / 60);
    await page.mouse.move(eX, y);
    await page.waitForTimeout(30);

    if (i % 10 === 0) {
      const angles = await monitorAngles();
      console.log(`Step ${i}/60, y=${Math.round(y)}: angles=${JSON.stringify(angles)}`);

      // Detect snap: large instant change
      if (prevAngles.length > 0 && angles.length > 0) {
        const prevVal = parseFloat(prevAngles[0].replace(/[^0-9.-]/g, ''));
        const currVal = parseFloat(angles[0].replace(/[^0-9.-]/g, ''));
        if (Math.abs(currVal - prevVal) > 90) {
          snapDetected = true;
          console.log(`SNAP/FLIP DETECTED at step ${i}: ${prevAngles[0]} -> ${angles[0]}`);
        }
      }
      prevAngles = angles;
    }
  }

  await page.screenshot({ path: 'd:/robo4/ss_at_limit.png' });
  console.log('Screenshot at limit taken');
  const limitAngles = await monitorAngles();
  console.log('Angles at limit:', limitAngles);

  await page.mouse.up();
  await page.waitForTimeout(500);

  // Fast drag test
  await page.keyboard.press('Home');
  await page.waitForTimeout(1000);

  console.log('\n--- FAST DRAG TEST (200px, 4 steps) ---');
  await page.mouse.move(eX, eY);
  await page.mouse.down();
  await page.waitForTimeout(50);

  const beforeFast = await monitorAngles();
  await page.mouse.move(eX, eY - 50, { steps: 1 });
  await page.waitForTimeout(30);
  await page.mouse.move(eX, eY - 100, { steps: 1 });
  await page.waitForTimeout(30);
  await page.mouse.move(eX, eY - 150, { steps: 1 });
  await page.waitForTimeout(30);
  await page.mouse.move(eX, eY - 200, { steps: 1 });
  await page.waitForTimeout(100);

  const afterFast = await monitorAngles();
  await page.screenshot({ path: 'd:/robo4/ss_fast_drag.png' });
  console.log('Fast drag screenshot taken');
  console.log('Before fast drag:', beforeFast);
  console.log('After fast drag:', afterFast);
  console.log('Snap detected during slow drag:', snapDetected);

  await page.mouse.up();

  console.log('\n=== SUMMARY ===');
  console.log('Panel width:', cssData.panelWidth, '(expected 340)');
  console.log('Stat value font size:', cssData.statValFs, '(expected 14px)');
  console.log('Label font size:', cssData.labelFs, '(expected 12px)');
  console.log('Snap/flip detected:', snapDetected);
  console.log('Angles at limit:', limitAngles);

  await page.waitForTimeout(2000);
  await browser.close();
})();
