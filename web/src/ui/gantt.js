// Planned schedule versus what really happened. Each lane is a subsystem; the
// faint bars are the plan and the solid ones are dated from the project chat.
const DAY = 864e5;
const LANES = [
  ['project', 'Project'],
  ['platform', 'Carrier'],
  ['conveyor', 'Conveyor'],
  ['half-drum', 'Half-drum'],
  ['tray-bin', 'Tray and bin'],
  ['electronics', 'Electronics'],
  ['system', 'Whole system'],
];
const CATS = {
  test: 'Tests',
  field: 'Field',
  build: 'Build',
  design: 'Design',
  electronics: 'Electronics',
  platform: 'Carrier',
  research: 'Research',
  review: 'Reviews',
  milestone: 'Milestones',
  admin: 'Admin',
};
const PEOPLE = ['Wonje', 'Ming Yuan', 'Gary', 'Russell', 'Yizhang'];
const STATUS = { done: 'Done', partial: 'Partly', failed: 'Failed', unclear: 'Unclear' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ts = (d) => Date.parse(`${d}T00:00:00Z`);
const fmt = (d) => new Date(ts(d)).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export async function initGantt(url) {
  const mount = document.getElementById('gantt');
  const controls = document.getElementById('gantt-controls');
  const detail = document.getElementById('gantt-detail');
  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch {
    mount.innerHTML = '<p class="fine">The timeline data could not be loaded.</p>';
    return;
  }

  const events = data.events.filter((e) => e.status !== 'planned-only');
  const start = ts(data.range[0]);
  const end = ts(data.range[1]);
  const span = (end - start) / DAY;
  const pxPerDay = 4.2;
  const x = (t) => ((t - start) / DAY) * pxPerDay;
  const width = span * pxPerDay;

  const KEY = ['test', 'field', 'milestone'];
  const filter = { cat: new Set(KEY), person: null, plan: true };

  const months = [];
  for (let d = new Date(start); d.getTime() < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push(d.getTime());
  }

  controls.innerHTML = `
    <div class="chips" data-group="cat"><span class="chips-label">Show</span>
      <button class="chip on" data-cat="key">Tests and milestones</button>
      <button class="chip" data-cat="">Everything</button>
      ${['test', 'field', 'build', 'electronics', 'platform', 'design', 'research', 'review', 'milestone']
        .filter((c) => events.some((e) => e.category === c))
        .map((c) => `<button class="chip" data-cat="${c}">${CATS[c]}</button>`)
        .join('')}
    </div>
    <div class="chips" data-group="person"><span class="chips-label">Who</span>
      <button class="chip on" data-person="">Everyone</button>
      ${PEOPLE.map((p) => `<button class="chip" data-person="${p}">${p}</button>`).join('')}
    </div>
    <label class="plan-toggle"><input type="checkbox" checked> Show the original plan</label>`;

  function placeInRows(list) {
    // Stack overlapping bars within a lane.
    const rows = [];
    const sorted = [...list].sort((a, b) => ts(a.start) - ts(b.start));
    for (const e of sorted) {
      const s = ts(e.start);
      const f = ts(e.end) + DAY;
      // Leave room for the label on one-day events.
      const visualEnd = Math.max(f, s) + 50 * DAY;
      let r = rows.findIndex((endT) => endT <= s);
      if (r < 0) {
        rows.push(visualEnd);
        r = rows.length - 1;
      } else rows[r] = visualEnd;
      e._row = r;
    }
    return rows.length;
  }

  function render() {
    const visible = events.filter(
      (e) => (filter.cat.size === 0 || filter.cat.has(e.category)) && (!filter.person || e.people.includes(filter.person) || e.people.includes('Team')),
    );
    const rowH = 28;
    let y = 34;
    let lanesHtml = '';
    const planLane = { conveyor: 'conveyor', 'half-drum': 'half-drum', 'tray-bin': 'tray-bin', electronics: 'electronics', system: 'system', project: 'project', platform: 'platform' };
    for (const [key, label] of LANES) {
      const list = visible.filter((e) => e.subsystem === key);
      const plans = filter.plan ? (data.planned ?? []).filter((p) => planLane[p.lane] === key && (!filter.person || p.people?.includes(filter.person))) : [];
      if (!list.length && !plans.length) continue;
      const rows = placeInRows(list);
      const planRows = plans.length ? 1 : 0;
      const h = Math.max(1, rows) * rowH + planRows * 14 + 12;
      let bars = '';
      if (plans.length) {
        const a = Math.min(...plans.map((p) => ts(p.start)));
        const b = Math.max(...plans.map((p) => ts(p.end)));
        bars += `<div class="g-plan" style="left:${x(a)}px;width:${x(b) - x(a)}px" title="Planned: ${esc(fmt(new Date(a).toISOString().slice(0, 10)))} to ${esc(fmt(new Date(b).toISOString().slice(0, 10)))}"><span>Planned window</span></div>`;
      }
      for (const e of list) {
        const left = x(ts(e.start));
        const w = Math.max(x(ts(e.end) + DAY) - left, 8);
        const top = planRows * 14 + 4 + e._row * rowH;
        bars += `<button class="g-bar c-${e.category} s-${e.status}" style="left:${left}px;top:${top}px;width:${w}px" data-i="${events.indexOf(e)}" title="${esc(e.title)}"><span>${esc(e.title)}</span></button>`;
      }
      lanesHtml += `<div class="g-lane" style="height:${h}px"><div class="g-lane-name">${label}</div><div class="g-lane-track" style="width:${width}px">${bars}</div></div>`;
      y += h;
    }
    const axis = months
      .map((m) => {
        const d = new Date(m);
        const label = d.toLocaleDateString('en-SG', { month: 'short', timeZone: 'UTC' });
        const yr = d.getUTCMonth() === 0 || m === months[0] ? ` <b>${d.getUTCFullYear()}</b>` : '';
        return `<span class="g-month" style="left:${x(m)}px">${label}${yr}</span><i class="g-grid" style="left:${x(m)}px"></i>`;
      })
      .join('');
    const exportEnd = data.exportEnd ? `<i class="g-now" style="left:${x(ts(data.exportEnd))}px" title="The chat record ends here"><span>Chat record ends</span></i>` : '';
    mount.innerHTML = `<div class="g-inner" style="width:${width + 118}px"><div class="g-axis" style="left:118px;width:${width}px">${axis}${exportEnd}</div><div class="g-body">${lanesHtml || '<p class="fine g-empty">Nothing matches those filters.</p>'}</div></div>`;
  }

  controls.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    if ('cat' in b.dataset) {
      filter.cat.clear();
      if (b.dataset.cat === 'key') KEY.forEach((c) => filter.cat.add(c));
      else if (b.dataset.cat) filter.cat.add(b.dataset.cat);
    } else {
      filter.person = b.dataset.person || null;
    }
    b.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
    render();
  });
  controls.querySelector('input').addEventListener('change', (e) => {
    filter.plan = e.target.checked;
    render();
  });

  mount.addEventListener('click', (e) => {
    const b = e.target.closest('.g-bar');
    if (!b) return;
    const ev = events[+b.dataset.i];
    mount.querySelectorAll('.g-bar.cur').forEach((c) => c.classList.remove('cur'));
    b.classList.add('cur');
    const when = ev.start === ev.end ? fmt(ev.start) : `${fmt(ev.start)} to ${fmt(ev.end)}`;
    detail.innerHTML = `<time>${when}</time><h3>${esc(ev.title)}</h3>
      ${ev.result ? `<p>${esc(ev.result)}</p>` : ''}
      <p class="fine">${esc(ev.people.join(', '))} · <span class="st st-${ev.status}">${STATUS[ev.status] ?? ev.status}</span>${ev.checked === false ? ' · date not independently confirmed' : ''}</p>`;
  });

  render();
  // Open on the build and test months, which is what most people came to see.
  mount.scrollLeft = x(ts('2026-07-20'));

  const short = (d) => new Date(ts(d)).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const range = (a, b) => (!a ? '' : !b ? `From ${short(a)}` : a === b ? short(a) : `${short(a)} to ${short(b)}`);
  document.getElementById('pva').innerHTML = `<thead><tr><th>Task</th><th>Planned</th><th>Actual</th></tr></thead><tbody>${(data.pva ?? [])
    .map((p) => {
      const actual = range(p.actualStart, p.actualEnd);
      return `<tr><td>${esc(p.task)}</td><td>${range(p.plannedStart, p.plannedEnd)}</td><td class="${actual ? '' : 'none'}">${actual || 'No record'}</td></tr>`;
    })
    .join('')}</tbody>`;
}
