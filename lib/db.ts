import { Pool, QueryResultRow } from "pg";
import type { Menu } from "./schema";

const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  console.warn("Postgres connection string not set. Define POSTGRES_URL or DATABASE_URL.");
}

// Detect SSL automatically
const sslOption =
  process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false } // required for most cloud providers
    : false;

// Parse connection URL
const urlParts = (() => {
  try {
    return connectionString ? new URL(connectionString) : null;
  } catch {
    return null;
  }
})();

const cfgUser = process.env.POSTGRES_USER || (urlParts?.username ? decodeURIComponent(urlParts.username) : undefined);
const cfgPassword = process.env.POSTGRES_PASSWORD || (urlParts?.password ? decodeURIComponent(urlParts.password) : undefined);
const cfgHost = process.env.POSTGRES_HOST || urlParts?.hostname;
const cfgPort = Number(process.env.POSTGRES_PORT || (urlParts?.port || 5432));
const cfgDatabase = process.env.POSTGRES_DATABASE || (urlParts?.pathname ? urlParts.pathname.replace(/^\//, "") : undefined);

const poolConfig: any = {
  ssl: sslOption,
  max: 5, // serverless-safe pool size
};

if (connectionString && !cfgUser && !cfgDatabase && !cfgHost) {
  poolConfig.connectionString = connectionString;
} else {
  poolConfig.user = cfgUser;
  poolConfig.password = cfgPassword;
  poolConfig.host = cfgHost;
  poolConfig.port = cfgPort;
  poolConfig.database = cfgDatabase;
}

const pool = new Pool(poolConfig);

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]) {
  if (!connectionString) throw new Error("Missing POSTGRES_URL or DATABASE_URL env var");
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}
// Schema
// - menus
//   id          SERIAL PRIMARY KEY
//   vendor      TEXT NULL
//   currency    TEXT NULL
//   items       JSONB NOT NULL
//   created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()

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

export async function insertMenu(menu: Menu): Promise<number> {
  const itemsJson = JSON.stringify(menu.items ?? []);
  const { rows } = await query<{ id: number }>(
    `INSERT INTO menus (vendor, currency, items)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id`,
    [menu.vendor ?? null, menu.currency ?? null, itemsJson]
  );
  return (rows as any)[0].id;
}

export type MenuListRow = {
  id: number;
  vendor: string | null;
  currency: string | null;
  created_at: string; // ISO string
};

export async function listMenus(limit = 20): Promise<MenuListRow[]> {
  const { rows } = await query<MenuListRow>(
    `SELECT id, vendor, currency, created_at
     FROM menus
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return (rows as any).map((r: any) => ({
    id: r.id,
    vendor: r.vendor,
    currency: r.currency,
    created_at: new Date(r.created_at).toISOString(),
  }));
}

export type MenuRow = {
  id: number;
  vendor: string | null;
  currency: string | null;
  items: any[];
  created_at: string;
};

export async function getMenu(id: number): Promise<MenuRow | null> {
  const { rows } = await query<QueryResultRow>(
    `SELECT id, vendor, currency, items, created_at
     FROM menus
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  const row = (rows as any)[0];
  if (!row) return null;
  return {
    id: row.id,
    vendor: row.vendor,
    currency: row.currency,
    items: Array.isArray(row.items) ? row.items : row.items ?? [],
    created_at: new Date(row.created_at).toISOString(),
  };
}