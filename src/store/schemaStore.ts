import { create } from 'zustand';
import type { TableNode, GroupNode, GroupColor, Relationship, Column, ColumnType, Cardinality } from '@/types/schema';
import { DEFAULT_TABLE_WIDTH, TABLE_HEADER_HEIGHT, COLUMN_ROW_HEIGHT } from '@/types/schema';

// Padding constants for groups
const GROUP_PAD_LEFT = 24;
const GROUP_PAD_RIGHT = 24;
const GROUP_PAD_TOP = 44;
const GROUP_PAD_BOTTOM = 24;
const GROUP_MIN_WIDTH = 200;
const GROUP_MIN_HEIGHT = 120;

export function getTableHeight(table: TableNode): number {
  return TABLE_HEADER_HEIGHT + table.columns.length * COLUMN_ROW_HEIGHT + 32;
}

function getTablesForGroup(tables: TableNode[], groupId: string): TableNode[] {
  return tables.filter(t => t.groupId === groupId);
}

function computeGroupBounds(tables: TableNode[], group: GroupNode): { x: number; y: number; width: number; height: number } {
  const groupTables = getTablesForGroup(tables, group.id);
  if (groupTables.length === 0) {
    return { x: group.position.x, y: group.position.y, width: Math.max(group.width, GROUP_MIN_WIDTH), height: Math.max(group.height, GROUP_MIN_HEIGHT) };
  }

  const minX = Math.min(...groupTables.map(t => t.position.x));
  const minY = Math.min(...groupTables.map(t => t.position.y));
  const maxX = Math.max(...groupTables.map(t => t.position.x + (t.width || DEFAULT_TABLE_WIDTH)));
  const maxY = Math.max(...groupTables.map(t => t.position.y + getTableHeight(t)));

  return {
    x: minX - GROUP_PAD_LEFT,
    y: minY - GROUP_PAD_TOP,
    width: Math.max(GROUP_MIN_WIDTH, maxX - minX + GROUP_PAD_LEFT + GROUP_PAD_RIGHT),
    height: Math.max(GROUP_MIN_HEIGHT, maxY - minY + GROUP_PAD_TOP + GROUP_PAD_BOTTOM),
  };
}

function autoResizeAllGroups(tables: TableNode[], groups: GroupNode[]): GroupNode[] {
  let changed = false;
  const result = groups.map(g => {
    const bounds = computeGroupBounds(tables, g);
    if (
      Math.abs(g.position.x - bounds.x) > 0.5 ||
      Math.abs(g.position.y - bounds.y) > 0.5 ||
      Math.abs(g.width - bounds.width) > 0.5 ||
      Math.abs(g.height - bounds.height) > 0.5
    ) {
      changed = true;
      return { ...g, position: { x: bounds.x, y: bounds.y }, width: bounds.width, height: bounds.height };
    }
    return g;
  });
  return changed ? result : groups;
}

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
      const col = groupedCount % 2;
      const row = Math.floor(groupedCount / 2);
      const colWidth = DEFAULT_TABLE_WIDTH + 22;
      const baseTableHeight = TABLE_HEADER_HEIGHT + COLUMN_ROW_HEIGHT + 32;
      const rowHeight = baseTableHeight + 26;

      const nextPos = {
        x: group.position.x + GROUP_PAD_LEFT + col * colWidth,
        y: group.position.y + GROUP_PAD_TOP + row * rowHeight,
      };

      // Just assign the groupId and position; subscriber handles group resize
      return {
        tables: s.tables.map((t) =>
          t.id === tableId ? { ...t, groupId, position: nextPos } : t
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
    
    let nameIndex = 1;
    let newName = 'new_table';
    while (state.tables.some(t => t.name === newName)) {
      nameIndex++;
      newName = `new_table_${nameIndex}`;
    }

    const baseTableHeight = TABLE_HEADER_HEIGHT + COLUMN_ROW_HEIGHT + 32;
    const gapX = 22;
    const gapY = 26;
    const perRow = 2;
    const colWidth = DEFAULT_TABLE_WIDTH + gapX;

    const tablesInGroup = getTablesForGroup(state.tables, groupId);
    const idx = tablesInGroup.length;
    const col = idx % perRow;
    const row = Math.floor(idx / perRow);

    const position = {
      x: group.position.x + GROUP_PAD_LEFT + col * colWidth,
      y: group.position.y + GROUP_PAD_TOP + row * (baseTableHeight + gapY),
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

    // Just add the table; the subscriber will auto-resize the group
    set((s) => ({
      tables: [...s.tables, table],
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
      const tableIdsToRemove = new Set(s.tables.filter(t => t.groupId === id).map(t => t.id));

      return {
        groups: s.groups.filter((g) => g.id !== id),
        tables: s.tables.filter((t) => !tableIdsToRemove.has(t.id)),
        relationships: s.relationships.filter(
          (r) => !tableIdsToRemove.has(r.sourceTableId) && !tableIdsToRemove.has(r.targetTableId)
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
      return {
        groups: s.groups.map((g) => (g.id === id ? { ...g, position } : g)),
        tables: s.tables.map((t) => 
          t.groupId === id
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

      const tablesInside = getTablesForGroup(s.tables, id);

      if (tablesInside.length > 0) {
        const minTableX = Math.min(...tablesInside.map((t) => t.position.x));
        const minTableY = Math.min(...tablesInside.map((t) => t.position.y));
        const maxTableX = Math.max(...tablesInside.map((t) => t.position.x + t.width));
        const maxTableY = Math.max(...tablesInside.map((t) => t.position.y + getTableHeight(t)));

        const mustLeft = minTableX - GROUP_PAD_LEFT;
        const mustTop = minTableY - GROUP_PAD_TOP;
        const mustRight = maxTableX + GROUP_PAD_RIGHT;
        const mustBottom = maxTableY + GROUP_PAD_BOTTOM;

        nextX = Math.min(nextX, mustLeft);
        nextY = Math.min(nextY, mustTop);
        
        nextWidth = Math.max(nextWidth, mustRight - nextX);
        nextHeight = Math.max(nextHeight, mustBottom - nextY);
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

// Auto-resize groups whenever tables change, then fix overlaps
const GROUP_REFLOW_GAP = 50;

function reflowOverlappingGroups(groups: GroupNode[]): GroupNode[] {
  if (groups.length <= 1) return groups;

  // Sort groups by x position for left-to-right reflow
  const sorted = [...groups].sort((a, b) => a.position.x - b.position.x);
  const result = sorted.map(g => ({ ...g }));
  let changed = false;

  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const prevRight = prev.position.x + prev.width + GROUP_REFLOW_GAP;
    if (result[i].position.x < prevRight) {
      result[i] = { ...result[i], position: { x: prevRight, y: result[i].position.y } };
      changed = true;
    }
  }

  if (!changed) return groups;
  
  // Map back to original order
  const idMap = new Map(result.map(g => [g.id, g]));
  return groups.map(g => idMap.get(g.id) || g);
}

let _prevTables: TableNode[] = [];
let _isAutoResizing = false;
useSchemaStore.subscribe((state) => {
  if (_isAutoResizing) return;
  if (state.tables === _prevTables) return;
  _prevTables = state.tables;

  _isAutoResizing = true;

  let groups = autoResizeAllGroups(state.tables, state.groups);
  const reflowed = reflowOverlappingGroups(groups);

  // If groups were reflowed, also shift tables inside those groups
  if (reflowed !== groups) {
    let tables = state.tables;
    let tablesChanged = false;
    const groupsBefore = new Map(groups.map(g => [g.id, g]));
    
    for (const newG of reflowed) {
      const original = groupsBefore.get(newG.id);
      if (!original) continue;
      const dx = newG.position.x - original.position.x;
      const dy = newG.position.y - original.position.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        tablesChanged = true;
        tables = tables.map(t =>
          t.groupId === newG.id
            ? { ...t, position: { x: t.position.x + dx, y: t.position.y + dy } }
            : t
        );
      }
    }

    if (tablesChanged) {
      _prevTables = tables;
      useSchemaStore.setState({ groups: reflowed, tables });
    } else {
      useSchemaStore.setState({ groups: reflowed });
    }
  } else if (groups !== state.groups) {
    useSchemaStore.setState({ groups });
  }

  _isAutoResizing = false;
});
