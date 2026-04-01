"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Table, Code, Robot, Folder, Sun, Moon, CheckCircle, TextAa, GridFour, ShareNetwork, MagnifyingGlassPlus, MagnifyingGlassMinus, Bug, CornersOut, Trash, Minus } from '@phosphor-icons/react';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useSchemaStore } from '@/store/schemaStore';

interface Props {
  position: { x: number; y: number };
  onSelect: (cmd: string) => void;
  onAskAI: (message: string) => void;
  onClose: () => void;
}

export const SlashCommandMenu: React.FC<Props> = ({ position, onSelect, onAskAI, onClose }) => {
  const { theme, setTheme, fontPreference, setFontPreference } = usePreferencesStore();
  const { showGrid, toggleGrid, zoom, setZoom } = useSchemaStore();
  const [filter, setFilter] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dynamicCommands = [
    { id: 'table', label: 'Add Table', icon: Table },
    { id: 'group', label: 'Create Group', icon: Folder },
    { id: 'sql', label: 'View SQL', icon: Code },
    { id: 'chat-expand', label: 'Expand Chat', icon: CornersOut },
    { id: 'chat-minimize', label: 'Minimize Chat', icon: Minus },
    { id: 'chat-clear', label: 'Clear Chat', icon: Trash },
    { id: 'share', label: 'Share', icon: ShareNetwork },
    { id: 'issue', label: 'Report Issue', icon: Bug },
    { id: 'grid', label: 'Toggle Grid', icon: GridFour },
    { id: 'zoom-in', label: 'Zoom In (+10%)', icon: MagnifyingGlassPlus },
    { id: 'zoom-out', label: 'Zoom Out (-10%)', icon: MagnifyingGlassMinus },
    { id: 'theme-light', label: 'Light Mode', icon: Sun },
    { id: 'theme-dark', label: 'Dark Mode', icon: Moon },
    { id: 'font-manrope', label: 'Font: Manrope', icon: TextAa },
    { id: 'font-inter', label: 'Font: Inter', icon: TextAa },
    { id: 'font-excalifont', label: 'Font: Excalifont', icon: TextAa },
  ];

  const filtered = dynamicCommands.filter(
    (c) => c.label.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [filter]);

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIdx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIdx]) {
        handleSelect(filtered[activeIdx].id);
      } else if (filter.trim()) {
        onAskAI(filter.trim());
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (id: string) => {
    if (id === 'theme-light') { setTheme('light'); onClose(); return; }
    if (id === 'theme-dark') { setTheme('dark'); onClose(); return; }
    if (id === 'font-manrope') { setFontPreference('manrope'); onClose(); return; }
    if (id === 'font-inter') { setFontPreference('inter'); onClose(); return; }
    if (id === 'font-excalifont') { setFontPreference('excalifont'); onClose(); return; }
    if (id === 'grid') { toggleGrid(); onClose(); return; }
    if (id === 'zoom-in') { setZoom(zoom + 0.1); onClose(); return; }
    if (id === 'zoom-out') { setZoom(zoom - 0.1); onClose(); return; }
    if (id === 'issue') { window.open('https://github.com/dev-hari-prasad/schema-pad/issues/new', '_blank'); onClose(); return; }
    if (id === 'chat-expand') { window.dispatchEvent(new CustomEvent('schema:open-ai-chat')); onClose(); return; }
    if (id === 'chat-minimize') { window.dispatchEvent(new CustomEvent('schema:minimize-ai-chat')); onClose(); return; }
    if (id === 'chat-clear') { window.dispatchEvent(new CustomEvent('schema:clear-ai-chat')); onClose(); return; }
    onSelect(id);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="absolute z-50 w-[286px] rounded-xl border border-floating-border bg-floating-bg shadow-2xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden flex flex-col"
        style={{ left: position.x - 143, top: position.y - 180 }}
      >
        <div className="flex items-center px-2.5 py-2 border-b border-border gap-1.5 bg-secondary/30">
          <span className="text-muted-foreground font-mono text-xs leading-none bg-secondary px-1.5 py-0.5 rounded border border-border">/</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-medium"
            placeholder="Type a command or ask AI..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground font-mono text-[10px] leading-none bg-secondary px-1.5 py-0.5 rounded border border-border hover:text-foreground transition-colors"
            aria-label="Close command menu"
            title="Close (Esc)"
          >
            Esc
          </button>
        </div>
        <div ref={listRef} className="max-h-[260px] overflow-y-auto p-1 scrollbar-thin">
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            const isThemeActive = cmd.id === `theme-${theme}`;
            const isFontActive =
              (cmd.id === 'font-manrope' && fontPreference === 'manrope') ||
              (cmd.id === 'font-inter' && fontPreference === 'inter') ||
              (cmd.id === 'font-excalifont' && fontPreference === 'excalifont');
            const isGridActive = cmd.id === 'grid' && showGrid;

            return (
              <button
                key={cmd.id}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left transition-colors ${
                  i === activeIdx ? 'bg-primary/15 text-foreground' : 'text-foreground hover:bg-primary/10'
                }`}
                onClick={() => handleSelect(cmd.id)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <div className={`p-1 rounded-md ${i === activeIdx ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  <Icon size={14} weight={i === activeIdx ? 'fill' : 'regular'} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-foreground">
                    {cmd.label}
                  </div>
                </div>
                {(isThemeActive || isFontActive || isGridActive) && (
                   <CheckCircle size={14} weight="fill" className="text-primary" />
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              Hit enter to ask AI...
            </div>
          )}
        </div>
      </div>
    </>
  );
};
