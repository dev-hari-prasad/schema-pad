import { TableNode, Column, Relationship, ColumnType, Cardinality } from '../types/schema';

export function parseSql(sql: string): { tables: TableNode[]; relationships: Omit<Relationship, 'id'>[] } {
  const tables: TableNode[] = [];
  const relationships: Omit<Relationship, 'id'>[] = [];
  
  // Remove comments
  const cleanSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?\s*\(([\s\S]*?)\)(?:\s*INHERITS.*?)?(?:\s*WITH.*?)?(?:\s*TABLESPACE.*?)?;/gi;
  
  let match;
  let counter = 0;
  const uid = () => `import_${++counter}_${Date.now().toString(36)}`;

  const tableMap = new Map<string, TableNode>();
  
  let xOffset = 100;
  let yOffset = 100;

  while ((match = createTableRegex.exec(cleanSql)) !== null) {
    const tableName = match[1];
    const body = match[2];

    const columns: Column[] = [];
    const lines = body.split(',\n').map(l => l.trim()).filter(Boolean);
    
    // We split by comma but be careful not to split inside parens, a basic approach:
    // Better to split by comma not in parens
    const parsedLines: string[] = [];
    let currentLine = '';
    let inParen = 0;
    for (let i = 0; i < body.length; i++) {
        const char = body[i];
        if (char === '(') inParen++;
        if (char === ')') inParen--;
        if (char === ',' && inParen === 0) {
            parsedLines.push(currentLine.trim());
            currentLine = '';
        } else {
            currentLine += char;
        }
    }
    if (currentLine.trim()) parsedLines.push(currentLine.trim());

    for (const line of parsedLines) {
      if (!line) continue;
      const upperLine = line.toUpperCase();
      
      // Inline PK
      if (upperLine.startsWith('PRIMARY KEY') || upperLine.startsWith('FOREIGN KEY') || upperLine.startsWith('CONSTRAINT')) {
          const pkMatch = upperLine.match(/PRIMARY KEY\s*\(([^)]+)\)/);
          if (pkMatch) {
              const colNames = pkMatch[1].split(',').map(s => s.replace(/["']/g, '').trim());
              colNames.forEach(cName => {
                  const col = columns.find(c => c.name.toLowerCase() === cName.toLowerCase());
                  if (col) col.isPrimaryKey = true;
              });
          }
          const fkMatch = upperLine.match(/FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s*(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?\s*\(([^)]+)\)/);
          if (fkMatch) {
              const sourceColName = fkMatch[1].replace(/["']/g, '').trim();
              const targetTableName = fkMatch[2].replace(/["']/g, '').trim();
              const targetColName = fkMatch[3].replace(/["']/g, '').trim();
              
              const col = columns.find(c => c.name.toLowerCase() === sourceColName.toLowerCase());
              if (col) col.isForeignKey = true;
              
              // We queue relationships to be resolved after all tables are created
              relationships.push({
                  sourceTableId: tableName, // temporary, will link later
                  sourceColumnId: sourceColName,
                  targetTableId: targetTableName,
                  targetColumnId: targetColName,
                  cardinality: '1:N', // default assumption
              });
          }
          continue;
      }

      const parts = line.split(/\s+/);
      const colName = parts[0].replace(/["']/g, '');
      const typeStr = parts[1]?.toLowerCase() || 'text';
      
      let mappedType: ColumnType = 'text';
      for (const t of ['uuid', 'serial', 'bigserial', 'integer', 'bigint', 'smallint', 'text', 'varchar', 'char', 'boolean', 'timestamp', 'timestamptz', 'date', 'time', 'jsonb', 'json', 'float', 'double', 'decimal', 'numeric', 'bytea']) {
          if (typeStr.includes(t)) {
              mappedType = t as ColumnType;
              break;
          }
      }

      const isPrimaryKey = upperLine.includes('PRIMARY KEY');
      const isNullable = !upperLine.includes('NOT NULL');
      const isUnique = upperLine.includes('UNIQUE');
      
      let isForeignKey = false;
      const inlineFkMatch = upperLine.match(/REFERENCES\s+(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?\s*(?:\(([^)]+)\))?/);
      if (inlineFkMatch) {
          isForeignKey = true;
          const targetTableName = inlineFkMatch[1].replace(/["']/g, '').trim();
          const targetColName = inlineFkMatch[2]?.replace(/["']/g, '').trim() || 'id'; // default to id if not specified
          
          relationships.push({
              sourceTableId: tableName, // temporary
              sourceColumnId: colName,
              targetTableId: targetTableName,
              targetColumnId: targetColName,
              cardinality: '1:N',
          });
      }

      columns.push({
          id: uid(),
          name: colName,
          type: mappedType,
          isPrimaryKey,
          isForeignKey,
          isNullable,
          isUnique,
      });
    }

    const tableNode = {
        id: uid(),
        name: tableName,
        columns,
        position: { x: xOffset, y: yOffset },
        width: 260
    };

    tables.push(tableNode);
    tableMap.set(tableName.toLowerCase(), tableNode);

    xOffset += 300;
    if (xOffset > 1000) {
        xOffset = 100;
        yOffset += 400;
    }
  }

  // Handle ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY 
  const alterTableRegex = /ALTER\s+TABLE\s+(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?\s+ADD\s+(?:CONSTRAINT\s+"?[a-zA-Z0-9_]+"?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?\s*\(([^)]+)\)/gi;
  while ((match = alterTableRegex.exec(cleanSql)) !== null) {
      const sourceTableName = match[1];
      const sourceColName = match[2].replace(/["']/g, '').trim();
      const targetTableName = match[3];
      const targetColName = match[4].replace(/["']/g, '').trim();

      relationships.push({
          sourceTableId: sourceTableName,
          sourceColumnId: sourceColName,
          targetTableId: targetTableName,
          targetColumnId: targetColName,
          cardinality: '1:N',
      });
  }

  // Link temporary IDs to actual UUIDs
  const finalRelationships: Omit<Relationship, 'id'>[] = [];
  for (const rel of relationships) {
      const sourceTable = tableMap.get(rel.sourceTableId.toLowerCase());
      const targetTable = tableMap.get(rel.targetTableId.toLowerCase());
      
      if (sourceTable && targetTable) {
          const sourceCol = sourceTable.columns.find(c => c.name.toLowerCase() === rel.sourceColumnId.toLowerCase());
          const targetCol = targetTable.columns.find(c => c.name.toLowerCase() === rel.targetColumnId.toLowerCase());
          
          if (sourceCol) sourceCol.isForeignKey = true;
          
          if (sourceCol && targetCol) {
              finalRelationships.push({
                  sourceTableId: sourceTable.id,
                  sourceColumnId: sourceCol.id,
                  targetTableId: targetTable.id,
                  targetColumnId: targetCol.id,
                  cardinality: rel.cardinality
              });
          }
      }
  }

  return { tables, relationships: finalRelationships };
}
