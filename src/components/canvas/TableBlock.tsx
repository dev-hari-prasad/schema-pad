"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import type { TableNode, Column, ColumnType } from '@/types/schema';
import { COLUMN_TYPES, COLUMN_ROW_HEIGHT, TABLE_HEADER_HEIGHT } from '@/types/schema';
import {
  Key, LinkSimple, HashStraight, Plus, Trash, CopySimple, CaretDown, PencilSimple, Folders, Check, DotsSixVertical,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TableBlockProps {
  table: TableNode;
}

export const TableBlock: React.FC<TableBlockProps> = ({ table }) => {
  const {
    selectedIds, editingTableId, editingColumnId,
    setSelectedIds, toggleSelected, setEditingTableId, setEditingColumnId,
    updateTableName, moveTable, addColumn, updateColumn, removeColumn, removeTable,
    duplicateTable, connectingFrom, setConnectingFrom, addRelationship, groups, moveTableToGroup, tables,
  } = useSchemaStore();

  const isSelected = selectedIds.includes(table.id);
  const isEditing = editingTableId === table.id;
  const isDuplicateTableName = tables.some(t => t.id !== table.id && t.name.toLowerCase() === table.name.toLowerCase());
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const nameInputRef = useRef<HTMLInputElement>(null);

  const focusNameInput = useCallback(() => {
    const input = nameInputRef.current;
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    input.select();
  }, []);

  useEffect(() => {
    if (isEditing) {
      focusNameInput();
    }
  }, [isEditing, focusNameInput]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const longestColumnNameLength = table.columns.reduce(
    (max, col) => Math.max(max, col.name.length),
    0
  );
  const estimatedNameWidth = Math.max(140, longestColumnNameLength * 8 + 26);
  const fixedControlsWidth = 188;
  const dynamicWidth = estimatedNameWidth + fixedControlsWidth;
  const tableRenderWidth = Math.min(
    Math.floor(viewportWidth * 0.5),
    Math.max(240, table.width, dynamicWidth)
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey) {
        toggleSelected(table.id);
      } else {
        if (!isSelected) setSelectedIds([table.id]);
      }
      const el = e.target as HTMLElement;
      const isHandle = !!el.closest('.table-drag-handle');
      if (!isHandle) return;

      setDragging(true);
      setDragOffset({
        x: e.clientX / useSchemaStore.getState().zoom - table.position.x,
        y: e.clientY / useSchemaStore.getState().zoom - table.position.y,
      });
    },
    [table.id, table.position, isSelected, setSelectedIds, toggleSelected]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const zoom = useSchemaStore.getState().zoom;
      moveTable(table.id, {
        x: e.clientX / zoom - dragOffset.x,
        y: e.clientY / zoom - dragOffset.y,
      });
    };
    const handleUp = () => {
      setDragging(false);
      
      // Auto-detect group membership after drag
      const state = useSchemaStore.getState();
      const t = state.tables.find(tbl => tbl.id === table.id);
      if (!t) return;
      
      const centerX = t.position.x + t.width / 2;
      const centerY = t.position.y + 20;
      
      // Find which group this table's center falls into
      let targetGroupId: string | null = null;
      for (const g of state.groups) {
        if (
          centerX >= g.position.x && centerX <= g.position.x + g.width &&
          centerY >= g.position.y && centerY <= g.position.y + g.height
        ) {
          targetGroupId = g.id;
          break;
        }
      }
      
      const currentGroupId = t.groupId || null;
      if (targetGroupId !== currentGroupId) {
        // Just update groupId, keep position where user dropped it
        useSchemaStore.setState((s) => ({
          tables: s.tables.map(tbl => 
            tbl.id === table.id ? { ...tbl, groupId: targetGroupId || undefined } : tbl
          ),
        }));
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, dragOffset, table.id, moveTable]);

  const handleColumnConnect = (columnId: string) => {
    if (connectingFrom) {
      if (connectingFrom.tableId !== table.id) {
        addRelationship({
          sourceTableId: connectingFrom.tableId,
          sourceColumnId: connectingFrom.columnId,
          targetTableId: table.id,
          targetColumnId: columnId,
          cardinality: '1:N',
        });
        updateColumn(connectingFrom.tableId, connectingFrom.columnId, { isForeignKey: true });
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom({ tableId: table.id, columnId });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, columnId?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (columnId) {
        addColumn(table.id);
      } else {
        if (table.columns.length === 0) {
          addColumn(table.id);
        } else {
          setEditingColumnId(table.columns[0].id);
        }
      }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (columnId) {
        const idx = table.columns.findIndex((c) => c.id === columnId);
        if (idx < table.columns.length - 1) {
          setEditingColumnId(table.columns[idx + 1].id);
        } else {
          addColumn(table.id);
        }
      }
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ scale: { type: 'spring', stiffness: 300, damping: 20 }, opacity: { duration: 0.2 } }}
      className={`absolute flex flex-col table-block border-[1.5px] rounded-lg overflow-hidden shadow-sm transition-shadow ${
        isSelected ? 'border-table-selected ring-1 ring-table-selected/30' : 'border-table-border'
      } ${connectingFrom ? 'cursor-crosshair' : ''}`}
      style={{
        left: table.position.x,
        top: table.position.y,
        width: tableRenderWidth,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditingTableId(table.id);
      }}
    >
      <div
        className="flex items-center justify-between pl-2.5 pr-4 bg-table-header"
        style={{ height: TABLE_HEADER_HEIGHT }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            className="table-drag-handle p-0.5 -ml-0.5 rounded cursor-grab active:cursor-grabbing opacity-70 hover:opacity-100 hover:bg-secondary/60"
            title="Drag table"
          >
            <DotsSixVertical size={16} weight="bold" />
          </button>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip open={isDuplicateTableName}>
                  <TooltipTrigger asChild>
                    <input
                      ref={nameInputRef}
                      className={`bg-transparent text-[15px] font-semibold outline-none w-full ${isDuplicateTableName ? 'text-destructive' : 'text-foreground'}`}
                      value={table.name}
                      onChange={(e) => updateTableName(table.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e)}
                      onBlur={() => setEditingTableId(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs bg-destructive text-destructive-foreground border-0 px-2 py-1 font-medium shadow-lg">
                    <p>Table name already exists</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider delayDuration={0}>
                <Tooltip open={isDuplicateTableName}>
                  <TooltipTrigger asChild>
                    <span className={`text-[15px] font-semibold truncate block ${isDuplicateTableName ? 'text-destructive' : 'text-foreground'}`}>
                      {table.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs bg-destructive text-destructive-foreground border-0 px-2 py-1 font-medium shadow-lg">
                    <p>Table name already exists</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateTable(table.id);
                  }}
                >
                  <CopySimple size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>Duplicate table</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTable(table.id);
                  }}
                >
                  <Trash size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>Delete table</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="bg-table-bg">
        {table.columns.map((col) => (
          <ColumnRow
            key={col.id}
            column={col}
            tableId={table.id}
            columns={table.columns}
            isEditing={editingColumnId === col.id}
            isConnecting={
              connectingFrom?.tableId === table.id && connectingFrom?.columnId === col.id
            }
            onConnect={() => handleColumnConnect(col.id)}
            onKeyDown={(e) => handleKeyDown(e, col.id)}
          />
        ))}

        <button
          className="flex items-center gap-2 w-full px-3.5 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            addColumn(table.id);
          }}
        >
          <Plus size={13} />
          <span>Add column</span>
        </button>
      </div>
    </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 rounded-xl border-floating-border bg-floating-bg p-1.5 shadow-xl">
        <ContextMenuItem
          className="rounded-md text-xs text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
          onSelect={() => {
            setSelectedIds([table.id]);
            setEditingTableId(table.id);
            window.setTimeout(() => {
              focusNameInput();
            }, 0);
          }}
        >
          <PencilSimple size={14} className="mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          className="rounded-md text-xs text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
          onSelect={() => addColumn(table.id)}
        >
          <Plus size={14} className="mr-2" />
          Add row/column
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger className="rounded-md text-xs text-foreground data-[state=open]:bg-secondary/60 data-[state=open]:text-foreground">
            <Folders size={14} className="mr-2" />
            Move to group
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 rounded-xl border-floating-border bg-floating-bg p-1.5 shadow-xl">
            {groups.length === 0 ? (
              <ContextMenuItem className="rounded-md text-xs" disabled>No groups available</ContextMenuItem>
            ) : (
              groups.map((group) => (
                <ContextMenuItem
                  className="rounded-md text-xs text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
                  key={group.id}
                  onSelect={() => moveTableToGroup(table.id, group.id)}
                >
                  {group.name}
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="rounded-md text-xs text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
          onSelect={() => duplicateTable(table.id)}
        >
          <CopySimple size={14} className="mr-2" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem
          className="rounded-md text-xs text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          onSelect={() => removeTable(table.id)}
        >
          <Trash size={14} className="mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

interface ColumnRowProps {
  column: Column;
  tableId: string;
  columns: Column[];
  isEditing: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const ColumnRow: React.FC<ColumnRowProps> = ({
  column, tableId, columns, isEditing, isConnecting, onConnect, onKeyDown,
}) => {
  const { setEditingColumnId, updateColumn, removeColumn } = useSchemaStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const isDuplicateColumnName = columns.some(c => c.id !== column.id && c.name.toLowerCase() === column.name.toLowerCase());

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={`flex items-center gap-1.5 px-3.5 group transition-colors ${
          isConnecting ? 'bg-primary/10' : 'hover:bg-secondary/30'
        }`}
        style={{ height: COLUMN_ROW_HEIGHT }}
      >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex-shrink-0 w-3 h-3 rounded-full border border-connector-line hover:border-primary hover:bg-primary/30 transition-colors cursor-crosshair"
            onClick={(e) => {
              e.stopPropagation();
              onConnect();
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Click to connect with another table's primary key</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`p-1 rounded transition-colors ${
                column.isPrimaryKey
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                const nextPrimary = !column.isPrimaryKey;
                updateColumn(tableId, column.id, {
                  isPrimaryKey: nextPrimary,
                  isNullable: nextPrimary ? false : column.isNullable,
                  isUnique: nextPrimary ? true : column.isUnique,
                });
              }}
            >
              <Key size={13} weight={column.isPrimaryKey ? 'fill' : 'regular'} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>{column.isPrimaryKey ? 'Unset primary key' : 'Set as primary key'}</p>
          </TooltipContent>
        </Tooltip>
        {column.isForeignKey && <LinkSimple size={13} className="text-connector-active" />}
        {column.isUnique && !column.isPrimaryKey && <HashStraight size={13} className="text-muted-foreground" />}
      </div>

      {isEditing ? (
        <TooltipProvider delayDuration={0}>
          <Tooltip open={isDuplicateColumnName}>
            <TooltipTrigger asChild>
              <input
                ref={inputRef}
                className={`bg-transparent text-[13px] font-medium outline-none flex-1 min-w-0 ${isDuplicateColumnName ? 'text-destructive' : 'text-foreground'}`}
                value={column.name}
                onChange={(e) => updateColumn(tableId, column.id, { name: e.target.value })}
                onKeyDown={onKeyDown}
                onBlur={() => setEditingColumnId(null)}
                onClick={(e) => e.stopPropagation()}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs bg-destructive text-destructive-foreground border-0 px-2 py-1 font-medium shadow-lg">
              <p>Column name already exists</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <TooltipProvider delayDuration={0}>
          <Tooltip open={isDuplicateColumnName}>
            <TooltipTrigger asChild>
              <span
                className={`text-[13px] font-medium truncate flex-1 min-w-0 cursor-text ${isDuplicateColumnName ? 'text-destructive' : 'text-foreground'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingColumnId(column.id);
                }}
              >
                {column.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs bg-destructive text-destructive-foreground border-0 px-2 py-1 font-medium shadow-lg">
              <p>Column name already exists</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="flex items-center gap-1 pl-2 pr-0.5 flex-shrink-0">
        <DataTypePicker
          value={column.type}
          onSelect={(type) => updateColumn(tableId, column.id, { type })}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`text-[11px] flex-shrink-0 px-2.5 py-1 rounded-md border font-medium transition-colors ${
                column.isNullable
                  ? 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  : 'border-primary/30 text-primary bg-primary/10'
              } ${column.isPrimaryKey ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (column.isPrimaryKey) return;
                updateColumn(tableId, column.id, { isNullable: !column.isNullable });
              }}
            >
              {column.isNullable ? 'Nullable' : 'Not null'}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>
              {column.isPrimaryKey
                ? 'Primary keys are always not null'
                : column.isNullable
                  ? 'Set as not null'
                  : 'Set as null'}
            </p>
          </TooltipContent>
        </Tooltip>

        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            removeColumn(tableId, column.id);
          }}
        >
          <Trash size={12} />
        </button>
      </div>
      </div>
    </TooltipProvider>
  );
};

const DataTypePicker: React.FC<{
  value: ColumnType;
  onSelect: (value: ColumnType) => void;
}> = ({ value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:border-border hover:bg-secondary/40 text-[11px] text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
          title="Change datatype"
          type="button"
        >
          <span className="max-w-[76px] truncate text-left">{value}</span>
          <CaretDown size={10} className="opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-44 p-0 rounded-xl border-floating-border bg-floating-bg shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="bg-transparent">
          <div className="px-1.5 pt-1.5">
            <CommandInput ref={searchInputRef} placeholder="Search type..." className="h-9 text-xs" />
          </div>
          <CommandList className="max-h-52 px-1.5 pb-1.5">
            <CommandEmpty className="py-3 text-xs text-muted-foreground px-2">No datatype found.</CommandEmpty>
            {COLUMN_TYPES.map((type) => (
              <CommandItem
                key={type}
                value={type}
                className="text-xs rounded-md my-0.5"
                onSelect={() => {
                  onSelect(type as ColumnType);
                  setOpen(false);
                }}
              >
                <Check size={12} className={`mr-2 ${value === type ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                {type}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
