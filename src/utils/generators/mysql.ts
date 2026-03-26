import type { TableNode, Relationship } from '@/types/schema';

export function generateMySQL(tables: TableNode[], relationships: Relationship[]): string {
  if (tables.length === 0) return '-- No tables defined yet';
  const lines: string[] = [];

  for (const table of tables) {
    lines.push(`CREATE TABLE \`${table.name}\` (`);
    const colLines: string[] = [];
    for (const col of table.columns) {
      let type = col.type.toUpperCase();
      if (type === 'UUID') type = 'VARCHAR(36)'; // MySQL doesn't have native UUID
      else if (type === 'SERIAL') type = 'INT AUTO_INCREMENT';
      else if (type === 'BIGSERIAL') type = 'BIGINT AUTO_INCREMENT';
      else if (type === 'TIMESTAMPTZ') type = 'TIMESTAMP';

      let line = `  \`${col.name}\` ${type}`;
      if (!col.isNullable) line += ' NOT NULL';
      if (col.isUnique && !col.isPrimaryKey) line += ' UNIQUE';
      if (col.defaultValue) line += ` DEFAULT ${col.defaultValue}`;
      colLines.push(line);
    }
    const pks = table.columns.filter((c) => c.isPrimaryKey);
    if (pks.length > 0) {
      colLines.push(`  PRIMARY KEY (\`${pks.map((c) => c.name).join('`, `')}\`)`);
    }
    const fkRels = relationships.filter((r) => r.sourceTableId === table.id);
    for (const rel of fkRels) {
      const srcCol = table.columns.find((c) => c.id === rel.sourceColumnId);
      const tgtTable = tables.find((t) => t.id === rel.targetTableId);
      const tgtCol = tgtTable?.columns.find((c) => c.id === rel.targetColumnId);
      if (srcCol && tgtTable && tgtCol) {
        colLines.push(`  CONSTRAINT \`fk_${table.name}_${srcCol.name}\` FOREIGN KEY (\`${srcCol.name}\`) REFERENCES \`${tgtTable.name}\` (\`${tgtCol.name}\`)`);
      }
    }
    lines.push(colLines.join(',\n'));
    lines.push(');\n');
  }
  return lines.join('\n');
}
