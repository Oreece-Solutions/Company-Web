// Sales department: 20261031000001_sales_department.sql
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, one, all, createUser, asUser, expectError } from './db.mjs';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });

describe('Sales department', () => {
  let db;
  let founder;
  let rep;
  let accountant;
  before(async () => {
    db = await createDb();
    founder = await createUser(db, { role: 'admin', name: 'Founder' });
    rep = await createUser(db, { role: 'staff', name: 'Rep' });
    accountant = await createUser(db, { role: 'accountant', name: 'Accounts' });
  });

  const addProspect = (who, fields = {}) => asUser(db, who, () => one(db,
    `INSERT INTO prospects (business_name, stage, consent_basis, segment, tier, evidence, observed_problem)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [fields.name ?? `Clean ${crypto.randomUUID().slice(0, 6)}`, fields.stage ?? 'researching',
     fields.consent ?? null, fields.segment ?? 'residential_cleaning', fields.tier ?? 'A',
     fields.evidence ?? 'Homepage 2026-10-31', fields.problem ?? 'No quote form']));

  const activities = (prospectId) =>
    all(db, `SELECT kind, user_id FROM sales_activities WHERE prospect_id = $1 ORDER BY occurred_at, created_at`, [prospectId]);

  test('research and qualification are logged automatically, owned by whoever researched', async () => {
    const p = await addProspect(rep);
    assert.equal(p.assigned_to, rep);
    await asUser(db, rep, () => db.query(`UPDATE prospects SET stage = 'ready' WHERE id = $1`, [p.id]));
    const kinds = (await activities(p.id)).map((a) => a.kind);
    assert.deepEqual(kinds, ['researched', 'qualified']);
    assert.ok((await activities(p.id)).every((a) => a.user_id === rep));
  });

  test('logging contact needs a next action, picks first contact vs follow-up, moves the stage', async () => {
    const p = await addProspect(rep, { stage: 'ready', consent: 'Published business email' });
    await expectError(asUser(db, rep, () => db.query(
      `SELECT log_sales_contact($1, 'contact', 'email')`, [p.id])), /next action/);
    await asUser(db, rep, () => db.query(
      `SELECT log_sales_contact($1, 'contact', 'email', 'Sent', NULL, 'Growth System', NULL, 'Follow up', $2)`, [p.id, today()]));
    let row = await one(db, `SELECT * FROM prospects WHERE id = $1`, [p.id]);
    assert.equal(row.stage, 'contacted');
    assert.ok(row.last_contacted_at);
    assert.equal(row.next_action, 'Follow up');
    await asUser(db, rep, () => db.query(
      `SELECT log_sales_contact($1, 'contact', 'phone', 'Voicemail', NULL, NULL, NULL, 'Call again', $2)`, [p.id, today()]));
    await asUser(db, rep, () => db.query(
      `SELECT log_sales_contact($1, 'conversation', 'phone', 'Interested', 'Already has a website', NULL, NULL, 'Book call', $2)`, [p.id, today()]));
    const kinds = (await activities(p.id)).map((a) => a.kind);
    assert.deepEqual(kinds.slice(-3), ['first_contact', 'follow_up', 'conversation']);
    const obj = await one(db, `SELECT objection FROM sales_activities WHERE prospect_id = $1 AND kind = 'conversation'`, [p.id]);
    assert.equal(obj.objection, 'Already has a website');
  });

  test('contact still needs a consent basis', async () => {
    const p = await addProspect(rep, { stage: 'ready' });
    await expectError(asUser(db, rep, () => db.query(
      `SELECT log_sales_contact($1, 'contact', 'email', NULL, NULL, NULL, NULL, 'Follow up', $2)`, [p.id, today()])),
      /consent_basis/);
    assert.equal((await activities(p.id)).filter((a) => a.kind === 'first_contact').length, 0, 'failed contact is not logged');
  });

  test('booking a discovery call sets the date, stage and logs one meeting', async () => {
    const p = await addProspect(rep, { stage: 'contacted', consent: 'Spoke on phone' });
    await asUser(db, rep, () => db.query(`SELECT book_discovery($1, '2026-11-04T22:00:00Z', 'Owner prefers mornings')`, [p.id]));
    const row = await one(db, `SELECT * FROM prospects WHERE id = $1`, [p.id]);
    assert.equal(row.stage, 'conversation_booked');
    assert.equal(row.next_action, 'Discovery call (founder)');
    assert.equal(row.next_action_date.toISOString().slice(0, 10), '2026-11-05', 'NZ date of the call');
    await asUser(db, rep, () => db.query(`SELECT book_discovery($1, '2026-11-06T22:00:00Z')`, [p.id]));
    const kinds = (await activities(p.id)).map((a) => a.kind);
    assert.equal(kinds.filter((k) => k === 'meeting_booked').length, 1, 'rescheduling does not double count');
  });

  test('scoreboard counts per person, with quality', async () => {
    const rows = await asUser(db, founder, () => all(db, `SELECT * FROM sales_scoreboard($1, $2)`, [today(), today()]));
    const r = rows.find((x) => x.user_id === rep).metrics;
    assert.equal(r.first_contact, 1);
    assert.equal(r.follow_up, 1);
    assert.equal(r.conversation, 1);
    assert.equal(r.meeting_booked, 1);
    assert.ok(r.researched >= 4);
    assert.equal(r.with_evidence, r.researched);
    await expectError(asUser(db, null, () => db.query(`SELECT * FROM sales_scoreboard($1, $2)`, [today(), today()])), /team members/);
  });

  test('activities are the logger\'s own and cannot be edited', async () => {
    const p = await addProspect(rep);
    await expectError(asUser(db, rep, () => db.query(
      `INSERT INTO sales_activities (prospect_id, user_id, kind) VALUES ($1, $2, 'note')`, [p.id, founder])), /row-level security/);
    const upd = await asUser(db, rep, () => db.query(`UPDATE sales_activities SET kind = 'meeting_booked' WHERE prospect_id = $1`, [p.id]));
    assert.equal(upd.affectedRows ?? 0, 0);
    await expectError(asUser(db, accountant, () => db.query(
      `INSERT INTO sales_activities (prospect_id, kind) VALUES ($1, 'note')`, [p.id])), /row-level security/);
  });

  test('trial targets are seeded; only admins change them', async () => {
    const t = await asUser(db, rep, () => all(db, `SELECT metric, weekly_min, weekly_max FROM sales_targets WHERE user_id IS NULL ORDER BY metric`));
    assert.equal(t.length, 6);
    assert.deepEqual(t.find((x) => x.metric === 'researched'), { metric: 'researched', weekly_min: 40, weekly_max: 50 });
    const upd = await asUser(db, rep, () => db.query(`UPDATE sales_targets SET weekly_min = 1`));
    assert.equal(upd.affectedRows ?? 0, 0);
    await asUser(db, founder, () => db.query(`UPDATE sales_targets SET weekly_min = 35 WHERE metric = 'researched' AND user_id IS NULL`));
  });

  test('templates: only the founder approves; a rep edit un-approves', async () => {
    const tpl = await one(db, `SELECT * FROM sales_templates ORDER BY sort_order LIMIT 1`);
    assert.equal(tpl.status, 'draft', 'seeds start as drafts');
    await expectError(asUser(db, rep, () => db.query(`UPDATE sales_templates SET status = 'approved' WHERE id = $1`, [tpl.id])), /Only the founder/);
    const ok = await asUser(db, founder, () => one(db, `UPDATE sales_templates SET status = 'approved' WHERE id = $1 RETURNING *`, [tpl.id]));
    assert.equal(ok.approved_by, founder);
    const edited = await asUser(db, rep, () => one(db, `UPDATE sales_templates SET body = body || ' Thanks.' WHERE id = $1 RETURNING *`, [tpl.id]));
    assert.equal(edited.status, 'draft');
    assert.equal(edited.approved_by, null);
  });

  test('playbook: team reads, only admins edit', async () => {
    const sections = await asUser(db, rep, () => all(db, `SELECT slug FROM playbook_sections ORDER BY sort_order`));
    assert.ok(sections.some((s) => s.slug === 'target-market'));
    const upd = await asUser(db, rep, () => db.query(`UPDATE playbook_sections SET body = 'x'`));
    assert.equal(upd.affectedRows ?? 0, 0);
  });

  test('onboarding: admin starts it; the rep ticks only their own items', async () => {
    await expectError(asUser(db, rep, () => db.query(`SELECT start_sales_onboarding($1, $2)`, [rep, today()])), /Only admins/);
    const plan = await asUser(db, founder, () => one(db, `SELECT start_sales_onboarding($1, $2) AS id`, [rep, today()]));
    await expectError(asUser(db, founder, () => db.query(`SELECT start_sales_onboarding($1, $2)`, [rep, today()])), /onboarding_plans_one_active/);
    const items = await asUser(db, rep, () => all(db, `SELECT id, owner, week FROM onboarding_items WHERE plan_id = $1`, [plan.id]));
    assert.ok(items.length > 20);
    const mine = items.find((i) => i.owner === 'rep');
    const founders = items.find((i) => i.owner === 'founder');
    const ticked = await asUser(db, rep, () => one(db, `UPDATE onboarding_items SET done_at = now() WHERE id = $1 RETURNING done_by`, [mine.id]));
    assert.equal(ticked.done_by, rep);
    const blocked = await asUser(db, rep, () => db.query(`UPDATE onboarding_items SET done_at = now() WHERE id = $1`, [founders.id]));
    assert.equal(blocked.affectedRows ?? 0, 0);
    const other = await asUser(db, accountant, () => all(db, `SELECT id FROM onboarding_plans`));
    assert.equal(other.length, 0, 'other staff cannot see someone else\'s plan');
  });

  test('the offer is in the services catalogue without a price', async () => {
    const s = await one(db, `SELECT * FROM services WHERE name = 'Cleaning Business Growth System'`);
    assert.equal(s.price, null);
    assert.equal(s.price_approved, false);
  });
});
