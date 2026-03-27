"use client";

import React from 'react';
import type { TableNode, Relationship } from '@/types/schema';
import { TABLE_HEADER_HEIGHT, COLUMN_ROW_HEIGHT } from '@/types/schema';

interface Props {
  tables: TableNode[];
  relationships: Relationship[];
  connectingFrom?: { tableId: string; columnId: string } | null;
  mousePos?: { x: number; y: number } | null;
}

function getColumnY(table: TableNode, columnId: string): number {
  const idx = table.columns.findIndex((c) => c.id === columnId);
  if (idx === -1) return table.position.y + TABLE_HEADER_HEIGHT;
  return table.position.y + TABLE_HEADER_HEIGHT + idx * COLUMN_ROW_HEIGHT + COLUMN_ROW_HEIGHT / 2;
}

export const RelationshipLines: React.FC<Props> = ({ tables, relationships, connectingFrom, mousePos }) => {
  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: 1, height: 1 }}
    >
      {/* Active connecting line */}
      {connectingFrom && mousePos && (() => {
        const srcTable = tables.find((t) => t.id === connectingFrom.tableId);
        if (!srcTable) return null;

        const srcY = getColumnY(srcTable, connectingFrom.columnId);
        const srcCenterX = srcTable.position.x + srcTable.width / 2;
        
        // Decide which side to start from based on mouse position
        const srcX = mousePos.x > srcCenterX 
          ? srcTable.position.x + srcTable.width 
          : srcTable.position.x;

        const midX = (srcX + mousePos.x) / 2;
        const pathD = `M ${srcX} ${srcY} C ${midX} ${srcY}, ${midX} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;

        return (
          <g className="opacity-60">
            <path
              d={pathD}
              fill="none"
              stroke="hsl(var(--connector-line))"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <circle cx={srcX} cy={srcY} r={3} fill="hsl(var(--connector-active))" />
            <circle cx={mousePos.x} cy={mousePos.y} r={4} fill="hsl(var(--connector-active))" />
          </g>
        );
      })()}

      {relationships.map((rel) => {
        const srcTable = tables.find((t) => t.id === rel.sourceTableId);
        const tgtTable = tables.find((t) => t.id === rel.targetTableId);
        if (!srcTable || !tgtTable) return null;

        const srcY = getColumnY(srcTable, rel.sourceColumnId);
        const tgtY = getColumnY(tgtTable, rel.targetColumnId);

        // Determine which sides to connect from
        const srcCenterX = srcTable.position.x + srcTable.width / 2;
        const tgtCenterX = tgtTable.position.x + tgtTable.width / 2;

        let srcX: number;
        let tgtX: number;

        if (srcCenterX < tgtCenterX) {
          srcX = srcTable.position.x + srcTable.width;
          tgtX = tgtTable.position.x;
        } else {
          srcX = srcTable.position.x;
          tgtX = tgtTable.position.x + tgtTable.width;
        }

        const midX = (srcX + tgtX) / 2;

        const pathD = `M ${srcX} ${srcY} C ${midX} ${srcY}, ${midX} ${tgtY}, ${tgtX} ${tgtY}`;

        return (
          <g key={rel.id}>
            <path
              d={pathD}
              fill="none"
              stroke="hsl(var(--connector-line))"
              strokeWidth={1.5}
              strokeDasharray={rel.cardinality === 'N:N' ? '4 3' : undefined}
            />
            {/* Source marker */}
            <circle
              cx={srcX}
              cy={srcY}
              r={3}
              fill="hsl(var(--connector-active))"
            />
            {/* Target marker */}
            {rel.cardinality === '1:1' && (
              <circle cx={tgtX} cy={tgtY} r={3} fill="hsl(var(--connector-active))" />
            )}
            {(rel.cardinality === '1:N' || rel.cardinality === 'N:N') && (
              <>
                <line
                  x1={tgtX}
                  y1={tgtY - 6}
                  x2={tgtX + (srcCenterX < tgtCenterX ? -8 : 8)}
                  y2={tgtY}
                  stroke="hsl(var(--connector-active))"
                  strokeWidth={1.5}
                />
                <line
                  x1={tgtX}
                  y1={tgtY + 6}
                  x2={tgtX + (srcCenterX < tgtCenterX ? -8 : 8)}
                  y2={tgtY}
                  stroke="hsl(var(--connector-active))"
                  strokeWidth={1.5}
                />
              </>
            )}
            {/* Cardinality label */}
            <text
              x={midX}
              y={Math.min(srcY, tgtY) - 8}
              fill="hsl(var(--muted-foreground))"
              fontSize={10}
              textAnchor="middle"
              fontFamily="ManropeLocal, Manrope, sans-serif"
            >
              {rel.cardinality}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
