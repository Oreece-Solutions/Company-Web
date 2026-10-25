// Phase A Sales CRM: 20261003000001_crm_sales.sql
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, applyMigration, grantApiRoles, one, all, createUser, asUser, expectError } from './db.mjs';

const CRM_MIGRATION = '20261003000001_crm_sales.sql';

async function makeClient(db, fields = {}) {
  return one(
    db,
    `INSERT INTO clients (name, company_name, email, phone, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      fields.name ?? 'Ana Silva',
      fields.company_name ?? 'Acme Ltd',
      fields.email ?? 'ana@acme.test',
      fields.phone ?? '+64 21 000 000',
      fields.status ?? 'lead',
    ],
  );
}

async function makeDeal(db, clientId, fields = {}) {
  const cols = { client_id: clientId, title: 'Website rebuild', ...fields };
  const keys = Object.keys(cols);
  return one(
    db,
    `INSERT INTO deals (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    Object.values(cols),
  );
}

const ITEMS = [
  { description: 'Discovery workshop', quantity: 1, unit_price: 1500 },
  { description: 'Development', quantity: 40, unit_price: 120.5 },
];

async function makeQuote(db, clientId, fields = {}) {
  const cols = { client_id: clientId, title: 'Website', items: JSON.stringify(ITEMS), ...fields };
  const keys = Object.keys(cols);
  return one(
    db,
    `INSERT INTO quotes (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    Object.values(cols),
  );
}

describe('migration', () => {
  test('backfills a primary contact for every existing account', async () => {
    const db = await createDb({ until: CRM_MIGRATION });
    await db.exec(`
      INSERT INTO clients (name, company_name, email, phone) VALUES
        ('Ana Silva', 'Acme', 'ana@acme.test', '021'),
        ('Ben Lee', NULL, NULL, NULL);
    `);
    await applyMigration(db, CRM_MIGRATION);
    await grantApiRoles(db);

    const contacts = await all(db, `
      SELECT c.full_name, c.email, c.is_primary, cl.name AS client_name
      FROM contacts c JOIN clients cl ON cl.id = c.client_id ORDER BY c.full_name`);
    assert.deepEqual(contacts, [
      { full_name: 'Ana Silva', email: 'ana@acme.test', is_primary: true, client_name: 'Ana Silva' },
      { full_name: 'Ben Lee', email: null, is_primary: true, client_name: 'Ben Lee' },
    ]);
    const inv = await one(db, `SELECT column_default FROM information_schema.columns
      WHERE table_name = 'invoices' AND column_name = 'currency'`);
    assert.match(inv.column_default, /LKR/);
  });
});

describe('Sales CRM', () => {
  let db;
  before(async () => {
    db = await createDb();
  });

  describe('accounts and contacts', () => {
    test('a new account (e.g. from the website form) gets a primary contact', async () => {
      const client = await makeClient(db, { name: 'Website Lead', email: 'lead@x.test' });
      const contacts = await all(db, `SELECT full_name, email, is_primary FROM contacts WHERE client_id = $1`, [client.id]);
      assert.deepEqual(contacts, [{ full_name: 'Website Lead', email: 'lead@x.test', is_primary: true }]);
    });

    test('an account has at most one primary contact', async () => {
      const client = await makeClient(db);
      await expectError(
        db.query(`INSERT INTO contacts (client_id, full_name, is_primary) VALUES ($1, 'Second', true)`, [client.id]),
        /contacts_one_primary_per_client/,
      );
      await db.query(`INSERT INTO contacts (client_id, full_name) VALUES ($1, 'Second')`, [client.id]);
    });
  });

  describe('deals', () => {
    test('probability follows the stage unless set explicitly', async () => {
      const client = await makeClient(db);
      const deal = await makeDeal(db, client.id);
      assert.equal(deal.probability, 10);

      let row = await one(db, `UPDATE deals SET stage = 'proposal' WHERE id = $1 RETURNING probability`, [deal.id]);
      assert.equal(row.probability, 50);

      row = await one(db, `UPDATE deals SET stage = 'negotiation', probability = 60 WHERE id = $1 RETURNING probability`, [deal.id]);
      assert.equal(row.probability, 60);

      const custom = await makeDeal(db, client.id, { stage: 'qualified', probability: 40 });
      assert.equal(custom.probability, 40);
    });

    test('records every stage change and moves the account along', async () => {
      const client = await makeClient(db, { status: 'lead' });
      const deal = await makeDeal(db, client.id);
      await db.query(`UPDATE deals SET stage = 'qualified' WHERE id = $1`, [deal.id]);
      assert.equal((await one(db, `SELECT status FROM clients WHERE id = $1`, [client.id])).status, 'prospect');

      await db.query(`UPDATE deals SET title = 'Renamed' WHERE id = $1`, [deal.id]);
      await db.query(`UPDATE deals SET stage = 'won' WHERE id = $1`, [deal.id]);
      assert.equal((await one(db, `SELECT status FROM clients WHERE id = $1`, [client.id])).status, 'active');

      const history = await all(db, `SELECT from_stage, to_stage FROM deal_stage_changes WHERE deal_id = $1 ORDER BY changed_at, to_stage`, [deal.id]);
      assert.deepEqual(history, [
        { from_stage: null, to_stage: 'lead' },
        { from_stage: 'lead', to_stage: 'qualified' },
        { from_stage: 'qualified', to_stage: 'won' },
      ]);
    });

    test('a lost deal needs a reason; closing sets closed_at, reopening clears it', async () => {
      const client = await makeClient(db);
      const deal = await makeDeal(db, client.id);
      await expectError(db.query(`UPDATE deals SET stage = 'lost' WHERE id = $1`, [deal.id]), /deals_lost_needs_reason/);

      let row = await one(db, `UPDATE deals SET stage = 'lost', lost_reason = 'Budget' WHERE id = $1 RETURNING *`, [deal.id]);
      assert.ok(row.closed_at);
      assert.equal(row.probability, 0);

      row = await one(db, `UPDATE deals SET stage = 'proposal' WHERE id = $1 RETURNING *`, [deal.id]);
      assert.equal(row.closed_at, null);
      assert.equal(row.lost_reason, null);
    });

    test("a deal's contact must belong to the same account", async () => {
      const a = await makeClient(db);
      const b = await makeClient(db);
      const bContact = await one(db, `SELECT id FROM contacts WHERE client_id = $1`, [b.id]);
      await expectError(makeDeal(db, a.id, { contact_id: bContact.id }), /foreign key/);
    });

    test('win_deal marks the deal won and opens one project for it', async () => {
      const client = await makeClient(db, { status: 'prospect' });
      const deal = await makeDeal(db, client.id, { value: 25000, stage: 'negotiation' });
      const { win_deal: projectId } = await one(db, `SELECT win_deal($1)`, [deal.id]);
      assert.ok(projectId);

      const project = await one(db, `SELECT client_id, name, budget, status FROM projects WHERE id = $1`, [projectId]);
      assert.deepEqual(project, { client_id: client.id, name: 'Website rebuild', budget: '25000.00', status: 'planning' });
      const after = await one(db, `SELECT stage, project_id FROM deals WHERE id = $1`, [deal.id]);
      assert.deepEqual(after, { stage: 'won', project_id: projectId });

      const again = await one(db, `SELECT win_deal($1)`, [deal.id]);
      assert.equal(again.win_deal, projectId);
      assert.equal((await one(db, `SELECT count(*)::int AS n FROM projects WHERE client_id = $1`, [client.id])).n, 1);
    });

    test('win_deal without a project leaves project_id empty', async () => {
      const client = await makeClient(db);
      const deal = await makeDeal(db, client.id);
      const res = await one(db, `SELECT win_deal($1, false)`, [deal.id]);
      assert.equal(res.win_deal, null);
      assert.equal((await one(db, `SELECT stage FROM deals WHERE id = $1`, [deal.id])).stage, 'won');
    });
  });

  describe('activities and follow-ups', () => {
    test('calls, emails and meetings update last_contacted_at; notes do not', async () => {
      const client = await makeClient(db);
      await db.query(`INSERT INTO activities (client_id, type, note) VALUES ($1, 'note', 'internal')`, [client.id]);
      assert.equal((await one(db, `SELECT last_contacted_at FROM clients WHERE id = $1`, [client.id])).last_contacted_at, null);

      await db.query(`INSERT INTO activities (client_id, type, note) VALUES ($1, 'call', 'Intro call')`, [client.id]);
      assert.ok((await one(db, `SELECT last_contacted_at FROM clients WHERE id = $1`, [client.id])).last_contacted_at);

      await expectError(
        db.query(`INSERT INTO activities (client_id, type, note) VALUES ($1, 'sms', 'x')`, [client.id]),
        /activities_type_check/,
      );
    });

    test('a follow-up or activity on a deal must belong to that deal\'s account', async () => {
      const a = await makeClient(db);
      const b = await makeClient(db);
      const deal = await makeDeal(db, a.id);
      await expectError(
        db.query(`INSERT INTO follow_ups (client_id, deal_id, title, due_date) VALUES ($1, $2, 'Call', CURRENT_DATE)`, [b.id, deal.id]),
        /foreign key/,
      );
      await expectError(
        db.query(`INSERT INTO activities (client_id, deal_id, type, note) VALUES ($1, $2, 'note', 'x')`, [b.id, deal.id]),
        /foreign key/,
      );
      await db.query(`INSERT INTO follow_ups (client_id, deal_id, title, due_date) VALUES ($1, $2, 'Call', CURRENT_DATE)`, [a.id, deal.id]);
    });

    test('deleting a deal keeps its activities but drops its follow-ups', async () => {
      const client = await makeClient(db);
      const deal = await makeDeal(db, client.id);
      await db.query(`INSERT INTO activities (client_id, deal_id, type, note) VALUES ($1, $2, 'note', 'kept')`, [client.id, deal.id]);
      await db.query(`INSERT INTO follow_ups (client_id, deal_id, title, due_date) VALUES ($1, $2, 'Gone', CURRENT_DATE)`, [client.id, deal.id]);
      await db.query(`DELETE FROM deals WHERE id = $1`, [deal.id]);
      const act = await one(db, `SELECT client_id, deal_id FROM activities WHERE note = 'kept' AND client_id = $1`, [client.id]);
      assert.deepEqual(act, { client_id: client.id, deal_id: null });
      assert.equal((await one(db, `SELECT count(*)::int AS n FROM follow_ups WHERE client_id = $1`, [client.id])).n, 0);
    });
  });

  describe('quotes', () => {
    test('totals are computed from line items, ignoring values sent by the browser', async () => {
      const client = await makeClient(db);
      const quote = await makeQuote(db, client.id, { discount: 320, tax_rate: 15, subtotal: 1, total: 1 });
      // 1500 + 40 * 120.5 = 6320; less 320 = 6000; 15% tax = 900
      assert.equal(quote.subtotal, '6320.00');
      assert.equal(quote.tax_amount, '900.00');
      assert.equal(quote.total, '6900.00');
      assert.match(quote.quote_number, /^Q-\d{4}-\d{4}$/);
      assert.equal(quote.status, 'draft');
    });

    test('rejects bad lines and a discount above the subtotal', async () => {
      const client = await makeClient(db);
      await expectError(makeQuote(db, client.id, { items: JSON.stringify([{ description: '', quantity: 1, unit_price: 1 }]) }), /description/);
      await expectError(makeQuote(db, client.id, { items: JSON.stringify([{ description: 'x', quantity: 0, unit_price: 1 }]) }), /positive/);
      await expectError(makeQuote(db, client.id, { items: JSON.stringify([{ description: 'x', quantity: '2', unit_price: 1 }]) }), /quantity/);
      await expectError(makeQuote(db, client.id, { discount: 99999 }), /Discount/);
    });

    test('quote numbers are unique and sending stamps sent_at', async () => {
      const client = await makeClient(db);
      const a = await makeQuote(db, client.id);
      const b = await makeQuote(db, client.id);
      assert.notEqual(a.quote_number, b.quote_number);
      const sent = await one(db, `UPDATE quotes SET status = 'sent' WHERE id = $1 RETURNING sent_at, decided_at`, [a.id]);
      assert.ok(sent.sent_at);
      assert.equal(sent.decided_at, null);
    });

    test('an account with quotes cannot be deleted', async () => {
      const client = await makeClient(db);
      await makeQuote(db, client.id);
      await expectError(db.query(`DELETE FROM clients WHERE id = $1`, [client.id]), /foreign key/);
    });

    test('convert_quote_to_invoice builds the invoice once and freezes the quote', async () => {
      const client = await makeClient(db);
      const deal = await makeDeal(db, client.id);
      const { win_deal: projectId } = await one(db, `SELECT win_deal($1)`, [deal.id]);
      const quote = await makeQuote(db, client.id, { deal_id: deal.id, discount: 320, tax_rate: 15, currency: 'NZD' });

      await expectError(one(db, `SELECT convert_quote_to_invoice($1)`, [quote.id]), /sent or accepted/);
      await db.query(`UPDATE quotes SET status = 'sent' WHERE id = $1`, [quote.id]);

      const { convert_quote_to_invoice: invoiceId } = await one(db, `SELECT convert_quote_to_invoice($1)`, [quote.id]);
      const invoice = await one(db, `SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
      assert.equal(invoice.client_id, client.id);
      assert.equal(invoice.project_id, projectId);
      assert.equal(invoice.currency, 'NZD');
      assert.equal(invoice.total, '6900.00');
      assert.equal(invoice.status, 'Unpaid');
      assert.match(invoice.invoice_number, /^INV-\d{4}-\d{4}$/);
      assert.deepEqual(invoice.items, [
        { id: 'item-0', description: 'Discovery workshop', amount: 1500 },
        { id: 'item-1', description: 'Development (40 × 120.5)', amount: 4820 },
        { id: 'item-2', description: 'Discount', amount: -320 },
        { id: 'item-3', description: 'Tax (15%)', amount: 900 },
      ]);
      const lineSum = invoice.items.reduce((s, i) => s + i.amount, 0);
      assert.equal(lineSum, 6900);

      const q = await one(db, `SELECT status, invoice_id, decided_at FROM quotes WHERE id = $1`, [quote.id]);
      assert.equal(q.status, 'accepted');
      assert.equal(q.invoice_id, invoiceId);
      assert.ok(q.decided_at);

      const again = await one(db, `SELECT convert_quote_to_invoice($1)`, [quote.id]);
      assert.equal(again.convert_quote_to_invoice, invoiceId);
      assert.equal((await one(db, `SELECT count(*)::int AS n FROM invoices WHERE client_id = $1`, [client.id])).n, 1);

      await expectError(db.query(`UPDATE quotes SET discount = 0 WHERE id = $1`, [quote.id]), /invoiced/);
      await db.query(`UPDATE quotes SET notes = 'Signed copy received' WHERE id = $1`, [quote.id]);
    });

    test('payments on a converted invoice still settle it', async () => {
      const client = await makeClient(db);
      const quote = await makeQuote(db, client.id, { status: 'accepted' });
      const { convert_quote_to_invoice: invoiceId } = await one(db, `SELECT convert_quote_to_invoice($1)`, [quote.id]);
      await db.query(`INSERT INTO payments (invoice_id, amount) VALUES ($1, 6320)`, [invoiceId]);
      assert.equal((await one(db, `SELECT status FROM invoices WHERE id = $1`, [invoiceId])).status, 'Paid');
    });
  });

  describe('row-level security', () => {
    test('team members can work with CRM data; others see nothing', async () => {
      const staff = await createUser(db, { role: 'staff' });
      const outsider = await createUser(db, { role: null });

      const created = await asUser(db, staff, async () => {
        const client = await makeClient(db, { name: 'RLS Co' });
        const deal = await makeDeal(db, client.id, { owner_id: staff, created_by: staff });
        await db.query(`UPDATE deals SET stage = 'proposal' WHERE id = $1`, [deal.id]);
        const quote = await makeQuote(db, client.id, { deal_id: deal.id, status: 'sent' });
        const inv = await one(db, `SELECT convert_quote_to_invoice($1) AS id`, [quote.id]);
        const history = await all(db, `SELECT to_stage, changed_by FROM deal_stage_changes WHERE deal_id = $1 ORDER BY changed_at`, [deal.id]);
        assert.deepEqual(history.map((h) => h.to_stage), ['lead', 'proposal']);
        assert.ok(history.every((h) => h.changed_by === staff));
        const invoice = await one(db, `SELECT user_id FROM invoices WHERE id = $1`, [inv.id]);
        assert.equal(invoice.user_id, staff);
        return { client, deal };
      });

      await asUser(db, outsider, async () => {
        for (const table of ['clients', 'contacts', 'deals', 'deal_stage_changes', 'follow_ups', 'quotes']) {
          const { n } = await one(db, `SELECT count(*)::int AS n FROM ${table}`);
          assert.equal(n, 0, `${table} visible to a non-member`);
        }
        await expectError(makeDeal(db, created.client.id), /row-level security/);
      });

      await asUser(db, staff, async () => {
        await expectError(
          db.query(`INSERT INTO deal_stage_changes (deal_id, to_stage) VALUES ($1, 'won')`, [created.deal.id]),
          /row-level security/,
        );
      });
    });
  });
});
