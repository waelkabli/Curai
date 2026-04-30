import mysql from 'mysql2/promise';
import { DBConfig } from '@/types';

// ─── Connection pool ─────────────────────────────────────────────────────────
// One pool per unique DB config, kept alive for the lifetime of the
// serverless function instance.  Eliminates per-request TCP handshakes.

const pools = new Map<string, mysql.Pool>();

function getPool(config: DBConfig): mysql.Pool {
  const key = `${config.user}@${config.host}:${config.port}/${config.database}`;
  if (!pools.has(key)) {
    pools.set(
      key,
      mysql.createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        waitForConnections: true,
        connectionLimit: 10,   // max simultaneous queries
        queueLimit: 20,
        connectTimeout: 10_000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      })
    );
  }
  return pools.get(key)!;
}

// ─── Single query (used by /api/db, schema, etc.) ────────────────────────────
export async function executeQuery(
  config: DBConfig,
  query: string,
  params: unknown[] = []
): Promise<{ rows: Record<string, unknown>[]; fields: mysql.FieldPacket[]; error?: string }> {
  try {
    const pool = getPool(config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows, fields] = await pool.execute(query as any, params as any);
    return {
      rows: rows as Record<string, unknown>[],
      fields: fields as mysql.FieldPacket[],
    };
  } catch (error) {
    return { rows: [], fields: [], error: error instanceof Error ? error.message : String(error) };
  }
}

// ─── Batch queries (runs N queries in parallel on the same pool) ─────────────
export async function executeQueries(
  config: DBConfig,
  queries: Array<{ sql: string; params?: unknown[] }>
): Promise<Array<{ rows: Record<string, unknown>[]; error?: string }>> {
  const pool = getPool(config);
  return Promise.all(
    queries.map(async ({ sql, params = [] }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [rows] = await pool.execute(sql as any, params as any);
        return { rows: rows as Record<string, unknown>[] };
      } catch (error) {
        return { rows: [], error: error instanceof Error ? error.message : String(error) };
      }
    })
  );
}

// ─── Connection test (settings page) ─────────────────────────────────────────
export async function testConnection(
  config: DBConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const pool = getPool(config);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return { success: true, message: 'Connection successful!' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
}
