import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  locale: 'en-NZ',
  timezoneId: 'Pacific/Auckland',
});
const page = await context.newPage();

const captured = [];
page.on('response', async res => {
  const url = res.url();
  if (url.includes('/api/') && !url.includes('/api/data/search') && !url.includes('searchFilters')) {
    let body = null;
    try { body = await res.text(); } catch {}
    captured.push({ method: res.request().method(), url, status: res.status(), size: body ? body.length : 0, bodyPreview: body ? body.substring(0, 800) : null });
  }
});

await page.goto('https://hansard.parliament.nz/hansard-transcript/2026-08-20', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(12000);
console.log('TITLE:', await page.title());

console.log('\nAPI CALLS ON TRANSCRIPT PAGE:');
captured.forEach(c => console.log(`  ${c.method} ${c.url} (${c.status}, ${c.size} bytes)`));

// find the biggest response - likely the transcript content
const biggest = [...captured].sort((a, b) => b.size - a.size)[0];
if (biggest) {
  console.log('\nBIGGEST RESPONSE:', biggest.url);
  console.log(biggest.bodyPreview);
}

// also check visible text on transcript page
const text = await page.$eval('body', el => el.innerText.substring(0, 1200)).catch(() => '');
console.log('\nPAGE TEXT PREVIEW:\n', text);

await browser.close();
