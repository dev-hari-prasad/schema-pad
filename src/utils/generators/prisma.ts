import type { TableNode, Relationship } from '@/types/schema';

export function generatePrisma(tables: TableNode[], relationships: Relationship[]): string {
  if (tables.length === 0) return '// No tables defined yet\ngenerator client {\n  provider = "prisma-client-js"\n}\n';
  
  const lines: string[] = ['generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n'];

  for (const table of tables) {
    // Basic table
    lines.push(`model ${capitalize(table.name)} {`);
    
    for (const col of table.columns) {
      let pType = 'String';
      if (col.type === 'uuid') pType = 'String';
      else if (col.type === 'integer' || col.type === 'serial' || col.type === 'bigint' || col.type === 'smallint') pType = 'Int';
      else if (col.type === 'boolean') pType = 'Boolean';
      else if (col.type === 'timestamp' || col.type === 'timestamptz' || col.type === 'date') pType = 'DateTime';
      
      let line = `  ${col.name} ${pType}`;
      if (col.isNullable) line += '?';
      if (col.isPrimaryKey) {
          if (col.type === 'uuid') line += ' @id @default(uuid())';
          else if (col.type === 'serial') line += ' @id @default(autoincrement())';
          else line += ' @id';
      }
      if (col.isUnique && !col.isPrimaryKey) line += ' @unique';
      
      // FKs
      const fk = relationships.find(r => r.sourceTableId === table.id && r.sourceColumnId === col.id);
      if (fk) {
          const tgtTable = tables.find(t => t.id === fk.targetTableId);
          if (tgtTable) {
              const relName = tgtTable.name;
              line += `\n  ${relName} ${capitalize(tgtTable.name)} @relation(fields: [${col.name}], references: [id])`;
          }
      }

      lines.push(line);
    }
    
    // Reverse relations
    const backRels = relationships.filter(r => r.targetTableId === table.id);
    for (const br of backRels) {
        const srcTable = tables.find(t => t.id === br.sourceTableId);
        if (srcTable) {
            lines.push(`  ${srcTable.name}s ${capitalize(srcTable.name)}[]`);
        }
    }

    lines.push('}\n');
  }

  return lines.join('\n');
}

function capitalize(s: string) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
