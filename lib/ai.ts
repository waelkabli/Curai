import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type AIProvider = 'openai' | 'anthropic' | 'perplexity';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  sql: string;
  insights: string;
  chartSuggestion: string;
}

const SQL_SYSTEM_PROMPT = `You are an expert SQL analyst for a healthcare database system called "Cura".
You help users query their MySQL database by converting natural language questions to SQL.

IMPORTANT RULES:
1. Always return valid MySQL SQL queries
2. Use proper JOINs when needed
3. Add LIMIT 1000 to prevent huge result sets unless the user asks for all data
4. Return SQL in a code block with \`\`\`sql ... \`\`\`
5. After the SQL, provide a brief explanation of what the query does
6. Only use tables and columns that exist in the schema provided
7. Use appropriate aggregations (SUM, COUNT, AVG) when the question implies totals or averages
8. Always handle NULL values appropriately

The database belongs to a healthcare company with tables including:
- orderitems, orders (transactions)
- consultations (medical consultations)
- doctors, patients, customers
- products, bundles, wellness_programs
- insurance_eligiblity_requests (insurance data)
- followups, subscriptions
- organizations, currencies, promotions`;

const INSIGHTS_SYSTEM_PROMPT = `You are a healthcare business analyst for "Cura".
Given SQL query results, provide concise, actionable insights in 3-5 bullet points.
Focus on:
- Key trends or patterns in the data
- Notable highs/lows or outliers
- Business implications for a healthcare company
- Recommendations if applicable
Keep insights brief and data-driven. Format as bullet points starting with •`;

export async function generateSQL(
  question: string,
  schemaContext: string,
  history: AIMessage[],
  provider: AIProvider,
  apiKey: string,
  model: string
): Promise<string> {
  const systemPrompt = `${SQL_SYSTEM_PROMPT}\n\n${schemaContext}`;

  const messages: AIMessage[] = [
    ...history.slice(-6),
    { role: 'user', content: question },
  ];

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  if (provider === 'openai' || provider === 'perplexity') {
    const baseURL = provider === 'perplexity' ? 'https://api.perplexity.ai' : undefined;
    const client = new OpenAI({ apiKey, baseURL });
    const response = await client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      max_tokens: 2048,
    });
    return response.choices[0]?.message?.content || '';
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}

export async function generateInsights(
  query: string,
  results: Record<string, unknown>[],
  question: string,
  provider: AIProvider,
  apiKey: string,
  model: string
): Promise<{ insights: string; chartSuggestion: string }> {
  const resultSample = results.slice(0, 50);
  const prompt = `User asked: "${question}"
SQL used: ${query}
Results (${results.length} rows, showing first ${resultSample.length}):
${JSON.stringify(resultSample, null, 2)}

Please provide:
1. 3-5 bullet point insights about this data
2. A suggestion for the best chart type to visualize this (bar, line, pie, table, etc.)

Format your response as:
INSIGHTS:
[bullet points]

CHART_SUGGESTION:
[chart type and why]`;

  let responseText = '';

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: INSIGHTS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = response.content[0];
    responseText = content.type === 'text' ? content.text : '';
  } else if (provider === 'openai' || provider === 'perplexity') {
    const baseURL = provider === 'perplexity' ? 'https://api.perplexity.ai' : undefined;
    const client = new OpenAI({ apiKey, baseURL });
    const response = await client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1024,
    });
    responseText = response.choices[0]?.message?.content || '';
  }

  const insightsMatch = responseText.match(/INSIGHTS:\s*([\s\S]*?)(?:CHART_SUGGESTION:|$)/);
  const chartMatch = responseText.match(/CHART_SUGGESTION:\s*([\s\S]*?)$/);

  return {
    insights: insightsMatch ? insightsMatch[1].trim() : responseText,
    chartSuggestion: chartMatch ? chartMatch[1].trim() : 'table',
  };
}

export function extractSQL(text: string): string {
  const codeBlockMatch = text.match(/```sql\s*([\s\S]*?)```/i);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  const sqlMatch = text.match(/(?:SELECT|INSERT|UPDATE|DELETE|WITH)\s[\s\S]+?(?:;|$)/i);
  if (sqlMatch) return sqlMatch[0].trim();

  return '';
}
