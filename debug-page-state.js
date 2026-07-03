const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:8866', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check what's actually on the page
  const titleVisible = await page.locator('#title').isVisible();
  console.log('Title visible:', titleVisible);

  const enterVisible = await page.locator('#enter').isVisible();
  console.log('Enter button visible:', enterVisible);

  const modeSelectorVisible = await page.locator('#modeSelector').isVisible();
  console.log('Mode selector visible:', modeSelectorVisible);

  // Get all visible buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(btn => ({
      id: btn.id,
      class: btn.className,
      text: btn.textContent.trim().substring(0, 50),
      visible: btn.offsetParent !== null
    }));
  });
  console.log('Buttons on page:', JSON.stringify(buttons, null, 2));

  // Check for mode cards
  const modeCards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.mode-card')).map(card => ({
      mode: card.dataset.mode,
      visible: card.offsetParent !== null
    }));
  });
  console.log('Mode cards:', JSON.stringify(modeCards, null, 2));

  await browser.close();
})();
