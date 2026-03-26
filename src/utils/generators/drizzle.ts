import type { TableNode, Relationship } from '@/types/schema';

export function generateDrizzle(tables: TableNode[], relationships: Relationship[]): string {
  if (tables.length === 0) return '// No tables defined yet\nimport { pgTable } from "drizzle-orm/pg-core";';
  
  const lines: string[] = ['import { pgTable, uuid, text, varchar, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";\n'];

  for (const table of tables) {
    lines.push(`export const ${table.name} = pgTable("${table.name}", {`);
    for (const col of table.columns) {
      let dType = 'text';
      if (col.type === 'uuid') dType = 'uuid';
      else if (col.type === 'varchar') dType = 'varchar';
      else if (col.type === 'serial') dType = 'serial';
      else if (col.type === 'boolean') dType = 'boolean';
      else if (col.type === 'timestamp' || col.type === 'timestamptz') dType = 'timestamp';
      else if (col.type === 'integer') dType = 'integer';

      let line = `  ${col.name}: ${dType}("${col.name}")`;
      if (col.isPrimaryKey) line += '.primaryKey()';
      if (!col.isNullable && !col.isPrimaryKey) line += '.notNull()';
      if (col.isUnique && !col.isPrimaryKey) line += '.unique()';
      
      const fk = relationships.find(r => r.sourceTableId === table.id && r.sourceColumnId === col.id);
      if (fk) {
          const tgtTable = tables.find(t => t.id === fk.targetTableId);
          if (tgtTable) {
              line += `.references(() => ${tgtTable.name}.id)`;
          }
      }

      line += ',';
      lines.push(line);
    }
    lines.push('});\n');
  }

  return lines.join('\n');
}
