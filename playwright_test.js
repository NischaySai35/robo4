const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  console.log('Navigating to http://localhost:5179...');
  await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Screenshot 1: Initial state
  await page.screenshot({ path: 'd:/robo4/screenshot_1_initial.png', fullPage: false });
  console.log('Screenshot 1 taken: initial state');

  // Check panel width and font sizes via CSS
  const panelInfo = await page.evaluate(() => {
    const panel = document.querySelector('.left-panel, [class*="panel"], aside, .sidebar');
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const panelW = styles.getPropertyValue('--panel-w').trim();

    // Try to find joint stat text and label elements
    const statTexts = document.querySelectorAll('[class*="stat"], [class*="joint"], [class*="value"]');
    let statFontSize = null;
    let labelFontSize = null;

    if (statTexts.length > 0) {
      statFontSize = getComputedStyle(statTexts[0]).fontSize;
    }

    const labels = document.querySelectorAll('[class*="label"]');
    if (labels.length > 0) {
      labelFontSize = getComputedStyle(labels[0]).fontSize;
    }

    // Get actual panel element width
    let panelWidth = null;
    const panelEl = document.querySelector('.left-panel') ||
                    document.querySelector('[class*="LeftPanel"]') ||
                    document.querySelector('aside') ||
                    document.querySelector('.panel');
    if (panelEl) {
      panelWidth = panelEl.getBoundingClientRect().width;
    }

    return { panelW, statFontSize, labelFontSize, panelWidth, numStatTexts: statTexts.length, numLabels: labels.length };
  });
  console.log('Panel info:', JSON.stringify(panelInfo, null, 2));

  // Try to find the CSS variables more broadly
  const cssVars = await page.evaluate(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const vars = {};
    // Check common variable names
    ['--panel-w', '--panel-width', '--sidebar-width', '--left-panel-width'].forEach(v => {
      vars[v] = styles.getPropertyValue(v).trim();
    });
    return vars;
  });
  console.log('CSS vars:', JSON.stringify(cssVars));

  // Check left panel actual width by finding first major column
  const layoutInfo = await page.evaluate(() => {
    const els = document.querySelectorAll('*');
    const panels = [];
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.x < 10 && rect.width > 200 && rect.width < 500 && rect.height > 400) {
        const cls = el.className;
        const tag = el.tagName;
        panels.push({ tag, cls: typeof cls === 'string' ? cls.substring(0, 80) : '', width: rect.width, height: rect.height });
        if (panels.length >= 5) break;
      }
    }
    return panels;
  });
  console.log('Potential left panels:', JSON.stringify(layoutInfo, null, 2));

  // Find joint stat elements more broadly
  const fontInfo = await page.evaluate(() => {
    // Look for elements with numeric content that could be joint values
    const allEls = Array.from(document.querySelectorAll('*'));
    const results = [];
    for (const el of allEls) {
      if (el.children.length === 0 && el.textContent.trim()) {
        const rect = el.getBoundingClientRect();
        const fs = getComputedStyle(el).fontSize;
        const text = el.textContent.trim();
        // Look for elements in the left panel area with small font sizes
        if (rect.x < 400 && rect.width > 20 && rect.height > 5 && rect.height < 30) {
          const fsPx = parseFloat(fs);
          if (fsPx >= 10 && fsPx <= 16) {
            results.push({ text: text.substring(0, 30), fs, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width) });
          }
        }
      }
    }
    return results.slice(0, 20);
  });
  console.log('Font elements in left area:', JSON.stringify(fontInfo, null, 2));

  // Now let's do the slow drag test
  // First, let's find the end-cap (golden cube) approximately at x=1110, y=440
  // Try pressing HOME key first to reset
  await page.keyboard.press('Home');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'd:/robo4/screenshot_2_after_home.png', fullPage: false });
  console.log('Screenshot 2 taken: after HOME key');

  // Slow drag upward: x=1110, y=440, move up 300px over 60 steps
  const startX = 1110;
  const startY = 440;
  const endY = startY - 300;
  const steps = 60;

  console.log('Starting slow drag test (60 steps, 300px up)...');
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);

  let flipped = false;
  for (let i = 0; i <= steps; i++) {
    const y = startY - (300 * i / steps);
    await page.mouse.move(startX, y);
    await page.waitForTimeout(30); // slow

    if (i === 30) {
      // mid-drag screenshot
      await page.screenshot({ path: 'd:/robo4/screenshot_3_mid_slow_drag.png', fullPage: false });
      console.log('Screenshot 3 taken: mid slow drag');
    }
  }

  await page.screenshot({ path: 'd:/robo4/screenshot_4_at_limit.png', fullPage: false });
  console.log('Screenshot 4 taken: at limit after slow drag');
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Reset
  await page.keyboard.press('Home');
  await page.waitForTimeout(1000);

  // Fast drag test: 200px in 3 steps
  console.log('Starting fast drag test (3 steps, 200px up)...');
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(50);

  // 3 fast steps
  await page.mouse.move(startX, startY - 66);
  await page.waitForTimeout(20);
  await page.mouse.move(startX, startY - 133);
  await page.waitForTimeout(20);
  await page.mouse.move(startX, startY - 200);
  await page.waitForTimeout(20);

  await page.screenshot({ path: 'd:/robo4/screenshot_5_fast_drag.png', fullPage: false });
  console.log('Screenshot 5 taken: fast drag');

  await page.mouse.up();
  await page.waitForTimeout(500);

  console.log('All tests complete.');
  await browser.close();
})();
