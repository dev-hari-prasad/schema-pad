"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { X, PaperPlaneTilt, Gear, OpenAiLogo, Spinner, Trash, Plus, Sparkle, ChatCircle, Minus, CornersOut, CaretDown, CopySimple, Check } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { useSchemaStore } from '@/store/schemaStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { generateSQL } from '@/utils/sqlGenerator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
  customModels?: string[];
}

const PROVIDERS = [
  { 
    id: 'openai', 
    label: 'OpenAI', 
    baseUrl: 'https://api.openai.com/v1', 
    defaultModel: 'gpt-4o',
    icon: (props: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829 14.6174 7.2144a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.3927-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.909 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    icon: (props: any) => (
      <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" {...props}>
        <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z"/>
      </svg>
    ),
  },
  { 
    id: 'vercel', 
    label: 'Vercel AI Gateway', 
    baseUrl: 'https://ai-gateway.vercel.sh/v1', 
    defaultModel: 'openai/gpt-4o',
    icon: (props: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 2.16l10.8 18.72H1.2L12 2.16z"/></svg>
  },
  { 
    id: 'openrouter', 
    label: 'OpenRouter', 
    baseUrl: 'https://openrouter.ai/api/v1', 
    defaultModel: 'openai/gpt-4o',
    icon: (props: any) => <svg viewBox="0 0 512 512" fill="currentColor" stroke="currentColor" {...props}><g clipPath="url(#openrouter_light__clip0_205_3)"><path d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945" strokeWidth="90"/><path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z"/><path d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377" strokeWidth="90"/><path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z"/></g></svg>
  },
  { 
    id: 'groq', 
    label: 'Groq', 
    baseUrl: 'https://api.groq.com/openai/v1', 
    defaultModel: 'llama-3.3-70b-versatile',
    icon: (props: any) => <svg viewBox="0 0 201 201" {...props}><path fill="#F54F35" d="M0 0h201v201H0V0Z"/><path fill="#FEFBFB" d="m128 49 1.895 1.52C136.336 56.288 140.602 64.49 142 73c.097 1.823.148 3.648.161 5.474l.03 3.247.012 3.482.017 3.613c.01 2.522.016 5.044.02 7.565.01 3.84.041 7.68.072 11.521.007 2.455.012 4.91.016 7.364l.038 3.457c-.033 11.717-3.373 21.83-11.475 30.547-4.552 4.23-9.148 7.372-14.891 9.73l-2.387 1.055c-9.275 3.355-20.3 2.397-29.379-1.13-5.016-2.38-9.156-5.17-13.234-8.925 3.678-4.526 7.41-8.394 12-12l3.063 2.375c5.572 3.958 11.135 5.211 17.937 4.625 6.96-1.384 12.455-4.502 17-10 4.174-6.784 4.59-12.222 4.531-20.094l.012-3.473c.003-2.414-.005-4.827-.022-7.241-.02-3.68 0-7.36.026-11.04-.003-2.353-.008-4.705-.016-7.058l.025-3.312c-.098-7.996-1.732-13.21-6.681-19.47-6.786-5.458-13.105-8.211-21.914-7.792-7.327 1.188-13.278 4.7-17.777 10.601C75.472 72.012 73.86 78.07 75 85c2.191 7.547 5.019 13.948 12 18 5.848 3.061 10.892 3.523 17.438 3.688l2.794.103c2.256.082 4.512.147 6.768.209v16c-16.682.673-29.615.654-42.852-10.848-8.28-8.296-13.338-19.55-13.71-31.277.394-9.87 3.93-17.894 9.562-25.875l1.688-2.563C84.698 35.563 110.05 34.436 128 49Z"/></svg>
  },
  { 
    id: 'custom', 
    label: 'Custom endpoints (OpenAI format)', 
    baseUrl: '', 
    defaultModel: '',
    icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
  },
];

const STORAGE_KEY = 'schema-ai-config';

function loadConfig(): AIConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!PROVIDERS.find(p => p.id === parsed.provider)) {
        parsed.provider = PROVIDERS[0].id;
        parsed.baseUrl = PROVIDERS[0].baseUrl;
        parsed.model = PROVIDERS[0].defaultModel;
      }
      return parsed;
    }
  } catch {}
  return { apiKey: '', baseUrl: PROVIDERS[0].baseUrl, model: PROVIDERS[0].defaultModel, provider: PROVIDERS[0].id, customModels: [] };
}

function saveConfig(config: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function normalizeMarkdownCodeLanguage(className?: string) {
  const match = className?.match(/language-([\w-]+)/);
  return match?.[1];
}

function stripToolCallTraces(text: string) {
  if (!text) return text;

  // Remove common "tool call trace" blocks some models emit as plain text.
  let out = text;

  // XML-ish tool trace blocks
  out = out.replace(/<tool_calls_section_begin>[\s\S]*?<tool_calls_section_end>/g, '');
  out = out.replace(/<tool_call_begin>[\s\S]*?<tool_call_end>/g, '');

  // Older variants / partials
  out = out.replace(/<tool_calls_section_begin>[\s\S]*/g, '');
  out = out.replace(/[\s\S]*?<tool_calls_section_end>/g, '');

  // Line-level traces (keep it conservative)
  out = out
    .split('\n')
    .filter((line) => {
      const l = line.trim();
      if (!l) return true;
      if (l.includes('tool_calls_section_begin') || l.includes('tool_calls_section_end')) return false;
      if (l.includes('<tool_call_begin>') || l.includes('<tool_call_end>')) return false;
      // e.g. "functions.add_group:0" or similar debug-y prefixes
      if (/^functions\.\w+:/i.test(l)) return false;
      if (l.startsWith('functions.') && l.includes('tool_call')) return false;
      return true;
    })
    .join('\n');

  // Clean up excess blank lines after stripping
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

export const AIChatPanel: React.FC<{ 
  onClose: () => void; 
  isEmbedded?: boolean; 
  newMessage?: { text: string; tick: number };
  onLoadingChange?: (loading: boolean) => void;
  onMinimize?: () => void;
  clearTick?: number;
}> = ({ onClose, onMinimize, isEmbedded, newMessage, onLoadingChange, clearTick }) => {
  const chatDockPosition = usePreferencesStore((s) => s.chatDockPosition);
  const apiKeyHintSide = chatDockPosition === 'bottom-right' ? 'left' : 'right';
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRunningTools, setIsRunningTools] = useState(false);
  const [toolStatusText, setToolStatusText] = useState<string | null>(null);
  const [config, setConfig] = useState<AIConfig>(loadConfig);
  const [newModelInput, setNewModelInput] = useState('');
  const [chatMode, setChatMode] = useState<'chat' | 'agent'>('agent');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedTick = useRef(0);
  const lastClearTick = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isScrollable, setIsScrollable] = useState(false);

  const isConfigured = config.apiKey.length > 0 && config.baseUrl.length > 0;

  const markdownComponents = useMemo(() => {
    const CodeBlock = ({
      code,
      language,
    }: {
      code: string;
      language?: string;
    }) => {
      const [copied, setCopied] = useState(false);

      return (
        <div className="relative my-3 overflow-hidden rounded-xl border border-border/60 bg-floating-bg shadow-sm">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/50 bg-secondary/25 backdrop-blur-md rounded-t-xl">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">
              {(language || 'code').toUpperCase()}
            </span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-7 w-7 rounded-md bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(code);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 900);
                      } catch {}
                    }}
                    aria-label="Copy code"
                  >
                    {copied ? <Check size={14} weight="bold" /> : <CopySimple size={14} weight="bold" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs bg-black/80 text-white border-0 px-2 py-1 font-medium shadow-lg backdrop-blur-sm z-[9999]">
                  <p>{copied ? 'Copied' : 'Copy'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <pre className="m-0 p-3 overflow-x-auto text-xs leading-relaxed bg-black/10 rounded-b-xl">
            <code className={language ? `language-${language}` : undefined}>
              {code}
            </code>
          </pre>
        </div>
      );
    };

    return {
      p: ({ node, ...props }: any) => <p className="whitespace-pre-line mb-3 last:mb-0" {...props} />,
      a: ({ node, ...props }: any) => (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 decoration-white/30 hover:decoration-white/60 text-primary hover:text-primary/90 transition-colors break-all"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      ul: ({ node, ...props }: any) => <ul className="my-3 pl-5 list-disc" {...props} />,
      ol: ({ node, ...props }: any) => <ol className="my-3 pl-5 list-decimal" {...props} />,
      li: ({ node, ...props }: any) => <li className="my-1" {...props} />,
      blockquote: ({ node, ...props }: any) => (
        <blockquote className="my-3 pl-4 border-l-2 border-border/70 text-muted-foreground" {...props} />
      ),
      hr: ({ node, ...props }: any) => <hr className="my-4 border-border/70" {...props} />,
      table: ({ node, ...props }: any) => (
        <div className="my-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs" {...props} />
        </div>
      ),
      thead: ({ node, ...props }: any) => <thead className="bg-secondary/40" {...props} />,
      th: ({ node, ...props }: any) => <th className="px-2 py-2 text-left font-semibold border-b border-border" {...props} />,
      td: ({ node, ...props }: any) => <td className="px-2 py-2 border-b border-border/60 align-top" {...props} />,
      code: ({ node, inline, className, children, ...props }: any) => {
        const text = String(children ?? '').replace(/\n$/, '');
        if (inline) {
          return (
            <code
              className="text-xs bg-muted/70 px-1 py-0.5 rounded-sm border border-border/60"
              {...props}
            >
              {text}
            </code>
          );
        }
        const language = normalizeMarkdownCodeLanguage(className);
        return <CodeBlock code={text} language={language} />;
      },
    };
  }, []);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    if (!isConfigured) setShowSettings(true);
  }, [isConfigured]);

  useEffect(() => {
    if (!isAtBottom) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const canScroll = el.scrollHeight - el.clientHeight > 16;
    setIsScrollable(canScroll);
    if (!canScroll) setIsAtBottom(true);
  }, [messages, showSettings, isMinimized]);

  useEffect(() => {
    const handleStop = () => stopGenerating();
    window.addEventListener('schema:stop-ai-chat', handleStop as EventListener);
    return () => window.removeEventListener('schema:stop-ai-chat', handleStop as EventListener);
  }, [stopGenerating]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  useEffect(() => {
    if (newMessage && newMessage.tick > lastProcessedTick.current && isConfigured) {
      lastProcessedTick.current = newMessage.tick;
      sendMessage(newMessage.text);
    }
  }, [newMessage, isConfigured]);

  useEffect(() => {
    if (!clearTick) return;
    if (clearTick <= lastClearTick.current) return;
    lastClearTick.current = clearTick;
    setMessages([]);
  }, [clearTick]);

  const updateConfig = (updates: Partial<AIConfig>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    saveConfig(next);
  };

  const selectProvider = (providerId: string) => {
    const p = PROVIDERS.find((x) => x.id === providerId)!;
    updateConfig({ provider: providerId, baseUrl: p.baseUrl, model: p.defaultModel });
  };

  const getSchemaContext = useCallback(() => {
    const { tables, relationships } = useSchemaStore.getState();
    if (tables.length === 0) return '';
    const sql = generateSQL(tables, relationships);
    return `\n\nCurrent database schema:\n\`\`\`sql\n${sql}\n\`\`\``;
  }, []);

  const executeSchemaActions = useCallback((actions: any[]) => {
    const getStore = () => useSchemaStore.getState();
    const TABLE_W = 240;
    const GROUP_GAP = 60;

    // Temporary positions -- we'll reflow everything at the end
    let xCursor = 0;
    const yStart = 0;
    let ungroupedX = 0;
    let ungroupedY = yStart;
    const createdGroupIds: string[] = [];
    const createdTableIds: string[] = [];

    for (const action of actions) {
      const s = getStore();
      
      if (action.action === 'add_group') {
        if (!s.groups.find(g => g.name === action.groupName)) {
          const id = s.addGroup({ x: xCursor, y: yStart });
          createdGroupIds.push(id);
          getStore().updateGroupName(id, action.groupName || 'New Group');
          if (action.groupColor) getStore().updateGroupColor(id, action.groupColor);
          xCursor += 600;
        }
      } else if (action.action === 'add_table') {
        if (!s.tables.find(t => t.name === action.tableName)) {
           if (action.groupName) {
             const group = getStore().groups.find(g => g.name === action.groupName);
             if (group) {
               const newId = getStore().addTableToGroup(group.id);
               if (newId) {
                 getStore().updateTableName(newId, action.tableName);
                 createdTableIds.push(newId);
               }
             } else {
               const id = getStore().addTable({ x: ungroupedX, y: ungroupedY });
               getStore().updateTableName(id, action.tableName);
               createdTableIds.push(id);
               ungroupedX += TABLE_W + 40;
             }
           } else {
             const id = getStore().addTable({ x: ungroupedX, y: ungroupedY });
             getStore().updateTableName(id, action.tableName);
             createdTableIds.push(id);
             ungroupedX += TABLE_W + 40;
           }
        }
      } else if (action.action === 'remove_group') {
        const g = s.groups.find(g => g.name === action.groupName);
        if (g) s.removeGroup(g.id);
      } else if (action.action === 'remove_group_and_tables') {
        const g = s.groups.find(g => g.name === action.groupName);
        if (g) s.removeGroupAndTables(g.id);
      } else if (action.action === 'remove_table') {
        const t = s.tables.find(t => t.name === action.tableName);
        if (t) s.removeTable(t.id);
      } else if (action.action === 'add_column') {
        const t = getStore().tables.find(t => t.name === action.tableName);
        if (t) {
          const colId = getStore().addColumn(t.id);
          getStore().updateColumn(t.id, colId, { name: action.columnName, type: action.columnType as any });
        }
      } else if (action.action === 'remove_column') {
        const t = getStore().tables.find(t => t.name === action.tableName);
        if (t) {
          const c = t.columns.find(c => c.name === action.columnName);
          if (c) getStore().removeColumn(t.id, c.id);
        }
      } else if (action.action === 'update_column') {
        const t = getStore().tables.find(t => t.name === action.tableName);
        if (t) {
          const c = t.columns.find(c => c.name === action.columnName);
          if (c) {
            const updates: any = {};
            if (action.newColumnName) updates.name = action.newColumnName;
            if (action.columnType) updates.type = action.columnType;
            getStore().updateColumn(t.id, c.id, updates);
          }
        }
      } else if (action.action === 'add_relationship') {
        const cur = getStore();
        const srcT = cur.tables.find(t => t.name === action.tableName);
        const tgtT = cur.tables.find(t => t.name === action.targetTableName);
        if (srcT && tgtT) {
          const srcC = srcT.columns.find(c => c.name === action.columnName);
          const tgtC = tgtT.columns.find(c => c.name === action.targetColumnName);
          if (srcC && tgtC) {
             cur.updateColumn(srcT.id, srcC.id, { isForeignKey: true });
             cur.addRelationship({
               sourceTableId: srcT.id,
               sourceColumnId: srcC.id,
               targetTableId: tgtT.id,
               targetColumnId: tgtC.id,
               cardinality: '1:N'
             });
          }
        }
      } else if (action.action === 'remove_relationship') {
        const cur = getStore();
        const srcT = cur.tables.find(t => t.name === action.tableName);
        const tgtT = cur.tables.find(t => t.name === action.targetTableName);
        if (srcT && tgtT) {
          const srcC = srcT.columns.find(c => c.name === action.columnName);
          const tgtC = tgtT.columns.find(c => c.name === action.targetColumnName);
          if (srcC && tgtC) {
             const rel = cur.relationships.find(r => r.sourceTableId === srcT.id && r.sourceColumnId === srcC.id && r.targetTableId === tgtT.id && r.targetColumnId === tgtC.id);
             if (rel) {
               cur.removeRelationship(rel.id);
               cur.updateColumn(srcT.id, srcC.id, { isForeignKey: false });
             }
          }
        }
      }
    }

    // REFLOW: lay out created groups in a row based on their ACTUAL sizes
    if (createdGroupIds.length > 0 || createdTableIds.length > 0) {
      const s = getStore();
      const createdGroups = createdGroupIds
        .map(id => s.groups.find(g => g.id === id))
        .filter(Boolean) as typeof s.groups;

      // Sort by original x to preserve AI's intended order
      createdGroups.sort((a, b) => a.position.x - b.position.x);

      let cursorX = 50;
      const baseY = 50;

      // Pre-calculate final positions for each group and table
      const groupFinalPos = new Map<string, { x: number; y: number }>();
      const tableShiftMap = new Map<string, { dx: number; dy: number }>();

      for (const group of createdGroups) {
        const dx = cursorX - group.position.x;
        const dy = baseY - group.position.y;
        groupFinalPos.set(group.id, { x: cursorX, y: baseY });

        for (const t of s.tables) {
          if (t.groupId === group.id) {
            tableShiftMap.set(t.id, { dx, dy });
          }
        }

        cursorX += group.width + GROUP_GAP;
      }

      // Place ungrouped created tables after all groups
      for (const tid of createdTableIds) {
        const t = s.tables.find(tbl => tbl.id === tid);
        if (t && !t.groupId) {
          tableShiftMap.set(t.id, { dx: cursorX - t.position.x, dy: baseY - t.position.y });
          cursorX += (t.width || TABLE_W) + 40;
        }
      }

      // Apply all shifts in one setState
      if (tableShiftMap.size > 0 || groupFinalPos.size > 0) {
        useSchemaStore.setState((prev) => ({
          tables: prev.tables.map(t => {
            const shift = tableShiftMap.get(t.id);
            if (shift) return { ...t, position: { x: t.position.x + shift.dx, y: t.position.y + shift.dy } };
            return t;
          }),
          groups: prev.groups.map(g => {
            const pos = groupFinalPos.get(g.id);
            if (pos) return { ...g, position: pos };
            return g;
          }),
        }));
      }
    }

    // Pan to center all created content
    const final = getStore();
    if (createdGroupIds.length > 0 || createdTableIds.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      for (const g of final.groups) {
        if (createdGroupIds.includes(g.id)) {
          minX = Math.min(minX, g.position.x);
          minY = Math.min(minY, g.position.y);
          maxX = Math.max(maxX, g.position.x + g.width);
          maxY = Math.max(maxY, g.position.y + g.height);
        }
      }
      for (const t of final.tables) {
        if (createdTableIds.includes(t.id) && !t.groupId) {
          minX = Math.min(minX, t.position.x);
          minY = Math.min(minY, t.position.y);
          maxX = Math.max(maxX, t.position.x + (t.width || TABLE_W));
          maxY = Math.max(maxY, t.position.y + 200);
        }
      }

      if (minX !== Infinity) {
        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const zoom = final.zoom;
        final.setPan({ x: vw / 2 - centerX * zoom, y: vh / 2 - centerY * zoom });
      }
    }
  }, []);

  const getToolStatusLabel = useCallback((actions: any[]): string => {
    const has = (a: string) => actions.some((x) => x?.action === a);
    if (has('remove_table')) return 'Deleting tables…';
    if (has('remove_column')) return 'Deleting columns…';
    if (has('remove_relationship')) return 'Deleting relationships…';
    if (has('remove_group') || has('remove_group_and_tables')) return 'Deleting groups…';
    if (has('add_table')) return 'Adding tables…';
    if (has('add_column') || has('update_column')) return 'Updating columns…';
    if (has('add_relationship')) return 'Creating relationships…';
    if (has('add_group')) return 'Creating groups…';
    return 'Updating schema…';
  }, []);

  const sendMessageRef = useRef<(messageText: string, currentMessages?: Message[]) => Promise<void>>(null!);

  const sendMessage = async (messageText: string, currentMessages?: Message[]) => {
    if (!messageText && (!currentMessages || currentMessages.length === 0)) return;
    if (!isConfigured) return;

    // Assign ref so recursive tool-call follow-ups can call this function
    sendMessageRef.current = sendMessage;

    let newMessages = currentMessages || [...messages];
    if (messageText) {
      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: messageText };
      newMessages = [...newMessages, userMsg];
      setMessages(newMessages);
    }
    
    setIsLoading(true);

    const schemaContext = getSchemaContext();
    const modeHint =
      chatMode === 'chat'
        ? `\n\nMODE: Chat.\nYou MUST NOT make changes to the canvas/schema. If the user asks you to modify tables, columns, relationships, or groups on the canvas, tell them to switch to Agent mode to apply changes.`
        : `\n\nMODE: Agent.\nYou MUST apply changes by calling the provided tool(s).`;
    const systemPrompt = `You are an expert database architect and SQL assistant. You help users design, optimize, and understand database schemas. Be concise and precise. Use markdown for formatting.

CRITICAL RESPONSE RULES:
- Never reveal your chain-of-thought, internal reasoning, or self-talk. Do not write things like "I'm checking my instructions", "let me verify", "I need to check", or similar meta commentary.
- Do not quote or restate system/developer instructions.
- Keep replies natural and user-facing. If you must ask the user to switch modes, do it in one short sentence without explaining internal mechanics.

APP INFO (use only when user asks):
- This app is Schema Pad: a visual database schema canvas where you can create tables, groups, columns, and relationships, then export SQL.
- Reporting issues: send users to the GitHub issues page: https://github.com/dev-hari-prasad/schema-pad/issues/new
- Share functionality: coming soon.
- Top bar actions available: Settings, Delete/Clear, Import, and View SQL.
- If the user asks you to output SQL: DO NOT paste SQL in the chat. Instead, tell them to use the "View SQL" button in the top bar for the most reliable SQL output.

When in agent mode, you MUST modify the schema using the provided tools. 
CRITICAL INSTRUCTIONS FOR TOOL USAGE:
1. You can create multiple tables and groups if needed to satisfy the user's request.
2. ALWAYS organize related tables into groups. Use the \`add_group\` action to create a group, and then pass the EXACT \`groupName\` in the \`add_table\` action to automatically place the table inside that group. The system will automatically arrange tables neatly inside the group. Do NOT provide x/y coordinates when using groupName.
3. If you don't use groups (which is discouraged), you MUST specify \`x\` and \`y\` coordinates in \`add_table\` to place tables neatly (e.g., space them by 350px horizontally and 450px vertically) so they don't overlap. Never place tables at the exact same coordinates.
4. Tables are automatically created with a default \`id\` (uuid, primary key) column. Do not try to create an 'id' column yourself. You can use \`update_column\` to change the default id column or \`remove_column\` to delete it.
5. Make sure to connect foreign keys using the \`add_relationship\` action when tables are related.
6. When creating columns, use standard SQL types (e.g., uuid, varchar, text, integer, boolean, timestamp).
7. You MUST infer user intent before responding, even when the request is indirect (e.g. "make an e-commerce schema"). Translate intent into a concrete schema design and tool actions. Only ask a clarifying question if a missing detail would materially change the schema; otherwise choose sensible defaults and proceed.
8. If tools are available (AGENT mode), DO NOT write pseudo tool output (e.g. "tool_calls_section", XML tags, or JSON in the chat). Instead, call the tool \`execute_schema_actions\` with the actions needed. After tool execution, respond with a brief summary.
8. To delete visual group containers, use \`remove_group\` (keeps tables but ungroups them) or \`remove_group_and_tables\` (deletes the group plus its tables).

${schemaContext}${modeHint}`;

    const tools = chatMode === 'agent' ? [
      {
        type: 'function',
        function: {
          name: 'execute_schema_actions',
          description: 'Execute a series of actions to modify the database schema. Use this when the user asks to create, modify, or delete tables, columns, or relationships.',
          parameters: {
            type: 'object',
            properties: {
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['add_group', 'remove_group', 'remove_group_and_tables', 'add_table', 'remove_table', 'add_column', 'remove_column', 'update_column', 'add_relationship', 'remove_relationship'] },
                    groupName: { type: 'string', description: 'Name of the group (for add_group or add_table)' },
                    groupColor: { type: 'string', description: 'Color of the group (e.g. blue, purple, green, yellow, red, orange, pink, gray)' },
                    tableName: { type: 'string', description: 'Name of the table' },
                    columnName: { type: 'string', description: 'Name of the column' },
                    newColumnName: { type: 'string', description: 'New name for the column (for update_column)' },
                    columnType: { type: 'string', description: 'Data type of the column (e.g. integer, varchar, boolean, uuid)' },
                    targetTableName: { type: 'string', description: 'For relationships: target table name' },
                    targetColumnName: { type: 'string', description: 'For relationships: target column name' },
                    x: { type: 'number', description: 'X coordinate for placement (e.g., 0, 300, 600)' },
                    y: { type: 'number', description: 'Y coordinate for placement (e.g., 0, 400, 800)' }
                  },
                  required: ['action']
                }
              }
            },
            required: ['actions']
          }
        }
      }
    ] : undefined;

    try {
      const apiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...newMessages.map((m) => {
          const { id, ...rest } = m;
          return rest;
        }),
      ];

      console.log('[AIChatPanel] Sending request to /api/chat', { model: config.model, provider: config.provider, messageCount: apiMessages.length, hasTools: !!tools });
      
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          provider: config.provider,
          model: config.model,
          messages: apiMessages,
          stream: true,
          tools,
        }),
      });

      console.log('[AIChatPanel] Response status:', response.status);

      if (!response.ok) {
        let errText = await response.text();
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error) errText = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        } catch {}
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let assistantDisplayContent = '';
      const assistantId = crypto.randomUUID();
      let toolCalls: any[] = [];

      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              assistantContent += delta.content;
              assistantDisplayContent = stripToolCallTraces(assistantContent);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantDisplayContent } : m))
              );
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index;
                if (!toolCalls[index]) {
                  toolCalls[index] = { id: tc.id, type: tc.type, function: { name: tc.function?.name, arguments: '' } };
                }
                if (tc.function?.arguments) {
                  toolCalls[index].function.arguments += tc.function.arguments;
                }
              }
            }
          } catch {
            // partial JSON, skip
          }
        }
      }

      // After stream finishes, check if there are tool calls
      console.log('[AIChatPanel] Stream finished. Content length:', assistantContent.length, 'Tool calls:', toolCalls.length);
      
      if (toolCalls.length > 0) {
        toolCalls = toolCalls.filter(Boolean);
        
        // Update the assistant message with the tool calls
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, tool_calls: toolCalls } : m))
        );

        const newHiddenMessages: Message[] = [];
        
        for (const tc of toolCalls) {
          if (tc.function.name === 'execute_schema_actions') {
            try {
              const args = JSON.parse(tc.function.arguments);
              setIsRunningTools(true);
              setToolStatusText(getToolStatusLabel(args.actions || []));
              executeSchemaActions(args.actions);
              
              // Add a tool response message
              newHiddenMessages.push({
                id: crypto.randomUUID(),
                role: 'tool',
                content: 'Schema actions executed successfully.',
                tool_call_id: tc.id,
                name: tc.function.name
              });
            } catch (e: any) {
              newHiddenMessages.push({
                id: crypto.randomUUID(),
                role: 'tool',
                content: `Error executing actions: ${e.message}`,
                tool_call_id: tc.id,
                name: tc.function.name
              });
            } finally {
              setIsRunningTools(false);
              setToolStatusText(null);
            }
          }
        }

        // Send the tool results back to the LLM to get a final response
        if (newHiddenMessages.length > 0) {
          const assistantMsg: Message = { id: assistantId, role: 'assistant', content: stripToolCallTraces(assistantContent), tool_calls: toolCalls };
          const updatedMessages = [...newMessages, assistantMsg, ...newHiddenMessages];
          setMessages(updatedMessages);
          
          // Recursively call to get the LLM's final text response
          // Don't reset isLoading - keep it true through the chain
          try {
            await sendMessageRef.current('', updatedMessages);
          } finally {
            // isLoading will be set to false by the finally block below
          }
          return;
        }
      }

    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('[AIChatPanel] Error in sendMessage:', err);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: `**Error:** ${err.message}` },
      ]);
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isEmbedded && isMinimized && (
        <div className="absolute left-3 top-14 z-30">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="h-10 w-10 rounded-lg border border-floating-border bg-floating-bg shadow-2xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setIsMinimized(false)}
                >
                  <CornersOut size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium shadow-lg">
                <p>Expand chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {!isMinimized && (
        <div className={`${isEmbedded ? 'w-full h-full' : 'absolute left-3 top-14 bottom-14 w-[380px] rounded-lg border border-floating-border shadow-2xl animate-fade-in'} bg-floating-bg flex flex-col z-30 overflow-hidden overflow-x-hidden`}>
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-1.5 border-b border-border flex-shrink-0 min-h-[44px]">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1172.25 1172.249948" className="w-4 h-5 fill-primary">
            <path d="M 1170.484375 790.613281 C 1169.910156 786.421875 1168.976562 782.308594 1167.6875 778.277344 L 1165.410156 772.351562 C 1164.636719 770.382812 1163.527344 768.558594 1162.582031 766.664062 C 1162.074219 765.738281 1161.628906 764.769531 1161.054688 763.878906 L 1159.277344 761.246094 C 1158.140625 759.453125 1156.890625 757.746094 1155.523438 756.125 L 1151.34375 751.339844 C 1149.820312 749.882812 1148.242188 748.480469 1146.675781 747.0625 C 1145.046875 745.535156 1143.65625 744.496094 1142.234375 743.382812 L 1137.957031 740.03125 L 1129.40625 733.328125 L 1112.328125 719.882812 L 1094.960938 706.824219 C 1091.398438 704.183594 1087.867188 701.5 1084.316406 698.839844 C 1103.988281 685.285156 1123.363281 671.296875 1142.613281 657.140625 C 1149.355469 652.007812 1155.097656 645.929688 1159.839844 638.90625 C 1164.414062 631.734375 1167.640625 624 1169.519531 615.699219 C 1171.394531 607.390625 1171.71875 599.019531 1170.488281 590.589844 C 1169.910156 586.398438 1168.980469 582.285156 1167.691406 578.253906 L 1165.414062 572.328125 C 1164.644531 570.355469 1163.53125 568.535156 1162.585938 566.640625 C 1162.078125 565.714844 1161.632812 564.746094 1161.0625 563.855469 L 1159.28125 561.222656 C 1158.148438 559.429688 1156.898438 557.722656 1155.53125 556.097656 L 1151.351562 551.316406 C 1149.832031 549.855469 1148.25 548.457031 1146.6875 547.039062 C 1145.054688 545.507812 1143.664062 544.46875 1142.242188 543.355469 L 1137.964844 540.003906 L 1129.414062 533.300781 L 1112.339844 519.859375 L 1094.972656 506.800781 C 1091.390625 504.140625 1087.835938 501.441406 1084.261719 498.769531 C 1103.957031 485.238281 1123.355469 471.261719 1142.613281 457.105469 C 1149.355469 451.972656 1155.097656 445.898438 1159.839844 438.875 C 1164.414062 431.703125 1167.640625 423.964844 1169.519531 415.667969 C 1171.394531 407.359375 1171.71875 398.988281 1170.488281 390.558594 C 1169.910156 386.363281 1168.980469 382.253906 1167.691406 378.222656 L 1165.414062 372.292969 C 1164.644531 370.324219 1163.535156 368.503906 1162.589844 366.609375 C 1162.078125 365.679688 1161.632812 364.714844 1161.0625 363.824219 L 1159.28125 361.1875 C 1158.148438 359.398438 1156.898438 357.691406 1155.53125 356.066406 L 1151.351562 351.285156 C 1149.832031 349.824219 1148.25 348.425781 1146.6875 347.007812 C 1145.054688 345.476562 1143.664062 344.4375 1142.242188 343.324219 L 1137.96875 339.972656 L 1129.414062 333.269531 L 1112.339844 319.828125 L 1094.976562 306.769531 C 1089.160156 302.453125 1083.457031 297.972656 1077.542969 293.796875 L 1059.886719 281.144531 C 1048.1875 272.59375 1036.113281 264.617188 1024.207031 256.378906 C 1012.300781 248.132812 1000.144531 240.304688 988.117188 232.242188 L 951.601562 208.820312 C 902.652344 178.042969 853.054688 148.511719 803.542969 119.207031 C 754.035156 89.878906 704.757812 60.515625 656.648438 29.640625 L 638.625 18.050781 L 634.109375 15.171875 C 633.480469 14.753906 632.253906 14.03125 631.289062 13.453125 C 630.261719 12.847656 629.246094 12.226562 628.203125 11.652344 C 623.988281 9.398438 619.605469 7.535156 615.054688 6.0625 C 610.5 4.585938 605.847656 3.53125 601.097656 2.898438 C 596.351562 2.265625 591.585938 2.058594 586.804688 2.285156 C 582.019531 2.507812 577.292969 3.160156 572.628906 4.238281 C 567.960938 5.316406 563.429688 6.804688 559.03125 8.699219 C 554.648438 10.589844 550.457031 12.839844 546.457031 15.445312 L 519.445312 32.71875 C 507.414062 40.355469 495.242188 47.824219 483.152344 55.382812 L 446.441406 77.496094 C 434.078125 84.714844 421.8125 92.035156 409.375 99.167969 L 334.703125 142.085938 C 309.730469 156.34375 284.679688 170.667969 259.773438 185.304688 L 222.453125 207.445312 C 210.105469 215.042969 197.644531 222.410156 185.394531 230.199219 C 136.269531 261.097656 88.03125 293.863281 41.773438 329.410156 L 33.074219 336.035156 L 30.898438 337.691406 L 28.179688 340.039062 C 26.398438 341.65625 24.527344 343.160156 22.882812 344.917969 C 16.101562 351.929688 10.742188 359.902344 6.8125 368.828125 C 2.910156 377.722656 0.730469 387.019531 0.273438 396.71875 C 0.0234375 401.507812 0.171875 406.28125 0.71875 411.046875 L 1.96875 418.117188 C 2.375 420.476562 3.210938 422.746094 3.851562 425.050781 C 4.210938 426.195312 4.515625 427.355469 4.9375 428.476562 L 6.324219 431.800781 C 7.195312 434.042969 8.210938 436.214844 9.371094 438.320312 C 10.554688 440.414062 11.726562 442.519531 12.976562 444.5625 C 14.375 446.519531 15.792969 448.457031 17.234375 450.378906 L 18.320312 451.816406 L 19.527344 453.144531 L 21.976562 455.773438 L 24.453125 458.375 C 25.292969 459.21875 26.238281 459.945312 27.132812 460.730469 C 28.90625 462.222656 30.871094 463.894531 32.53125 465.179688 L 36.953125 468.375 L 54.625 481.152344 L 63.464844 487.53125 L 72.421875 493.742188 C 75.425781 495.835938 78.445312 497.898438 81.457031 499.972656 C 68.085938 509.597656 54.855469 519.425781 41.757812 529.453125 L 33.058594 536.078125 L 30.882812 537.734375 L 28.160156 540.089844 C 26.382812 541.703125 24.507812 543.207031 22.867188 544.96875 C 16.085938 551.980469 10.730469 559.953125 6.804688 568.882812 C 2.902344 577.777344 0.726562 587.074219 0.273438 596.777344 C 0.0234375 601.5625 0.171875 606.339844 0.722656 611.101562 L 1.972656 618.175781 C 2.386719 620.53125 3.214844 622.800781 3.855469 625.109375 C 4.21875 626.25 4.519531 627.414062 4.949219 628.53125 L 6.332031 631.859375 C 7.207031 634.097656 8.222656 636.269531 9.386719 638.375 C 10.566406 640.46875 11.734375 642.574219 12.992188 644.617188 C 14.390625 646.570312 15.808594 648.507812 17.25 650.433594 L 18.332031 651.871094 L 19.546875 653.195312 L 21.992188 655.824219 L 24.46875 658.425781 C 25.316406 659.269531 26.257812 659.996094 27.152344 660.78125 L 29.886719 663.070312 L 31.261719 664.207031 C 31.714844 664.574219 32.222656 665.003906 32.546875 665.222656 L 36.964844 668.417969 L 54.628906 681.199219 L 63.46875 687.578125 L 72.421875 693.796875 C 75.414062 695.886719 78.429688 697.945312 81.433594 700.023438 C 68.035156 709.664062 54.773438 719.507812 41.65625 729.5625 L 32.957031 736.191406 L 30.753906 737.878906 L 28.03125 740.234375 C 26.257812 741.855469 24.367188 743.339844 22.746094 745.128906 C 15.972656 752.148438 10.636719 760.132812 6.738281 769.078125 C 2.847656 777.980469 0.691406 787.28125 0.265625 796.988281 C 0.0195312 801.773438 0.179688 806.550781 0.75 811.3125 L 2.007812 818.382812 C 2.449219 820.734375 3.257812 823.007812 3.90625 825.3125 C 6.824219 834.578125 11.308594 843.011719 17.359375 850.613281 C 18.839844 852.5 20.429688 854.292969 22.117188 855.992188 L 24.597656 858.589844 C 25.464844 859.40625 26.390625 860.152344 27.289062 860.929688 L 30.027344 863.222656 L 31.402344 864.355469 C 31.878906 864.753906 32.328125 865.113281 32.660156 865.335938 L 37.070312 868.535156 L 54.707031 881.320312 L 63.53125 887.703125 L 72.457031 893.9375 C 119.984375 927.3125 168.65625 958.871094 218.472656 988.613281 C 318.035156 1048.050781 421.394531 1100.332031 526.035156 1149.003906 L 545.6875 1158.066406 L 550.601562 1160.324219 L 553.082031 1161.460938 L 556.035156 1162.722656 C 557.980469 1163.597656 560.046875 1164.246094 562.054688 1164.996094 C 564.125 1165.601562 566.152344 1166.324219 568.269531 1166.789062 C 576.734375 1168.9375 585.324219 1169.75 594.039062 1169.21875 C 602.636719 1168.671875 610.980469 1166.90625 619.0625 1163.917969 C 622.820312 1162.511719 626.5 1160.914062 630.097656 1159.132812 L 639.863281 1154.457031 L 659.394531 1145.113281 C 672.402344 1138.859375 685.332031 1132.417969 698.300781 1126.082031 C 750.046875 1100.441406 801.152344 1073.511719 851.609375 1045.285156 L 870.503906 1034.675781 L 889.265625 1023.824219 C 901.804688 1016.652344 914.175781 1009.179688 926.574219 1001.761719 C 939 994.386719 951.242188 986.707031 963.582031 979.191406 C 975.800781 971.480469 988.050781 963.8125 1000.175781 955.957031 C 1012.25 948.019531 1024.421875 940.226562 1036.351562 932.078125 L 1054.363281 920.019531 L 1072.199219 907.710938 C 1096.003906 891.328125 1119.363281 874.320312 1142.613281 857.171875 C 1149.359375 852.039062 1155.097656 845.960938 1159.839844 838.9375 C 1164.417969 831.761719 1167.644531 824.027344 1169.519531 815.726562 C 1171.394531 807.417969 1171.71875 799.046875 1170.484375 790.613281 Z M 60.363281 637.101562 L 56.09375 633.898438 C 55.808594 633.691406 55.539062 633.464844 55.285156 633.21875 L 54.605469 632.605469 L 53.226562 631.402344 C 52.777344 630.996094 52.265625 630.644531 51.855469 630.203125 L 50.667969 628.84375 L 49.449219 627.515625 L 48.832031 626.859375 L 48.328125 626.113281 C 47.65625 625.125 46.960938 624.152344 46.246094 623.199219 L 44.542969 620.050781 C 43.964844 619 43.484375 617.910156 43.097656 616.777344 L 42.40625 615.121094 C 42.195312 614.5625 42.09375 613.960938 41.925781 613.386719 C 41.566406 612.242188 41.269531 611.082031 41.03125 609.90625 C 40.863281 608.710938 40.671875 607.523438 40.453125 606.34375 C 40.246094 603.941406 40.230469 601.535156 40.402344 599.128906 C 40.695312 594.300781 41.859375 589.695312 43.898438 585.308594 C 45.917969 580.984375 48.609375 577.132812 51.976562 573.75 C 52.777344 572.875 53.804688 572.207031 54.675781 571.394531 L 56.015625 570.199219 L 58.148438 568.609375 L 66.6875 562.25 C 83.683594 549.4375 100.953125 537.003906 118.5 524.945312 C 151.515625 546.699219 185.042969 567.558594 219.089844 587.53125 C 319.101562 646.167969 422.59375 697.664062 526.027344 748.253906 L 545.441406 757.699219 L 550.300781 760.054688 L 552.746094 761.238281 L 555.691406 762.574219 C 557.628906 763.503906 559.699219 764.191406 561.699219 764.988281 C 563.773438 765.636719 565.800781 766.394531 567.921875 766.902344 C 572.128906 768.042969 576.398438 768.839844 580.730469 769.296875 C 585.066406 769.75 589.40625 769.859375 593.757812 769.617188 C 598.109375 769.378906 602.414062 768.792969 606.671875 767.863281 C 610.929688 766.933594 615.085938 765.667969 619.140625 764.074219 C 621.125 763.253906 623.125 762.464844 625.03125 761.5 L 627.828125 760.128906 L 630.222656 758.886719 L 639.800781 753.90625 L 658.960938 743.945312 L 697.253906 723.953125 C 748.277344 697.203125 799.203125 670.148438 849.644531 642.121094 L 868.570312 631.625 L 887.402344 620.949219 C 899.988281 613.890625 912.429688 606.558594 924.914062 599.3125 C 937.398438 592.066406 949.769531 584.605469 962.203125 577.261719 C 974.515625 569.707031 986.894531 562.261719 999.125 554.5625 C 1011.320312 546.808594 1023.601562 539.199219 1035.644531 531.203125 L 1053.824219 519.386719 L 1064.292969 512.332031 L 1064.316406 512.351562 C 1070.242188 516.355469 1075.941406 520.65625 1081.765625 524.792969 L 1099.160156 537.328125 L 1116.21875 550.300781 L 1128.96875 560.085938 C 1130.324219 561.070312 1131.621094 562.121094 1132.859375 563.246094 L 1136.191406 566.207031 L 1139.132812 569.53125 C 1140.109375 570.648438 1140.988281 571.828125 1141.777344 573.082031 L 1143.058594 574.890625 C 1143.46875 575.503906 1143.761719 576.191406 1144.125 576.832031 C 1144.773438 578.15625 1145.617188 579.394531 1146.148438 580.773438 L 1147.789062 584.902344 C 1148.714844 587.730469 1149.390625 590.617188 1149.824219 593.558594 C 1150.769531 599.511719 1150.605469 605.433594 1149.328125 611.324219 C 1148.046875 617.199219 1145.828125 622.695312 1142.664062 627.808594 C 1139.3125 632.820312 1135.261719 637.191406 1130.523438 640.917969 C 1107.472656 657.890625 1084.269531 674.664062 1060.53125 690.679688 L 1042.75 702.726562 L 1024.773438 714.484375 C 1012.828125 722.378906 1000.585938 729.832031 988.472656 737.472656 C 939.820312 767.753906 889.8125 795.878906 839.226562 822.957031 C 788.589844 849.964844 737.316406 875.84375 685.714844 901.152344 L 646.976562 920.082031 L 627.574219 929.492188 L 617.875 934.199219 L 615.449219 935.375 C 614.621094 935.78125 614.0625 936 613.355469 936.324219 C 612.03125 936.964844 610.65625 937.445312 609.296875 937.972656 C 606.621094 938.960938 603.878906 939.730469 601.078125 940.28125 C 598.273438 940.832031 595.445312 941.15625 592.59375 941.253906 C 589.738281 941.347656 586.894531 941.21875 584.0625 940.859375 C 581.230469 940.5 578.445312 939.921875 575.703125 939.117188 C 574.324219 938.777344 573.003906 938.203125 571.648438 937.773438 C 570.335938 937.1875 568.976562 936.746094 567.695312 936.070312 L 565.75 935.140625 L 563.371094 933.921875 L 558.574219 931.457031 L 539.375 921.617188 C 436.914062 869.339844 335.082031 816.296875 237.308594 757.082031 C 188.515625 727.351562 140.796875 696.019531 94.675781 662.554688 L 86.007812 656.3125 L 77.453125 649.914062 Z M 1149.328125 811.355469 C 1148.050781 817.230469 1145.828125 822.726562 1142.667969 827.839844 C 1139.3125 832.851562 1135.265625 837.222656 1130.523438 840.949219 C 1107.464844 857.980469 1084.304688 874.867188 1060.703125 891.128906 C 1037.242188 907.589844 1013.28125 923.320312 989.136719 938.753906 C 977.054688 946.457031 964.855469 953.972656 952.683594 961.53125 L 934.28125 972.628906 C 928.152344 976.34375 922.019531 980.042969 915.792969 983.589844 C 903.390625 990.769531 891.019531 997.996094 878.472656 1004.925781 L 859.714844 1015.417969 L 840.820312 1025.667969 C 790.347656 1052.851562 739.089844 1078.539062 687.046875 1102.734375 C 674.015625 1108.734375 661.039062 1114.835938 647.972656 1120.75 L 628.355469 1129.59375 C 621.902344 1132.421875 614.878906 1135.890625 609.71875 1137.636719 C 606.988281 1138.601562 604.203125 1139.355469 601.359375 1139.894531 C 598.511719 1140.433594 595.644531 1140.757812 592.75 1140.859375 C 589.859375 1140.964844 586.972656 1140.847656 584.097656 1140.511719 C 581.222656 1140.175781 578.390625 1139.621094 575.597656 1138.855469 C 574.199219 1138.535156 572.851562 1137.976562 571.476562 1137.566406 C 570.136719 1137 568.757812 1136.574219 567.441406 1135.925781 L 565.449219 1135.023438 L 563.050781 1133.855469 L 558.214844 1131.496094 L 538.855469 1122.078125 C 435.621094 1071.90625 334.285156 1018.160156 236.980469 958.164062 C 188.414062 928.046875 140.878906 896.367188 94.789062 862.753906 L 86.128906 856.484375 L 77.574219 850.070312 L 60.476562 837.222656 L 56.203125 834.011719 C 55.902344 833.800781 55.617188 833.566406 55.355469 833.3125 L 54.675781 832.699219 L 53.296875 831.496094 C 52.84375 831.09375 52.351562 830.726562 51.917969 830.304688 L 50.730469 828.945312 C 49.882812 828.09375 49.101562 827.183594 48.382812 826.222656 C 45.445312 822.382812 43.300781 818.148438 41.949219 813.507812 C 41.683594 812.335938 41.207031 811.222656 41.046875 810.027344 C 40.878906 808.832031 40.6875 807.648438 40.472656 806.464844 C 40.25 804.0625 40.226562 801.65625 40.398438 799.25 C 40.675781 794.421875 41.832031 789.8125 43.867188 785.421875 C 45.867188 781.085938 48.554688 777.230469 51.921875 773.84375 C 52.703125 772.953125 53.746094 772.300781 54.613281 771.484375 L 55.949219 770.289062 L 58.050781 768.71875 L 66.585938 762.359375 C 83.601562 749.53125 100.890625 737.085938 118.460938 725.023438 C 151.460938 746.804688 184.988281 767.6875 219.039062 787.675781 C 319.078125 846.3125 422.609375 897.714844 526.039062 948.292969 L 545.457031 957.738281 L 550.3125 960.09375 L 552.761719 961.28125 L 555.710938 962.617188 C 557.652344 963.546875 559.722656 964.230469 561.730469 965.03125 C 563.804688 965.675781 565.835938 966.433594 567.960938 966.9375 C 572.164062 968.0625 576.429688 968.851562 580.761719 969.300781 C 585.089844 969.746094 589.429688 969.847656 593.773438 969.605469 C 598.121094 969.363281 602.421875 968.777344 606.671875 967.851562 C 610.925781 966.921875 615.078125 965.664062 619.132812 964.074219 C 621.113281 963.269531 623.105469 962.480469 625.011719 961.53125 C 625.929688 961.085938 627.023438 960.582031 627.800781 960.179688 L 630.199219 958.945312 L 639.808594 954.011719 L 659.023438 944.140625 L 697.40625 924.285156 C 748.539062 897.703125 799.5 870.679688 849.9375 842.621094 L 868.859375 832.109375 L 887.683594 821.40625 C 900.261719 814.332031 912.699219 806.992188 925.167969 799.710938 C 937.648438 792.457031 949.996094 784.953125 962.417969 777.585938 C 974.722656 770.019531 987.074219 762.523438 999.292969 754.8125 C 1011.464844 747.023438 1023.734375 739.394531 1035.761719 731.367188 L 1053.914062 719.511719 L 1064.382812 712.429688 C 1070.28125 716.417969 1075.957031 720.699219 1081.753906 724.816406 L 1099.148438 737.351562 L 1116.207031 750.324219 L 1124.710938 756.851562 L 1128.960938 760.113281 C 1130.316406 761.097656 1131.613281 762.148438 1132.855469 763.273438 L 1136.1875 766.234375 L 1139.128906 769.558594 C 1140.105469 770.671875 1140.984375 771.855469 1141.773438 773.109375 L 1143.054688 774.917969 C 1143.46875 775.53125 1143.757812 776.21875 1144.121094 776.859375 C 1144.773438 778.183594 1145.613281 779.421875 1146.148438 780.800781 L 1147.789062 784.929688 C 1148.710938 787.757812 1149.390625 790.644531 1149.824219 793.585938 C 1150.769531 799.539062 1150.605469 805.464844 1149.328125 811.355469 Z M 1149.328125 811.355469 "/>
          </svg>
        </div>

        {/* Tabs */}
        <div className="absolute left-1/2 -translate-x-1/2 flex p-0.5 bg-secondary/50 rounded-lg border border-border">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setChatMode('agent')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${chatMode === 'agent' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Sparkle size={14} weight={chatMode === 'agent' ? "fill" : "regular"} />
                  Agent
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium shadow-lg z-[9999]">
                <p>AI can autonomously modify your schema</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setChatMode('chat')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${chatMode === 'chat' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ChatCircle size={14} weight={chatMode === 'chat' ? "fill" : "regular"} />
                  Chat
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium shadow-lg z-[9999]">
                <p>Discuss and ask questions about your schema</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`p-1.5 rounded-md transition-colors ${
                    showSettings ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Gear size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium shadow-lg z-[9999]">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => { setMessages([]); }}
                >
                  <Trash size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium shadow-lg z-[9999]">
                <p>Clear chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => {
                    if (isEmbedded && onMinimize) onMinimize();
                    else setIsMinimized(true);
                  }}
                >
                  <Minus size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium shadow-lg z-[9999]">
                <p>Minimize chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden flex-shrink-0 bg-card border-b border-border"
          >
            <div className="px-4 py-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Provider</label>
            <Select value={config.provider} onValueChange={selectProvider}>
              <SelectTrigger className="w-full h-8 text-xs bg-secondary border-border focus:ring-1 focus:ring-primary">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-floating-border bg-floating-bg shadow-xl ai-provider-select-content">
                {PROVIDERS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <SelectItem key={p.id} value={p.id} className="text-xs rounded-lg my-0.5">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{p.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">API Key</label>
            <TooltipProvider>
              <Tooltip open={true}>
                <TooltipTrigger asChild>
                  <div className="relative w-full">
                    <input
                      type="password"
                      className="w-full bg-secondary text-foreground text-xs rounded-md px-2 py-1.5 outline-none border border-border placeholder:text-muted-foreground"
                      placeholder="sk-..."
                      value={config.apiKey}
                      onChange={(e) => updateConfig({ apiKey: e.target.value })}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side={apiKeyHintSide}
                  sideOffset={15}
                  className="text-xs bg-black text-white border-0 px-2.5 py-1.5 font-medium shadow-lg relative overflow-visible animate-in fade-in zoom-in duration-300"
                >
                  <div
                    className={
                      apiKeyHintSide === 'right'
                        ? 'absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-black rotate-45 rounded-sm'
                        : 'absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-black rotate-45 rounded-sm'
                    }
                  />
                  <p className="relative z-10">API is stored locally and never shared</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {config.provider === 'custom' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Base URL</label>
              <input
                className="w-full bg-secondary text-foreground text-xs rounded-md px-2 py-1.5 outline-none border border-border placeholder:text-muted-foreground"
                placeholder="https://api.example.com/v1"
                value={config.baseUrl}
                onChange={(e) => updateConfig({ baseUrl: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Model</label>
            <div className="space-y-2">
              <Select value={config.model} onValueChange={(val) => updateConfig({ model: val })}>
                <SelectTrigger className="w-full h-8 text-xs bg-secondary border-border focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-floating-border bg-floating-bg shadow-xl ai-provider-select-content">
                  {/* Default model for provider */}
                  <SelectItem value={PROVIDERS.find(p => p.id === config.provider)?.defaultModel || 'gpt-4o'} className="text-xs rounded-lg my-0.5">
                    {PROVIDERS.find(p => p.id === config.provider)?.defaultModel || 'gpt-4o'} (Default)
                  </SelectItem>
                  {/* Custom models */}
                  {config.customModels?.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs rounded-lg my-0.5 group pr-8">
                      <div className="flex items-center justify-between w-full">
                        <span>{m}</span>
                        <button
                          className="absolute right-2 p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                          }}
                          onPointerUp={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newModels = config.customModels?.filter(model => model !== m) || [];
                            updateConfig({ 
                              customModels: newModels,
                              model: config.model === m ? (PROVIDERS.find(p => p.id === config.provider)?.defaultModel || 'gpt-4o') : config.model
                            });
                          }}
                          title="Remove model"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-secondary text-foreground text-xs rounded-md px-2 py-1.5 outline-none border border-border placeholder:text-muted-foreground"
                  placeholder="Add custom model (e.g. gpt-4)"
                  value={newModelInput}
                  onChange={(e) => setNewModelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newModelInput.trim()) {
                      e.preventDefault();
                      const models = [...(config.customModels || [])];
                      if (!models.includes(newModelInput.trim())) {
                        models.push(newModelInput.trim());
                        updateConfig({ customModels: models, model: newModelInput.trim() });
                      }
                      setNewModelInput('');
                    }
                  }}
                />
                <button
                  className="p-1.5 rounded-md bg-secondary text-foreground hover:bg-primary/20 hover:text-primary transition-colors border border-border"
                  onClick={() => {
                    if (newModelInput.trim()) {
                      const models = [...(config.customModels || [])];
                      if (!models.includes(newModelInput.trim())) {
                        models.push(newModelInput.trim());
                        updateConfig({ customModels: models, model: newModelInput.trim() });
                      }
                      setNewModelInput('');
                    }
                  }}
                  title="Add model"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
          <button
            className="text-xs text-primary font-medium hover:underline"
            onClick={() => setShowSettings(false)}
          >
            Done
          </button>
        </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-4"
          onScroll={() => {
            const el = scrollContainerRef.current;
            if (!el) return;
            const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
            setIsAtBottom(gap < 40);
            setIsScrollable(el.scrollHeight - el.clientHeight > 16);
          }}
        >
        {messages.length === 0 && !showSettings && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1172.25 1172.249948" className="w-8 h-8 fill-muted-foreground/50">
              <path d="M 1170.484375 790.613281 C 1169.910156 786.421875 1168.976562 782.308594 1167.6875 778.277344 L 1165.410156 772.351562 C 1164.636719 770.382812 1163.527344 768.558594 1162.582031 766.664062 C 1162.074219 765.738281 1161.628906 764.769531 1161.054688 763.878906 L 1159.277344 761.246094 C 1158.140625 759.453125 1156.890625 757.746094 1155.523438 756.125 L 1151.34375 751.339844 C 1149.820312 749.882812 1148.242188 748.480469 1146.675781 747.0625 C 1145.046875 745.535156 1143.65625 744.496094 1142.234375 743.382812 L 1137.957031 740.03125 L 1129.40625 733.328125 L 1112.328125 719.882812 L 1094.960938 706.824219 C 1091.398438 704.183594 1087.867188 701.5 1084.316406 698.839844 C 1103.988281 685.285156 1123.363281 671.296875 1142.613281 657.140625 C 1149.355469 652.007812 1155.097656 645.929688 1159.839844 638.90625 C 1164.414062 631.734375 1167.640625 624 1169.519531 615.699219 C 1171.394531 607.390625 1171.71875 599.019531 1170.488281 590.589844 C 1169.910156 586.398438 1168.980469 582.285156 1167.691406 578.253906 L 1165.414062 572.328125 C 1164.644531 570.355469 1163.53125 568.535156 1162.585938 566.640625 C 1162.078125 565.714844 1161.632812 564.746094 1161.0625 563.855469 L 1159.28125 561.222656 C 1158.148438 559.429688 1156.898438 557.722656 1155.53125 556.097656 L 1151.351562 551.316406 C 1149.832031 549.855469 1148.25 548.457031 1146.6875 547.039062 C 1145.054688 545.507812 1143.664062 544.46875 1142.242188 543.355469 L 1137.964844 540.003906 L 1129.414062 533.300781 L 1112.339844 519.859375 L 1094.972656 506.800781 C 1091.390625 504.140625 1087.835938 501.441406 1084.261719 498.769531 C 1103.957031 485.238281 1123.355469 471.261719 1142.613281 457.105469 C 1149.355469 451.972656 1155.097656 445.898438 1159.839844 438.875 C 1164.414062 431.703125 1167.640625 423.964844 1169.519531 415.667969 C 1171.394531 407.359375 1171.71875 398.988281 1170.488281 390.558594 C 1169.910156 386.363281 1168.980469 382.253906 1167.691406 378.222656 L 1165.414062 372.292969 C 1164.644531 370.324219 1163.535156 368.503906 1162.589844 366.609375 C 1162.078125 365.679688 1161.632812 364.714844 1161.0625 363.824219 L 1159.28125 361.1875 C 1158.148438 359.398438 1156.898438 357.691406 1155.53125 356.066406 L 1151.351562 351.285156 C 1149.832031 349.824219 1148.25 348.425781 1146.6875 347.007812 C 1145.054688 345.476562 1143.664062 344.4375 1142.242188 343.324219 L 1137.96875 339.972656 L 1129.414062 333.269531 L 1112.339844 319.828125 L 1094.976562 306.769531 C 1089.160156 302.453125 1083.457031 297.972656 1077.542969 293.796875 L 1059.886719 281.144531 C 1048.1875 272.59375 1036.113281 264.617188 1024.207031 256.378906 C 1012.300781 248.132812 1000.144531 240.304688 988.117188 232.242188 L 951.601562 208.820312 C 902.652344 178.042969 853.054688 148.511719 803.542969 119.207031 C 754.035156 89.878906 704.757812 60.515625 656.648438 29.640625 L 638.625 18.050781 L 634.109375 15.171875 C 633.480469 14.753906 632.253906 14.03125 631.289062 13.453125 C 630.261719 12.847656 629.246094 12.226562 628.203125 11.652344 C 623.988281 9.398438 619.605469 7.535156 615.054688 6.0625 C 610.5 4.585938 605.847656 3.53125 601.097656 2.898438 C 596.351562 2.265625 591.585938 2.058594 586.804688 2.285156 C 582.019531 2.507812 577.292969 3.160156 572.628906 4.238281 C 567.960938 5.316406 563.429688 6.804688 559.03125 8.699219 C 554.648438 10.589844 550.457031 12.839844 546.457031 15.445312 L 519.445312 32.71875 C 507.414062 40.355469 495.242188 47.824219 483.152344 55.382812 L 446.441406 77.496094 C 434.078125 84.714844 421.8125 92.035156 409.375 99.167969 L 334.703125 142.085938 C 309.730469 156.34375 284.679688 170.667969 259.773438 185.304688 L 222.453125 207.445312 C 210.105469 215.042969 197.644531 222.410156 185.394531 230.199219 C 136.269531 261.097656 88.03125 293.863281 41.773438 329.410156 L 33.074219 336.035156 L 30.898438 337.691406 L 28.179688 340.039062 C 26.398438 341.65625 24.527344 343.160156 22.882812 344.917969 C 16.101562 351.929688 10.742188 359.902344 6.8125 368.828125 C 2.910156 377.722656 0.730469 387.019531 0.273438 396.71875 C 0.0234375 401.507812 0.171875 406.28125 0.71875 411.046875 L 1.96875 418.117188 C 2.375 420.476562 3.210938 422.746094 3.851562 425.050781 C 4.210938 426.195312 4.515625 427.355469 4.9375 428.476562 L 6.324219 431.800781 C 7.195312 434.042969 8.210938 436.214844 9.371094 438.320312 C 10.554688 440.414062 11.726562 442.519531 12.976562 444.5625 C 14.375 446.519531 15.792969 448.457031 17.234375 450.378906 L 18.320312 451.816406 L 19.527344 453.144531 L 21.976562 455.773438 L 24.453125 458.375 C 25.292969 459.21875 26.238281 459.945312 27.132812 460.730469 C 28.90625 462.222656 30.871094 463.894531 32.53125 465.179688 L 36.953125 468.375 L 54.625 481.152344 L 63.464844 487.53125 L 72.421875 493.742188 C 75.425781 495.835938 78.445312 497.898438 81.457031 499.972656 C 68.085938 509.597656 54.855469 519.425781 41.757812 529.453125 L 33.058594 536.078125 L 30.882812 537.734375 L 28.160156 540.089844 C 26.382812 541.703125 24.507812 543.207031 22.867188 544.96875 C 16.085938 551.980469 10.730469 559.953125 6.804688 568.882812 C 2.902344 577.777344 0.726562 587.074219 0.273438 596.777344 C 0.0234375 601.5625 0.171875 606.339844 0.722656 611.101562 L 1.972656 618.175781 C 2.386719 620.53125 3.214844 622.800781 3.855469 625.109375 C 4.21875 626.25 4.519531 627.414062 4.949219 628.53125 L 6.332031 631.859375 C 7.207031 634.097656 8.222656 636.269531 9.386719 638.375 C 10.566406 640.46875 11.734375 642.574219 12.992188 644.617188 C 14.390625 646.570312 15.808594 648.507812 17.25 650.433594 L 18.332031 651.871094 L 19.546875 653.195312 L 21.992188 655.824219 L 24.46875 658.425781 C 25.316406 659.269531 26.257812 659.996094 27.152344 660.78125 L 29.886719 663.070312 L 31.261719 664.207031 C 31.714844 664.574219 32.222656 665.003906 32.546875 665.222656 L 36.964844 668.417969 L 54.628906 681.199219 L 63.46875 687.578125 L 72.421875 693.796875 C 75.414062 695.886719 78.429688 697.945312 81.433594 700.023438 C 68.035156 709.664062 54.773438 719.507812 41.65625 729.5625 L 32.957031 736.191406 L 30.753906 737.878906 L 28.03125 740.234375 C 26.257812 741.855469 24.367188 743.339844 22.746094 745.128906 C 15.972656 752.148438 10.636719 760.132812 6.738281 769.078125 C 2.847656 777.980469 0.691406 787.28125 0.265625 796.988281 C 0.0195312 801.773438 0.179688 806.550781 0.75 811.3125 L 2.007812 818.382812 C 2.449219 820.734375 3.257812 823.007812 3.90625 825.3125 C 6.824219 834.578125 11.308594 843.011719 17.359375 850.613281 C 18.839844 852.5 20.429688 854.292969 22.117188 855.992188 L 24.597656 858.589844 C 25.464844 859.40625 26.390625 860.152344 27.289062 860.929688 L 30.027344 863.222656 L 31.402344 864.355469 C 31.878906 864.753906 32.328125 865.113281 32.660156 865.335938 L 37.070312 868.535156 L 54.707031 881.320312 L 63.53125 887.703125 L 72.457031 893.9375 C 119.984375 927.3125 168.65625 958.871094 218.472656 988.613281 C 318.035156 1048.050781 421.394531 1100.332031 526.035156 1149.003906 L 545.6875 1158.066406 L 550.601562 1160.324219 L 553.082031 1161.460938 L 556.035156 1162.722656 C 557.980469 1163.597656 560.046875 1164.246094 562.054688 1164.996094 C 564.125 1165.601562 566.152344 1166.324219 568.269531 1166.789062 C 576.734375 1168.9375 585.324219 1169.75 594.039062 1169.21875 C 602.636719 1168.671875 610.980469 1166.90625 619.0625 1163.917969 C 622.820312 1162.511719 626.5 1160.914062 630.097656 1159.132812 L 639.863281 1154.457031 L 659.394531 1145.113281 C 672.402344 1138.859375 685.332031 1132.417969 698.300781 1126.082031 C 750.046875 1100.441406 801.152344 1073.511719 851.609375 1045.285156 L 870.503906 1034.675781 L 889.265625 1023.824219 C 901.804688 1016.652344 914.175781 1009.179688 926.574219 1001.761719 C 939 994.386719 951.242188 986.707031 963.582031 979.191406 C 975.800781 971.480469 988.050781 963.8125 1000.175781 955.957031 C 1012.25 948.019531 1024.421875 940.226562 1036.351562 932.078125 L 1054.363281 920.019531 L 1072.199219 907.710938 C 1096.003906 891.328125 1119.363281 874.320312 1142.613281 857.171875 C 1149.359375 852.039062 1155.097656 845.960938 1159.839844 838.9375 C 1164.417969 831.761719 1167.644531 824.027344 1169.519531 815.726562 C 1171.394531 807.417969 1171.71875 799.046875 1170.484375 790.613281 Z M 60.363281 637.101562 L 56.09375 633.898438 C 55.808594 633.691406 55.539062 633.464844 55.285156 633.21875 L 54.605469 632.605469 L 53.226562 631.402344 C 52.777344 630.996094 52.265625 630.644531 51.855469 630.203125 L 50.667969 628.84375 L 49.449219 627.515625 L 48.832031 626.859375 L 48.328125 626.113281 C 47.65625 625.125 46.960938 624.152344 46.246094 623.199219 L 44.542969 620.050781 C 43.964844 619 43.484375 617.910156 43.097656 616.777344 L 42.40625 615.121094 C 42.195312 614.5625 42.09375 613.960938 41.925781 613.386719 C 41.566406 612.242188 41.269531 611.082031 41.03125 609.90625 C 40.863281 608.710938 40.671875 607.523438 40.453125 606.34375 C 40.246094 603.941406 40.230469 601.535156 40.402344 599.128906 C 40.695312 594.300781 41.859375 589.695312 43.898438 585.308594 C 45.917969 580.984375 48.609375 577.132812 51.976562 573.75 C 52.777344 572.875 53.804688 572.207031 54.675781 571.394531 L 56.015625 570.199219 L 58.148438 568.609375 L 66.6875 562.25 C 83.683594 549.4375 100.953125 537.003906 118.5 524.945312 C 151.515625 546.699219 185.042969 567.558594 219.089844 587.53125 C 319.101562 646.167969 422.59375 697.664062 526.027344 748.253906 L 545.441406 757.699219 L 550.300781 760.054688 L 552.746094 761.238281 L 555.691406 762.574219 C 557.628906 763.503906 559.699219 764.191406 561.699219 764.988281 C 563.773438 765.636719 565.800781 766.394531 567.921875 766.902344 C 572.128906 768.042969 576.398438 768.839844 580.730469 769.296875 C 585.066406 769.75 589.40625 769.859375 593.757812 769.617188 C 598.109375 769.378906 602.414062 768.792969 606.671875 767.863281 C 610.929688 766.933594 615.085938 765.667969 619.140625 764.074219 C 621.125 763.253906 623.125 762.464844 625.03125 761.5 L 627.828125 760.128906 L 630.222656 758.886719 L 639.800781 753.90625 L 658.960938 743.945312 L 697.253906 723.953125 C 748.277344 697.203125 799.203125 670.148438 849.644531 642.121094 L 868.570312 631.625 L 887.402344 620.949219 C 899.988281 613.890625 912.429688 606.558594 924.914062 599.3125 C 937.398438 592.066406 949.769531 584.605469 962.203125 577.261719 C 974.515625 569.707031 986.894531 562.261719 999.125 554.5625 C 1011.320312 546.808594 1023.601562 539.199219 1035.644531 531.203125 L 1053.824219 519.386719 L 1064.292969 512.332031 L 1064.316406 512.351562 C 1070.242188 516.355469 1075.941406 520.65625 1081.765625 524.792969 L 1099.160156 537.328125 L 1116.21875 550.300781 L 1128.96875 560.085938 C 1130.324219 561.070312 1131.621094 562.121094 1132.859375 563.246094 L 1136.191406 566.207031 L 1139.132812 569.53125 C 1140.109375 570.648438 1140.988281 571.828125 1141.777344 573.082031 L 1143.058594 574.890625 C 1143.46875 575.503906 1143.761719 576.191406 1144.125 576.832031 C 1144.773438 578.15625 1145.617188 579.394531 1146.148438 580.773438 L 1147.789062 584.902344 C 1148.714844 587.730469 1149.390625 590.617188 1149.824219 593.558594 C 1150.769531 599.511719 1150.605469 605.433594 1149.328125 611.324219 C 1148.046875 617.199219 1145.828125 622.695312 1142.664062 627.808594 C 1139.3125 632.820312 1135.261719 637.191406 1130.523438 640.917969 C 1107.472656 657.890625 1084.269531 674.664062 1060.53125 690.679688 L 1042.75 702.726562 L 1024.773438 714.484375 C 1012.828125 722.378906 1000.585938 729.832031 988.472656 737.472656 C 939.820312 767.753906 889.8125 795.878906 839.226562 822.957031 C 788.589844 849.964844 737.316406 875.84375 685.714844 901.152344 L 646.976562 920.082031 L 627.574219 929.492188 L 617.875 934.199219 L 615.449219 935.375 C 614.621094 935.78125 614.0625 936 613.355469 936.324219 C 612.03125 936.964844 610.65625 937.445312 609.296875 937.972656 C 606.621094 938.960938 603.878906 939.730469 601.078125 940.28125 C 598.273438 940.832031 595.445312 941.15625 592.59375 941.253906 C 589.738281 941.347656 586.894531 941.21875 584.0625 940.859375 C 581.230469 940.5 578.445312 939.921875 575.703125 939.117188 C 574.324219 938.777344 573.003906 938.203125 571.648438 937.773438 C 570.335938 937.1875 568.976562 936.746094 567.695312 936.070312 L 565.75 935.140625 L 563.371094 933.921875 L 558.574219 931.457031 L 539.375 921.617188 C 436.914062 869.339844 335.082031 816.296875 237.308594 757.082031 C 188.515625 727.351562 140.796875 696.019531 94.675781 662.554688 L 86.007812 656.3125 L 77.453125 649.914062 Z M 1149.328125 811.355469 C 1148.050781 817.230469 1145.828125 822.726562 1142.667969 827.839844 C 1139.3125 832.851562 1135.265625 837.222656 1130.523438 840.949219 C 1107.464844 857.980469 1084.304688 874.867188 1060.703125 891.128906 C 1037.242188 907.589844 1013.28125 923.320312 989.136719 938.753906 C 977.054688 946.457031 964.855469 953.972656 952.683594 961.53125 L 934.28125 972.628906 C 928.152344 976.34375 922.019531 980.042969 915.792969 983.589844 C 903.390625 990.769531 891.019531 997.996094 878.472656 1004.925781 L 859.714844 1015.417969 L 840.820312 1025.667969 C 790.347656 1052.851562 739.089844 1078.539062 687.046875 1102.734375 C 674.015625 1108.734375 661.039062 1114.835938 647.972656 1120.75 L 628.355469 1129.59375 C 621.902344 1132.421875 614.878906 1135.890625 609.71875 1137.636719 C 606.988281 1138.601562 604.203125 1139.355469 601.359375 1139.894531 C 598.511719 1140.433594 595.644531 1140.757812 592.75 1140.859375 C 589.859375 1140.964844 586.972656 1140.847656 584.097656 1140.511719 C 581.222656 1140.175781 578.390625 1139.621094 575.597656 1138.855469 C 574.199219 1138.535156 572.851562 1137.976562 571.476562 1137.566406 C 570.136719 1137 568.757812 1136.574219 567.441406 1135.925781 L 565.449219 1135.023438 L 563.050781 1133.855469 L 558.214844 1131.496094 L 538.855469 1122.078125 C 435.621094 1071.90625 334.285156 1018.160156 236.980469 958.164062 C 188.414062 928.046875 140.878906 896.367188 94.789062 862.753906 L 86.128906 856.484375 L 77.574219 850.070312 L 60.476562 837.222656 L 56.203125 834.011719 C 55.902344 833.800781 55.617188 833.566406 55.355469 833.3125 L 54.675781 832.699219 L 53.296875 831.496094 C 52.84375 831.09375 52.351562 830.726562 51.917969 830.304688 L 50.730469 828.945312 C 49.882812 828.09375 49.101562 827.183594 48.382812 826.222656 C 45.445312 822.382812 43.300781 818.148438 41.949219 813.507812 C 41.683594 812.335938 41.207031 811.222656 41.046875 810.027344 C 40.878906 808.832031 40.6875 807.648438 40.472656 806.464844 C 40.25 804.0625 40.226562 801.65625 40.398438 799.25 C 40.675781 794.421875 41.832031 789.8125 43.867188 785.421875 C 45.867188 781.085938 48.554688 777.230469 51.921875 773.84375 C 52.703125 772.953125 53.746094 772.300781 54.613281 771.484375 L 55.949219 770.289062 L 58.050781 768.71875 L 66.585938 762.359375 C 83.601562 749.53125 100.890625 737.085938 118.460938 725.023438 C 151.460938 746.804688 184.988281 767.6875 219.039062 787.675781 C 319.078125 846.3125 422.609375 897.714844 526.039062 948.292969 L 545.457031 957.738281 L 550.3125 960.09375 L 552.761719 961.28125 L 555.710938 962.617188 C 557.652344 963.546875 559.722656 964.230469 561.730469 965.03125 C 563.804688 965.675781 565.835938 966.433594 567.960938 966.9375 C 572.164062 968.0625 576.429688 968.851562 580.761719 969.300781 C 585.089844 969.746094 589.429688 969.847656 593.773438 969.605469 C 598.121094 969.363281 602.421875 968.777344 606.671875 967.851562 C 610.925781 966.921875 615.078125 965.664062 619.132812 964.074219 C 621.113281 963.269531 623.105469 962.480469 625.011719 961.53125 C 625.929688 961.085938 627.023438 960.582031 627.800781 960.179688 L 630.199219 958.945312 L 639.808594 954.011719 L 659.023438 944.140625 L 697.40625 924.285156 C 748.539062 897.703125 799.5 870.679688 849.9375 842.621094 L 868.859375 832.109375 L 887.683594 821.40625 C 900.261719 814.332031 912.699219 806.992188 925.167969 799.710938 C 937.648438 792.457031 949.996094 784.953125 962.417969 777.585938 C 974.722656 770.019531 987.074219 762.523438 999.292969 754.8125 C 1011.464844 747.023438 1023.734375 739.394531 1035.761719 731.367188 L 1053.914062 719.511719 L 1064.382812 712.429688 C 1070.28125 716.417969 1075.957031 720.699219 1081.753906 724.816406 L 1099.148438 737.351562 L 1116.207031 750.324219 L 1124.710938 756.851562 L 1128.960938 760.113281 C 1130.316406 761.097656 1131.613281 762.148438 1132.855469 763.273438 L 1136.1875 766.234375 L 1139.128906 769.558594 C 1140.105469 770.671875 1140.984375 771.855469 1141.773438 773.109375 L 1143.054688 774.917969 C 1143.46875 775.53125 1143.757812 776.21875 1144.121094 776.859375 C 1144.773438 778.183594 1145.613281 779.421875 1146.148438 780.800781 L 1147.789062 784.929688 C 1148.710938 787.757812 1149.390625 790.644531 1149.824219 793.585938 C 1150.769531 799.539062 1150.605469 805.464844 1149.328125 811.355469 Z M 1149.328125 811.355469 "/>
            </svg>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Ask about your schema, get SQL help, or request optimization suggestions. Your current schema is shared as context.
            </p>
          </div>
        )}
        {messages.filter(m => m.role !== 'tool' && !(m.role === 'assistant' && !m.content)).map((msg) => (
          <div key={msg.id} className={`flex min-w-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] min-w-0 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground px-4 py-2.5 rounded-tr-sm'
                    : 'bg-secondary/50 text-foreground px-4 py-3 border border-border/50 rounded-tl-sm shadow-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-3 last:prose-p:mb-0 prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:p-3 prose-pre:rounded-lg prose-pre:my-3 prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-none prose-code:after:content-none prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-5 first:prose-headings:mt-0 prose-ul:my-3 prose-ul:pl-4 prose-li:my-1 prose-strong:font-semibold break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkBreaks, remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={markdownComponents as any}
                    >
                      {msg.content || '...'}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p
                    className={`whitespace-pre-wrap break-words ${
                      msg.role === 'user' ? 'leading-tight' : 'leading-relaxed'
                    }`}
                  >
                    {msg.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary/50 text-foreground px-3 py-2.5 border border-border/50 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
              <div className="grid grid-cols-3 gap-[2px]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] h-[3px] rounded-full"
                    style={{ background: 'hsl(var(--primary))' }}
                    animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1.0, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
                  />
                ))}
              </div>
              <motion.span
                className="text-[12px] font-medium bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--muted-foreground)), hsl(var(--primary)), hsl(var(--muted-foreground)))' , backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['100% 0%', '-100% 0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                {isRunningTools && toolStatusText ? toolStatusText : 'Thinking…'}
              </motion.span>
            </div>
          </div>
        )}
        {!isConfigured && !showSettings && (
          <div className="flex flex-col items-center justify-center p-3 mt-4 rounded-lg border border-dashed border-border bg-secondary/50 gap-2">
            <p className="text-xs text-muted-foreground text-center mb-1">
              Configure API key in settings first
            </p>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
              onClick={() => setShowSettings(true)}
            >
              <Gear size={14} />
              Open Settings
            </button>
          </div>
        )}
        <div ref={messagesEndRef}></div>
        </div>

        {isScrollable && !isAtBottom && (
          <button
            type="button"
            onClick={() => {
              setIsAtBottom(true);
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 h-7 w-7 rounded-full border border-white/10 bg-white/5 text-foreground/90 shadow-lg backdrop-blur-xl hover:bg-white/10 transition-colors flex items-center justify-center"
            style={{ WebkitBackdropFilter: 'blur(18px)' }}
            aria-label="Scroll to bottom"
          >
            <CaretDown size={14} weight="bold" />
          </button>
        )}
      </div>
    </div>
      )}
    </>
  );
};
