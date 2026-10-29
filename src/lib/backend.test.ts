import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabasePool, closeDb } from './db';
import { migrateDatabase, seedDatabase } from './db-setup';
import { getDb, createAdminToken, parseAdminToken, revokeAdminToken } from './db';
import { startAttempt, phaseContent, readyPhase, answerPhase, getAttempt, QuizError } from './quiz-engine';
import { eventClock, calculateScore } from './event-clock';
import { standings, finalizeClosedRounds, attemptPosition } from './hourly-ranking';
import type { QuizQuestion } from './quiz-content';
import { NextRequest } from 'next/server';
import * as qr from '../app/api/qr/generate/route';
import * as prizes from '../app/api/admin/prizes/route';
import * as attempts from '../app/api/admin/attempts/route';
import * as revoke from '../app/api/admin/attempts/[id]/revoke/route';
import * as writeoff from '../app/api/admin/prizes/[id]/writeoff/route';
import * as stats from '../app/api/admin/stats/route';
import * as winners from '../app/api/admin/winners/route';
import * as redemption from '../app/api/redemption/[code]/route';
import * as login from '../app/api/admin/login/route';
import * as logout from '../app/api/admin/logout/route';
import * as ranking from '../app/api/ranking/route';
import * as resultRoute from '../app/api/qr/[qrCode]/route';
import * as answerRoute from '../app/api/quiz/answer/route';
import * as contentRoute from '../app/api/quiz/content/route';
import * as prizeById from '../app/api/admin/prizes/[id]/route';
assert.match(process.env.QUIZ_TEST_SCHEMA || '', /^quiz_test_[a-f0-9]+$/, 'Use npm test: never run against the live schema');
const db = getDb();
const device = 'device-test-001';
before(async () => {
    const schema = (await db.query('SELECT current_schema() AS name')).rows[0].name;
    assert.equal(schema, process.env.QUIZ_TEST_SCHEMA);
    await migrateDatabase(db);
    await seedDatabase(db);
    await db.query('DELETE FROM prizes');
});
after(closeDb);
async function insert(id: string) { await db.query(`INSERT INTO attempts (id, qr_code, nickname, phone) VALUES ($1, $2, 'Test', '11999999999')`, [id, id]); }
function reject(fn: () => Promise<unknown>, status = 409) { return assert.rejects(fn, (e: unknown) => e instanceof QuizError && e.status === status); }
function request(route: string, method = 'GET', token = 'forged', body?: unknown) {
    return new NextRequest(`http://localhost/api/${route}`, { method, headers: { cookie: `gi_admin_session=${token}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function complete(id: string, at: number, correct = true, duration = 1000) {
    await insert(id);
    await startAttempt(db, id, device, at);
    const questions = JSON.parse((await getAttempt(db, id)).question_snapshots!) as QuizQuestion[];
    for (let p = 1; p <= 6; p++) {
        await readyPhase(db, id, p, device, at + p * duration);
        await answerPhase(db, id, p, correct ? questions[p - 1].correctId : questions[p - 1].alternatives.find((a) => a.id !== questions[p - 1].correctId)!.id, device, at + (p + 1) * duration);
    }
}
test('opaque persisted sessions: forgery, future timestamp, exact expiry, logout revocation', async () => {
    const now = Date.now();
    const token = await createAdminToken('admin', now);
    assert.deepEqual(await parseAdminToken(token, now), { u: 'admin', t: now });
    assert.equal(await parseAdminToken(Buffer.from(JSON.stringify({ u: 'admin', t: now + 9999999 })).toString('base64url')), null);
    assert.equal(await parseAdminToken('x'.repeat(43)), null);
    assert.equal(await parseAdminToken(token, now - 1), null);
    assert.equal(await parseAdminToken(token, now + 8 * 3600000), null);
    assert.ok(!JSON.stringify((await db.query('SELECT * FROM admin_sessions')).rows).includes(token));
    await revokeAdminToken(token);
    assert.equal(await parseAdminToken(token), null);
});
test('every privileged endpoint rejects forged AND expired sessions before querying/mutating', async () => {
    const expired = await createAdminToken('admin', Date.now() - 9 * 3600000);
    for (const token of ['forged', expired]) {
        const calls = [qr.GET(request('qr/generate', 'GET', token)), qr.POST(request('qr/generate', 'POST', token)),
            prizes.GET(request('admin/prizes', 'GET', token)), prizes.POST(request('admin/prizes', 'POST', token)),
            prizes.PUT(request('admin/prizes', 'PUT', token), { params: { id: 'missing' } }),
            attempts.GET(request('admin/attempts', 'GET', token)), stats.GET(request('admin/stats', 'GET', token)),
            winners.GET(request('admin/winners', 'GET', token)),
            revoke.POST(request('admin/revoke', 'POST', token), { params: { id: 'missing' } }),
            writeoff.POST(request('admin/writeoff', 'POST', token), { params: { id: 'missing' } }),
            redemption.GET(request('redemption/x', 'GET', token), { params: { code: 'x' } }),
            redemption.POST(request('redemption/x', 'POST', token), { params: { code: 'x' } }),
            login.GET(request('admin/login', 'GET', token)), logout.POST(request('admin/logout', 'POST', token))];
        for (const response of await Promise.all(calls))
            assert.equal(response.status, 401);
    }
    const token = await createAdminToken('admin');
    assert.equal((await qr.GET(request('qr/generate', 'GET', token))).status, 200);
    await logout.POST(request('admin/logout', 'POST', token));
    assert.equal(await parseAdminToken(token), null);
});
test('readiness only, immutable snapshots, reload, order, invalid input and device/idempotency', async () => {
    await insert('flow');
    const start = await startAttempt(db, 'flow', device, 10000);
    assert.equal(start.timerStartedAt, null);
    const snapshot = (await getAttempt(db, 'flow')).question_snapshots;
    const content = await phaseContent(db, 'flow', 1);
    assert.ok(!JSON.stringify(content).includes('correctId'));
    assert.equal((await getAttempt(db, 'flow')).phase1_started_ms, null);
    await reject(async () => await answerPhase(db, 'flow', 1, 'a', device, 12000));
    await reject(async () => await readyPhase(db, 'flow', 2, device, 12000));
    await reject(async () => await readyPhase(db, 'flow', 1.5, device, 12000), 400);
    await reject(async () => await readyPhase(db, 'flow', 1, 'different-device', 12000));
    await reject(async () => await startAttempt(db, 'flow', 'different-device', 12000));
    assert.equal((await readyPhase(db, 'flow', 1, device, 12000)).timerStartedAt, 12000);
    assert.equal((await readyPhase(db, 'flow', 1, device, 13000)).elapsedMs, 1000);
    assert.equal((await startAttempt(db, 'flow', device, 14000)).elapsedMs, 2000);
    assert.equal((await getAttempt(db, 'flow')).question_snapshots, snapshot);
    await reject(async () => await answerPhase(db, 'flow', 1, 'invalid', device, 14000), 400);
    await reject(async () => await answerPhase(db, 'flow', -1, 'a', device, 14000), 400);
    await reject(async () => await answerPhase(db, 'flow', 1, 'a', device, 11000));
    const question = (JSON.parse(snapshot!) as QuizQuestion[])[0];
    const response = await answerPhase(db, 'flow', 1, question.correctId, device, 14500);
    assert.equal(response.elapsedMs, 2500);
    assert.equal(response.timeMs, 2500);
    assert.deepEqual(await answerPhase(db, 'flow', 1, question.correctId, device, 19000), response);
    await reject(async () => await answerPhase(db, 'flow', 1, question.alternatives.find((a) => a.id !== question.correctId)!.id, device, 19000));
    assert.equal((await startAttempt(db, 'flow', device, 20000)).results.length, 1);
    assert.equal((await startAttempt(db, 'flow', device, 20000)).phase, 2);
});
test('answer route ignores fabricated timeSpent; six answers finalize atomically and last retry stable', async () => {
    await insert('http-timing');
    await startAttempt(db, 'http-timing', device);
    await readyPhase(db, 'http-timing', 1, device, Date.now() - 3500);
    const res = await answerRoute.POST(request('quiz/answer', 'POST', '', { qrCode: 'http-timing', phase: 1, answer: 'a', deviceId: device, timeSpent: -9999 }));
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.elapsedMs >= 3500);
    assert.ok(data.timeSpent >= 3.5);
    const at = Date.parse('2026-10-01T14:05:00Z');
    await complete('six', at);
    const a = await getAttempt(db, 'six');
    assert.equal(a.status, 'completed');
    assert.equal(a.correct_answers, 6);
    assert.equal(a.total_time, 6);
    assert.equal(a.score, 994);
    const question = (JSON.parse(a.question_snapshots!) as QuizQuestion[])[5];
    const retry = await answerPhase(db, 'six', 6, question.correctId, device, at + 90000);
    assert.equal(retry.elapsedMs, 1000);
    assert.equal((await getAttempt(db, 'six')).redemption_code, a.redemption_code);
    assert.equal((await startAttempt(db, 'six', device)).phase, 7);
    assert.equal((await startAttempt(db, 'six', device)).results.length, 6);
});
test('hourly timezone boundaries, day separation, only closed winners, exact ties unresolved, catchup durable', async () => {
    for (const [iso, round] of [['2026-10-01T13:59:59Z', 0], ['2026-10-01T14:00:00Z', 1], ['2026-10-01T22:59:59Z', 9], ['2026-10-01T23:00:00Z', 10]] as const)
        assert.equal(eventClock(new Date(iso)).round, round);
    assert.equal(eventClock(new Date('2026-10-02T01:00:00Z')).date, '2026-10-01');
    assert.equal(eventClock(new Date('2026-10-01T14:00:00Z'), 'UTC').round, 4);
    await complete('tie-a', Date.parse('2026-10-03T14:10:00Z'));
    await complete('tie-b', Date.parse('2026-10-03T14:11:00Z'));
    await complete('day-two', Date.parse('2026-10-04T14:10:00Z'));
    await finalizeClosedRounds(db, new Date('2026-10-03T14:59:59Z'));
    assert.equal((await attemptPosition(db, await getAttempt(db, 'tie-a'))).isHourlyWinner, false);
    await finalizeClosedRounds(db, new Date('2026-10-03T15:00:00Z'));
    const tie = (await db.query(`SELECT * FROM hourly_rounds WHERE event_date = '2026-10-03' AND round = 1`)).rows[0] as {
        state: string;
        winner_id: string | null;
        candidates: string;
    };
    assert.equal(tie.state, 'tie');
    assert.equal(tie.winner_id, null);
    assert.equal(JSON.parse(tie.candidates).length, 2);
    assert.equal((await attemptPosition(db, await getAttempt(db, 'tie-a'))).roundStatus, 'tied');
    assert.deepEqual((await standings(db, '2026-10-03', 1)).map((r) => r.round_position), [1, 1]);
    await finalizeClosedRounds(db, new Date('2026-10-04T15:00:00Z'));
    assert.equal((await standings(db, '2026-10-04', 1)).length, 1);
    assert.equal((await attemptPosition(db, await getAttempt(db, 'day-two'))).isHourlyWinner, true);
    const rounds = (await db.query('SELECT * FROM hourly_rounds')).rows;
    await finalizeClosedRounds(db, new Date('2026-10-04T15:00:00Z'));
    assert.deepEqual((await db.query('SELECT * FROM hourly_rounds')).rows, rounds);
    assert.equal(((await db.query(`SELECT COUNT(*) AS c FROM hourly_rounds WHERE event_date = '2026-10-03'`)).rows[0] as {
        c: number;
    }).c, 9);
});
test('accuracy precedes time, points bounded, zero correct has zero; public projections omit private data', async () => {
    assert.equal(calculateScore(0, 0), 0);
    assert.equal(calculateScore(6, 0), 1000);
    assert.equal(calculateScore(6, 200), 900);
    await complete('slow-perfect', Date.parse('2026-10-05T14:00:00Z'), true, 25000);
    await complete('fast-zero', Date.parse('2026-10-05T14:01:00Z'), false, 1);
    assert.equal((await standings(db, '2026-10-05', 1))[0].id, 'slow-perfect');
    const publicRank = await (await ranking.GET(request('ranking?round=1&date=2026-10-05'))).json();
    const serialized = JSON.stringify(publicRank);
    for (const secret of ['phone', 'qr_code', 'redemption_code', 'question_snapshots', 'device_id', 'correctId'])
        assert.ok(!serialized.includes(secret));
    const result = await (await resultRoute.GET(request('qr/slow-perfect'), { params: { qrCode: 'slow-perfect' } })).json();
    assert.equal(result.score, 900);
    assert.equal(result.roundPosition, 1);
    assert.equal(result.isHourlyWinner, true);
    assert.equal(result.roundStatus, 'closed');
    assert.equal(result.roundStart, '11:00');
    assert.equal(result.roundEnd, '12:00');
    assert.equal(result.eventDate, '2026-10-05');
    assert.ok(!JSON.stringify(result).includes('phone'));
});
test('persisted reload across connections, device race and answer transaction rollback', async () => {
    await insert('durable');
    await startAttempt(db, 'durable', device, 10000);
    await readyPhase(db, 'durable', 1, device, 11000);
    const first = createDatabasePool();
    const second = createDatabasePool();
    try {
        assert.equal((await startAttempt(second, 'durable', device, 16000)).elapsedMs, 5000);
        await reject(async () => await startAttempt(first, 'durable', 'competing-device', 16000));
        const question = (JSON.parse((await getAttempt(first, 'durable')).question_snapshots!) as QuizQuestion[])[0];
        const one = await answerPhase(first, 'durable', 1, question.correctId, device, 17000);
        assert.deepEqual(await answerPhase(second, 'durable', 1, question.correctId, device, 19000), one);
    }
    finally {
        await first.end();
        await second.end();
    }
    await insert('rollback');
    await startAttempt(db, 'rollback', device, 10000);
    await readyPhase(db, 'rollback', 1, device, 11000);
    await db.query("ALTER TABLE attempts ADD CONSTRAINT test_fail_answer CHECK (id <> 'rollback' OR phase1_answer IS NULL)");
    try {
        await assert.rejects(async () => await answerPhase(db, 'rollback', 1, 'a', device, 12000));
        assert.equal((await getAttempt(db, 'rollback')).phase1_answer, null);
        assert.equal((await getAttempt(db, 'rollback')).phase1_result, null);
    }
    finally {
        await db.query('ALTER TABLE attempts DROP CONSTRAINT test_fail_answer');
    }
});
test('HTTP content GET never starts timer, ready response and parallel retries agree', async () => {
    await insert('content-http');
    await startAttempt(db, 'content-http', device);
    const content = await contentRoute.GET(request('quiz/content?qrCode=content-http&phase=1'));
    assert.equal(content.status, 200);
    assert.equal((await getAttempt(db, 'content-http')).phase1_started_ms, null);
    const ready = await contentRoute.POST(request('quiz/content', 'POST', '', { qrCode: 'content-http', phase: 1, deviceId: device }));
    assert.equal(ready.status, 200);
    const time = await ready.json();
    assert.equal(time.timerStartedAt, time.serverNow);
    const questions = JSON.parse((await getAttempt(db, 'content-http')).question_snapshots!) as QuizQuestion[];
    const replies = await Promise.all(Array.from({ length: 4 }, () => answerRoute.POST(request('quiz/answer', 'POST', '', {
        qrCode: 'content-http', phase: 1, answer: questions[0].correctId, deviceId: device, timeSpent: 0
    }))));
    const results = await Promise.all(replies.map((r) => r.json()));
    for (const result of results)
        assert.deepEqual(result, results[0]);
});
test('orphan prize PUT protected; inventory validation, writeoff and repeated redemption preserve stock', async () => {
    assert.equal((await prizeById.PUT(request('admin/prizes/x', 'PUT'), { params: { id: 'x' } })).status, 401);
    const token = await createAdminToken('admin');
    assert.equal((await prizes.POST(request('admin/prizes', 'POST', token, { name: 'Bad', category: 'basic', quantity: -1 }))).status, 400);
    await db.query(`INSERT INTO prizes (id, name, category, quantity, available) VALUES ('stock', 'Adesivos', 'basic', 10, 10)`);
    assert.equal((await writeoff.POST(request('admin/writeoff', 'POST', token, { quantity: 2, reason: 'Test' }), { params: { id: 'stock' } })).status, 200);
    assert.equal((await prizeById.PUT(request('admin/prizes/stock', 'PUT', token, { quantity: 12 }), { params: { id: 'stock' } })).status, 200);
    assert.equal(((await db.query(`SELECT available FROM prizes WHERE id = 'stock'`)).rows[0] as {
        available: number;
    }).available, 10);
    await complete('redeem-zero', Date.parse('2026-10-07T14:00:00Z'), false);
    const code = (await getAttempt(db, 'redeem-zero')).redemption_code!;
    const responses = await Promise.all([1, 2].map(() => redemption.POST(request('redemption/x', 'POST', token), { params: { code } })));
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    assert.equal(((await db.query(`SELECT available FROM prizes WHERE id = 'stock'`)).rows[0] as {
        available: number;
    }).available, 9);
    assert.equal(((await db.query(`SELECT COUNT(*) AS c FROM prize_deliveries WHERE attempt_id = 'redeem-zero'`)).rows[0] as {
        c: number;
    }).c, 1);
});
test('comparison tables are copied from persisted snapshot into public DTO without gabarito', async () => {
    await insert('table');
    await startAttempt(db, 'table', device, 10000);
    const questions = JSON.parse((await getAttempt(db, 'table')).question_snapshots!) as QuizQuestion[];
    const comparison = { headers: ['Campanha', 'Conversão'], rows: [['A', '3%'], ['B', '5%']] };
    questions[0].comparison = comparison;
    await db.query(`UPDATE attempts SET question_snapshots = $1 WHERE id = 'table'`, [JSON.stringify(questions)]);
    const publicQuestion = (await phaseContent(db, 'table', 1)).question;
    assert.deepEqual(publicQuestion.comparison, comparison);
    assert.ok(!JSON.stringify(publicQuestion).includes('correctId'));
});
test('legacy migration repeatable, non-destructive, unsafe resume blocked and no automatic legacy winner', async () => {
    assert.deepEqual(await migrateDatabase(db), []);
    assert.deepEqual(await migrateDatabase(db), []);
    assert.equal((await getAttempt(db, 'durable')).id, 'durable');
    await insert('legacy');
    await db.query(`UPDATE attempts SET status = 'in_progress', phase1_answer = 'a' WHERE id = 'legacy'`);
    await reject(async () => await startAttempt(db, 'legacy', device));
    assert.equal((await getAttempt(db, 'legacy')).phase1_answer, 'a');
    await insert('legacy-completed');
    await db.query(`UPDATE attempts SET status = 'completed', completed_at = '2026-10-06 14:10:00', correct_answers = 6 WHERE id = 'legacy-completed'`);
    await finalizeClosedRounds(db, new Date('2026-10-06T15:00:00Z'));
    assert.equal((await getAttempt(db, 'legacy-completed')).event_date, '2026-10-06');
    assert.equal((await attemptPosition(db, await getAttempt(db, 'legacy-completed'))).isHourlyWinner, false);
});

test('TLS configuration preserves the Aiven CA even with SSL parameters in the URI', async () => {
  const { databaseConfig } = await import('./db-config')
  const config = databaseConfig({ DATABASE_URL: 'postgresql://user:pass@db.example:25060/defaultdb?sslmode=require&ssl=0&sslrootcert=ignored',
    DATABASE_CA_CERT: 'certificate\\ncontents', DATABASE_POOL_MAX: '3' })
  assert.deepEqual(config.ssl, { rejectUnauthorized: true, ca: 'certificate\ncontents' })
  assert.ok(!config.connectionString?.includes('sslmode'))
  assert.ok(!config.connectionString?.includes('sslrootcert'))
  assert.ok(!new URL(config.connectionString!).searchParams.has('ssl'))
  assert.equal(config.max, 3)
  assert.equal(databaseConfig({ DATABASE_URL: 'postgresql://localhost/test', DATABASE_SSL: 'false' }).ssl, false)
  assert.throws(() => databaseConfig({}), /DATABASE_URL/)
  assert.throws(() => databaseConfig({ DATABASE_URL: 'sqlite:///tmp/test' }), /postgres/)
  assert.throws(() => databaseConfig({ DATABASE_URL: 'postgresql://localhost/test', DATABASE_POOL_MAX: '0' }), /DATABASE_POOL_MAX/)
})

test('concurrent registrations and device claims allow exactly one participant', async () => {
  const registration = await import('../app/api/quiz/register/route')
  await db.query("INSERT INTO attempts (id, qr_code, nickname, phone) VALUES ('register-race', 'register-race', '', '')")
  const registrations = await Promise.all(['First', 'Second'].map(nickname => registration.POST(request('quiz/register', 'POST', '',
    { qrCode: 'register-race', nickname, phone: '11999999999' }))))
  assert.deepEqual(registrations.map(r => r.status).sort(), [200, 409])
  const devices = ['device-race-first', 'device-race-second']
  const starts = await Promise.allSettled(devices.map(id => startAttempt(db, 'register-race', id)))
  assert.equal(starts.filter(r => r.status === 'fulfilled').length, 1)
  const rejected = starts.find(r => r.status === 'rejected') as PromiseRejectedResult
  assert.equal(rejected.reason.code, 'DEVICE_CONFLICT')
})

test('different attempts cannot redeem the last unit twice and competing writeoffs preserve stock', async () => {
  await complete('stock-race-a', Date.parse('2026-10-09T14:00:00Z'), false)
  await complete('stock-race-b', Date.parse('2026-10-09T14:01:00Z'), false)
  await db.query("UPDATE prizes SET available = 1 WHERE id = 'stock'")
  const token = await createAdminToken('admin')
  const codes = await Promise.all(['stock-race-a', 'stock-race-b'].map(async id => (await getAttempt(db, id)).redemption_code!))
  const responses = await Promise.all(codes.map(code => redemption.POST(request('redemption/x', 'POST', token), { params: { code } })))
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409])
  assert.equal((await db.query("SELECT available FROM prizes WHERE id = 'stock'")).rows[0].available, 0)
  assert.equal((await db.query("SELECT COUNT(*)::int AS c FROM prize_deliveries WHERE attempt_id IN ('stock-race-a', 'stock-race-b')")).rows[0].c, 1)
  await db.query("UPDATE prizes SET available = 1 WHERE id = 'stock'")
  const writeoffs = await Promise.all([1, 2].map(() => writeoff.POST(request('admin/writeoff', 'POST', token,
    { quantity: 1, reason: 'Concurrent test' }), { params: { id: 'stock' } })))
  assert.deepEqual(writeoffs.map(r => r.status).sort(), [200, 409])
  assert.equal((await db.query("SELECT available FROM prizes WHERE id = 'stock'")).rows[0].available, 0)
})

test('failed finalization rolls back the sixth answer and preserves fractional seconds', async () => {
  const at = Date.parse('2026-10-10T14:00:00Z')
  await insert('atomic-final')
  await startAttempt(db, 'atomic-final', device, at)
  const questions = JSON.parse((await getAttempt(db, 'atomic-final')).question_snapshots!) as QuizQuestion[]
  for (let p = 1; p <= 5; p++) {
    await readyPhase(db, 'atomic-final', p, device, at + p * 2000)
    await answerPhase(db, 'atomic-final', p, questions[p - 1].correctId, device, at + p * 2000 + 1234)
  }
  await readyPhase(db, 'atomic-final', 6, device, at + 12000)
  await db.query("ALTER TABLE attempts ADD CONSTRAINT test_fail_completion CHECK (id <> 'atomic-final' OR status <> 'completed')")
  try {
    await assert.rejects(() => answerPhase(db, 'atomic-final', 6, questions[5].correctId, device, at + 13234))
    const row = await getAttempt(db, 'atomic-final')
    assert.equal(row.phase6_answer, null)
    assert.equal(row.phase6_result, null)
    assert.equal(row.status, 'in_progress')
    assert.equal(row.phase1_time, 1.234)
    assert.equal(row.phase6_started_ms, at + 12000)
  } finally { await db.query('ALTER TABLE attempts DROP CONSTRAINT test_fail_completion') }
  await answerPhase(db, 'atomic-final', 6, questions[5].correctId, device, at + 13234)
  assert.ok(Math.abs((await getAttempt(db, 'atomic-final')).total_time - 7.404) < 0.000001)
})

test('migrations and seeds are repeatable without resetting password, attempts or stock', async () => {
  const before = (await db.query("SELECT password_hash FROM admins WHERE username = 'admin'")).rows[0].password_hash
  await seedDatabase(db, { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'a-different-test-password' })
  await seedDatabase(db)
  assert.deepEqual(await migrateDatabase(db), [])
  assert.equal((await db.query("SELECT password_hash FROM admins WHERE username = 'admin'")).rows[0].password_hash, before)
  assert.equal((await db.query("SELECT available FROM prizes WHERE id = 'stock'")).rows[0].available, 0)
  assert.equal((await getAttempt(db, 'atomic-final')).status, 'completed')
  assert.equal((await db.query("SELECT COUNT(*)::int AS c FROM prizes WHERE name = 'Adesivos'")).rows[0].c, 1)
})

test('parallel round finalizers persist a single winner and one closure per round', async () => {
  await complete('round-race', Date.parse('2026-10-11T14:00:00Z'))
  await Promise.all([1, 2, 3].map(() => finalizeClosedRounds(db, new Date('2026-10-11T15:00:00Z'))))
  const rows = (await db.query("SELECT winner_id FROM hourly_rounds WHERE event_date = '2026-10-11' AND round = 1")).rows
  assert.equal(rows.length, 1)
  assert.equal(rows[0].winner_id, 'round-race')
})
