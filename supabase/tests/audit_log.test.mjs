// Audit trail: 20261026000001_audit_log.sql
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, one, all, createUser, asUser, expectError } from './db.mjs';

describe('audit log', () => {
  let db;
  let admin;
  before(async () => {
    db = await createDb();
    admin = await createUser(db, { role: 'admin', name: 'Founder' });
  });

  test('records insert, field-level update and delete with the user', async () => {
    const client = await asUser(db, admin, () => one(db, `INSERT INTO clients (name, company_name, status) VALUES ('Ana', 'Audit Co', 'lead') RETURNING id`));
    await asUser(db, admin, () => db.query(`UPDATE clients SET status = 'active', email = 'a@b.test' WHERE id = $1`, [client.id]));
    await asUser(db, admin, () => db.query(`UPDATE clients SET name = name WHERE id = $1`, [client.id])); // no real change
    const rows = await all(db, `SELECT action, changes, label, changed_by FROM audit_log WHERE table_name = 'clients' AND record_id = $1 ORDER BY id`, [client.id]);
    assert.deepEqual(rows.map((r) => r.action), ['insert', 'update']);
    assert.equal(rows[0].label, 'Audit Co');
    assert.equal(rows[0].changed_by, admin);
    assert.deepEqual(rows[1].changes.status, ['lead', 'active']);
    assert.deepEqual(rows[1].changes.email, [null, 'a@b.test']);
    assert.equal(rows[1].changes.updated_at, undefined, 'updated_at is not a business change');
  });

  test('money changes are traced: invoice and payment', async () => {
    const c = await one(db, `INSERT INTO clients (name) VALUES ('Payer') RETURNING id`);
    const inv = await asUser(db, admin, () => one(db, `INSERT INTO invoices (client_id, invoice_number, total, currency) VALUES ($1, 'INV-A1', 500, 'NZD') RETURNING id`, [c.id]));
    await asUser(db, admin, () => db.query(`INSERT INTO payments (invoice_id, amount, reference) VALUES ($1, 200, 'Deposit')`, [inv.id]));
    const pay = await one(db, `SELECT label, changes->>'amount' AS amount FROM audit_log WHERE table_name = 'payments' ORDER BY id DESC LIMIT 1`);
    assert.equal(pay.label, 'Deposit');
    assert.equal(Number(pay.amount), 200);
    const invRows = await all(db, `SELECT action, label FROM audit_log WHERE table_name = 'invoices' AND record_id = $1`, [inv.id]);
    assert.ok(invRows.some((r) => r.action === 'insert' && r.label === 'INV-A1'));
  });

  test('deletes are kept with the old row', async () => {
    const svc = await asUser(db, admin, () => one(db, `INSERT INTO services (name, price) VALUES ('Temp service', 10) RETURNING id`));
    await asUser(db, admin, () => db.query(`DELETE FROM services WHERE id = $1`, [svc.id]));
    const del = await one(db, `SELECT changes->>'name' AS name FROM audit_log WHERE table_name = 'services' AND record_id = $1 AND action = 'delete'`, [svc.id]);
    assert.equal(del.name, 'Temp service');
  });

  test('nobody can edit or remove audit entries; outsiders cannot read them', async () => {
    const before = (await one(db, `SELECT count(*)::int AS n FROM audit_log`)).n;
    await asUser(db, admin, async () => {
      await db.query(`UPDATE audit_log SET label = 'tampered'`).catch(() => {});
      await db.query(`DELETE FROM audit_log`).catch(() => {});
      await db.query(`INSERT INTO audit_log (table_name, action) VALUES ('x', 'insert')`).catch(() => {});
    });
    assert.equal((await one(db, `SELECT count(*)::int AS n FROM audit_log`)).n, before);
    assert.equal((await one(db, `SELECT count(*)::int AS n FROM audit_log WHERE label = 'tampered'`)).n, 0);
    const visible = await asUser(db, admin, () => all(db, `SELECT id FROM audit_log`));
    assert.equal(visible.length, before);
    const outsider = await createUser(db, { role: null });
    const hidden = await asUser(db, outsider, () => all(db, `SELECT id FROM audit_log`));
    assert.equal(hidden.length, 0);
    await expectError(asUser(db, outsider, () => db.query(`INSERT INTO audit_log (table_name, action) VALUES ('x', 'insert')`)), /row-level security|permission/);
  });
});
