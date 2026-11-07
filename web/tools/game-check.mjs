// Plays the driving game in a headless browser, to check its rules and its look.
//   node tools/game-check.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const [url = 'http://127.0.0.1:5173/game.html?test&seed=7', out = 'shots-game'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  protocolTimeout: 400000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 860, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type()) && !/GPU stall|swiftshader|ReadPixels/i.test(m.text())) errors.push(`${m.type()}: ${m.text()}`);
});
page.on('requestfailed', (r) => errors.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
await page.goto(url, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction('window.__gameReady && window.__game', { timeout: 180000 });
const shot = async (name) => {
  await page.evaluate(() => window.__game.draw());
  await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 82 });
};
if (process.env.KEYS) {
  // Real keys and the real clock, through the same paths a player uses.
  const read = () => page.evaluate(() => {
    const { G, v } = window.__game;
    return { mode: G.mode, time: +G.time.toFixed(2), x: +v.x.toFixed(2), z: +v.z.toFixed(2), theta: +v.theta.toFixed(2), vf: +v.vf.toFixed(2) };
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  console.log('menu', JSON.stringify(await read()), 'button:', await page.$eval('#startBtn', (b) => b.textContent));
  await page.click('#startBtn');
  await wait(300);
  console.log('started', JSON.stringify(await read()), 'hud hidden:', await page.$eval('#hud', (e) => e.hidden));
  await page.keyboard.down('KeyW');
  await wait(3000);
  console.log('W held', JSON.stringify(await read()));
  await page.keyboard.down('KeyA');
  await wait(1500);
  console.log('W+A held', JSON.stringify(await read()));
  await page.keyboard.up('KeyA');
  await page.keyboard.down('Space');
  await wait(400);
  console.log('Space held', JSON.stringify(await read()));
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyP');
  const paused = await read();
  await wait(1000);
  const still = await read();
  console.log('paused', paused.mode, 'clock stopped:', paused.time === still.time, 'sheet hidden:', await page.$eval('#pause', (e) => e.hidden));
  await page.keyboard.press('KeyP');
  await wait(400);
  console.log('resumed', JSON.stringify(await read()));
  await page.keyboard.press('KeyC');
  await page.keyboard.press('KeyM');
  await wait(300);
  console.log('toast:', await page.$eval('#toast', (e) => e.textContent), '| camera', await page.evaluate(() => window.__game.G.cam));
  console.log(errors.length ? `ISSUES\n${[...new Set(errors)].join('\n')}` : 'no console errors');
  await browser.close();
  process.exit(0);
}
await page.evaluate(() => window.__game.freeze());
await shot('menu');

// A driver that plays by the rules of the game.
await page.evaluate(() => {
  const g = window.__game;
  const near = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  window.__botDt = 1 / 60;
  window.__bot = (careful) => {
    const { v, items, STATIONS, G, colliders } = g;
    const full = items.bin.length + items.onBelt >= 16;
    let tx;
    let tz;
    let slow = false;
    if (full) {
      const s = STATIONS.reduce((a, b) => (Math.hypot(a.x - v.x, a.z - v.z) < Math.hypot(b.x - v.x, b.z - v.z) ? a : b));
      tx = s.x;
      tz = s.z + 1.6;
      if (Math.hypot(s.x - v.x, s.z - v.z) < s.r + 0.7 || items.bin.length === 0) return (g.steer({ throttle: 0, steer: 0, estop: false }), null);
    } else {
      let best = null;
      let bestScore = 1e9;
      for (const it of items.list) {
        if (it.state !== 'ground' || it.lock > 0 || it.skip > G.time) continue;
        // Wet band first, because the tide takes it.
        const d = Math.hypot(it.x - v.x, it.z - v.z) - (it.wetBand ? 9 : 0);
        if (d < bestScore) {
          bestScore = d;
          best = it;
        }
      }
      if (!best) return g.steer({ throttle: 0, steer: 0, estop: false });
      window.__target = best;
      tx = best.x - Math.cos(v.theta) * 0.9;
      tz = best.z + Math.sin(v.theta) * 0.9;
      slow = best.long && Math.hypot(best.x - v.x, best.z - v.z) < 4;
    }
    let want = Math.atan2(-(tz - v.z), tx - v.x);
    if (careful && items.onBelt > 0 && items.list.some((i) => i.state === 'belt' && i.u < 0.42) && v.wet > 0.05) {
      // Debris on the climb: point straight down the slope until it is safe.
      const toSea = -Math.PI / 2;
      const toLand = Math.PI / 2;
      want = Math.abs(near(toSea, v.theta)) < Math.abs(near(toLand, v.theta)) ? toSea : toLand;
    }
    // Steer around whatever is ahead.
    const err0 = (c) => near(Math.atan2(-(c.z - v.z), c.x - v.x), v.theta);
    const ax = v.x + Math.cos(v.theta) * 2;
    const az = v.z - Math.sin(v.theta) * 2;
    for (const c of colliders) {
      if (Math.hypot(c.x - ax, c.z - az) < c.r + 0.8 && Math.abs(err0(c)) < 1.2) want += near(Math.atan2(-(c.z - v.z), c.x - v.x), want) > 0 ? -1.1 : 1.1;
    }
    const err = near(want, v.theta);
    let throttle = Math.abs(err) > 0.75 ? 0.1 : slow ? 0.45 : v.wet > 0.25 ? 0.6 : 1;
    if (v.jam) throttle = -1;
    if (v.load > 0.6) throttle = 0.3;
    // No progress for a while: back away, and skip this target for a time.
    g.watch ??= { x: v.x, z: v.z, t: 0, backing: 0, stucks: 0 };
    const w = g.watch;
    w.t += window.__botDt;
    if (w.t > 1.6) {
      if (Math.hypot(v.x - w.x, v.z - w.z) < 0.6 && (!full || items.bin.length === 16)) {
        w.backing = 0.9;
        w.stucks++;
        const nearest = colliders.reduce((a, c) => (Math.hypot(c.x - v.x, c.z - v.z) - c.r < Math.hypot(a.x - v.x, a.z - v.z) - a.r ? c : a), { x: 1e6, z: 1e6, r: 0 });
        (w.log ??= []).push([+v.x.toFixed(1), +v.z.toFixed(1), +G.time.toFixed(0), +(Math.hypot(nearest.x - v.x, nearest.z - v.z) - nearest.r).toFixed(2), full ? 'full' : 'seek', window.__target ? [+window.__target.x.toFixed(1), +window.__target.z.toFixed(1)] : 0]);
        if (window.__target) window.__target.skip = G.time + 8;
      }
      Object.assign(w, { x: v.x, z: v.z, t: 0 });
    }
    if (w.backing > 0) {
      w.backing -= window.__botDt;
      return g.steer({ throttle: -1, steer: w.stucks % 2 ? 0.8 : -0.8, estop: false });
    }
    g.steer({ throttle, steer: Math.max(-1, Math.min(1, err * 3)), estop: false });
  };
});

if (process.env.REACH) {
// With no obstacles, this driver shows whether the target is within reach at all.
for (const seed of [11, 23, 42]) {
  const r = await page.evaluate((seed) => {
    const g = window.__game;
    const saved = g.colliders.splice(0);
    g.G.seed = seed;
    g.begin();
    window.__botDt = 1 / 30;
    g.watch = null;
    g.run(180, 1 / 30, () => window.__bot(true));
    const t = g.items.tally();
    g.colliders.push(...saved);
    return { seed, rate: +((t.banked / t.total) * 100).toFixed(1), wet: `${t.wetDone}/${t.wet}`, dry: `${t.dryDone}/${t.dry}`, spills: g.G.spills, jams: g.G.jams, stucks: g.watch?.stucks };
  }, seed);
  console.log('no obstacles', JSON.stringify(r));
}
await page.evaluate(() => {
  window.__game.G.seed = 7;
  window.__botDt = 1 / 60;
});

  await browser.close();
  process.exit(0);
}

// Round 1: careful driver, with screenshots along the way.
const summary = () =>
  page.evaluate(() => {
    const g = window.__game;
    const t = g.items.tally();
    const { G, v } = g;
    return { mode: G.mode, time: +G.time.toFixed(1), shore: +G.shore.toFixed(2), got: t.banked, wet: `${t.wetDone}/${t.wet}`, dry: `${t.dryDone}/${t.dry}`, lost: t.lost, bin: g.items.bin.length, spills: G.spills, jams: G.jams, tows: G.tows, roll: +(v.roll * 57.3).toFixed(1), pos: [+v.x.toFixed(1), +v.z.toFixed(1)] };
  });
await page.evaluate(() => window.__game.begin());
await page.evaluate(() => window.__game.run(0.2));
await shot('start');
const stops = [30, 90, 180];
let last = 0;
for (const at of stops) {
  await page.evaluate((s) => window.__game.run(s, 1 / 60, () => window.__bot(true)), at - last);
  last = at;
  console.log('careful', at, JSON.stringify(await summary()));
  await shot(`t${at}`);
}
await page.evaluate(() => window.__game.G.mode === 'play' && window.__game.run(10, 1 / 60, () => window.__game.steer({ throttle: 0, steer: 0, estop: false })));
console.log('careful end', JSON.stringify(await summary()));
await shot('end');
console.log('end text:', await page.evaluate(() => [...document.querySelectorAll('#end .kicker,#endTitle,#endLine,#endDry,#endWet,#endStats')].map((e) => e.textContent).join(' | ')));

// More rounds on other beaches, to measure how hard the game is.
for (const seed of [11, 23, 42]) {
  const r = await page.evaluate((seed) => {
    const g = window.__game;
    g.G.seed = seed;
    g.begin();
    window.__botDt = 1 / 30;
    g.watch = null;
    g.run(180, 1 / 30, () => window.__bot(true));
    const t = g.items.tally();
    return { seed, rate: +((t.banked / t.total) * 100).toFixed(1), wet: `${t.wetDone}/${t.wet}`, dry: `${t.dryDone}/${t.dry}`, lost: t.lost, spills: g.G.spills, jams: g.G.jams, stucks: g.watch?.stucks, time: +g.G.time.toFixed(0) };
  }, seed);
  console.log('round', JSON.stringify(r));
}
await page.evaluate(() => {
  window.__game.G.seed = 7;
  window.__botDt = 1 / 60;
});

// Round 2: drives along the shore, to prove the cross-slope matters.
await page.evaluate(() => {
  const g = window.__game;
  g.begin();
  g.v.place(-30, 5, 0);
  g.steer({ throttle: 0.55, steer: 0, estop: false });
  g.run(4);
  for (const it of g.items.list.slice(0, 4)) {
    it.x = g.v.x + 2 + Math.random();
    it.z = g.v.z;
    it.long = false;
  }
  g.run(4);
});
console.log('along shore', JSON.stringify(await summary()));
await shot('spill');

// Round 3: full speed on wet sand, to prove a jam happens and reversing clears it.
const jam = await page.evaluate(() => {
  const g = window.__game;
  g.begin();
  g.v.place(-35, 7, 0);
  g.steer({ throttle: 1, steer: 0, estop: false });
  let t = 0;
  while (!g.v.jam && t < 14) {
    g.run(0.1);
    t += 0.1;
  }
  const out = { jammedAfter: +t.toFixed(1), why: g.v.jam, load: g.v.load };
  g.steer({ throttle: 1, steer: 0, estop: false });
  g.run(1);
  out.speedWhileJammed = +g.v.vf.toFixed(2);
  out.fold = +g.v.fold.toFixed(2);
  return out;
});
console.log('jam', JSON.stringify(jam));
await shot('jam');
const cleared = await page.evaluate(() => {
  const g = window.__game;
  g.steer({ throttle: -1, steer: 0, estop: false });
  g.run(1.1);
  return { jam: g.v.jam, vf: +g.v.vf.toFixed(2) };
});
console.log('after reversing', JSON.stringify(cleared));

// Emergency stop, and a drive into the sea.
const other = await page.evaluate(() => {
  const g = window.__game;
  g.begin();
  g.v.place(-5, -5, 0);
  g.steer({ throttle: 1, steer: 0, estop: false });
  g.run(2);
  const before = g.v.vf;
  g.steer({ throttle: 1, steer: 0, estop: true });
  g.run(0.05);
  const after = g.v.vf;
  g.v.place(0, 10, -Math.PI / 2);
  g.steer({ throttle: 1, steer: 0, estop: false });
  g.run(5);
  return { before: +before.toFixed(2), after, tows: g.G.tows, z: +g.v.z.toFixed(1) };
});
console.log('estop and tow', JSON.stringify(other));
console.log('frame', JSON.stringify(await page.evaluate(() => window.__game.stats())));

// Phone layout.
await page.setViewport({ width: 390, height: 780, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await new Promise((r) => setTimeout(r, 500));
await page.evaluate(() => {
  window.__game.begin();
  window.__game.run(0.3);
});
await new Promise((r) => setTimeout(r, 300));
await shot('phone');
console.log(errors.length ? `ISSUES\n${[...new Set(errors)].join('\n')}` : 'no console errors');
await browser.close();
