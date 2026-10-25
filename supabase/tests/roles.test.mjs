// Roles: 20261026000002_roles.sql
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, one, all, createUser, asUser, expectError } from './db.mjs';

describe('roles', () => {
  let db, admin, staff, accountant, client, invoice;
  before(async () => {
    db = await createDb();
    admin = await createUser(db, { role: 'admin', name: 'Founder' });
    staff = await createUser(db, { role: 'staff', name: 'Sales Person' });
    accountant = await createUser(db, { role: 'accountant', name: 'Accountant' });
    client = await asUser(db, admin, () => one(db, `INSERT INTO clients (name, company_name) VALUES ('C', 'Roles Ltd') RETURNING id`));
    invoice = await asUser(db, admin, () => one(db, `INSERT INTO invoices (client_id, invoice_number, total, currency) VALUES ($1, 'INV-R1', 100, 'NZD') RETURNING id`, [client.id]));
  });

  test('staff can sell but not delete money records or change prices', async () => {
    await asUser(db, staff, () => db.query(`INSERT INTO prospects (business_name) VALUES ('Staff lead')`));
    await asUser(db, staff, () => db.query(`INSERT INTO deals (client_id, title) VALUES ($1, 'Staff deal')`, [client.id]));
    const del = await asUser(db, staff, () => db.query(`DELETE FROM invoices WHERE id = $1`, [invoice.id]));
    assert.equal(del.affectedRows ?? 0, 0);
    assert.ok(await one(db, `SELECT id FROM invoices WHERE id = $1`, [invoice.id]));
    await expectError(asUser(db, staff, () => db.query(`INSERT INTO services (name, price) VALUES ('Cheap', 1)`)), /row-level security/);
  });

  test('accountant reads everything, bills, but cannot sell or delete', async () => {
    const seen = await asUser(db, accountant, () => all(db, `SELECT id FROM clients`));
    assert.ok(seen.length >= 1);
    await asUser(db, accountant, () => db.query(`INSERT INTO payments (invoice_id, amount) VALUES ($1, 50)`, [invoice.id]));
    await asUser(db, accountant, () => db.query(`UPDATE invoices SET notes = 'Checked' WHERE id = $1`, [invoice.id]));
    await expectError(asUser(db, accountant, () => db.query(`INSERT INTO prospects (business_name) VALUES ('No')`)), /row-level security/);
    await expectError(asUser(db, accountant, () => db.query(`INSERT INTO clients (name) VALUES ('No')`)), /row-level security/);
    const upd = await asUser(db, accountant, () => db.query(`UPDATE clients SET name = 'Hacked' WHERE id = $1`, [client.id]));
    assert.equal(upd.affectedRows ?? 0, 0);
  });

  test('admin can delete; team management is admin-only and cannot lock out', async () => {
    const team = await asUser(db, admin, () => all(db, `SELECT * FROM team_members()`));
    assert.ok(team.find((m) => m.user_id === staff).roles.includes('staff'));
    await expectError(asUser(db, staff, () => db.query(`SELECT * FROM team_members()`)), /Only admins/);
    await expectError(asUser(db, staff, () => db.query(`SELECT set_member_role($1, 'admin')`, [staff])), /Only admins/);
    await expectError(asUser(db, admin, () => db.query(`SELECT set_member_role($1, 'staff')`, [admin])), /own admin access/);
    await asUser(db, admin, () => db.query(`SELECT set_member_role($1, 'accountant')`, [staff]));
    assert.deepEqual((await all(db, `SELECT role::text FROM user_roles WHERE user_id = $1`, [staff])).map((r) => r.role), ['accountant']);
    await asUser(db, admin, () => db.query(`SELECT set_member_role($1, NULL)`, [staff]));
    assert.equal((await all(db, `SELECT 1 FROM user_roles WHERE user_id = $1`, [staff])).length, 0);
    const p = await asUser(db, admin, () => one(db, `INSERT INTO prospects (business_name) VALUES ('Delete me') RETURNING id`));
    await asUser(db, admin, () => db.query(`DELETE FROM prospects WHERE id = $1`, [p.id]));
    assert.equal(await one(db, `SELECT id FROM prospects WHERE id = $1`, [p.id]), undefined);
  });
});
