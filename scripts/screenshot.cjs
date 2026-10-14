const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createServer } = require('./preview.cjs');

async function main() {
  let playwright;
  try {
    playwright = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  } catch {
    throw new Error('Set PLAYWRIGHT_MODULE_PATH to an installed Playwright module before running npm run screenshot.');
  }
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    const button = page.locator('#increment-button');
    const counter = page.locator('#current-counter');
    await button.waitFor();
    await page.waitForFunction(() => !document.getElementById('increment-button').disabled);
    assert.equal((await counter.textContent()).trim(), '0');
    await button.evaluate(element => { element.click(); element.click(); });
    await page.waitForFunction(() => !document.getElementById('increment-button').disabled);
    assert.equal((await counter.textContent()).trim(), '1', 'Double click must add only once');
    await page.evaluate(() => window.__counterDemo.failNext());
    await button.click();
    await page.locator('#counter-status[data-state="error"]').waitFor();
    assert.equal(await button.isDisabled(), true, 'Unconfirmed write must block further increments');
    assert.equal((await counter.textContent()).trim(), '1', 'Failed request must preserve count');
    assert.match(await page.locator('#counter-status').textContent(), /coba|gagal|error|terputus/i);
    await page.locator('#refresh-button').click();
    await page.waitForFunction(() => !document.getElementById('increment-button').disabled);
    assert.equal((await counter.textContent()).trim(), '1', 'Refresh must confirm existing count');
    await button.click();
    await page.waitForFunction(() => !document.getElementById('increment-button').disabled);
    assert.equal((await counter.textContent()).trim(), '2', 'Retry must recover');
    await button.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('increment-button').disabled);
    assert.equal((await counter.textContent()).trim(), '3', 'Keyboard activation must increment');
    const output = path.join(__dirname, '..', 'docs', 'images', 'counter-demo.png');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.screenshot({ path: output, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile view must fit width');
    assert.deepEqual(pageErrors, [], 'Browser must have no uncaught errors');
    await page.screenshot({ path: output.replace('.png', '-mobile.png'), fullPage: true });
    console.log(output);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
