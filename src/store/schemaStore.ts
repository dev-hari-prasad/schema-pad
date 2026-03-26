import { create } from 'zustand';
import type { TableNode, GroupNode, GroupColor, Relationship, Column, ColumnType, Cardinality } from '@/types/schema';
import { DEFAULT_TABLE_WIDTH, TABLE_HEADER_HEIGHT, COLUMN_ROW_HEIGHT } from '@/types/schema';

interface SchemaStore {
  tables: TableNode[];
  groups: GroupNode[];
  relationships: Relationship[];
  pan: { x: number; y: number };
  zoom: number;
  showGrid: boolean;
  selectedIds: string[];
  editingTableId: string | null;
  editingColumnId: string | null;
  connectingFrom: { tableId: string; columnId: string } | null;

  // Actions
  addTable: (position: { x: number; y: number }) => string;
  removeTable: (id: string) => void;
  updateTableName: (id: string, name: string) => void;
  moveTable: (id: string, position: { x: number; y: number }) => void;
  duplicateTable: (id: string) => void;
  moveTableToGroup: (tableId: string, groupId: string | null) => void;

  addGroup: (position: { x: number; y: number }) => string;
  addTableToGroup: (groupId: string) => string | null;
  removeGroup: (id: string) => void;
  removeGroupAndTables: (id: string) => void;
  updateGroupName: (id: string, name: string) => void;
  updateGroupColor: (id: string, color: GroupColor) => void;
  moveGroup: (id: string, position: { x: number; y: number }, delta: { x: number; y: number }) => void;
  resizeGroup: (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => void;

  addColumn: (tableId: string) => string;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  removeColumn: (tableId: string, columnId: string) => void;

  addRelationship: (rel: Omit<Relationship, 'id'>) => void;
  removeRelationship: (id: string) => void;
  updateRelationshipCardinality: (id: string, cardinality: Cardinality) => void;

  setPan: (pan: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  setEditingTableId: (id: string | null) => void;
  setEditingColumnId: (id: string | null) => void;
  setConnectingFrom: (from: { tableId: string; columnId: string } | null) => void;

  importSchema: (sql: string) => void;
  clearAll: () => void;
}

let counter = 0;
const uid = () => `id_${++counter}_${Date.now().toString(36)}`;

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  tables: [],
  groups: [],
  relationships: [],
  pan: { x: 0, y: 0 },
  zoom: 1,
  showGrid: true,
  selectedIds: [],
  editingTableId: null,
  editingColumnId: null,
  connectingFrom: null,

  addTable: (position) => {
    const id = uid();
    const colId = uid();
    
    // Generate a unique table name
    const state = get();
    let nameIndex = 1;
    let newName = 'new_table';
    while (state.tables.some(t => t.name === newName)) {
      nameIndex++;
      newName = `new_table_${nameIndex}`;
    }

    const table: TableNode = {
      id,
      name: newName,
      columns: [
        {
          id: colId,
          name: 'id',
          type: 'uuid' as ColumnType,
          isPrimaryKey: true,
          isForeignKey: false,
          isNullable: false,
          isUnique: true,
        },
      ],
      position,
      width: DEFAULT_TABLE_WIDTH,
    };
    set((s) => ({ tables: [...s.tables, table], editingTableId: id }));
    return id;
  },

  removeTable: (id) =>
    set((s) => ({
      tables: s.tables.filter((t) => t.id !== id),
      relationships: s.relationships.filter(
        (r) => r.sourceTableId !== id && r.targetTableId !== id
      ),
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
    })),

  updateTableName: (id, name) =>
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, name } : t)),
    })),

  moveTable: (id, position) =>
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, position } : t)),
    })),

  duplicateTable: (id) => {
    const table = get().tables.find((t) => t.id === id);
    if (!table) return;
    const newId = uid();
    const horizontalGap = 28;
    const newTable: TableNode = {
      ...table,
      id: newId,
      name: `${table.name}_copy`,
      position: { x: table.position.x + table.width + horizontalGap, y: table.position.y },
      columns: table.columns.map((c) => ({ ...c, id: uid() })),
    };
    set((s) => ({ tables: [...s.tables, newTable] }));
  },

  moveTableToGroup: (tableId, groupId) =>
    set((s) => {
      const table = s.tables.find((t) => t.id === tableId);
      if (!table) return s;

      if (!groupId) {
        return {
          tables: s.tables.map((t) =>
            t.id === tableId ? { ...t, groupId: undefined } : t
          ),
        };
      }

      const group = s.groups.find((g) => g.id === groupId);
      if (!group) return s;

      const groupedCount = s.tables.filter((t) => t.groupId === groupId).length;
      const col = groupedCount % 3;
      const row = Math.floor(groupedCount / 3);

      const colWidth = DEFAULT_TABLE_WIDTH + 22;
      const baseTableHeight = TABLE_HEADER_HEIGHT + COLUMN_ROW_HEIGHT + 32;
      const rowHeight = baseTableHeight + 26;

      const nextPos = {
        x: group.position.x + 24 + col * colWidth,
        y: group.position.y + 44 + row * rowHeight,
      };

      const requiredRight = nextPos.x + DEFAULT_TABLE_WIDTH + 24;
      const requiredBottom = nextPos.y + baseTableHeight + 20;

      return {
        tables: s.tables.map((t) =>
          t.id === tableId ? { ...t, groupId, position: nextPos } : t
        ),
        groups: s.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                width: Math.max(g.width, requiredRight - g.position.x),
                height: Math.max(g.height, requiredBottom - g.position.y),
              }
            : g
        ),
      };
    }),

  addGroup: (position) => {
    const id = uid();
    const group: GroupNode = {
      id,
      name: 'New Group',
      color: 'blue',
      position,
      width: 400,
      height: 300,
    };
    set((s) => ({ groups: [...s.groups, group] }));
    return id;
  },

  addTableToGroup: (groupId) => {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return null;

    const id = uid();
    const colId = uid();
    
    // Generate a unique table name
    let nameIndex = 1;
    let newName = 'new_table';
    while (state.tables.some(t => t.name === newName)) {
      nameIndex++;
      newName = `new_table_${nameIndex}`;
    }

    const baseTableHeight = TABLE_HEADER_HEIGHT + COLUMN_ROW_HEIGHT + 32;
    const padX = 24;
    const padTop = 44;
    const padBottom = 20;
    const gapX = 22;
    const gapY = 26;

    const tablesInGroup = state.tables.filter((t) => {
      const inside =
        t.position.x >= group.position.x &&
        t.position.y >= group.position.y &&
        t.position.x <= group.position.x + group.width &&
        t.position.y <= group.position.y + group.height;
      return t.groupId === groupId || inside;
    });

    const usableWidth = Math.max(0, group.width - padX * 2);
    const colWidth = DEFAULT_TABLE_WIDTH + gapX;
    
    // Allow up to 3 tables side-by-side before wrapping, expanding group width as needed
    const perRow = 3;
    const idx = tablesInGroup.length;
    const col = idx % perRow;
    const row = Math.floor(idx / perRow);

    const position = {
      x: group.position.x + padX + col * colWidth,
      y: group.position.y + padTop + row * (baseTableHeight + gapY),
    };

    const table: TableNode = {
      id,
      name: newName,
      columns: [
        {
          id: colId,
          name: 'id',
          type: 'uuid' as ColumnType,
          isPrimaryKey: true,
          isForeignKey: false,
          isNullable: false,
          isUnique: true,
        },
      ],
      position,
      width: DEFAULT_TABLE_WIDTH,
      groupId,
    };

    const requiredRight = position.x + DEFAULT_TABLE_WIDTH + padX;
    const requiredBottom = position.y + baseTableHeight + padBottom;

    set((s) => ({
      tables: [...s.tables, table],
      groups: s.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              width: Math.max(g.width, requiredRight - g.position.x),
              height: Math.max(g.height, requiredBottom - g.position.y),
            }
          : g
      ),
      editingTableId: id,
    }));
    return id;
  },

  removeGroup: (id) =>
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      tables: s.tables.map((t) => (t.groupId === id ? { ...t, groupId: undefined } : t)),
    })),

  removeGroupAndTables: (id) =>
    set((s) => {
      const group = s.groups.find((g) => g.id === id);
      if (!group) return s;

      const insideTables = s.tables.filter(t => 
        t.position.x >= group.position.x &&
        t.position.y >= group.position.y &&
        t.position.x <= group.position.x + group.width &&
        t.position.y <= group.position.y + group.height
      );
      const insideTableIds = new Set(insideTables.map((t) => t.id));

      return {
        groups: s.groups.filter((g) => g.id !== id),
        tables: s.tables.filter((t) => !insideTableIds.has(t.id)),
        relationships: s.relationships.filter(
          (r) => !insideTableIds.has(r.sourceTableId) && !insideTableIds.has(r.targetTableId)
        ),
      };
    }),

  updateGroupName: (id, name) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)),
    })),

  updateGroupColor: (id, color) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, color } : g)),
    })),

  moveGroup: (id, position, delta) =>
    set((s) => {
      // Find tables that intersect with this group's bounding box BEFORE moving, 
      // or optionally move any tables strictly inside.
      // Easiest semantic approach for "Spatial Groups": move explicit children, OR move overlapping tables.
      // Usually users just assign by overlapping. We will move any table whose top-left is currently inside the group's old bounds.
      const group = s.groups.find(g => g.id === id);
      if (!group) return s;

      const insideTables = s.tables.filter(t => 
        t.position.x >= group.position.x &&
        t.position.y >= group.position.y &&
        t.position.x <= group.position.x + group.width &&
        t.position.y <= group.position.y + group.height
      );

      return {
        groups: s.groups.map((g) => (g.id === id ? { ...g, position } : g)),
        tables: s.tables.map((t) => 
          insideTables.includes(t) 
            ? { ...t, position: { x: t.position.x + delta.x, y: t.position.y + delta.y } }
            : t
        ),
      };
    }),

  resizeGroup: (id, size, position) => 
    set((s) => {
      const group = s.groups.find((g) => g.id === id);
      if (!group) return s;

      const nextPos = position ?? group.position;
      let nextX = nextPos.x;
      let nextY = nextPos.y;
      let nextWidth = size.width;
      let nextHeight = size.height;

      const tableHeight = (t: TableNode) => TABLE_HEADER_HEIGHT + t.columns.length * COLUMN_ROW_HEIGHT + 32;
      const tablesInside = s.tables.filter((t) =>
        t.position.x >= group.position.x &&
        t.position.y >= group.position.y &&
        t.position.x <= group.position.x + group.width &&
        t.position.y <= group.position.y + group.height
      );

      if (tablesInside.length > 0) {
        const minTableX = Math.min(...tablesInside.map((t) => t.position.x));
        const minTableY = Math.min(...tablesInside.map((t) => t.position.y));
        const maxTableX = Math.max(...tablesInside.map((t) => t.position.x + t.width));
        const maxTableY = Math.max(...tablesInside.map((t) => t.position.y + tableHeight(t)));

        const padLeft = 24;
        const padTop = 44;
        const padRight = 24;
        const padBottom = 24;

        const mustLeft = minTableX - padLeft;
        const mustTop = minTableY - padTop;
        const mustRight = maxTableX + padRight;
        const mustBottom = maxTableY + padBottom;

        // Prevent dragging the left/top edges past the tables
        nextX = Math.min(nextX, mustLeft);
        nextY = Math.min(nextY, mustTop);
        
        // Prevent reducing width/height below what's needed to contain the tables
        const minRequiredWidth = mustRight - nextX;
        const minRequiredHeight = mustBottom - nextY;
        
        nextWidth = Math.max(nextWidth, minRequiredWidth);
        nextHeight = Math.max(nextHeight, minRequiredHeight);
      }

      return {
        groups: s.groups.map((g) =>
          g.id === id
            ? { ...g, width: nextWidth, height: nextHeight, position: { x: nextX, y: nextY } }
            : g
        ),
      };
    }),

  addColumn: (tableId) => {
    const colId = uid();
    
    // Generate a unique column name
    const state = get();
    const table = state.tables.find(t => t.id === tableId);
    let nameIndex = 1;
    let newName = 'column';
    if (table) {
      while (table.columns.some(c => c.name === newName)) {
        nameIndex++;
        newName = `column_${nameIndex}`;
      }
    }

    const col: Column = {
      id: colId,
      name: newName,
      type: 'text',
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
      isUnique: false,
    };
    set((s) => ({
      tables: s.tables.map((t) =>
        t.id === tableId ? { ...t, columns: [...t.columns, col] } : t
      ),
      editingColumnId: colId,
    }));
    return colId;
  },

  updateColumn: (tableId, columnId, updates) =>
    set((s) => ({
      tables: s.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map((c) =>
                c.id === columnId ? { ...c, ...updates } : c
              ),
            }
          : t
      ),
    })),

  removeColumn: (tableId, columnId) =>
    set((s) => ({
      tables: s.tables.map((t) =>
        t.id === tableId
          ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) }
          : t
      ),
      relationships: s.relationships.filter(
        (r) =>
          !(r.sourceTableId === tableId && r.sourceColumnId === columnId) &&
          !(r.targetTableId === tableId && r.targetColumnId === columnId)
      ),
    })),

  addRelationship: (rel) => {
    const id = uid();
    set((s) => ({ relationships: [...s.relationships, { ...rel, id }] }));
  },

  removeRelationship: (id) =>
    set((s) => ({
      relationships: s.relationships.filter((r) => r.id !== id),
    })),

  updateRelationshipCardinality: (id, cardinality) =>
    set((s) => ({
      relationships: s.relationships.map((r) =>
        r.id === id ? { ...r, cardinality } : r
      ),
    })),

  setPan: (pan) => set({ pan }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelected: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((sid) => sid !== id)
        : [...s.selectedIds, id],
    })),
  setEditingTableId: (id) => set({ editingTableId: id }),
  setEditingColumnId: (id) => set({ editingColumnId: id }),
  setConnectingFrom: (from) => set({ connectingFrom: from }),

  clearAll: () =>
    set({
      tables: [],
      groups: [],
      relationships: [],
      selectedIds: [],
      editingTableId: null,
      editingColumnId: null,
    }),

  importSchema: (sql) => {
    import('@/utils/sqlParser').then(({ parseSql }) => {
      const { tables: parsedTables, relationships: parsedRelationships } = parseSql(sql);
      set((state) => {
        // Merge with existing or replace depending on preference, here we add them on
        const updatedRelationships = [...state.relationships];
        
        parsedRelationships.forEach(rel => {
            updatedRelationships.push({ ...rel, id: uid() } as Relationship);
        });

        return {
          tables: [...state.tables, ...parsedTables],
          relationships: updatedRelationships,
        };
      });
    });
  },
}));
