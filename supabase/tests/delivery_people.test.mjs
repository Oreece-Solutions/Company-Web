// Delivery and people: 20261101000002_delivery_people.sql
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, one, all, createUser, asUser, expectError } from './db.mjs';

describe('Delivery and people', () => {
  let db;
  let founder;
  let rep;
  let accountant;
  let client;
  let project;
  before(async () => {
    db = await createDb();
    founder = await createUser(db, { role: 'admin', name: 'Founder' });
    rep = await createUser(db, { role: 'staff', name: 'Rep' });
    accountant = await createUser(db, { role: 'accountant', name: 'Accounts' });
    client = (await asUser(db, founder, () => one(db, `INSERT INTO clients (name) VALUES ('Sparkle') RETURNING id`))).id;
    project = (await asUser(db, founder, () => one(db, `INSERT INTO projects (name, client_id) VALUES ('Website', $1) RETURNING id`, [client]))).id;
  });

  test('people log their own time; only they or the founder can change it', async () => {
    const t = await asUser(db, rep, () => one(db, `INSERT INTO time_entries (project_id, minutes, description) VALUES ($1, 90, 'Homepage') RETURNING *`, [project]));
    assert.equal(t.user_id, rep);
    await expectError(asUser(db, rep, () => db.query(`INSERT INTO time_entries (project_id, minutes, user_id) VALUES ($1, 30, $2)`, [project, founder])), /row-level security/);
    await expectError(asUser(db, accountant, () => db.query(`INSERT INTO time_entries (project_id, minutes) VALUES ($1, 30)`, [project])), /row-level security/);
    // Someone else's entry: an update touches nothing.
    const other = await asUser(db, founder, () => one(db, `INSERT INTO time_entries (project_id, minutes) VALUES ($1, 60) RETURNING id`, [project]));
    await asUser(db, rep, () => db.query(`UPDATE time_entries SET minutes = 1 WHERE id = $1`, [other.id]));
    assert.equal((await one(db, `SELECT minutes FROM time_entries WHERE id = $1`, [other.id])).minutes, 60);
    await asUser(db, founder, () => db.query(`UPDATE time_entries SET minutes = 120 WHERE id = $1`, [t.id]));
    assert.equal((await one(db, `SELECT minutes FROM time_entries WHERE id = $1`, [t.id])).minutes, 120);
    await expectError(asUser(db, rep, () => db.query(`INSERT INTO time_entries (project_id, minutes) VALUES ($1, 0)`, [project])), /check/);
  });

  test('support requests stamp first response and resolution; reopening clears it', async () => {
    const r = await asUser(db, rep, () => one(db, `INSERT INTO support_requests (client_id, title, priority) VALUES ($1, 'Form not sending', 'urgent') RETURNING *`, [client]));
    assert.equal(r.status, 'open');
    assert.equal(r.first_response_at, null);
    assert.equal(r.assigned_to, rep);
    await asUser(db, rep, () => db.query(`UPDATE support_requests SET status = 'in_progress' WHERE id = $1`, [r.id]));
    const mid = await one(db, `SELECT first_response_at, resolved_at FROM support_requests WHERE id = $1`, [r.id]);
    assert.ok(mid.first_response_at);
    assert.equal(mid.resolved_at, null);
    await asUser(db, rep, () => db.query(`UPDATE support_requests SET status = 'resolved', resolution = 'Fixed SMTP key' WHERE id = $1`, [r.id]));
    assert.ok((await one(db, `SELECT resolved_at FROM support_requests WHERE id = $1`, [r.id])).resolved_at);
    await asUser(db, rep, () => db.query(`UPDATE support_requests SET status = 'open' WHERE id = $1`, [r.id]));
    const reopened = await one(db, `SELECT first_response_at, resolved_at FROM support_requests WHERE id = $1`, [r.id]);
    assert.equal(reopened.resolved_at, null);
    assert.ok(reopened.first_response_at, 'first response stays');
    // Accountants can read but not log requests; only the founder deletes.
    assert.equal((await asUser(db, accountant, () => all(db, `SELECT id FROM support_requests`))).length, 1);
    await expectError(asUser(db, accountant, () => db.query(`INSERT INTO support_requests (client_id, title) VALUES ($1, 'x')`, [client])), /row-level security/);
    await asUser(db, rep, () => db.query(`DELETE FROM support_requests WHERE id = $1`, [r.id]));
    assert.ok(await one(db, `SELECT id FROM support_requests WHERE id = $1`, [r.id]));
  });

  test('job applications are founder-only and stay out of the audit log', async () => {
    const opening = await asUser(db, founder, () => one(db, `INSERT INTO job_openings (title) VALUES ('Business Development Rep') RETURNING id`));
    const a = await asUser(db, founder, () => one(db,
      `INSERT INTO job_applications (opening_id, full_name, email) VALUES ($1, 'Test Candidate', 'cand@example.com') RETURNING *`, [opening.id]));
    assert.equal(a.stage, 'new');
    assert.equal((await asUser(db, rep, () => all(db, `SELECT id FROM job_applications`))).length, 0);
    assert.equal((await asUser(db, rep, () => all(db, `SELECT id FROM job_openings`))).length, 1, 'team can see open roles');
    await expectError(asUser(db, rep, () => db.query(`INSERT INTO job_applications (full_name) VALUES ('x')`)), /row-level security/);
    const before = a.stage_changed_at;
    await asUser(db, founder, () => db.query(`UPDATE job_applications SET stage = 'interview' WHERE id = $1`, [a.id]));
    const after = await one(db, `SELECT stage_changed_at FROM job_applications WHERE id = $1`, [a.id]);
    assert.ok(new Date(after.stage_changed_at) >= new Date(before));
    assert.equal((await all(db, `SELECT 1 FROM audit_log WHERE table_name = 'job_applications'`)).length, 0);
  });
});
