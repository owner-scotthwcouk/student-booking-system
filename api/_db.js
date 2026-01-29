// api/_db.js
// Uses @vercel/postgres via serverless fetch-based driver.
// In Vercel, add the "Vercel Postgres" integration and redeploy.

import { sql } from '@vercel/postgres';

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS tutors (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      rate_gbp NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;
}

export async function getTutor(tutorId) {
  await ensureSchema();
  const { rows } = await sql`SELECT id, display_name, rate_gbp FROM tutors WHERE id = ${tutorId} LIMIT 1;`;
  return rows[0] || null;
}

export async function upsertTutorRate(tutorId, rateGBP, displayName = null) {
  await ensureSchema();
  const { rows } = await sql`
    INSERT INTO tutors (id, display_name, rate_gbp)
    VALUES (${tutorId}, ${displayName}, ${rateGBP})
    ON CONFLICT (id) DO UPDATE SET
      rate_gbp = EXCLUDED.rate_gbp,
      display_name = COALESCE(EXCLUDED.display_name, tutors.display_name),
      updated_at = NOW()
    RETURNING id, display_name, rate_gbp;
  `;
  return rows[0];
}
