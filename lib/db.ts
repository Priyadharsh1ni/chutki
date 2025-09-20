import pkg from "pg";
import type { QueryResultRow } from "pg";
import type { Menu } from "./schema";

declare global {
  var _pgPool: import("pg").Pool | undefined;
}

const { Pool } = pkg;

// Ensure DATABASE_URL is set
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Postgres connection string not set. Define DATABASE_URL in environment variables."
  );
}

// Use a global pool for serverless to prevent exhausting connections
let pool: import("pg").Pool;

if (!globalThis._pgPool) {
  globalThis._pgPool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 5, // serverless-safe
  });
}

pool = globalThis._pgPool;

// Generic query function
export async function query<T extends QueryResultRow>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  return pool.query<T>(text, params);
}

// Ensure menus table exists
export async function ensureTables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS menus (
      id SERIAL PRIMARY KEY,
      vendor TEXT NULL,
      currency TEXT NULL,
      items JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

// Insert a new menu
export async function insertMenu(menu: Menu): Promise<number> {
  const itemsJson = JSON.stringify(menu.items ?? []);
  const { rows } = await query<{ id: number }>(
    `
    INSERT INTO menus (vendor, currency, items)
    VALUES ($1, $2, $3::jsonb)
    RETURNING id
    `,
    [menu.vendor ?? null, menu.currency ?? null, itemsJson]
  );
  return rows[0].id;
}

// List menus
export type MenuListRow = {
  id: number;
  vendor: string | null;
  currency: string | null;
  created_at: string;
};

export async function listMenus(limit = 20): Promise<MenuListRow[]> {
  const { rows } = await query<MenuListRow>(
    `
    SELECT id, vendor, currency, created_at
    FROM menus
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    vendor: r.vendor,
    currency: r.currency,
    created_at: new Date(r.created_at).toISOString(),
  }));
}

// Get single menu
export type MenuRow = {
  id: number;
  vendor: string | null;
  currency: string | null;
  items: any[];
  created_at: string;
};

export async function getMenu(id: number): Promise<MenuRow | null> {
  const { rows } = await query(
    `
    SELECT id, vendor, currency, items, created_at
    FROM menus
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    vendor: row.vendor,
    currency: row.currency,
    items: Array.isArray(row.items) ? row.items : row.items ?? [],
    created_at: new Date(row.created_at).toISOString(),
  };
}
