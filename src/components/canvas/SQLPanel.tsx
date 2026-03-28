"use client";

import React, { useMemo, useState } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { generateSchema, OutputFormat } from '@/utils/generators';
import { X, Copy, Download, CheckCircle, Code } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import hljs from 'highlight.js/lib/common';
import { useTheme } from 'next-themes';

const SVGLIcon = ({ name, fallback }: { name: string; fallback?: React.ReactNode }) => {
  if (name === 'mysql') {
    return <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 252" className="w-4 h-4"><path fill="#00546B" d="M236 194c-14 0-25 1-34 5-3 1-7 1-7 4l3 6c2 3 5 8 9 11l11 8 21 10 11 9 6 4-3-6-5-5c-5-7-11-13-18-18-6-3-18-9-20-15h-1l12-3 18-3 8-2v-2l-9-10c-8-8-18-15-28-22l-18-8c-2-1-6-2-7-4l-7-13-15-30-8-20c-18-30-38-48-68-65-6-4-14-5-22-7l-13-1-8-6C34 5 8-9 1 9c-5 11 7 22 11 28l9 13 3 9c3 8 5 17 9 24l6 10c2 2 4 3 5 6-3 4-3 9-4 13-7 20-4 44 5 59 2 4 9 14 18 10 8-3 6-13 8-22l1-4 8 14c5 9 14 18 22 24 4 3 8 8 13 10l-4-4-9-10c-8-10-14-21-20-32l-7-17-3-6c-3 4-7 7-9 12-3 7-3 17-4 26h-1c-6-1-8-7-10-12-5-12-6-32-1-46 1-4 6-15 4-19-1-3-4-5-6-7l-7-12-10-30-9-13c-3-5-7-8-10-14-1-2-2-5 0-7l2-2c2-2 9 0 11 1 6 3 12 5 17 9l8 6h4c6 1 12 0 17 2 9 3 18 7 25 12 23 14 42 35 54 59 3 4 3 8 5 12l12 26c4 8 7 16 12 23 3 4 14 6 18 8l12 4 18 12c2 2 11 7 12 10Z"/><path fill="#00546B" d="m58 43-7 1 6 7 4 9v-1c3-1 4-4 4-8l-2-4-5-4Z"/></svg>;
  }
  if (name === 'drizzle') {
    return <svg fill="none" viewBox="0 0 160 160" className="w-4 h-4 bg-[#c5f74f] rounded-sm p-[1px]"><rect width="9.631" height="40.852" fill="#121212" rx="4.816" transform="matrix(.87303 .48767 -.49721 .86763 43.48 67.304)"/><rect width="9.631" height="40.852" fill="#121212" rx="4.816" transform="matrix(.87303 .48767 -.49721 .86763 76.94 46.534)"/><rect width="9.631" height="40.852" fill="#121212" rx="4.816" transform="matrix(.87303 .48767 -.49721 .86763 128.424 46.535)"/><rect width="9.631" height="40.852" fill="#121212" rx="4.816" transform="matrix(.87303 .48767 -.49721 .86763 94.957 67.304)"/></svg>;
  }
  return (
    <img
      src={`https://svgl.app/library/${name}.svg`}
      alt={name}
      className={`w-4 h-4 rounded-sm ${name === 'prisma' ? 'dark:invert dark:brightness-200' : ''}`}
    />
  );
};

interface Props {
  onClose: () => void;
}

export const SQLPanel: React.FC<Props> = ({ onClose }) => {
  const { tables, relationships } = useSchemaStore();
  const [copied, setCopied] = useState(false);
  const [dialect, setDialect] = useState<'postgres' | 'mysql'>('postgres');
  const [orm, setOrm] = useState<'raw' | 'drizzle' | 'prisma' | 'json'>('raw');
  const { resolvedTheme } = useTheme();

  const computedFormat: OutputFormat = orm === 'raw' ? dialect : (orm as OutputFormat);

  const output = useMemo(
    () => generateSchema(computedFormat, tables, relationships),
    [tables, relationships, computedFormat]
  );

  const highlightLang = useMemo(() => {
    if (computedFormat === 'drizzle') return 'typescript';
    if (computedFormat === 'json') return 'json';
    if (computedFormat === 'prisma') return 'prisma';
    return 'sql';
  }, [computedFormat]);

  const highlightedHtml = useMemo(() => {
    try {
      return hljs.highlight(output, { language: highlightLang }).value;
    } catch {
      try {
        return hljs.highlightAuto(output, ['sql', 'typescript', 'json']).value;
      } catch {
        return output
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;');
      }
    }
  }, [output, highlightLang]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = computedFormat === 'json' ? 'json' : computedFormat === 'prisma' ? 'prisma' : computedFormat === 'drizzle' ? 'ts' : 'sql';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute right-3 top-3 bottom-3 w-[440px] rounded-lg border border-floating-border bg-floating-bg shadow-2xl flex flex-col animate-fade-in">
        <TooltipProvider delayDuration={200}>
      <div className="flex flex-col border-b border-border">
        {/* Top Header Row with Tabs and Actions */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
          <Tabs value={dialect} onValueChange={(val) => setDialect(val as any)} className="h-8">
            <TabsList className="h-8 p-1">
              <TabsTrigger value="postgres" className="text-xs px-3 h-6 gap-2">
                <SVGLIcon name="postgresql" fallback={<Code size={14} />} />
                PgSQL
              </TabsTrigger>
              <TabsTrigger value="mysql" className="text-xs px-3 h-6 gap-2">
                <SVGLIcon name="mysql" fallback={<Code size={14} />} />
                MySQL
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <Select value={orm} onValueChange={(val: any) => setOrm(val)}>
              <SelectTrigger className="w-[150px] h-7 text-xs border-border bg-background focus:ring-1">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">
                  <div className="flex items-center gap-2">
                    {dialect === 'postgres' ? <SVGLIcon name="postgresql" fallback={<Code size={14} />} /> : <SVGLIcon name="mysql" fallback={<Code size={14} />} />}
                    <span>Raw SQL</span>
                  </div>
                </SelectItem>
                <SelectItem value="drizzle">
                  <div className="flex items-center gap-2">
                    <SVGLIcon name="drizzle" fallback={<Code size={14} />} />
                    <span>Drizzle ORM</span>
                  </div>
                </SelectItem>
                <SelectItem value="prisma">
                  <div className="flex items-center gap-2">
                    <SVGLIcon name="prisma" fallback={<Code size={14} />} />
                    <span>Prisma ORM</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <Code size={14} />
                    <span>JSON</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <button
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-1"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto p-4">
        <link 
          rel="stylesheet" 
          href={`https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${resolvedTheme === 'dark' ? 'github-dark' : 'github'}.min.css`} 
        />
        <div className="relative rounded-xl border border-border/60 bg-[#f6f8fa] dark:bg-white/5 overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 z-10">
            <div className="flex items-center gap-0.5 p-1 rounded-lg rounded-bl-2xl border border-border/60 bg-floating-bg/70 backdrop-blur-md shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                    onClick={handleCopy}
                  >
                    {copied ? <CheckCircle size={16} className="text-primary" /> : <Copy size={16} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium select-none shadow-lg">
                  <p>{copied ? 'Copied' : 'Copy'}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                    onClick={handleDownload}
                  >
                    <Download size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-black text-white border-0 px-2 py-1 font-medium select-none shadow-lg">
                  <p>Download</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <pre className="m-0 p-4 text-xs dark:text-foreground font-mono leading-relaxed whitespace-pre rounded-xl overflow-x-auto">
            <code
              className={`hljs language-${highlightLang} !bg-transparent`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        </div>
      </div>
        </TooltipProvider>
      </div>
    </div>
  );
};
