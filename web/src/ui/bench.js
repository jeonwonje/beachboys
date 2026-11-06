// Bench test 1, from the timestamped log the team wrote for the video. Attempts
// are listed in the order they happened; `t` is seconds into the video.
const parse = (m) => m.split(':').reduce((a, b) => a * 60 + +b, 0);

const LOG = `0:00 1a|20 cm twig|dry|pass
0:11 1a|20 cm twig|wet|pass
0:19 1a|Bottle cap|dry|fail
0:25 1a|Bottle cap|wet|pass
0:39 1a|Cigarette butt|dry|pass
0:55 1a|Cigarette butt|wet|fail
1:05 1a|Cigarette butt|wet|pass
1:13 1a|Plastic spoon|dry|fail
1:21 1a|Plastic spoon|dry|pass
1:30 1a|Plastic spoon|wet|pass
1:41 1a|Zip tie|dry|fail
1:50 1a|Zip tie|dry|pass
2:03 1a|Zip tie|wet|pass
2:11 1b|1.5 L bottle|dry|fail
2:18 1b|1.5 L bottle|wet|fail
2:35 1b|240 ml tin can|dry|pass
2:48 1b|240 ml tin can|dry|pass
3:02 1b|240 ml tin can|wet|pass
3:11 1b|500 ml bottle|dry|fail
3:37 1b|500 ml bottle|dry|fail
3:53 1b|500 ml bottle|dry|pass
4:11 1b|500 ml bottle|wet|fail
4:16 1b|500 ml bottle|wet|pass
4:26 1b|Plastic cup|dry|fail
4:38 1b|Plastic cup|wet|fail
4:46 2|30 cm branch|dry|pass
4:57 2|30 cm branch|wet|pass
5:10 2|Masking tape|dry|pass
5:24 2|Masking tape|wet|fail
5:36 2|Masking tape|wet|pass
5:44 2|Rope|dry|pass
5:55 2|Rope|wet|pass
6:11 3|Cardboard|dry|fail
6:20 3|Cardboard|dry|fail
6:29 3|Cardboard|wet|fail
6:36 3|Fish snack wrapper|dry|fail
6:42 3|Fish snack wrapper|dry|fail
6:49 3|Fish snack wrapper|dry|pass
6:58 3|Fish snack wrapper|wet|fail
7:05 3|Fish snack wrapper|wet|pass
7:14 3|Granola wrapper|dry|pass
7:24 3|Granola wrapper|wet|fail
7:31 3|Carrier bag|dry|pass
7:40 3|Carrier bag|wet|fail
7:47 3|Carrier bag|wet|pass`;

const ATTEMPTS = LOG.split('\n').map((l) => {
  const [head, item, cond, res] = l.split('|');
  const [time, cls] = head.split(' ');
  return { t: parse(time), time, cls, item, cond, pass: res === 'pass' };
});

const CLASSES = {
  '1a': 'Small rigid',
  '1b': 'Medium rigid',
  2: 'Long, pliable',
  3: 'Flat',
};

export function summarise() {
  const cases = new Map();
  for (const a of ATTEMPTS) {
    const k = `${a.item}|${a.cond}`;
    if (!cases.has(k)) cases.set(k, { item: a.item, cls: a.cls, cond: a.cond, attempts: [] });
    cases.get(k).attempts.push(a);
  }
  const list = [...cases.values()];
  for (const c of list) {
    c.first = c.attempts[0].pass;
    c.eventually = c.attempts.some((a) => a.pass);
  }
  return list;
}

export function initBench() {
  const list = summarise();
  const items = [...new Set(list.map((c) => c.item))];
  const video = document.getElementById('bench-video');
  const now = document.getElementById('bench-now');
  const grid = document.getElementById('bench-grid');
  const totals = document.getElementById('bench-totals');

  const tally = (f) => {
    const s = list.filter(f);
    return { n: s.length, first: s.filter((c) => c.first).length, ev: s.filter((c) => c.eventually).length };
  };
  const all = tally(() => true);
  const dry = tally((c) => c.cond === 'dry');
  const wet = tally((c) => c.cond === 'wet');
  totals.innerHTML = [
    ['All cases', all],
    ['Dry sand', dry],
    ['Wet sand', wet],
  ]
    .map(
      ([label, t]) =>
        `<div class="tot"><b>${t.ev}<small>/${t.n}</small></b><span>${label}</span><em>${t.first}/${t.n} on the first try</em></div>`,
    )
    .join('');

  let html = '<div class="bg-head"><span></span><span>Dry</span><span>Wet</span><span>Rate</span></div>';
  let cls = null;
  for (const item of items) {
    const row = list.filter((c) => c.item === item);
    if (row[0].cls !== cls) {
      cls = row[0].cls;
      const t = tally((c) => c.cls === cls);
      html += `<div class="bg-class"><span>Class ${cls} · ${CLASSES[cls]}</span><span class="bg-rate">${t.ev}/${t.n} passed, ${t.first}/${t.n} first try</span></div>`;
    }
    const cell = (cond) => {
      const c = row.find((x) => x.cond === cond);
      const state = c.first ? 'pass1' : c.eventually ? 'pass2' : 'fail';
      const word = c.first ? 'passed first try' : c.eventually ? `passed on try ${c.attempts.findIndex((a) => a.pass) + 1}` : 'never passed';
      const n = c.attempts.length;
      return `<button class="cell ${state}" data-t="${c.attempts[c.attempts.length - 1].t}" data-note="${item}, ${cond} sand: ${word}" aria-label="${item}, ${cond} sand, ${word}. Play the video.">${n > 1 ? n : ''}</button>`;
    };
    html += `<div class="bg-row"><span class="bg-item">${item}</span>${cell('dry')}${cell('wet')}<span></span></div>`;
  }
  grid.innerHTML = html;

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.cell');
    if (!b) return;
    grid.querySelectorAll('.cell.cur').forEach((c) => c.classList.remove('cur'));
    b.classList.add('cur');
    const seek = () => {
      video.currentTime = +b.dataset.t;
      video.play().catch(() => {});
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener('loadedmetadata', seek, { once: true });
    now.textContent = b.dataset.note;
  });
}

// Requirements and where they stand, from the report's traceability matrix and
// requirement-progress chart at build B4.0.
const REQS = [
  ['D1', 'Collect debris in wet sand', '0.80 intake or better, per class', 'partly', 'Long items pass. Small, medium and flat are still short.'],
  ['D2', 'Separate wet sand from debris', 'Most sand on the tray; 0.05 debris loss or less', 'partly', 'No debris lost through the mesh. Sand lands on the V plate, not the tray.'],
  ['D3', 'Quiet near the public', 'Under 60 dB(A) at 1 m', 'target', 'Electric, with no hydraulics, so we expect it to be quiet. We have no noise measurement on record yet.'],
  ['D4', 'Mass within carrier capacity', 'Moves with the bin at 10 kg', 'partly', 'Carrier moves the 10 kg payload.'],
  ['D6', 'Resist salt and wet sand', 'No corrosion or binding', 'target', 'Materials chosen for it. The exposure test is still to do.'],
  ['D7', 'Safe near the public', 'All motion stops on the e-stop', 'target', 'Open. The carrier e-stop doesn\'t cut the module\'s motors in the documented build.'],
  ['D8', 'Traverse the wet band', 'No immobilisation in either moisture zone', 'partly', 'Locked skids drive over the sandpit. Not yet shown on a real wet band.'],
  ['D9', 'Shift-end clearing with hand tools', 'Two people, hand tools only', 'partly', 'Tray and bin come off by hand.'],
  ['D10', 'Reduce strain of clearing', 'Fewer lifts and less demand than by hand', 'target', 'Needs a side-by-side trial with workers.'],
  ['D11', 'Usable by workers unaided', '5 of 6 tasks unaided; SUS 68 or above', 'target', 'Needs a trial with workers.'],
];
const WORD = { partly: 'Partly met', target: 'Target, not shown' };

export function initScore() {
  document.getElementById('score-list').innerHTML = REQS.map(
    ([id, name, thr, st, note]) => `<article class="req ${st}">
      <header><b>${id}</b><span class="tag ${st === 'partly' ? 'm' : 't'}">${WORD[st]}</span></header>
      <h3>${name}</h3>
      <p class="thr">${thr}</p>
      <p>${note}</p>
    </article>`,
  ).join('');
}
