// Boots an in-memory Postgres (PGlite) with the Supabase stubs and every
// migration in supabase/migrations, in filename order.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const supabaseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(supabaseDir, 'migrations');

export async function migrationFiles() {
  return (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
}

// `until`: stop before the first migration whose filename sorts >= it.
export async function createDb({ until } = {}) {
  const db = new PGlite();
  await db.exec(await readFile(path.join(supabaseDir, 'tests/supabase_stubs.sql'), 'utf8'));
  for (const file of await migrationFiles()) {
    if (until && file >= until) break;
    await applyMigration(db, file);
  }
  await grantApiRoles(db);
  return db;
}

export async function applyMigration(db, file) {
  try {
    await db.exec(await readFile(path.join(migrationsDir, file), 'utf8'));
  } catch (err) {
    err.message = `Migration ${file} failed: ${err.message}`;
    throw err;
  }
}

// Supabase grants table access to the API roles by default; RLS decides rows.
export async function grantApiRoles(db) {
  await db.exec(`
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
  `);
}

export async function one(db, sql, params = []) {
  const res = await db.query(sql, params);
  return res.rows[0];
}

export async function all(db, sql, params = []) {
  return (await db.query(sql, params)).rows;
}

// Creates an auth user (the signup trigger adds a profile) and, unless
// `role` is null, makes them a team member.
export async function createUser(db, { role = 'staff', name = 'Test User' } = {}) {
  const user = await one(
    db,
    `INSERT INTO auth.users (email, raw_user_meta_data) VALUES ($1, $2) RETURNING id`,
    [`${crypto.randomUUID()}@example.com`, JSON.stringify({ full_name: name })],
  );
  if (role) {
    await db.query(`INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)`, [user.id, role]);
  }
  return user.id;
}

// Runs `fn` as a signed-in API user: role `authenticated`, RLS enforced.
export async function asUser(db, userId, fn) {
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  await db.exec(`SET ROLE authenticated`);
  try {
    return await fn();
  } finally {
    await db.exec(`RESET ROLE`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  }
}

// Asserts that a promise rejects with a message matching `pattern`.
export async function expectError(promise, pattern) {
  try {
    await promise;
  } catch (err) {
    if (pattern && !pattern.test(err.message)) {
      throw new Error(`Expected error matching ${pattern}, got: ${err.message}`);
    }
    return err;
  }
  throw new Error(`Expected an error matching ${pattern}, but the call succeeded`);
}
