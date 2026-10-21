import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
function compile(source) {
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
}
const overviewSource = await readFile(new URL('../lib/overview.ts', import.meta.url), 'utf8');
const overviewUrl = compile(overviewSource);
const overviewModule = await import(overviewUrl);
const { weekWindows, weekTotal, recentActivities } = overviewModule;
test('week windows use seven complete UTC date boundaries across months', () => {
  const windows = weekWindows(new Date('2026-03-02T02:00:00+05:30'));
  assert.equal(windows.length, 7);
  assert.equal(windows[0].start, '2026-02-23T00:00:00.000Z');
  assert.equal(windows[6].date, '2026-03-01');
  for (const window of windows) assert.equal(Date.parse(window.end) - Date.parse(window.start), 86400000);
});
test('missing sources remain unknown without hiding available metric totals', () => {
  const week = [{ date: '2026-10-21', counts: { pairs: 1, cycles: 2, logs: null, notes: 3, ratings: 4 } }];
  assert.equal(weekTotal(week), null);
  assert.equal(weekTotal(week, 'cycles'), 2);
  assert.equal(weekTotal(week, 'logs'), null);
  assert.equal(weekTotal([{ ...week[0], counts: { pairs: 0, cycles: 0, logs: 0, notes: 0, ratings: 0 } }]), 0);
});
test('recent activity merges sources chronologically and caps the full feed', () => {
  const events = Array.from({ length: 35 }, (_, i) => ({ module: 'logs', kind: 'Check-in', date: new Date(Date.UTC(2026, 9, 1, i)).toISOString() }));
  const result = recentActivities([events.slice(0, 10), events.slice(10)]);
  assert.equal(result.length, 30); assert.equal(result[0].date, events[34].date);
  assert.equal(result[29].date, events[5].date);
});
const routeSource = (await readFile(new URL('../app/api/overview/route.ts', import.meta.url), 'utf8'))
  .replace(/import .* from '@\/lib\/supabase';/, 'const adminClient = () => globalThis.__portalTest.db;')
  .replace(/import .* from '@\/lib\/admin';/, 'const requireAdmin = async () => globalThis.__portalTest.admin;')
  .replace(/from '@\/lib\/overview'/, `from '${overviewUrl}'`);
const { GET } = await import(compile(routeSource));
function mockDatabase(missing = []) {
  const queries = [];
  return { queries, from(table) {
    const query = { table }; queries.push(query);
    const builder = {
      select(columns, options) { query.columns = columns; query.head = options?.head; return builder; },
      order() { return builder; }, limit(limit) { query.limit = limit; return builder; },
      gte(column, date) { query.start = date; query.dateColumn = column; return builder; },
      lt(column, date) { query.end = date; query.dateColumn = column; return builder; },
      then(resolve, reject) { return Promise.resolve(missing.includes(table) ? { error: { message: 'Missing table' }, count: null, data: null }
        : query.head ? { count: query.start ? 2 : 14, error: null }
        : { data: [{ created_at: '2026-10-20T10:00:00Z' }], error: null }).then(resolve, reject); },
    }; return builder;
  } };
}
test('overview rejects unauthorized requests before querying the database', async () => {
  const db = mockDatabase(); globalThis.__portalTest = { admin: null, db };
  const response = await GET(new Request('https://example.test/api/overview'));
  assert.equal(response.status, 403); assert.equal(db.queries.length, 0);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('overview uses exact date-bounded counts and returns only service metadata', async () => {
  const db = mockDatabase(); globalThis.__portalTest = { admin: { id: 'admin' }, db };
  const response = await GET(new Request('https://example.test/api/overview'));
  const body = await response.json(); assert.equal(response.status, 200);
  assert.equal(body.counts.logs, 14); assert.equal(body.week.length, 7);
  assert.equal(body.week[0].counts.logs, 2); assert.equal(weekTotal(body.week), 70);
  assert.equal(body.activities.length, 5); assert.deepEqual(body.unavailable, []);
  assert.equal(db.queries.filter(query => query.start && query.end).length, 35);
  for (const query of db.queries) {
    assert.ok(query.head || query.columns === 'created_at');
    if (query.head) assert.equal(query.columns, '*');
    if (query.start) assert.equal(query.dateColumn, 'created_at');
  }
  assert.deepEqual(Object.keys(body.activities[0]).sort(), ['date', 'kind', 'module']);
});
test('one missing source returns useful partial data and unknown values', async () => {
  globalThis.__portalTest = { admin: { id: 'admin' }, db: mockDatabase(['day_logs']) };
  const response = await GET(new Request('https://example.test/api/overview'));
  const body = await response.json(); assert.equal(response.status, 200);
  assert.equal(body.counts.logs, null); assert.equal(body.week[0].counts.logs, null);
  assert.equal(body.counts.cycles, 14); assert.deepEqual(body.unavailable, ['Daily check-ins']);
});
test('total source failure returns an error instead of zero activity', async () => {
  globalThis.__portalTest = { admin: { id: 'admin' }, db: mockDatabase(['links', 'cycles', 'notes', 'date_ratings', 'day_logs']) };
  const response = await GET(new Request('https://example.test/api/overview'));
  assert.equal(response.status, 500); assert.equal((await response.json()).counts, undefined);
});

test('CSV exports only aggregate counts and preserves unknown values', () => {
  const fixture = { checkedAt: '2026-10-21T10:00:00Z', counts: { profiles: 3, pairs: 0, cycles: 4, logs: null, notes: 2, ratings: 1 },
    week: [{ date: '2026-10-21', counts: { pairs: 0, cycles: 1, logs: null, notes: 0, ratings: 0 } }],
    activities: [{ module: 'notes', kind: 'Private event text must not be exported', date: '2026-10-21T09:00:00Z' }],
    unavailable: ['Daily check-ins'], services: { emailKey: true, emailSender: true, emailHook: true } };
  const { summaryCsv } = overviewModule;
  const csv = summaryCsv(fixture);
  assert.ok(csv.includes('"Daily check-ins","Unavailable","Unavailable"'));
  assert.ok(csv.includes('"Connected pairs","0","0"'));
  assert.ok(csv.includes('"2026-10-21","0","1","Unavailable","0","0"'));
  assert.ok(!csv.includes('Private event text'));
  assert.ok(!csv.includes('emailKey'));
});

