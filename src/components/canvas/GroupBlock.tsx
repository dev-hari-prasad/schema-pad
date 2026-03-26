import React, { useCallback, useRef, useState, useEffect } from 'react';
import { GroupNode, GroupColor } from '@/types/schema';
import { useSchemaStore } from '@/store/schemaStore';
import { Folder, DotsThree, Trash, PencilSimple, Palette, Plus } from '@phosphor-icons/react';
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

interface Props {
  group: GroupNode;
}

const COLOR_MAP: Record<GroupColor, { container: string, header: string, text: string }> = {
  pink: {
    container: 'bg-pink-100/40 border-pink-300 dark:bg-pink-950/40 dark:border-pink-900/60',
    header: 'bg-pink-200 dark:bg-pink-900/50',
    text: 'text-pink-900 dark:text-pink-400',
  },
  green: {
    container: 'bg-emerald-100/40 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/60',
    header: 'bg-emerald-200 dark:bg-emerald-900/50',
    text: 'text-emerald-900 dark:text-emerald-400',
  },
  orange: {
    container: 'bg-orange-100/40 border-orange-300 dark:bg-orange-950/40 dark:border-orange-900/60',
    header: 'bg-orange-200 dark:bg-orange-900/50',
    text: 'text-orange-900 dark:text-orange-400',
  },
  blue: {
    container: 'bg-blue-100/40 border-blue-300 dark:bg-blue-950/40 dark:border-blue-900/60',
    header: 'bg-blue-200 dark:bg-blue-900/50',
    text: 'text-blue-900 dark:text-blue-400',
  },
  purple: {
    container: 'bg-purple-100/40 border-purple-300 dark:bg-purple-950/40 dark:border-purple-900/60',
    header: 'bg-purple-200 dark:bg-purple-900/50',
    text: 'text-purple-900 dark:text-purple-400',
  },
  gray: {
    container: 'bg-gray-100/40 border-gray-300 dark:bg-zinc-900/40 dark:border-zinc-800/60',
    header: 'bg-gray-200 dark:bg-zinc-800/50',
    text: 'text-gray-900 dark:text-zinc-400',
  },
};

const GroupColors: GroupColor[] = ['pink', 'green', 'orange', 'blue', 'purple', 'gray'];
const COLOR_DOT_CLASS_MAP: Record<GroupColor, string> = {
  pink: 'bg-pink-200 dark:bg-pink-700',
  green: 'bg-emerald-200 dark:bg-emerald-700',
  orange: 'bg-orange-200 dark:bg-orange-700',
  blue: 'bg-blue-200 dark:bg-blue-700',
  purple: 'bg-purple-200 dark:bg-purple-700',
  gray: 'bg-gray-200 dark:bg-slate-700',
};

export const GroupBlock: React.FC<Props> = ({ group }) => {
  const { moveGroup, updateGroupName, removeGroup, removeGroupAndTables, updateGroupColor, addTableToGroup } = useSchemaStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0, gx: 0, gy: 0 });
  const resizeStart = useRef({ x: 0, y: 0, gx: 0, gy: 0, gw: 0, gh: 0 });
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const colors = COLOR_MAP[group.color];

  // Dragging logic
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.group-controls')) return;
    
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      gx: group.position.x,
      gy: group.position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [group.position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      const zoom = useSchemaStore.getState().zoom;
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      
      dragStart.current.x = e.clientX;
      dragStart.current.y = e.clientY;

      moveGroup(group.id, {
        x: group.position.x + dx,
        y: group.position.y + dy,
      }, { x: dx, y: dy });
    }
  }, [isDragging, moveGroup, group.id, group.position]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Resizing logic
  const handleResizePointerDown = useCallback((e: React.PointerEvent, dir: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDir(dir);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      gx: group.position.x,
      gy: group.position.y,
      gw: group.width,
      gh: group.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [group.position, group.width, group.height]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (isResizing && resizeDir) {
      const zoom = useSchemaStore.getState().zoom;
      const dx = (e.clientX - resizeStart.current.x) / zoom;
      const dy = (e.clientY - resizeStart.current.y) / zoom;

      let newWidth = resizeStart.current.gw;
      let newHeight = resizeStart.current.gh;
      let newX = resizeStart.current.gx;
      let newY = resizeStart.current.gy;

      if (resizeDir.includes('e')) {
        newWidth = Math.max(150, resizeStart.current.gw + dx);
      } else if (resizeDir.includes('w')) {
        newWidth = Math.max(150, resizeStart.current.gw - dx);
        if (newWidth > 150) newX = resizeStart.current.gx + dx;
        else newX = resizeStart.current.gx + (resizeStart.current.gw - 150);
      }

      if (resizeDir.includes('s')) {
        newHeight = Math.max(100, resizeStart.current.gh + dy);
      } else if (resizeDir.includes('n')) {
        newHeight = Math.max(100, resizeStart.current.gh - dy);
        if (newHeight > 100) newY = resizeStart.current.gy + dy;
        else newY = resizeStart.current.gy + (resizeStart.current.gh - 100);
      }

      useSchemaStore.getState().resizeGroup(group.id, { width: newWidth, height: newHeight }, { x: newX, y: newY });
    }
  }, [isResizing, resizeDir, group.id]);

  const handleResizePointerUp = useCallback((e: React.PointerEvent) => {
    setIsResizing(false);
    setResizeDir(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showMenu]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ scale: { type: 'spring', stiffness: 300, damping: 20 }, opacity: { duration: 0.2 } }}
      className={`absolute border rounded-lg transition-colors flex flex-col ${colors.container}`}
      style={{
        left: group.position.x,
        top: group.position.y,
        width: group.width,
        height: group.height,
        zIndex: 0,
      }}
    >
      {/* Header */}
      <div 
        className={`h-8 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing rounded-t-md opacity-90 backdrop-blur-sm ${colors.header} ${colors.text}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-1.5 flex-1 select-none">
          <Folder size={15} weight="fill" className="opacity-80" />
          <input
            ref={nameInputRef}
            value={group.name}
            onChange={(e) => updateGroupName(group.id, e.target.value)}
            className="bg-transparent border-none outline-none font-semibold text-xs tracking-wide w-full"
            placeholder="Group Name"
          />
        </div>
        
        {/* Controls */}
        <div ref={menuRef} className="group-controls relative flex items-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }} 
            className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <DotsThree size={16} weight="bold" />
          </button>
          
          {showMenu && (
            <div className="absolute top-8 right-0 bg-popover text-popover-foreground border border-border rounded-md shadow-xl w-44 z-50 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-border space-y-2">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground px-1">Name</div>
                <input
                  value={group.name}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded bg-secondary text-foreground outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Group Name"
                />
              </div>
              <div className="p-2 border-b border-border space-y-2">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground px-1">Color</div>
                <div className="flex flex-wrap gap-1 px-1">
                  {GroupColors.map(c => (
                    <button 
                      key={c}
                      onClick={() => { updateGroupColor(group.id, c); setShowMenu(false); }}
                      className={`w-4 h-4 rounded-full border border-black/20 dark:border-white/20`}
                      style={{ backgroundColor: c === 'gray' ? '#9ca3af' : c === 'pink' ? '#f472b6' : c === 'green' ? '#34d399' : c === 'orange' ? '#fb923c' : c === 'blue' ? '#60a5fa' : '#c084fc' }}
                    />
                  ))}
                </div>
              </div>
              <div className="p-1 flex flex-col">
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-colors"
                  onClick={() => {
                    addTableToGroup(group.id);
                    setShowMenu(false);
                  }}
                >
                  <Plus size={14} /> Add table
                </button>
                <button 
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm transition-colors"
                  onClick={() => removeGroup(group.id)}
                >
                  <Folder size={14} /> Delete group only
                </button>
                <button 
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-sm transition-colors"
                  onClick={() => removeGroupAndTables(group.id)}
                >
                  <Trash size={14} /> Delete group & tables
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resize Handles */}
      <div 
        className="absolute top-0 left-0 w-full h-[6px] -translate-y-1/2 cursor-ns-resize z-10"
        onPointerDown={(e) => handleResizePointerDown(e, 'n')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}
      />
      <div 
        className="absolute bottom-0 left-0 w-full h-[6px] translate-y-1/2 cursor-ns-resize z-10"
        onPointerDown={(e) => handleResizePointerDown(e, 's')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}
      />
      <div 
        className="absolute top-0 left-0 w-[6px] h-full -translate-x-1/2 cursor-ew-resize z-10"
        onPointerDown={(e) => handleResizePointerDown(e, 'w')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}
      />
      <div 
        className="absolute top-0 right-0 w-[6px] h-full translate-x-1/2 cursor-ew-resize z-10"
        onPointerDown={(e) => handleResizePointerDown(e, 'e')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}
      />
      
      {/* Corner Handles */}
      <div 
        className="absolute top-0 left-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize z-20"
        onPointerDown={(e) => handleResizePointerDown(e, 'nw')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}
      />
      <div 
        className="absolute top-0 right-0 w-4 h-4 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize z-20"
        onPointerDown={(e) => handleResizePointerDown(e, 'ne')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}
      />
      <div 
        className="absolute bottom-0 left-0 w-4 h-4 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize z-20"
        onPointerDown={(e) => handleResizePointerDown(e, 'sw')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}
      />
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize z-20"
        onPointerDown={(e) => handleResizePointerDown(e, 'se')} onPointerMove={handleResizePointerMove} onPointerUp={handleResizePointerUp}
      />

      {/* Visual resize indicator at bottom right */}
      <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 z-0">
        <div className="w-2 h-2 rounded-tl-sm bg-black/20 dark:bg-white/20 translate-x-1 translate-y-1" />
      </div>
    </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 rounded-xl border-floating-border bg-floating-bg p-1.5 shadow-xl">
        <ContextMenuItem
          className="rounded-md text-xs text-foreground focus:bg-secondary/60 focus:text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
          onSelect={() => addTableToGroup(group.id)}
        >
          <Plus size={14} className="mr-2" />
          Add table
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="rounded-md text-xs text-foreground focus:bg-secondary/60 focus:text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
          onSelect={() => {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
          }}
        >
          <PencilSimple size={14} className="mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger className="rounded-md text-xs text-foreground focus:bg-secondary/60 focus:text-foreground data-[state=open]:bg-secondary/60 data-[state=open]:text-foreground">
            <Palette size={14} className="mr-2" />
            Color
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40 rounded-xl border-floating-border bg-floating-bg p-1.5 shadow-xl">
            {GroupColors.map((c) => (
              <ContextMenuItem
                key={c}
                className="rounded-md text-xs text-foreground focus:bg-secondary/60 focus:text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
                onSelect={() => updateGroupColor(group.id, c)}
              >
                <span
                  className={`mr-2 h-2.5 w-2.5 rounded-full border border-black/20 dark:border-white/25 ${COLOR_DOT_CLASS_MAP[c]}`}
                />
                {c[0].toUpperCase() + c.slice(1)}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="rounded-md text-xs text-foreground focus:bg-secondary/60 focus:text-foreground data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground"
          onSelect={() => removeGroup(group.id)}
        >
          <Folder size={14} className="mr-2" />
          Delete group only
        </ContextMenuItem>
        <ContextMenuItem
          className="rounded-md text-xs text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          onSelect={() => removeGroupAndTables(group.id)}
        >
          <Trash size={14} className="mr-2" /> Delete group & tables
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
