import mysql from 'mysql2/promise';
import { DBConfig } from '@/types';

export async function createConnection(config: DBConfig) {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectTimeout: 10000,
    ssl: undefined,
  });
  return connection;
}

export async function executeQuery(
  config: DBConfig,
  query: string,
  params: unknown[] = []
): Promise<{ rows: Record<string, unknown>[]; fields: mysql.FieldPacket[]; error?: string }> {
  let connection: mysql.Connection | null = null;
  try {
    connection = await createConnection(config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows, fields] = await connection.execute(query as any, params as any);
    return {
      rows: rows as Record<string, unknown>[],
      fields: fields as mysql.FieldPacket[],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown database error';
    return { rows: [], fields: [], error: errMsg };
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore close error
      }
    }
  }
}

export async function testConnection(config: DBConfig): Promise<{ success: boolean; message: string }> {
  let connection: mysql.Connection | null = null;
  try {
    connection = await createConnection(config);
    await connection.ping();
    return { success: true, message: 'Connection successful!' };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Connection failed';
    return { success: false, message: errMsg };
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore
      }
    }
  }
}
