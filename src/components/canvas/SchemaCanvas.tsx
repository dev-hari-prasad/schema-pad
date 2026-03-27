"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { TableBlock } from '@/components/canvas/TableBlock';
import { GroupBlock } from '@/components/canvas/GroupBlock';
import { RelationshipLines } from '@/components/canvas/RelationshipLines';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { SlashCommandMenu } from '@/components/canvas/SlashCommandMenu';
import { SQLPanel } from '@/components/canvas/SQLPanel';
import { BottomChatInput } from '@/components/canvas/BottomChatInput';
import { 
  MagnifyingGlassPlus, 
  MagnifyingGlassMinus, 
  Question, 
  HandGrabbing, 
  MagnifyingGlass, 
  Keyboard,
  Table,
  FolderPlus,
  Code,
  Bug
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

const CanvasZoomControls: React.FC<{
  zoom: number;
  setZoom: (z: number) => void;
}> = ({ zoom, setZoom }) => (
  <div className="flex items-center gap-1 h-10 px-2 rounded-full bg-floating-bg border border-floating-border shadow-sm">
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
      onClick={() => setZoom(zoom - 0.1)}
      title="Zoom out"
    >
      <MagnifyingGlassMinus size={18} />
    </motion.button>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="text-[13px] text-muted-foreground hover:text-foreground font-medium w-10 text-center select-none transition-colors"
      onClick={() => setZoom(1)}
      title="Reset zoom"
    >
      {Math.round(zoom * 100)}%
    </motion.button>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
      onClick={() => setZoom(zoom + 0.1)}
      title="Zoom in"
    >
      <MagnifyingGlassPlus size={18} />
    </motion.button>
  </div>
);

const SchemaCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { tables, groups, relationships, pan, zoom, showGrid, selectedIds, connectingFrom } = useSchemaStore();
  const { setPan, setZoom, addTable, addGroup, setSelectedIds, setEditingTableId, setEditingColumnId, setConnectingFrom } = useSchemaStore();
  const chatDockPosition = usePreferencesStore((s) => s.chatDockPosition);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [didDrag, setDidDrag] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ x: number; y: number } | null>(null);
  const [sqlPanelOpen, setSqlPanelOpen] = useState(false);
  const [canvasContextPoint, setCanvasContextPoint] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const screenToCanvas = useCallback(
    (sx: number, sy: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (sx - rect.left - pan.x) / zoom,
        y: (sy - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Zoom on scroll wheel (no modifier needed), pan with two-finger/trackpad
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const store = useSchemaStore.getState();
      const currentPan = store.pan;
      const currentZoom = store.zoom;

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on trackpad
        const delta = -e.deltaY * 0.005;
        const newZoom = Math.max(0.1, Math.min(3, currentZoom + delta));
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const scale = newZoom / currentZoom;
        store.setPan({
          x: mx - (mx - currentPan.x) * scale,
          y: my - (my - currentPan.y) * scale,
        });
        store.setZoom(newZoom);
      } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
        // Regular scroll = zoom
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.max(0.1, Math.min(3, currentZoom + delta));
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const scale = newZoom / currentZoom;
        store.setPan({
          x: mx - (mx - currentPan.x) * scale,
          y: my - (my - currentPan.y) * scale,
        });
        store.setZoom(newZoom);
      } else {
        // Horizontal scroll / shift+scroll = pan
        store.setPan({
          x: currentPan.x - e.deltaX,
          y: currentPan.y - e.deltaY,
        });
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Left-click + drag on background = pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isBg = target === canvasRef.current || target.dataset.canvasBg === 'true';
      if (!isBg) return;

      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        activeEl.blur();
      }

      if (e.button === 0 || e.button === 1) {
        setIsPanning(true);
        setDidDrag(false);
        const currentPan = useSchemaStore.getState().pan;
        setPanStart({ x: e.clientX - currentPan.x, y: e.clientY - currentPan.y });
        e.preventDefault();
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setDidDrag(true);
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    },
    [isPanning, panStart, setPan]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        // If it was a click (no drag), deselect
        if (!didDrag) {
          setSelectedIds([]);
          setEditingTableId(null);
          setEditingColumnId(null);
          setConnectingFrom(null);
          setSlashMenu(null);
        }
      }
    },
    [isPanning, didDrag, setSelectedIds, setEditingTableId, setEditingColumnId, setConnectingFrom]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target.dataset.canvasBg === 'true') {
        const pos = screenToCanvas(e.clientX, e.clientY);
        addTable(pos);
      }
    },
    [screenToCanvas, addTable]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !isInput) {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) setSlashMenu({ x: rect.width / 2, y: rect.height / 2 });
      }
      if (e.key === 'Escape') {
        setSlashMenu(null);
        setConnectingFrom(null);
        setEditingTableId(null);
        setEditingColumnId(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        const store = useSchemaStore.getState();
        for (const id of store.selectedIds) {
          store.removeTable(id);
        }
      }
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !isInput) {
        useSchemaStore.getState().toggleGrid();
      }
      if (e.key === 'g' && (e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault();
        window.open('https://github.com/dev-hari-prasad/schema-pad/issues/new', '_blank');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSlashMenu, setConnectingFrom, setEditingTableId, setEditingColumnId]);

  // Track mouse for relationship line drawing
  useEffect(() => {
    if (!connectingFrom) {
      setMousePos(null);
      return;
    }
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos(screenToCanvas(e.clientX, e.clientY));
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [connectingFrom, screenToCanvas]);

  const handleSlashCommand = useCallback(
    (cmd: string) => {
      if (cmd === 'table' || cmd === 'group') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && slashMenu) {
          const pos = screenToCanvas(rect.left + slashMenu.x, rect.top + slashMenu.y);
          if (cmd === 'table') addTable(pos);
          if (cmd === 'group') addGroup(pos);
        }
      }
      if (cmd === 'sql') setSqlPanelOpen(true);
      if (cmd === 'share') {
        // Dispatch custom event to open share popover
        window.dispatchEvent(new CustomEvent('schema:open-share'));
      }
      setSlashMenu(null);
    },
    [slashMenu, screenToCanvas, addTable, addGroup]
  );

  const handleSlashAskAI = useCallback((message: string) => {
    window.dispatchEvent(new CustomEvent('schema:ask-ai-from-command', { detail: { message } }));
    setSlashMenu(null);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-canvas-bg no-select">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={canvasRef}
            className={`absolute inset-0 ${isPanning ? 'canvas-cursor-grabbing' : 'canvas-cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsPanning(false)}
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => {
              const target = e.target as HTMLElement;
              const isBg = target === canvasRef.current || target.dataset.canvasBg === 'true';
              if (isBg) {
                setCanvasContextPoint({ x: e.clientX, y: e.clientY });
              } else {
                setCanvasContextPoint(null);
              }
            }}
            data-canvas-bg="true"
          >
        {/* Grid */}
        {showGrid && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" data-canvas-bg="true">
            <defs>
              <pattern
                id="grid-small"
                width={20 * zoom}
                height={20 * zoom}
                patternUnits="userSpaceOnUse"
                x={pan.x % (20 * zoom)}
                y={pan.y % (20 * zoom)}
              >
                <circle cx={1} cy={1} r={0.5} fill="hsl(var(--canvas-grid))" />
              </pattern>
              <pattern
                id="grid-large"
                width={100 * zoom}
                height={100 * zoom}
                patternUnits="userSpaceOnUse"
                x={pan.x % (100 * zoom)}
                y={pan.y % (100 * zoom)}
              >
                <circle cx={1} cy={1} r={1} fill="hsl(var(--canvas-grid-major))" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-small)" />
            <rect width="100%" height="100%" fill="url(#grid-large)" />
          </svg>
        )}

        {/* Transform layer */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute"
          data-canvas-bg="true"
        >
          <RelationshipLines 
            tables={tables} 
            relationships={relationships} 
            connectingFrom={connectingFrom}
            mousePos={mousePos}
          />
          <AnimatePresence>
            {groups.map((group) => (
              <GroupBlock key={group.id} group={group} />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {tables.map((table) => (
              <TableBlock key={table.id} table={table} />
            ))}
          </AnimatePresence>
        </div>
      </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44 rounded-xl border-floating-border bg-floating-bg p-1.5 shadow-xl">
          <ContextMenuItem
            className="rounded-md text-xs text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
            onSelect={() => {
              if (!canvasContextPoint) return;
              addTable(screenToCanvas(canvasContextPoint.x, canvasContextPoint.y));
            }}
          >
            <Table size={14} className="mr-2" />
            Create table
          </ContextMenuItem>
          <ContextMenuItem
            className="rounded-md text-xs text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
            onSelect={() => {
              if (!canvasContextPoint) return;
              addGroup(screenToCanvas(canvasContextPoint.x, canvasContextPoint.y));
            }}
          >
            <FolderPlus size={14} className="mr-2" />
            Create group
          </ContextMenuItem>
          <ContextMenuItem
            className="rounded-md text-xs text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
            onSelect={() => setSqlPanelOpen(true)}
          >
            <Code size={14} className="mr-2" />
            View SQL
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <CanvasToolbar onOpenSQL={() => setSqlPanelOpen(true)} isSQLOpen={sqlPanelOpen} />

      {slashMenu && (
        <SlashCommandMenu
          position={slashMenu}
          onSelect={handleSlashCommand}
          onAskAI={handleSlashAskAI}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {sqlPanelOpen && <SQLPanel onClose={() => setSqlPanelOpen(false)} />}
      <BottomChatInput />

      {/* Status bar (bottom-left) */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 text-xs text-muted-foreground font-medium z-10 pointer-events-none">
        <span>{tables.length} table{tables.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Zoom at bottom center when chat is docked bottom-right */}
      {chatDockPosition === 'bottom-right' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
          <CanvasZoomControls zoom={zoom} setZoom={setZoom} />
        </div>
      )}

      {/* Bottom Right Workspace Controls (hide ? when chat is docked bottom-right) */}
      {chatDockPosition !== 'bottom-right' && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
          {/* Help Popover */}
          <div className="group relative">
            <button className="flex items-center justify-center w-8 h-8 rounded-full bg-floating-bg border border-floating-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-sm focus:outline-none">
              <Question size={15} weight="bold" />
            </button>
            
            <div className="absolute bottom-full right-0 mb-2 w-60 p-3 rounded-lg bg-popover text-popover-foreground border border-border shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 px-1">Shortcuts</h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5 text-sm px-1">
                  <div className="w-5 flex justify-center text-muted-foreground"><HandGrabbing size={16} /></div>
                  <span>Click and drag to pan</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm px-1">
                  <div className="w-5 flex justify-center text-muted-foreground"><MagnifyingGlass size={16} /></div>
                  <span>Pinch to zoom</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm px-1">
                  <div className="w-5 flex justify-center text-muted-foreground"><Keyboard size={16} /></div>
                  <span>Press <kbd className="bg-secondary px-1.5 py-0.5 rounded text-xs ml-1 border border-border">/</kbd> for commands</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm px-1">
                  <div className="w-5 flex justify-center text-muted-foreground"><Bug size={16} /></div>
                  <span>Report issue: <kbd className="bg-secondary px-1.5 py-0.5 rounded text-xs mx-1 border border-border">Ctrl</kbd> + <kbd className="bg-secondary px-1.5 py-0.5 rounded text-xs mr-1 border border-border">G</kbd></span>
                </div>
              </div>
            </div>
          </div>

          {chatDockPosition === 'center' && <CanvasZoomControls zoom={zoom} setZoom={setZoom} />}
        </div>
      )}
    </div>
  );
};

export default SchemaCanvas;
