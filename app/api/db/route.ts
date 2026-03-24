import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { DBConfig } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, params = [], dbConfig } = body as {
      query: string;
      params?: unknown[];
      dbConfig: DBConfig;
    };

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!dbConfig || !dbConfig.host || !dbConfig.database) {
      return NextResponse.json(
        { error: 'Database configuration is required. Please configure your database in Settings.' },
        { status: 400 }
      );
    }

    const result = await executeQuery(dbConfig, query, params);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      rows: result.rows,
      fields: result.fields.map((f) => ({ name: f.name, type: f.type })),
      rowCount: result.rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
