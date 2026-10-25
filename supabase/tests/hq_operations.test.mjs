// Oreece HQ: 20261025000001_hq_operations.sql
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, applyMigration, one, all, createUser, asUser, expectError } from './db.mjs';

async function insert(db, table, cols) {
  const keys = Object.keys(cols);
  return one(
    db,
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    Object.values(cols),
  );
}

const prospect = (db, fields = {}) =>
  insert(db, 'prospects', { business_name: 'Sample Cleaning Co', ...fields });

describe('Oreece HQ', () => {
  let db;
  let admin;
  before(async () => {
    db = await createDb();
    admin = await createUser(db, { role: 'admin', name: 'Founder' });
  });

  describe('prospects', () => {
    test('a problem cannot be recorded without evidence', async () => {
      await expectError(
        prospect(db, { observed_problem: 'Broken email link' }),
        /prospects_problem_needs_evidence/,
      );
      const p = await prospect(db, {
        business_name: 'Angel Test',
        observed_problem: 'Broken email link',
        evidence: 'Page source 2026-10-25',
      });
      assert.equal(p.stage, 'researching');
    });

    test('outreach stages need a consent basis', async () => {
      await expectError(prospect(db, { business_name: 'No Basis', stage: 'contacted' }), /consent_basis/);
      const p = await prospect(db, { business_name: 'With Basis', stage: 'ready' });
      await expectError(db.query(`UPDATE prospects SET stage = 'contacted' WHERE id = $1`, [p.id]), /consent_basis/);
      const row = await one(
        db,
        `UPDATE prospects SET stage = 'contacted', consent_basis = 'Published business phone' WHERE id = $1 RETURNING *`,
        [p.id],
      );
      assert.ok(row.last_contacted_at, 'contacting stamps last_contacted_at');
    });

    test('an explicit last_contacted_at is kept (imports)', async () => {
      const p = await prospect(db, {
        business_name: 'Imported',
        stage: 'contacted',
        consent_basis: 'Existing client',
        last_contacted_at: '2026-10-01T00:00:00Z',
      });
      assert.equal(new Date(p.last_contacted_at).toISOString(), '2026-10-01T00:00:00.000Z');
    });

    test('one prospect per website, ignoring scheme, www and trailing slash', async () => {
      await prospect(db, { business_name: 'Site A', website: 'https://www.example-clean.co.nz/' });
      await expectError(
        prospect(db, { business_name: 'Site A again', website: 'http://example-clean.co.nz' }),
        /prospects_website_unique/,
      );
    });

    test('disqualifying needs a reason, and reopening clears it', async () => {
      const p = await prospect(db, { business_name: 'Franchise' });
      await expectError(db.query(`UPDATE prospects SET stage = 'disqualified' WHERE id = $1`, [p.id]), /reason/);
      await db.query(`UPDATE prospects SET stage = 'disqualified', disqualified_reason = 'Run by head office' WHERE id = $1`, [p.id]);
      const reopened = await one(db, `UPDATE prospects SET stage = 'researching' WHERE id = $1 RETURNING *`, [p.id]);
      assert.equal(reopened.disqualified_reason, null);
    });
  });

  describe('convert_prospect', () => {
    test('creates an account, primary contact and open deal; second call is a no-op', async () => {
      const p = await prospect(db, {
        business_name: 'Convert Me Ltd',
        website: 'https://convert-me.test',
        industry: 'Cleaning',
        observed_problem: 'Private site',
        evidence: 'Visited 2026-10-25',
        estimated_value: 1950,
        lead_source: 'Web research',
      });
      const dealId = await asUser(db, admin, async () =>
        (await one(db, `SELECT convert_prospect($1, NULL, 'Jo Owner') AS id`, [p.id])).id);

      const deal = await one(db, `SELECT * FROM deals WHERE id = $1`, [dealId]);
      assert.equal(deal.stage, 'lead');
      assert.equal(Number(deal.value), 1950);
      assert.equal(deal.currency, 'NZD');
      const client = await one(db, `SELECT * FROM clients WHERE id = $1`, [deal.client_id]);
      assert.equal(client.company_name, 'Convert Me Ltd');
      assert.equal(client.name, 'Jo Owner');
      assert.match(client.notes, /Problem: Private site/);
      const contact = await one(db, `SELECT * FROM contacts WHERE client_id = $1`, [client.id]);
      assert.equal(contact.is_primary, true);
      const after = await one(db, `SELECT * FROM prospects WHERE id = $1`, [p.id]);
      assert.equal(after.stage, 'converted');
      assert.equal(after.deal_id, dealId);

      const again = await asUser(db, admin, async () =>
        (await one(db, `SELECT convert_prospect($1) AS id`, [p.id])).id);
      assert.equal(again, dealId);
      assert.equal((await one(db, `SELECT count(*)::int AS n FROM deals WHERE client_id = $1`, [client.id])).n, 1);
    });

    test('a disqualified prospect cannot be converted', async () => {
      const p = await prospect(db, { business_name: 'Nope', stage: 'disqualified', disqualified_reason: 'Franchise' });
      await expectError(asUser(db, admin, () => db.query(`SELECT convert_prospect($1)`, [p.id])), /disqualified/);
    });
  });

  describe('services', () => {
    test('an approved price must exist', async () => {
      await expectError(insert(db, 'services', { name: 'Care Plan', price_approved: true }), /services_approved_needs_price/);
      const s = await insert(db, 'services', { name: 'Website 5–6 pages', price: 1700, price_approved: true });
      assert.equal(s.currency, 'NZD');
      await expectError(insert(db, 'services', { name: 'website 5–6 PAGES' }), /services_name_unique/);
    });
  });

  describe('weekly reviews', () => {
    test('metrics count the week and keep money per currency', async () => {
      const fresh = await createDb();
      const uid = await createUser(fresh, { role: 'admin' });
      const c = await insert(fresh, 'clients', { name: 'Acme', status: 'active' });
      const nzd = await insert(fresh, 'invoices', {
        client_id: c.id, invoice_number: 'INV-1', date: '2026-10-27', total: 1000, currency: 'NZD', status: 'Unpaid',
      });
      await insert(fresh, 'invoices', {
        client_id: c.id, invoice_number: 'INV-2', date: '2026-10-28', total: 50000, currency: 'LKR', status: 'Unpaid',
      });
      await insert(fresh, 'invoices', {
        client_id: c.id, invoice_number: 'INV-OLD', date: '2026-09-01', total: 999, currency: 'NZD', status: 'Unpaid',
      });
      await insert(fresh, 'payments', { invoice_id: nzd.id, payment_date: '2026-10-29', amount: 500 });
      await insert(fresh, 'deals', { client_id: c.id, title: 'Open', value: 3000, currency: 'NZD' });

      const m = (await one(fresh, `SELECT weekly_metrics('2026-10-30') AS m`)).m;
      assert.equal(m.week_start, '2026-10-24');
      assert.deepEqual(m.invoiced, { NZD: 1000, LKR: 50000 });
      assert.deepEqual(m.cash_received, { NZD: 500 });
      assert.deepEqual(m.open_pipeline, { NZD: 3000 });
      assert.equal(m.outstanding.NZD, 1499, "unpaid balance after the 500 payment + old invoice");

      const id1 = await asUser(fresh, uid, async () => (await one(fresh, `SELECT refresh_weekly_review('2026-10-30') AS id`)).id);
      const id2 = await asUser(fresh, uid, async () => (await one(fresh, `SELECT refresh_weekly_review('2026-10-30') AS id`)).id);
      assert.equal(id1, id2, 'refreshing keeps one review per week');
    });

    test('at most three priorities', async () => {
      const four = JSON.stringify([1, 2, 3, 4].map((n) => ({ title: `P${n}` })));
      await expectError(insert(db, 'weekly_reviews', { week_ending: '2026-11-06', priorities: four }), /check/i);
    });
  });

  describe('contractors and tasks', () => {
    test('task completed_at follows status, contractor link is optional', async () => {
      const k = await insert(db, 'contractors', { name: 'Dev Contractor', skills: '{react,supabase}' });
      const proj = await insert(db, 'projects', { name: 'Site build' });
      const t = await insert(db, 'tasks', {
        project_id: proj.id, title: 'Build contact form', contractor_id: k.id, definition_of_done: 'Form sends to WhatsApp',
      });
      assert.equal(t.completed_at, null);
      const done = await one(db, `UPDATE tasks SET status = 'done' WHERE id = $1 RETURNING *`, [t.id]);
      assert.ok(done.completed_at);
      const reopened = await one(db, `UPDATE tasks SET status = 'in_progress' WHERE id = $1 RETURNING *`, [t.id]);
      assert.equal(reopened.completed_at, null);
      assert.equal(proj.health, 'on_track');
    });
  });

  describe('client systems', () => {
    test('own systems have no client; kinds are checked', async () => {
      const own = await insert(db, 'client_systems', { kind: 'website', name: 'oreece.co.nz', url: 'https://www.oreece.co.nz' });
      assert.equal(own.client_id, null);
      await expectError(insert(db, 'client_systems', { kind: 'password', name: 'x' }), /check/i);
    });
  });

  describe('social approval queue', () => {
    async function pieceNeedingApproval() {
      const idea = await one(db, `
        INSERT INTO social.content_ideas (brand_id, source_type, title, topic_key)
        VALUES ((SELECT id FROM social.brands WHERE slug = 'oreece'), 'manual', 'HQ test', social.title_key('HQ test'))
        RETURNING id`);
      const piece = await one(db, `
        INSERT INTO social.content_pieces (idea_id, brand_id, platform, format, caption)
        VALUES ($1, (SELECT id FROM social.brands WHERE slug = 'oreece'), 'linkedin', 'text', 'Hello from HQ')
        RETURNING id`, [idea.id]);
      const step = (to) => db.query(`SELECT social.transition($1::jsonb)`, [
        JSON.stringify({ entity: 'content_piece', id: piece.id, to, workflow: 'test', execution_id: 'x' })]);
      await step('GENERATED');
      await step('QA');
      await db.query(`INSERT INTO social.qa_results (content_id, revision, overall, score, critical_failures)
                      VALUES ($1, 1, 'PASS', 0.9, 0)`, [piece.id]);
      await step('NEEDS_APPROVAL');
      const appr = await one(db, `INSERT INTO social.approvals (content_id, revision, channel)
                                  VALUES ($1, 1, 'telegram') RETURNING id`, [piece.id]);
      return { pieceId: piece.id, approvalId: appr.id };
    }

    test('team members see the queue and can approve; others cannot', async () => {
      const { pieceId, approvalId } = await pieceNeedingApproval();
      const queue = await asUser(db, admin, () => all(db, `SELECT * FROM social_queue()`));
      const row = queue.find((r) => r.content_id === pieceId);
      assert.equal(row.status, 'NEEDS_APPROVAL');
      assert.equal(row.approval_id, approvalId);

      const outsider = await createUser(db, { role: null });
      await expectError(asUser(db, outsider, () => db.query(`SELECT * FROM social_queue()`)), /permission/);
      await expectError(asUser(db, outsider, () => db.query(`SELECT social_decide($1, 'approve')`, [approvalId])), /permission/);

      await expectError(asUser(db, admin, () => db.query(`SELECT social_decide($1, 'changes')`, [approvalId])), /feedback/);
      const res = await asUser(db, admin, async () =>
        (await one(db, `SELECT social_decide($1, 'approve') AS r`, [approvalId])).r);
      assert.equal(res.applied, true);
      const piece = await one(db, `SELECT status FROM social.content_pieces WHERE id = $1`, [pieceId]);
      assert.equal(piece.status, 'APPROVED');
      const appr = await one(db, `SELECT decided_by FROM social.approvals WHERE id = $1`, [approvalId]);
      assert.equal(appr.decided_by, `platform:${admin}`);
    });
  });

  describe('row-level security', () => {
    test('team members can use HQ tables; others see nothing', async () => {
      await prospect(db, { business_name: 'RLS Visible' });
      const outsider = await createUser(db, { role: null });
      for (const table of ['prospects', 'services', 'weekly_reviews', 'contractors', 'client_systems']) {
        const rows = await asUser(db, outsider, () => all(db, `SELECT * FROM ${table}`));
        assert.equal(rows.length, 0, `${table} hidden from non-members`);
      }
      await expectError(
        asUser(db, outsider, () => db.query(`INSERT INTO prospects (business_name) VALUES ('x')`)),
        /row-level security/,
      );
      const visible = await asUser(db, admin, () => all(db, `SELECT * FROM prospects WHERE business_name = 'RLS Visible'`));
      assert.equal(visible.length, 1);
    });
  });
});

describe('hardening (20261025000002)', () => {
  test('signed-out callers cannot run actions; members can; NZD defaults', async () => {
    const db = await createDb();
    // The harness grants every function to every API role after migrating;
    // Supabase does that at creation instead, so re-apply the revokes.
    await applyMigration(db, '20261025000002_hq_hardening.sql');
    const admin = await createUser(db, { role: 'admin' });
    await db.exec(`SET ROLE anon`);
    await expectError(db.query(`SELECT convert_prospect(gen_random_uuid())`), /permission denied/);
    await expectError(db.query(`SELECT weekly_metrics('2026-10-30')`), /permission denied/);
    await db.exec(`RESET ROLE`);
    const m = await asUser(db, admin, async () => (await one(db, `SELECT weekly_metrics('2026-10-30') AS m`)).m);
    assert.equal(m.week_ending, '2026-10-30');
    const c = await one(db, `INSERT INTO clients (name) VALUES ('NZ Co') RETURNING id`);
    const d = await one(db, `INSERT INTO deals (client_id, title) VALUES ($1, 'x') RETURNING currency`, [c.id]);
    assert.equal(d.currency, 'NZD');
  });
});
