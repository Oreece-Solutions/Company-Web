// Money: 20261101000001_money.sql
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, one, all, createUser, asUser, expectError } from './db.mjs';

describe('Money', () => {
  let db;
  let founder;
  let rep;
  let accountant;
  let nobody;
  let client;
  before(async () => {
    db = await createDb();
    founder = await createUser(db, { role: 'admin', name: 'Founder' });
    rep = await createUser(db, { role: 'staff', name: 'Rep' });
    accountant = await createUser(db, { role: 'accountant', name: 'Accounts' });
    nobody = await createUser(db, { role: null, name: 'No role' });
    client = (await asUser(db, founder, () => one(db, `INSERT INTO clients (name) VALUES ('Sparkle Cleaning') RETURNING id`))).id;
  });

  const addRetainer = (who, fields = {}) => asUser(db, who, () => one(db,
    `INSERT INTO retainers (client_id, name, amount, billing_interval, next_invoice_date, start_date, end_date, currency)
     VALUES ($1, $2, $3, $4, $5, $5, $6, $7) RETURNING *`,
    [client, fields.name ?? 'Website care plan', fields.amount ?? 150, fields.interval ?? 'monthly',
     fields.next ?? '2026-09-01', fields.end ?? null, fields.currency ?? 'NZD']));

  test('due retainers become invoices, one per missed period, and move to the next date', async () => {
    const r = await addRetainer(accountant, { next: '2026-09-01' });
    const made = await asUser(db, accountant, () => one(db, `SELECT invoice_due_retainers('2026-10-15') AS n`));
    assert.equal(made.n, 2);
    const invoices = await all(db, `SELECT date::text, due_date::text, total, status, retainer_id, items FROM invoices WHERE retainer_id = $1 ORDER BY date`, [r.id]);
    assert.deepEqual(invoices.map((i) => i.date), ['2026-09-01', '2026-10-01']);
    assert.equal(invoices[0].due_date, '2026-09-15');
    assert.equal(Number(invoices[0].total), 150);
    assert.equal(invoices[0].status, 'Unpaid');
    assert.match(invoices[0].items[0].description, /Website care plan \(01 Sep 2026 – 30 Sep 2026\)/);
    const after = await one(db, `SELECT next_invoice_date::text AS next, last_invoice_id FROM retainers WHERE id = $1`, [r.id]);
    assert.equal(after.next, '2026-11-01');
    assert.ok(after.last_invoice_id);
    // Running again the same day makes nothing new.
    const again = await asUser(db, accountant, () => one(db, `SELECT invoice_due_retainers('2026-10-15') AS n`));
    assert.equal(again.n, 0);
  });

  test('paused retainers are skipped; a retainer past its end date ends', async () => {
    const paused = await addRetainer(founder, { name: 'Paused plan', next: '2026-10-01' });
    await asUser(db, founder, () => db.query(`UPDATE retainers SET status = 'paused' WHERE id = $1`, [paused.id]));
    const ending = await addRetainer(founder, { name: 'Quarterly SEO', interval: 'quarterly', next: '2026-07-01', end: '2026-09-30' });
    await asUser(db, founder, () => db.query(`SELECT invoice_due_retainers('2026-12-31')`));
    assert.equal((await all(db, `SELECT 1 FROM invoices WHERE retainer_id = $1`, [paused.id])).length, 0);
    assert.equal((await all(db, `SELECT 1 FROM invoices WHERE retainer_id = $1`, [ending.id])).length, 1);
    assert.equal((await one(db, `SELECT status FROM retainers WHERE id = $1`, [ending.id])).status, 'ended');
  });

  test('only billing roles see or invoice retainers; only admins delete', async () => {
    const r = await addRetainer(founder, { name: 'Hosting', next: '2027-01-01' });
    assert.equal((await asUser(db, nobody, () => all(db, `SELECT id FROM retainers`))).length, 0);
    await expectError(asUser(db, nobody, () => db.query(`SELECT invoice_due_retainers()`)), /Only admin, staff or accountant/);
    await asUser(db, accountant, () => db.query(`DELETE FROM retainers WHERE id = $1`, [r.id]));
    assert.ok(await one(db, `SELECT id FROM retainers WHERE id = $1`, [r.id]), 'accountant delete must not remove it');
    await asUser(db, founder, () => db.query(`DELETE FROM retainers WHERE id = $1`, [r.id]));
    assert.equal((await all(db, `SELECT id FROM retainers WHERE id = $1`, [r.id])).length, 0);
    await expectError(addRetainer(founder, { amount: 0 }), /retainers_amount_check|check/);
  });

  test('expenses: billing roles record them, only admins delete, no role sees nothing', async () => {
    const e = await asUser(db, rep, () => one(db,
      `INSERT INTO expenses (supplier, category, amount, spent_on) VALUES ('Vercel', 'hosting', 46, '2026-10-05') RETURNING *`));
    assert.equal(e.created_by, rep);
    assert.equal(e.gst_claimable, true);
    assert.equal((await asUser(db, nobody, () => all(db, `SELECT id FROM expenses`))).length, 0);
    await asUser(db, rep, () => db.query(`DELETE FROM expenses WHERE id = $1`, [e.id]));
    assert.ok(await one(db, `SELECT id FROM expenses WHERE id = $1`, [e.id]));
    await expectError(asUser(db, rep, () => db.query(`INSERT INTO expenses (supplier, amount, category) VALUES ('X', 10, 'snacks')`)), /check/);
  });

  test('GST summary: payments basis, NZD only, claimable purchases', async () => {
    const fresh = await createDb();
    const admin = await createUser(fresh, { role: 'admin' });
    await asUser(fresh, admin, async () => {
      const c = await one(fresh, `INSERT INTO clients (name) VALUES ('Client') RETURNING id`);
      await fresh.query(`INSERT INTO company_settings (name) SELECT 'Oreece' WHERE NOT EXISTS (SELECT 1 FROM company_settings)`);
      const nz = await one(fresh, `INSERT INTO invoices (client_id, invoice_number, total, subtotal, currency, date) VALUES ($1, 'INV-1', 1150, 1150, 'NZD', '2026-09-20') RETURNING id`, [c.id]);
      const lk = await one(fresh, `INSERT INTO invoices (client_id, invoice_number, total, subtotal, currency, date) VALUES ($1, 'INV-2', 500, 500, 'USD', '2026-10-02') RETURNING id`, [c.id]);
      await fresh.query(`INSERT INTO payments (invoice_id, amount, payment_date) VALUES ($1, 1150, '2026-10-03'), ($2, 500, '2026-10-04')`, [nz.id, lk.id]);
      await fresh.query(`INSERT INTO expenses (supplier, amount, spent_on, gst_claimable) VALUES ('Software', 230, '2026-10-10', true), ('Bank', 20, '2026-10-11', false), ('Old', 999, '2026-08-01', true)`);
    });
    const s = (await asUser(fresh, admin, () => one(fresh, `SELECT gst_summary('2026-10-01', '2026-10-31') AS s`))).s;
    assert.equal(s.basis, 'payments');
    assert.equal(s.registered, false);
    assert.equal(Number(s.sales_incl), 1150);
    assert.equal(Number(s.zero_rated_sales), 500);
    assert.equal(Number(s.gst_on_sales), 150);
    assert.equal(Number(s.gst_on_purchases), 30);
    assert.equal(Number(s.purchases_not_claimable), 20);
    assert.equal(Number(s.gst_to_pay), 120);

    // Invoice basis counts the invoice date instead (September here).
    await asUser(fresh, admin, () => fresh.query(`UPDATE company_settings SET gst_basis = 'invoice', gst_registered = true`));
    const inv = (await asUser(fresh, admin, () => one(fresh, `SELECT gst_summary('2026-10-01', '2026-10-31') AS s`))).s;
    assert.equal(Number(inv.sales_incl), 0);
    assert.equal(Number(inv.zero_rated_sales), 500);
    assert.equal(inv.registered, true);
  });

  test('changes to retainers and expenses are in the audit trail', async () => {
    const r = await addRetainer(founder, { name: 'Audited plan', next: '2027-02-01' });
    const rows = await all(db, `SELECT action FROM audit_log WHERE table_name = 'retainers' AND record_id = $1`, [r.id]);
    assert.ok(rows.length >= 1);
  });
});
