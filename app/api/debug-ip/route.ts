import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';
import { DBConfig } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { dbConfig } = (await req.json()) as { dbConfig: DBConfig };

  // Fetch the real outbound IP at runtime
  let outboundIP = 'unknown';
  try {
    const r = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const d = await r.json();
      outboundIP = d.ip || 'unknown';
    }
  } catch {
    outboundIP = 'fetch-failed';
  }

  // Attempt DB connection
  let dbStatus = 'not-attempted';
  let dbError = '';
  if (dbConfig?.host) {
    const result = await testConnection(dbConfig);
    dbStatus = result.success ? 'connected' : 'failed';
    dbError  = result.success ? '' : result.message;
  }

  return NextResponse.json({
    outboundIP,
    dbStatus,
    dbError,
    note: 'This is the actual runtime outbound IP — whitelist this one.',
  });
}
