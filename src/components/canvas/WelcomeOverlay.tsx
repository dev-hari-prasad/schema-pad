"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSchemaStore } from '@/store/schemaStore';

/**
 * Hand-drawn style SVG arrow path generator using a simple quadratic bezier.
 * Calculates the exact tangent angle at the end so the arrowhead points
 * in the perfect direction.
 */
function getHandDrawnArrow(
  x1: number, y1: number,
  x2: number, y2: number,
  curvature: number = 0.2
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Normal vector
  const nx = -dy / len;
  const ny = dx / len;

  // Control point
  const cx = (x1 + x2) / 2 + nx * len * curvature;
  const cy = (y1 + y2) / 2 + ny * len * curvature;

  const path = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

  // Tangent at t=1 (end point) for a quadratic bezier goes from control point to end point
  const tx = x2 - cx;
  const ty = y2 - cy;
  const angle = Math.atan2(ty, tx);

  return { path, angle };
}

const ArrowHead: React.FC<{ x: number; y: number; angle: number; color: string }> = ({ x, y, angle, color }) => {
  const size = 10;
  // Sweep back 150 degrees (about 2.6 rad) from the direction line
  const a1 = angle + Math.PI * 0.83;
  const a2 = angle - Math.PI * 0.83;
  return (
    <path
      d={`M ${x + Math.cos(a1) * size} ${y + Math.sin(a1) * size} L ${x} ${y} L ${x + Math.cos(a2) * size} ${y + Math.sin(a2) * size}`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

export const WelcomeOverlay: React.FC = () => {
  const tables = useSchemaStore((s) => s.tables);
  const groups = useSchemaStore((s) => s.groups);
  const [dismissed, setDismissed] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [anchors, setAnchors] = useState<{
    toolbar: DOMRect | null;
    chatComposer: DOMRect | null;
  }>({
    toolbar: null,
    chatComposer: null,
  });

  useEffect(() => {
    const update = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });

      const toolbar = document.querySelector('[data-onboarding="toolbar-main"]');
      const chatComposer = document.querySelector('[data-onboarding="chat-composer"]');

      setAnchors({
        toolbar: toolbar instanceof HTMLElement ? toolbar.getBoundingClientRect() : null,
        chatComposer: chatComposer instanceof HTMLElement ? chatComposer.getBoundingClientRect() : null,
      });
    };

    update();

    // Capture final positions after entrance animations settle.
    const settleTimer = window.setTimeout(update, 420);
    const lateSettleTimer = window.setTimeout(update, 3200);

    const resizeObserver = new ResizeObserver(() => {
      update();
    });

    const toolbarEl = document.querySelector('[data-onboarding="toolbar-main"]');
    const chatComposerEl = document.querySelector('[data-onboarding="chat-composer"]');
    if (toolbarEl instanceof HTMLElement) resizeObserver.observe(toolbarEl);
    if (chatComposerEl instanceof HTMLElement) resizeObserver.observe(chatComposerEl);

    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.clearTimeout(settleTimer);
      window.clearTimeout(lateSettleTimer);
      resizeObserver.disconnect();
    };
  }, []);

  const isEmpty = tables.length === 0 && groups.length === 0;
  const show = isEmpty && !dismissed;

  // Dismiss on any table or group creation
  useEffect(() => {
    if (!isEmpty) setDismissed(true);
  }, [isEmpty]);

  if (!show || dimensions.w === 0) return null;

  const { w, h } = dimensions;

  const toolbarTarget = anchors.toolbar
    ? {
      to: {
        x: anchors.toolbar.left + 120,
        y: anchors.toolbar.bottom + 14,
      },
    }
    : {
      to: {
        x: w / 2 - 60,
        y: 62,
      },
    };

  const toolbarFrom = {
    x: toolbarTarget.to.x - 30,
    y: toolbarTarget.to.y + 40,
  };

  const chatTarget = anchors.chatComposer
    ? {
      to: {
        x: anchors.chatComposer.left + 65,
        y: anchors.chatComposer.top - 12,
      },
    }
    : {
      to: {
        x: w - 225,
        y: h - 61,
      },
    };

  const chatFrom = {
    x: chatTarget.to.x - 45,
    y: chatTarget.to.y - 32,
  };

  // Compute absolute positions for arrows based on actual viewport
  const annotations = [
    {
      id: 'toolbar',
      label: 'Add tables, toggle grid,\nimport & view SQL, and settings',
      fromAbs: toolbarFrom,
      toAbs: toolbarTarget.to,
      curvature: 0.16,
      delay: 0.25,
      labelStyle: {
        top: toolbarFrom.y - 12,
        right: w - toolbarFrom.x + 8,
        textAlign: 'right',
      } as React.CSSProperties,
    },
    {
      id: 'share',
      label: 'Share canvas, or\nstar the code!',
      fromAbs: { x: w - 75, y: 95 },
      toAbs: { x: w - 50, y: 70 },
      curvature: 0.2,
      delay: 0.45,
      labelStyle: { top: 90, right: 85, textAlign: 'right' } as React.CSSProperties,
    },
    {
      id: 'ai-chat',
      label: 'Zoom controls\n& shortcuts',
      fromAbs: { x: 178, y: h - 86 },
      toAbs: { x: 136, y: h - 58 },
      curvature: -0.14,
      delay: 0.55,
      labelStyle: { bottom: 92, left: 176, textAlign: 'left' } as React.CSSProperties,
    },
    {
      id: 'zoom-help',
      label: 'Ask AI for help\nor just chat',
      fromAbs: chatFrom,
      toAbs: chatTarget.to,
      curvature: -0.3,
      delay: 0.65,
      labelStyle: {
        bottom: h - chatFrom.y - 8,
        right: w - chatFrom.x + 8,
        textAlign: 'right',
      } as React.CSSProperties,
    },
  ];

  const arrowColor = 'hsl(var(--muted-foreground) / 0.7)';
  const textColor = 'hsl(var(--muted-foreground) / 0.9)';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden"
        >
          {/* SVG layer for arrows */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${w} ${h}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {annotations.map((ann) => {
              const { path, angle } = getHandDrawnArrow(
                ann.fromAbs.x, ann.fromAbs.y,
                ann.toAbs.x, ann.toAbs.y,
                ann.curvature || 0.2
              );

              return (
                <motion.g
                  key={ann.id}
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 1, pathLength: 1 }}
                  transition={{ delay: ann.delay, duration: 0.6, ease: 'easeOut' }}
                >
                  <motion.path
                    d={path}
                    fill="none"
                    stroke={arrowColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: ann.delay, duration: 0.7, ease: 'easeInOut' }}
                  />
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: ann.delay + 0.5, duration: 0.3 }}
                  >
                    <ArrowHead
                      x={ann.toAbs.x}
                      y={ann.toAbs.y}
                      angle={angle}
                      color={arrowColor}
                    />
                  </motion.g>
                </motion.g>
              );
            })}
          </svg>

          {/* Label layer */}
          {annotations.map((ann) => (
            <motion.div
              key={`label-${ann.id}`}
              className="absolute whitespace-pre-line text-[19px] leading-[1.35] font-medium"
              style={{
                ...ann.labelStyle,
                color: textColor,
                fontFamily: '"Caveat", "Comic Sans MS", cursive',
                letterSpacing: '0.02em',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ann.delay + 0.15, duration: 0.4, ease: 'easeOut' }}
            >
              {ann.label}
            </motion.div>
          ))}

          {/* Center welcome message - strictly centered horizontally, adjusted slightly up for bottom elements */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '44%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              maxWidth: '448px'
            }}
          >
            <motion.div
              className="flex flex-col items-center text-center w-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
            >
              <motion.div
                className="flex items-center justify-center mb-5"
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <img
                    src="/Icon.png"
                    alt="Schema Pad Logo"
                    className="w-9 h-9 object-contain drop-shadow-sm"
                  />
                  <h2
                    className="text-[25px] font-bold text-orange-600 dark:text-[#d44c0c] tracking-tight drop-shadow-sm"
                    style={{ fontFamily: '"ManropeLocal", "Manrope", ui-sans-serif, system-ui, sans-serif' }}
                  >
                    Schema Pad
                  </h2>
                </div>
              </motion.div>

              <motion.p
                className="text-base text-muted-foreground flex justify-center w-full leading-relaxed mb-5 leading-tight"
                style={{ fontFamily: '"ManropeLocal", "Manrope", ui-sans-serif, system-ui, sans-serif' }}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <span className="max-w-[320px]">
                  Design your database schema visually on an canvas, powered by Agentic AI.
                </span>
              </motion.p>

              <motion.div
                className="flex flex-col items-center gap-2 w-full text-[13px] text-muted-foreground/80"
                style={{ fontFamily: '"ManropeLocal", "Manrope", ui-sans-serif, system-ui, sans-serif' }}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <kbd className="bg-secondary/60 w-[22px] h-[22px] inline-flex items-center justify-center rounded text-[11px] font-bold border border-border font-mono text-foreground leading-none">T</kbd>
                    <span>New table</span>
                  </span>

                  <div className="w-px h-3.5 bg-foreground/40 mx-1.5" />

                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <kbd className="bg-secondary/60 w-[22px] h-[22px] inline-flex items-center justify-center rounded text-[11px] font-bold border border-border font-mono text-foreground leading-none">/</kbd>
                    <span>Commands</span>
                  </span>

                  <div className="w-px h-3.5 bg-foreground/40 mx-1.5" />

                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <kbd className="bg-secondary/60 w-[22px] h-[22px] inline-flex items-center justify-center rounded text-[11px] font-bold border border-border font-mono text-foreground leading-none">V</kbd>
                    <span>View SQL</span>
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
