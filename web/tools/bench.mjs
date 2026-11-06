// Average frame time per chapter. There is no GPU in headless Chrome, so this
// runs on a software renderer: compare runs with each other, don't read the
// numbers as what a real graphics card would do.
//   node tools/bench.mjs <url> [chapter ...]
import puppeteer from 'puppeteer-core';

const [url = 'http://127.0.0.1:5173/?snap=1', ...only] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  protocolTimeout: 240000,
});
const page = await browser.newPage();
await page.setViewport({ width: +(process.env.W ?? 1280), height: +(process.env.H ?? 720), deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__beachboy && window.__beachboy.ready', { timeout: 120000 });
await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
const stops = await page.evaluate(() =>
  [...document.querySelectorAll('section[data-ch]:not([hidden])')].map((s) => {
    const r = s.getBoundingClientRect();
    return { ch: s.dataset.ch, y: Math.max(0, r.top + scrollY + r.height / 2 - innerHeight / 2) };
  }),
);
for (const s of stops) {
  if (only.length && !only.includes(s.ch)) continue;
  await page.evaluate((y) => scrollTo(0, y), s.y);
  await new Promise((r) => setTimeout(r, 2500));
  const ms = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          const t = performance.now() - t0;
          if (t > 6000) res(t / n);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  const info = await page.evaluate(() => window.__beachboy.stats?.() ?? null);
  console.log(s.ch.padEnd(10), `${ms.toFixed(0)} ms/frame`.padEnd(16), info ? JSON.stringify(info) : '');
}
await browser.close();
