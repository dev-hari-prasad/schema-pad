import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnboarding } from './useOnboarding';
import { OnboardingCard } from './OnboardingCard';

interface OnboardingProps {
  extensionMode?: boolean;
}

export const Onboarding: React.FC<OnboardingProps> = ({ extensionMode = false }) => {
  const {
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    cardPosition,
    popupRef,
    nextStep,
    prevStep,
    skipOnboarding,
    addTableAndFinish,
    setupAIAndFinish,
  } = useOnboarding(extensionMode);

  if (!extensionMode || !isActive || !currentStep) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 pointer-events-none"
      >
        {/* Highlight ring on targeted element with orangish lines & light orange glow */}
        {cardPosition.targetRect && (
          <div
            className="absolute rounded-xl pointer-events-none border-2 border-orange-500/75 shadow-[0_0_16px_rgba(249,115,22,0.3)] transition-all duration-300 z-45"
            style={{
              top: `${cardPosition.targetRect.top - 4}px`,
              left: `${cardPosition.targetRect.left - 4}px`,
              width: `${cardPosition.targetRect.width + 8}px`,
              height: `${cardPosition.targetRect.height + 8}px`,
            }}
          />
        )}

        {/* Onboarding Card */}
        <div className="pointer-events-auto">
          <OnboardingCard
            key={`step-${currentStepIndex}`}
            step={currentStep}
            stepIndex={currentStepIndex}
            totalSteps={totalSteps}
            position={cardPosition}
            popupRef={popupRef}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipOnboarding}
            onAddTable={addTableAndFinish}
            onSetupAI={setupAIAndFinish}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
