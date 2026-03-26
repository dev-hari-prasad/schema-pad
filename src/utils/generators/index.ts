import { generatePostgres } from './postgres';
import { generateMySQL } from './mysql';
import { generateDrizzle } from './drizzle';
import { generatePrisma } from './prisma';
import type { TableNode, Relationship } from '@/types/schema';

export type OutputFormat = 'postgres' | 'mysql' | 'drizzle' | 'prisma' | 'json';

export function generateSchema(format: OutputFormat, tables: TableNode[], relationships: Relationship[]): string {
  switch (format) {
    case 'postgres':
      return generatePostgres(tables, relationships);
    case 'mysql':
      return generateMySQL(tables, relationships);
    case 'drizzle':
      return generateDrizzle(tables, relationships);
    case 'prisma':
      return generatePrisma(tables, relationships);
    case 'json':
      return JSON.stringify({ tables, relationships }, null, 2);
    default:
      return generatePostgres(tables, relationships);
  }
}
