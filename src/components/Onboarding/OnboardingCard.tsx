import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Table, Code, Robot, MagnifyingGlassPlus, Sparkle } from '@phosphor-icons/react';
import { OnboardingStep } from './onboardingSteps';
import { CardPosition } from './useOnboarding';

interface OnboardingCardProps {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  position: CardPosition;
  popupRef: React.Ref<HTMLDivElement>;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onAddTable?: () => void;
  onSetupAI?: () => void;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  welcome: <Compass size={20} weight="duotone" />,
  'toolbar-controls': <Table size={20} weight="duotone" />,
  'sql-import': <Code size={20} weight="duotone" />,
  'agents-ai': <Robot size={20} weight="duotone" />,
  'history-zoom': <MagnifyingGlassPlus size={20} weight="duotone" />,
  ready: <Sparkle size={20} weight="duotone" />,
};

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  step,
  stepIndex,
  totalSteps,
  position,
  popupRef,
  onNext,
  onPrev,
  onSkip,
  onAddTable,
  onSetupAI,
}) => {
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  const styleProps: React.CSSProperties = {
    fontFamily: '"ManropeLocal", "Manrope", ui-sans-serif, system-ui, sans-serif',
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  const caretLeft = position.caretX ?? 175;

  return (
    <motion.div
      ref={popupRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-card-title"
      aria-describedby="onboarding-card-desc"
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.96, y: position.placement === 'bottom' ? -4 : 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={styleProps}
      className="z-50 w-[350px] max-w-[calc(100vw-32px)] rounded-2xl border border-floating-border bg-floating-bg shadow-2xl outline-none select-none relative overflow-hidden transition-all duration-200"
    >
      {/* Share popover background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

      {/* Dynamic Caret pointing to target element matching active floating-bg theme */}
      {position.placement === 'bottom' && (
        <div
          className="absolute -top-2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[7px] border-b-[hsl(var(--floating-bg))] drop-shadow-[0_-1px_1px_rgba(0,0,0,0.15)] z-10"
          style={{ left: `${caretLeft}px`, transform: 'translateX(-50%)' }}
        />
      )}
      {position.placement === 'top' && (
        <div
          className="absolute -bottom-2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-[hsl(var(--floating-bg))] drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)] z-10"
          style={{ left: `${caretLeft}px`, transform: 'translateX(-50%)' }}
        />
      )}

      <div className="p-5 relative z-10">
        {/* Top Header Row with Icon Badge & Step Counter */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
            {STEP_ICONS[step.id] || <Compass size={20} weight="duotone" />}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/60 px-2.5 py-0.5 rounded-md border border-border/40">
            {stepIndex + 1} of {totalSteps}
          </span>
        </div>

        {/* Card Content */}
        <div className="mb-5">
          <h3
            id="onboarding-card-title"
            className="text-[16px] font-bold text-foreground tracking-tight leading-snug"
          >
            {step.title}
          </h3>
          {step.description && (
            <p
              id="onboarding-card-desc"
              className="text-[13px] text-muted-foreground leading-relaxed mt-1.5"
            >
              {step.description}
            </p>
          )}
          {step.bullets && step.bullets.length > 0 && (
            <ul className="mt-2.5 space-y-1.5 text-[13px]">
              {step.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-bold text-[14px] leading-tight shrink-0 select-none">•</span>
                  <span className="leading-tight text-foreground/90 font-medium">{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <button
            type="button"
            onClick={onSkip}
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none rounded cursor-pointer"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && !isLastStep && (
              <button
                type="button"
                onClick={onPrev}
                className="text-[12px] font-medium text-foreground bg-secondary hover:bg-secondary/80 px-3.5 py-1.5 rounded-lg transition-colors focus-visible:outline-none border border-border/50 cursor-pointer"
              >
                Back
              </button>
            )}

            {isLastStep ? (
              <>
                <button
                  type="button"
                  onClick={onSetupAI || onNext}
                  className="text-[12px] font-medium text-foreground bg-secondary hover:bg-secondary/80 px-3.5 py-1.5 rounded-lg transition-colors focus-visible:outline-none border border-border/50 cursor-pointer"
                >
                  Setup AI
                </button>
                <button
                  type="button"
                  data-primary-cta
                  onClick={onAddTable || onNext}
                  className="text-[12px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:bg-primary/95 px-4 py-1.5 rounded-lg transition-colors focus-visible:outline-none shadow-sm cursor-pointer"
                >
                  Add a table
                </button>
              </>
            ) : (
              <button
                type="button"
                data-primary-cta
                onClick={onNext}
                className="text-[12px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:bg-primary/95 px-4 py-1.5 rounded-lg transition-colors focus-visible:outline-none shadow-sm cursor-pointer"
              >
                {step.primaryCta || 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
