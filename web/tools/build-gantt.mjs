// Builds the public timeline from the private chat reconstruction. Only neutral
// titles, outcomes and dates reach the site: message IDs and media names don't.
//   node tools/build-gantt.mjs <reconstruction.json> <planned.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';

const [rawPath, plannedPath, out] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const planned = JSON.parse(readFileSync(plannedPath, 'utf8'));
const verdicts = new Map(raw.verification.map((v) => [v.title, v]));

// Left off the public page: coursework admin, assessor feedback, drafting
// notes, partner contact details and battery incidents.
const HIDE = /short-circuit|sparking|AI assist|with AI|generated|audited|assessor feedback|examiner themes|partner contacts|partner management|Partner agrees|support letter|non-disclosure|Shenzhen|peer review|charger for the second/i;
const BLANK_RESULT = /non-disclosure|NDA\b|support letter|contract|tender|S\$|\$\d/i;
const NOT_REALLY_TESTS = /^(Test bed item|Sand quantity|Debris test set)/;

const events = [];
for (const e of raw.timeline.events) {
  const v = verdicts.get(e.title);
  if (e.status === 'planned-only' || v?.verdict === 'did-not-happen') continue;
  if (e.category === 'admin' || e.confidence === 'low') continue;
  if (HIDE.test(`${e.title} ${e.result}`)) continue;
  events.push({
    start: v?.verdict === 'date-wrong' && v.corrected_start ? v.corrected_start : e.start,
    end: v?.verdict === 'date-wrong' && v.corrected_end ? v.corrected_end : e.end,
    title: e.title,
    category: NOT_REALLY_TESTS.test(e.title) ? 'build' : e.category,
    subsystem: e.subsystem,
    people: e.people,
    status: e.status,
    result: BLANK_RESULT.test(e.result) ? '' : e.result,
    checked: v ? v.verdict !== 'cannot-verify' : undefined,
  });
}

const laneOf = (name) =>
  name.startsWith('Yizhang') ? ['conveyor', 'Yizhang']
  : name.startsWith('Wonje') ? ['half-drum', 'Wonje']
  : name.startsWith('Russell') ? ['platform', 'Russell']
  : name.startsWith('Ming') ? ['project', 'Ming Yuan']
  : name.startsWith('Gary') ? ['project', 'Gary']
  : ['system', 'Team'];

const seen = new Set();
const pva = [];
for (const p of raw.timeline.planned_vs_actual) {
  const task = p.planned_task.replace(/^t\d+\s+/, '').replace(/RE Sustainability/g, 'Partner');
  if (seen.has(task)) continue;
  seen.add(task);
  pva.push({ task, plannedStart: p.planned_start, plannedEnd: p.planned_end, actualStart: p.actual_start || null, actualEnd: p.actual_end || null });
}

writeFileSync(
  out,
  `${JSON.stringify({
    range: ['2025-11-01', '2026-11-16'],
    exportEnd: '2026-10-29',
    events,
    planned: planned.tasks.map((t) => {
      const [lane, who] = laneOf(t.swimlane);
      return { lane, people: [who], start: t.start, end: t.end };
    }),
    pva,
  })}\n`,
);
console.log(`${events.length} events, ${pva.length} plan rows -> ${out}`);
