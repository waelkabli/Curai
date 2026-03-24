import { NextRequest, NextResponse } from 'next/server';
import { generateSQL, generateInsights, extractSQL, AIProvider } from '@/lib/ai';
import { executeQuery } from '@/lib/db';
import { schemaToPromptContext } from '@/lib/schema';
import { DBConfig, SchemaData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      history = [],
      aiProvider,
      apiKey,
      model,
      dbConfig,
      schema,
    } = body as {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
      aiProvider: AIProvider;
      apiKey: string;
      model: string;
      dbConfig: DBConfig;
      schema?: SchemaData;
    };

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: `${aiProvider || 'AI'} API key is required. Please configure it in Settings.` },
        { status: 400 }
      );
    }

    if (!dbConfig || !dbConfig.host || !dbConfig.database) {
      return NextResponse.json(
        { error: 'Database configuration is required. Please configure it in Settings.' },
        { status: 400 }
      );
    }

    // Build schema context
    const schemaContext = schema
      ? schemaToPromptContext(schema)
      : 'Schema not available. Generate SQL based on common healthcare database patterns.';

    // Generate SQL from question
    const aiResponse = await generateSQL(
      message,
      schemaContext,
      history,
      aiProvider || 'anthropic',
      apiKey,
      model
    );

    const sql = extractSQL(aiResponse);

    if (!sql) {
      // AI might have given a conversational response
      return NextResponse.json({
        sql: '',
        results: [],
        insights: aiResponse,
        chartSuggestion: 'none',
        conversational: true,
      });
    }

    // Execute the SQL
    const queryResult = await executeQuery(dbConfig, sql);

    if (queryResult.error) {
      return NextResponse.json({
        sql,
        results: [],
        insights: `SQL Error: ${queryResult.error}\n\nThe generated query had an error. This might be due to:\n• Table or column names not matching your database\n• Syntax issues\n\nTry rephrasing your question or check the schema in Schema Explorer.`,
        chartSuggestion: 'none',
        error: queryResult.error,
      });
    }

    // Generate insights
    const { insights, chartSuggestion } = await generateInsights(
      sql,
      queryResult.rows,
      message,
      aiProvider || 'anthropic',
      apiKey,
      model
    );

    return NextResponse.json({
      sql,
      results: queryResult.rows,
      insights,
      chartSuggestion,
      rowCount: queryResult.rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process chat request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
