const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Press Home to reset
  await page.keyboard.press('Home');
  await page.waitForTimeout(1000);

  // Find the canvas/3D viewport and identify the end-cap
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    }
    return null;
  });
  console.log('Canvas info:', JSON.stringify(canvasInfo));

  // The arm appears horizontally centered, end-cap on the right at ~x=1110
  // Let's screenshot with mouse highlighted to identify exact position
  // First move mouse to different positions and check

  // From screenshot: arm appears at y~440, right golden cube at ~x=1110
  // But drag didn't register. The issue might be the canvas not receiving pointer events
  // or the mousedown needs to be on the exact cube pixel.

  // Let's try clicking on the canvas first
  const canvas = await page.$('canvas');
  if (canvas) {
    const box = await canvas.boundingBox();
    console.log('Canvas box:', JSON.stringify(box));

    // The arm from screenshot: spans roughly from x=590 to x=1110 in viewport
    // Right golden cube end-cap: approximately x=1100, y=440
    // Let's try a few different y positions around 440

    // Check if pointer events work on canvas
    const pointerEventsStyle = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        return getComputedStyle(canvas).pointerEvents;
      }
      return 'not found';
    });
    console.log('Canvas pointer-events:', pointerEventsStyle);
  }

  // Try to drag from right end of arm
  // Arm appears centered in viewport (340px panel + ~530px canvas width = arm at 340 + (viewport_width-340)/2)
  // From screenshot the right golden cube looks to be at x~1100, y~440

  // Let's try pointerdown + move + pointerup directly on canvas coordinates
  const startX = 1100;
  const startY = 440;

  // Move to position first, then click and drag
  await page.mouse.move(startX, startY);
  await page.waitForTimeout(200);

  // Try pointer events
  await page.dispatchEvent('canvas', 'pointerdown', { button: 0, clientX: startX, clientY: startY });

  // Actually, let's just try mousedown on the page
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(200);

  // Check if any drag started by looking at joint angles
  const anglesAfterClick = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('*'))
      .filter(el => el.children.length === 0 && /[+-]\d+\.\d+°/.test(el.textContent.trim()))
      .map(el => ({ text: el.textContent.trim(), cls: el.className }));
    return texts;
  });
  console.log('Angles after click:', JSON.stringify(anglesAfterClick));

  // Try dragging up slowly
  for (let i = 0; i <= 20; i++) {
    const y = startY - (150 * i / 20);
    await page.mouse.move(startX, y);
    await page.waitForTimeout(50);
  }

  // Check angles after drag
  const anglesAfterDrag = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('*'))
      .filter(el => el.children.length === 0 && /[+-]?\d+\.?\d*°/.test(el.textContent.trim()))
      .map(el => ({ text: el.textContent.trim(), cls: typeof el.className === 'string' ? el.className.substring(0, 50) : '' }));
    return texts.slice(0, 10);
  });
  console.log('Angles after drag:', JSON.stringify(anglesAfterDrag));

  await page.screenshot({ path: 'd:/robo4/screenshot_drag_test.png' });
  console.log('Screenshot taken after drag test');

  await page.mouse.up();

  // Now try clicking different positions to find where the arm is
  // First reset
  await page.keyboard.press('Home');
  await page.waitForTimeout(1000);

  // The viewport is 1400 wide, panel is 340px, so 3D area is 1060px wide
  // Center of 3D area = 340 + 530 = 870px
  // Right end of arm: if arm is at 85.7% reach with length ~3.2 units
  // This is hard to calculate without knowing scale

  // From screenshot the right golden cube appears to be at approximately x=1105, y=442
  // Let's try to find clickable elements with specific mouse tracking
  await page.evaluate(() => {
    window._lastMousePos = { x: 0, y: 0 };
    window._events = [];
    document.addEventListener('mousedown', (e) => {
      window._events.push({ type: 'mousedown', x: e.clientX, y: e.clientY, target: e.target.tagName + '.' + e.target.className });
    });
    document.addEventListener('pointermove', (e) => {
      window._lastMousePos = { x: e.clientX, y: e.clientY };
    });
  });

  // Try clicking right on the cube
  await page.mouse.click(1105, 442);
  await page.waitForTimeout(100);

  const events1 = await page.evaluate(() => window._events);
  console.log('Events after click at 1105, 442:', JSON.stringify(events1));

  // Try dragging from x=1105, y=442 upward significantly
  await page.mouse.move(1105, 442);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Slow drag up 200px
  for (let i = 0; i <= 40; i++) {
    await page.mouse.move(1105, 442 - (200 * i / 40));
    await page.waitForTimeout(30);
  }

  const jointAnglesAfterDrag2 = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0) {
        const t = el.textContent.trim();
        if (/^[+-]?\d+\.\d+°$/.test(t)) {
          items.push(t);
        }
      }
    });
    return items;
  });
  console.log('Joint angles after drag 2:', JSON.stringify(jointAnglesAfterDrag2));

  await page.screenshot({ path: 'd:/robo4/screenshot_drag_test2.png' });
  console.log('Screenshot 2 taken');

  await page.mouse.up();
  await browser.close();
})();
