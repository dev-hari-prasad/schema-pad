"use client";

import React from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import {
  Table, GridFour, Code, MagnifyingGlassPlus, MagnifyingGlassMinus,
  Trash, Robot, Gear, FileArrowDown, FolderPlus, ShareNetwork
} from '@phosphor-icons/react';
import { PreferencesPanel } from '@/components/canvas/PreferencesPanel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';
import { DottedMap } from '@/components/ui/dotted-map';

interface Props {
  onOpenSQL: () => void;
  isSQLOpen?: boolean;
}

export const CanvasToolbar: React.FC<Props> = ({ onOpenSQL, isSQLOpen = false }) => {
  const { zoom, showGrid, setZoom, toggleGrid, addTable, clearAll, pan, importSchema, addGroup } = useSchemaStore();
  const [showSQLText, setShowSQLText] = React.useState(true);
  const [showLogoText, setShowLogoText] = React.useState(true);
  const [confirmClearOpen, setConfirmClearOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSQLText(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowLogoText(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const handleOpenShare = () => setShareOpen(true);
    window.addEventListener('schema:open-share', handleOpenShare);
    return () => window.removeEventListener('schema:open-share', handleOpenShare);
  }, []);

  const handleAddTable = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    addTable({
      x: (vw / 2 - pan.x) / zoom - 130,
      y: (vh / 2 - pan.y) / zoom - 60,
    });
  };

  const handleAddGroup = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    addGroup({
      x: (vw / 2 - pan.x) / zoom - 200,
      y: (vh / 2 - pan.y) / zoom - 150,
    });
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        importSchema(result);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Top Left Group (Logo) */}
      <div className="absolute top-3 left-3 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <motion.button 
            type="button"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center bg-floating-bg border border-floating-border shadow-sm rounded-[10px] overflow-hidden outline-none cursor-pointer"
            aria-label="Schema Pad"
            onMouseEnter={() => setShowLogoText(true)}
            onMouseLeave={() => setShowLogoText(false)}
            onClick={() => {
              const urls = ['https://schemapad.dev/', 'https://github.com/dev-hari-prasad/schema-pad'];
              window.open(urls[Math.floor(Math.random() * urls.length)], '_blank');
            }}
          >
            <motion.div 
              className="flex items-center justify-start h-10 overflow-hidden"
              animate={{
                width: showLogoText ? 132 : 40,
              }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              style={{ paddingLeft: 10 }}
            >
              <img
                src="/Icon.png"
                alt=""
                className="w-5 h-5 rounded-sm object-contain shrink-0"
              />
              <AnimatePresence>
                {showLogoText && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[14px] font-bold leading-none select-none whitespace-nowrap ml-2"
                    style={{ fontFamily: '"ManropeLocal", "Manrope", ui-sans-serif, system-ui, sans-serif' }}
                  >
                    <motion.span
                      animate={{ backgroundPosition: ['200% center', '-200% center'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="bg-clip-text text-transparent block"
                      style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--foreground)) 0%, hsl(var(--muted-foreground)) 50%, hsl(var(--foreground)) 100%)', backgroundSize: '200% auto' }}
                    >
                      Schema Pad
                    </motion.span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <TooltipProvider delayDuration={200}>
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              data-onboarding="toolbar-main"
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-floating-bg border border-floating-border shadow-sm"
            >
              <ToolbarButton icon={<Table size={18} />} onClick={handleAddTable} tooltip="Add table" />
              <ToolbarButton icon={<FolderPlus size={18} />} onClick={handleAddGroup} tooltip="Add group" />
              <ToolbarDivider />

              <ToolbarButton
                icon={<GridFour size={18} />}
                onClick={toggleGrid}
                tooltip="Toggle grid (G)"
                active={showGrid}
              />
              <ToolbarButton icon={<FileArrowDown size={18} />} onClick={() => fileInputRef.current?.click()} tooltip="Import SQL" />
              <input type="file" accept=".sql,.txt" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              
              {/* Animated View SQL Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button 
                    layout
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onOpenSQL}
                    className={`flex items-center gap-1.5 p-2 rounded-md transition-colors font-medium overflow-hidden ${
                      isSQLOpen
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                    initial={false}
                    animate={{ width: showSQLText ? 'auto' : undefined, paddingRight: showSQLText ? 10 : undefined }}
                  >
                    <Code size={18} className="shrink-0" />
                    {showSQLText && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap text-[13px] mx-0.5"
                      >
                        View SQL
                      </motion.span>
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-black text-white px-2 py-1 shadow-lg border-0 font-medium">
                  <p>View SQL</p>
                </TooltipContent>
              </Tooltip>
              
              <ToolbarDivider />

              <PreferencesPanel>
                <button
                  className="p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <Gear size={18} />
                </button>
              </PreferencesPanel>

              <Popover open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-md transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmClearOpen(true)}
                      >
                        <Trash size={18} />
                      </motion.button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium select-none shadow-lg">
                    <p>Clear all</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  align="center"
                  side="bottom"
                  sideOffset={8}
                  className="w-[250px] rounded-xl border-floating-border bg-floating-bg p-3 shadow-xl"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Clear canvas?</p>
                    <p className="text-xs text-muted-foreground">Delete all tables, groups, and relationships.</p>
                    <div className="flex items-center justify-start gap-2 pt-3">
                      <button
                        className="h-8 px-3 rounded-md text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                        onClick={() => {
                          clearAll();
                          setConfirmClearOpen(false);
                        }}
                      >
                        Delete all
                      </button>
                      <button
                        className="h-8 px-3 rounded-md text-xs text-foreground bg-secondary hover:bg-secondary/80 transition-colors"
                        onClick={() => setConfirmClearOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>
          </TooltipProvider>
        </div>
      </div>

      {/* Top Right Group (Share & GitHub) */}
      <div className="absolute top-3 right-3 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <TooltipProvider delayDuration={200}>
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-[10px] bg-floating-bg border border-floating-border shadow-sm"
            >
              {/* Share Popover */}
              <Popover open={shareOpen} onOpenChange={setShareOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShareOpen((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors font-medium text-[13px] ${
                          shareOpen
                            ? 'bg-primary/15 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        <ShareNetwork size={16} />
                        Share
                      </motion.button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium select-none shadow-lg">
                    <p>Share canvas</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={12}
                  className="w-[340px] p-0 rounded-2xl border-floating-border bg-floating-bg shadow-2xl overflow-hidden relative"
                >
                  <div className="w-full h-52 flex flex-col items-center justify-center p-6 relative bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                    <div className="absolute inset-0 opacity-40 pointer-events-none flex items-center justify-center">
                      <DottedMap 
                        width={350} 
                        height={190} 
                        dotColor="currentColor" 
                        className="text-primary/50"
                        mapSamples={1000}
                        dotRadius={0.5}
                      />
                    </div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-3 shadow-sm border border-primary/20">
                        <ShareNetwork size={24} weight="duotone" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1.5 mt-2">Sharing is Coming Soon</h3>
                      <p className="text-sm text-muted-foreground leading-tight max-w-[260px]">
                        Real-time collaboration is on the way. Soon you'll be able share your canvas with others.
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <ToolbarDivider />

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.a
                    href="https://github.com/dev-hari-prasad/schema-pad"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center"
                  >
                    <svg viewBox="0 0 1024 1024" className="w-[18px] h-[18px] fill-current"><path fillRule="evenodd" d="M512 0C229.12 0 0 229.12 0 512c0 226.56 146.56 417.92 350.08 485.76 25.6 4.48 35.2-10.88 35.2-24.32 0-12.16-.64-52.48-.64-95.36-128.64 23.68-161.92-31.36-172.16-60.16-5.76-14.72-30.72-60.16-52.48-72.32-17.92-9.6-43.52-33.28-.64-33.92 40.32-.64 69.12 37.12 78.72 52.48 46.08 77.44 119.68 55.68 149.12 42.24 4.48-33.28 17.92-55.68 32.64-68.48-113.92-12.8-232.96-56.96-232.96-252.8 0-55.68 19.84-101.76 52.48-137.6-5.12-12.8-23.04-65.28 5.12-135.68 0 0 42.88-13.44 140.8 52.48 40.96-11.52 84.48-17.28 128-17.28s87.04 5.76 128 17.28c97.92-66.56 140.8-52.48 140.8-52.48 28.16 70.4 10.24 122.88 5.12 135.68 32.64 35.84 52.48 81.28 52.48 137.6 0 196.48-119.68 240-233.6 252.8 18.56 16 34.56 46.72 34.56 94.72 0 68.48-.64 123.52-.64 140.8 0 13.44 9.6 29.44 35.2 24.32C877.44 929.92 1024 737.92 1024 512 1024 229.12 794.88 0 512 0" clipRule="evenodd"/></svg>
                  </motion.a>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium select-none shadow-lg mr-2">
                  <p>Star or report issues on GitHub</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          </TooltipProvider>
        </div>
      </div>
    </>
  );
};

const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  active?: boolean;
  destructive?: boolean;
}> = ({ icon, onClick, tooltip, active, destructive }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`p-2 rounded-md transition-colors ${
          active
            ? 'bg-primary/15 text-primary'
            : destructive
              ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }`}
        onClick={onClick}
      >
        {icon}
      </motion.button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium select-none shadow-lg">
      <p>{tooltip}</p>
    </TooltipContent>
  </Tooltip>
);

const ToolbarDivider = () => (
  <div className="w-px h-5 bg-border mx-1" />
);
