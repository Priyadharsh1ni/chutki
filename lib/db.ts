import { Pool, QueryResultRow } from "pg";
import type { Menu } from "./schema";

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

if (!connectionString) {
  console.warn("Postgres connection string not set. Define POSTGRES_URL or DATABASE_URL.");
}

// SSL handling
// Priority:
// 1) Explicit flags in connection string: ssl=true/false or sslmode=...
// 2) Env overrides: PGSSLMODE=disable or POSTGRES_SSL=false
// 3) Fallback: enable SSL for non-local hosts
let sslOption: any = undefined;
try {
  const u = new URL(connectionString);
  const params = new URLSearchParams(u.search);
  const sslParam = params.get("ssl"); // "true" | "false"
  const sslmodeParam = (params.get("sslmode") || "").toLowerCase();
  const envSslMode = (process.env.PGSSLMODE || "").toLowerCase();
  const envPostgresSsl = (process.env.POSTGRES_SSL || "").toLowerCase();

  const disableByParams = sslParam === "false" || sslParam === "0" || sslmodeParam === "disable";
  const enableByParams = sslParam === "true" || sslParam === "1" || ["require","prefer","verify-ca","verify-full"].includes(sslmodeParam);
  const disableByEnv = envSslMode === "disable" || envPostgresSsl === "false" || envPostgresSsl === "0";

  if (disableByParams || disableByEnv) {
    sslOption = false;
  } else if (enableByParams) {
    sslOption = { rejectUnauthorized: false };
  } else {
    const nonLocalHost = u.hostname !== "localhost" && u.hostname !== "127.0.0.1";
    sslOption = nonLocalHost ? { rejectUnauthorized: false } : false;
  }
} catch {
  // If URL parse fails, keep default undefined
}

const urlParts = (() => {
  try {
    return connectionString ? new URL(connectionString) : null;
  } catch {
    return null;
  }
})();

const cfgUser = process.env.POSTGRES_USER || process.env.PGUSER || (urlParts?.username ? decodeURIComponent(urlParts.username) : undefined);
const cfgPassword = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || (urlParts?.password ? decodeURIComponent(urlParts.password) : undefined);
const cfgHost = process.env.POSTGRES_HOST || process.env.PGHOST || (urlParts?.hostname || undefined);
const cfgPort = Number(process.env.POSTGRES_PORT || process.env.PGPORT || (urlParts?.port || 5432));
const cfgDatabase = process.env.POSTGRES_DATABASE || process.env.PGDATABASE || (urlParts?.pathname ? urlParts.pathname.replace(/^\//, "") : undefined);

const isJdbcUrl = typeof connectionString === "string" && connectionString.startsWith("jdbc:");
const haveDiscrete = !!(cfgUser || cfgPassword || cfgHost || cfgDatabase);

const poolConfig: any = {
  ssl: sslOption,
  max: 10,
};

if (!isJdbcUrl && !haveDiscrete && connectionString) {
  // Use standard postgres/postgresql connection string only
  poolConfig.connectionString = connectionString;
} else {
  // Prefer discrete env vars, and ignore JDBC-style URL
  poolConfig.user = cfgUser;
  // Ensure password is a string when present
  poolConfig.password = typeof cfgPassword === "string" ? cfgPassword : undefined;
  poolConfig.host = cfgHost;
  poolConfig.port = Number.isFinite(cfgPort) ? cfgPort : undefined;
  poolConfig.database = cfgDatabase;
}

const pool = new Pool(poolConfig);

async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]) {
  if (!connectionString) {
    throw new Error("Missing POSTGRES_URL or DATABASE_URL env var");
  }
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res;
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