import { NextRequest, NextResponse } from 'next/server';
import { discoverSchema } from '@/lib/schema';
import { testConnection } from '@/lib/db';
import { DBConfig } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbConfig } = body as { dbConfig: DBConfig };

    if (!dbConfig || !dbConfig.host || !dbConfig.database) {
      return NextResponse.json(
        { error: 'Database configuration is required. Please configure your database in Settings.' },
        { status: 400 }
      );
    }

    // Test connection first
    const connTest = await testConnection(dbConfig);
    if (!connTest.success) {
      return NextResponse.json(
        { error: `Cannot connect to database: ${connTest.message}` },
        { status: 500 }
      );
    }

    const schema = await discoverSchema(dbConfig);

    return NextResponse.json({
      schema,
      tableCount: schema.tables.length,
      relationshipCount: schema.relationships.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to discover schema';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST with dbConfig to discover schema' },
    { status: 200 }
  );
}
