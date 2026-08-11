"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import iconLogo from "@/assets/Icon.png";
import { useSchemaStore } from '@/store/schemaStore';
import { Onboarding } from '@/components/Onboarding/Onboarding';
import { useOnboarding } from '@/components/Onboarding/useOnboarding';
import { SchemaPadLogo } from '@/components/ui/SchemaPadLogo';

export const WelcomeOverlay: React.FC<{ extensionMode?: boolean }> = ({ extensionMode = false }) => {
  const { isActive: isOnboardingActive } = useOnboarding(extensionMode);
  const tables = useSchemaStore((s) => s.tables);
  const groups = useSchemaStore((s) => s.groups);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight });
    };

    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  const isEmpty = tables.length === 0 && groups.length === 0;
  const showCenterBranding = isEmpty && !isOnboardingActive;

  return (
    <>
      {extensionMode && <Onboarding extensionMode={true} />}

      <AnimatePresence>
        {showCenterBranding && dimensions.w > 0 && (
          <motion.div
            key="empty-canvas-welcome-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-20 pointer-events-none select-none overflow-hidden"
          >
            {/* Center welcome message - strictly centered horizontally */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '48%',
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
                transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
              >
                <div className="flex items-center gap-2.5 shrink-0 mb-5">
                  {typeof window !== 'undefined' && window.__SCHEMA_PAD_ICON_URL__ ? (
                    <img
                      src={window.__SCHEMA_PAD_ICON_URL__}
                      alt="Schema Pad Logo"
                      className="w-9 h-9 object-contain drop-shadow-sm"
                    />
                  ) : (
                    <SchemaPadLogo className="w-9 h-9 drop-shadow-sm shrink-0" />
                  )}
                  <h2
                    className="text-[25px] font-bold text-orange-600 dark:text-[#d44c0c] tracking-tight drop-shadow-sm"
                    style={{ fontFamily: '"ManropeLocal", "Manrope", ui-sans-serif, system-ui, sans-serif' }}
                  >
                    Schema Pad
                  </h2>
                </div>

                <p
                  className="text-base text-muted-foreground flex justify-center w-full leading-normal mb-5"
                  style={{ fontFamily: '"ManropeLocal", "Manrope", ui-sans-serif, system-ui, sans-serif' }}
                >
                  <span className="max-w-[340px]">
                    Design your database schema visually on an canvas, powered by Agentic AI.
                  </span>
                </p>

                <div
                  className="flex flex-col items-center gap-2 w-full text-[13px] text-muted-foreground/80"
                  style={{ fontFamily: '"ManropeLocal", "Manrope", ui-sans-serif, system-ui, sans-serif' }}
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
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
