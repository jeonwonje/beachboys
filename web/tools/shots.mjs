// Screenshots the page at each chapter, to check the 3D by eye.
//   node tools/shots.mjs <url> <outDir> [width] [height] [chapter ...]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const [url = 'http://127.0.0.1:5173/', out = 'shots', w = '1400', h = '860', ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  protocolTimeout: 240000,
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type()) && !/GPU stall|swiftshader|ReadPixels/i.test(m.text())) errors.push(`${m.type()}: ${m.text()}`);
});
page.on('requestfailed', (r) => errors.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
await page.goto(url, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__beachboy && window.__beachboy.ready', { timeout: 180000 });
await new Promise((r) => setTimeout(r, 1500));

const stops = await page.evaluate(() =>
  [...document.querySelectorAll('section[data-ch]')].map((s) => {
    const r = s.getBoundingClientRect();
    return { ch: s.dataset.ch, y: Math.max(0, r.top + scrollY + r.height / 2 - innerHeight / 2) };
  }),
);
await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
for (const s of stops) {
  if (only.length && !only.includes(s.ch)) continue;
  await page.evaluate((y) => scrollTo(0, y), s.y);
  await new Promise((r) => setTimeout(r, 4500));
  await page.screenshot({ path: `${out}/${s.ch}.jpg`, type: 'jpeg', quality: 80 });
  console.log('shot', s.ch, Math.round(s.y));
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log('horizontal overflow px:', overflow);
console.log(errors.length ? `ISSUES\n${[...new Set(errors)].join('\n')}` : 'no console errors');
await browser.close();
