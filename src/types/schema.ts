export type ColumnType =
  | 'uuid' | 'serial' | 'bigserial'
  | 'integer' | 'bigint' | 'smallint'
  | 'text' | 'varchar' | 'char'
  | 'boolean'
  | 'timestamp' | 'timestamptz' | 'date' | 'time'
  | 'json' | 'jsonb'
  | 'float' | 'double' | 'decimal' | 'numeric'
  | 'bytea';

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
}

export interface TableNode {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
  width: number;
  color?: string;
  groupId?: string; // Optional grouping
}

export type GroupColor = 'pink' | 'green' | 'orange' | 'blue' | 'purple' | 'gray';

export interface GroupNode {
  id: string;
  name: string;
  color: GroupColor;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export type Cardinality = '1:1' | '1:N' | 'N:N';

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: Cardinality;
}

export interface CanvasState {
  tables: TableNode[];
  groups: GroupNode[];
  relationships: Relationship[];
  pan: { x: number; y: number };
  zoom: number;
  showGrid: boolean;
  selectedIds: string[];
}

export const COLUMN_TYPES: ColumnType[] = [
  'uuid', 'serial', 'bigserial',
  'integer', 'bigint', 'smallint',
  'text', 'varchar', 'char',
  'boolean',
  'timestamp', 'timestamptz', 'date', 'time',
  'json', 'jsonb',
  'float', 'double', 'decimal', 'numeric',
  'bytea',
];

export const DEFAULT_TABLE_WIDTH = 240;
export const COLUMN_ROW_HEIGHT = 32;
export const TABLE_HEADER_HEIGHT = 40;
