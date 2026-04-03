"use client";

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Gear, Desktop, Sun, Moon, PaintBucket, TextAa } from '@phosphor-icons/react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePreferencesStore, Theme, CanvasColor, FontPreference } from '@/store/preferencesStore';

export const PreferencesPanel = ({ children }: { children: React.ReactNode }) => {
  const {
    theme,
    setTheme,
    canvasColor,
    setCanvasColor,
    fontPreference,
    setFontPreference,
  } = usePreferencesStore();

  const colors: { id: CanvasColor; bgStyle: string; darkStyle: string }[] = [
    { id: 'default', bgStyle: 'bg-white', darkStyle: 'bg-[#27272a]' },
    { id: 'white', bgStyle: 'bg-[#ffffff]', darkStyle: 'bg-[#141414]' },
    { id: 'gray', bgStyle: 'bg-[#f4f4f5]', darkStyle: 'bg-[#26211f]' },
    { id: 'blue', bgStyle: 'bg-[#f0f6fc]', darkStyle: 'bg-[#1c2128]' },
    { id: 'yellow', bgStyle: 'bg-[#fffbeb]', darkStyle: 'bg-[#2c281e]' },
  ];

  const visibleColors = colors.slice(0, 3);

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            {children}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 shadow-lg px-2 py-1 font-medium">
          <p>Preferences</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[336px] p-0 rounded-xl shadow-2xl border border-floating-border bg-floating-bg/95 backdrop-blur-md overflow-hidden animate-fade-in z-40" align="center" sideOffset={12}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/80 bg-secondary/25">
          <div className="p-1.5 rounded-md bg-secondary/60 border border-border/60">
            <Gear size={14} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Preferences</h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Theme Row */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sun size={14} className="text-muted-foreground" /> 
              Theme
            </span>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={(t) => t && setTheme(t as Theme)}
              className="bg-secondary/45 p-1 rounded-lg border border-border/80 gap-1"
            >
              <ToggleGroupItem value="light" className="h-7 w-8 p-0 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground transition-all">
                <Sun size={13} />
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" className="h-7 w-8 p-0 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground transition-all">
                <Moon size={13} />
              </ToggleGroupItem>
              <ToggleGroupItem value="system" className="h-7 w-8 p-0 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground text-muted-foreground transition-all">
                <Desktop size={13} />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Canvas Background Row */}
          <div className="flex items-center justify-between gap-3 px-1 pt-1">
            <span className="text-sm font-medium text-foreground flex items-center gap-2 shrink-0">
              <PaintBucket size={14} className="text-muted-foreground" />
              Background
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {visibleColors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCanvasColor(c.id)}
                  className={`w-7 h-7 rounded-[7px] border transition-all shadow-sm ${
                    canvasColor === c.id
                      ? 'border-primary ring-2 ring-primary/20 ring-offset-1 ring-offset-background'
                      : 'border-border opacity-70 hover:opacity-100 hover:border-muted-foreground'
                  } ${
                    theme === 'dark' ||
                    (theme === 'system' &&
                      typeof window !== 'undefined' &&
                      window.matchMedia('(prefers-color-scheme: dark)').matches)
                      ? c.darkStyle
                      : c.bgStyle
                  }`}
                  title={c.id.charAt(0).toUpperCase() + c.id.slice(1)}
                  aria-label={`Select ${c.id} canvas background`}
                />
              ))}
            </div>
          </div>

          {/* Font Row */}
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <TextAa size={14} className="text-muted-foreground" />
              Font
            </span>
            <Select value={fontPreference} onValueChange={(v) => setFontPreference(v as FontPreference)}>
              <SelectTrigger className="w-40 h-8 text-xs border-border/80 bg-background/80 focus:ring-1">
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manrope">Manrope (Default)</SelectItem>
                <SelectItem value="inter">Inter</SelectItem>
                <SelectItem value="excalifont">Excalifont</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
