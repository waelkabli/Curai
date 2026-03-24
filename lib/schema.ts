import { executeQuery } from './db';
import { DBConfig, SchemaData, SchemaTable } from '@/types';

export async function discoverSchema(config: DBConfig): Promise<SchemaData> {
  // Get all tables
  const tablesResult = await executeQuery(
    config,
    `SELECT TABLE_NAME, TABLE_SCHEMA
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [config.database]
  );

  if (tablesResult.error) {
    throw new Error(tablesResult.error);
  }

  const tables: SchemaTable[] = [];

  for (const tableRow of tablesResult.rows) {
    const tableName = tableRow.TABLE_NAME as string;

    // Get columns
    const columnsResult = await executeQuery(
      config,
      `SELECT
        COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [config.database, tableName]
    );

    // Get foreign keys
    const fkResult = await executeQuery(
      config,
      `SELECT
        COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [config.database, tableName]
    );

    tables.push({
      name: tableName,
      schema: tableRow.TABLE_SCHEMA as string,
      columns: (columnsResult.rows || []).map((col) => ({
        name: col.COLUMN_NAME as string,
        type: col.DATA_TYPE as string,
        nullable: col.IS_NULLABLE === 'YES',
        default: col.COLUMN_DEFAULT as string | null,
        key: col.COLUMN_KEY as string,
        extra: col.EXTRA as string,
      })),
      foreignKeys: (fkResult.rows || []).map((fk) => ({
        columnName: fk.COLUMN_NAME as string,
        referencedTable: fk.REFERENCED_TABLE_NAME as string,
        referencedColumn: fk.REFERENCED_COLUMN_NAME as string,
        constraintName: fk.CONSTRAINT_NAME as string,
      })),
    });
  }

  // Build relationships
  const relationships: SchemaData['relationships'] = [];
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      relationships.push({
        from: table.name,
        to: fk.referencedTable,
        fromColumn: fk.columnName,
        toColumn: fk.referencedColumn,
      });
    }
  }

  return { tables, relationships };
}

export function schemaToPromptContext(schema: SchemaData): string {
  if (!schema || !schema.tables || schema.tables.length === 0) {
    return 'No schema available. Please configure your database connection in Settings.';
  }

  let context = `DATABASE SCHEMA:\n`;
  context += `Database has ${schema.tables.length} tables.\n\n`;

  for (const table of schema.tables) {
    context += `TABLE: ${table.name}\n`;
    context += `Columns:\n`;
    for (const col of table.columns) {
      const pkIndicator = col.key === 'PRI' ? ' [PRIMARY KEY]' : '';
      const fkIndicator = col.key === 'MUL' ? ' [FOREIGN KEY]' : '';
      const nullIndicator = col.nullable ? '' : ' NOT NULL';
      context += `  - ${col.name}: ${col.type}${nullIndicator}${pkIndicator}${fkIndicator}\n`;
    }
    if (table.foreignKeys.length > 0) {
      context += `Foreign Keys:\n`;
      for (const fk of table.foreignKeys) {
        context += `  - ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}\n`;
      }
    }
    context += '\n';
  }

  if (schema.relationships.length > 0) {
    context += `RELATIONSHIPS:\n`;
    for (const rel of schema.relationships) {
      context += `  ${rel.from}.${rel.fromColumn} -> ${rel.to}.${rel.toColumn}\n`;
    }
  }

  return context;
}
