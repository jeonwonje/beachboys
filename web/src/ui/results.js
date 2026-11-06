// Every number here is copied from the ASI-301 CDE3301 Design Report: Figures 16,
// 17, 18 and 21, and Tables 2 and 12. Null means the report shows no value.
const CLASSES = ['Small', 'Medium', 'Long', 'Flat'];

const BENCH = {
  'B3.0': {
    label: 'First session, B3.0',
    rows: [
      ['Intake, dry', [60, 42, 100, 75], 67],
      ['Intake, wet', [80, 33, 89, 33], 58],
      ['Transfer, dry', [67, 100, 89, 100], 88],
      ['Transfer, wet', [75, 100, 63, 100], 79],
      ['Discharge, dry', [null, 100, null, null], 100],
      ['Discharge, wet', [null, null, null, null], null],
    ],
  },
  'B4.0': {
    label: 'Second session, B4.0',
    rows: [
      ['Intake, dry', [87, 92, 100, 92], 92],
      ['Intake, wet', [87, 92, 89, 50], 79],
      ['Transfer, dry', [92, 100, 89, 100], 96],
      ['Transfer, wet', [92, 100, 63, 100], 90],
      ['Discharge, dry', [100, 100, 100, 100], 100],
      ['Discharge, wet', [100, 100, 100, 100], 100],
    ],
  },
};

const FIELD = {
  intake: {
    label: 'Intake',
    rows: [
      ['Dry, no sweeper', [20, 50, 33.3, 50]],
      ['Dry, sweeper', [20, 75, 33.3, 0]],
      ['Wet, no sweeper', [20, 0, 66.7, 50]],
      ['Wet, sweeper', [20, 25, 33.3, 75]],
    ],
  },
  transfer: {
    label: 'Transfer',
    rows: [
      ['Dry, no sweeper', [100, 100, 100, 100]],
      ['Dry, sweeper', [100, 100, 100, null]],
      ['Wet, no sweeper', [0, null, 0, 0]],
      ['Wet, sweeper', [0, 0, 0, 33.3]],
    ],
  },
  discharge: {
    label: 'Discharge',
    rows: [
      ['Dry, no sweeper', [100, 100, 100, 100]],
      ['Dry, sweeper', [100, 100, 100, null]],
      ['Wet, no sweeper', [null, null, null, null]],
      ['Wet, sweeper', [null, null, null, 100]],
    ],
  },
};

const REQS = [
  ['D1', 'Collect debris in the wet band', 'Collection rate 0.80 or better per class', 'fail', 'Fail on field', 'Fail on field (37.5% at best on dry sand, 6.3% at best on wet sand). On the bench, wet flat intake (50%) and wet long transfer (63%) stayed below 80%. Updated after the field test to cover wet sand and cross-slope.'],
  ['D2', 'Separate wet sand from debris', 'Majority of sand settles on the tray; debris loss 0.05 or less', 'fail', 'Fail on settling', 'The majority is still split between the V plate and tray. Debris loss passes at 0%.'],
  ['D3', 'Operate below noise threshold', 'Under 60 dB(A) at 1 m', 'pass', 'Pass', 'Stayed below 60 dB(A) at 1 m while traversing, with the conveyor and U plate running.'],
  ['D4', 'Mass within carrier capacity', 'Moves with the bin at a 10 kg payload', 'pass', 'Pass', 'Route completed on road and motion on sand with the 10 kg payload.'],
  ['D5', 'Resist salt and wet sand', 'No corrosion initiation or binding', 'nt', 'Not tested', 'The electronics case keeps out sand but is not sealed.'],
  ['D6', 'Traverse the wet band', 'Observed to traverse in both sand conditions', 'pass', 'Pass, with limits', 'Jams impede motion and wheels slip in wet sand.'],
  ['D7', 'Shift-end clearing, hand tools only', 'Two people, hand tools only', 'pass', 'Pass', 'Passed on bench and field. Field clear-out took 5.23 minutes.'],
  ['D8', 'Reduce strain of clearing', 'Physical demand below the current manual workflow', 'pass', 'Pass, qualitative', 'All three people asked found the machine less physically demanding.'],
  ['D9', 'Operable by a worker unaided', '5 of 6 tasks unaided', 'pass', 'Pass', 'Both operators completed 5 of 6 tasks unaided.'],
  ['D10', 'Operate safely near the public', 'All motion ceases upon emergency stop', 'pass', 'Pass', 'Robot drive, conveyor and U plate all stopped immediately.'],
];

const TAG = { pass: 'm', fail: 'f', nt: 'n' };

const cell = (v, overall) => {
  if (v === null) return '<td class="none">–</td>';
  return `<td class="${overall ? 'overall' : v < 80 ? 'low' : 'ok'}">${v}%</td>`;
};

function benchTable(key) {
  const b = BENCH[key];
  const rows = b.rows
    .map(([name, vals, ov], i) => {
      const gap = i === 2 || i === 4 ? ' class="gap"' : '';
      return `<tr${gap}><th scope="row">${name}</th>${vals.map((v) => cell(v)).join('')}${cell(ov, true)}</tr>`;
    })
    .join('');
  return `<table class="rates"><thead><tr><th></th>${CLASSES.map((c) => `<th scope="col">${c}</th>`).join('')}<th scope="col">Overall</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function fieldTable(key) {
  const f = FIELD[key];
  const rows = f.rows
    .map(([name, vals]) => `<tr><th scope="row">${name}</th>${vals.map((v) => cell(v)).join('')}</tr>`)
    .join('');
  return `<table class="rates"><thead><tr><th></th>${CLASSES.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function tabs(mount, table, source, render) {
  const keys = Object.keys(source);
  mount.innerHTML = keys
    .map((k, i) => `<button class="tab" data-k="${k}" aria-pressed="${i === 0}">${source[k].label}</button>`)
    .join('');
  table.innerHTML = render(keys[0]);
  mount.addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (!b) return;
    mount.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-pressed', t === b));
    table.innerHTML = render(b.dataset.k);
  });
}

export function initResults() {
  tabs(document.getElementById('bench-tabs'), document.getElementById('bench-table'), BENCH, benchTable);
  tabs(document.getElementById('field-tabs'), document.getElementById('field-table'), FIELD, fieldTable);
  document.getElementById('score-list').innerHTML = REQS.map(
    ([id, name, thr, st, word, note]) => `<article class="req ${st}">
      <header><b>${id}</b><span class="tag ${TAG[st]}">${word}</span></header>
      <h3>${name}</h3>
      <p class="thr">${thr}</p>
      <p>${note}</p>
    </article>`,
  ).join('');
}
