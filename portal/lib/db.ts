import { Pool } from "pg";

// One pool per server process; Next's dev reloads would otherwise open a new one each time.
const g = globalThis as unknown as { __portalPool?: Pool };

export const pool = (g.__portalPool ??= new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 20_000,
}));

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const fail = (message: string, status = 400) => Response.json({ error: message }, { status });
