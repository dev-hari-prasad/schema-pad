import { useState, useEffect, useCallback, useRef } from 'react';
import { ONBOARDING_STEPS, OnboardingStep } from './onboardingSteps';
import { useSchemaStore } from '@/store/schemaStore';

const LOCAL_STORAGE_KEY = 'schemapad_onboarding_completed';

export interface CardPosition {
  x: number;
  y: number;
  placement: 'center' | 'bottom' | 'top' | 'top-right';
  targetRect: DOMRect | null;
  caretX?: number;
}

export function useOnboarding(extensionMode: boolean = false) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [cardPosition, setCardPosition] = useState<CardPosition>({
    x: 0,
    y: 0,
    placement: 'center',
    targetRect: null,
  });

  const popupRef = useRef<HTMLDivElement | null>(null);

  // Check initial state from localStorage & VS Code postMessage
  useEffect(() => {
    if (!extensionMode) {
      setIsActive(false);
      return;
    }

    const localValue = localStorage.getItem(LOCAL_STORAGE_KEY);
    const isCompletedLocally = localValue === 'true';

    if (!isCompletedLocally) {
      setIsActive(true);
    } else {
      setCompleted(true);
    }

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'resetOnboarding') {
        setCurrentStepIndex(0);
        setIsActive(true);
        setCompleted(false);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } else if (msg.type === 'onboardingState') {
        if (msg.completed) {
          setCompleted(true);
          setIsActive(false);
        } else {
          setCompleted(false);
          setIsActive(true);
          setCurrentStepIndex(0);
        }
      }
    };

    const handleResetEvent = () => {
      setCurrentStepIndex(0);
      setIsActive(true);
      setCompleted(false);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('schema:reset-onboarding', handleResetEvent);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('schema:reset-onboarding', handleResetEvent);
    };
  }, [extensionMode]);

  const currentStep: OnboardingStep | undefined = ONBOARDING_STEPS[currentStepIndex];

  const updatePosition = useCallback(() => {
    if (!currentStep) return;

    // Use current visible viewport dimensions (adapts to terminal and sidebar resizing)
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const cardWidth = 350;
    const targetGap = 20; // 20px clearance from target element to avoid collision with target highlight ring

    // Measure exact rendered DOM height of the popup card
    const measuredHeight = popupRef.current?.getBoundingClientRect().height || 230;
    const cardHeight = Math.max(160, measuredHeight);

    if (!currentStep.targetSelector || currentStep.position === 'center') {
      setCardPosition({
        x: Math.max(16, (vw - cardWidth) / 2),
        y: Math.max(16, (vh - cardHeight) / 2),
        placement: 'center',
        targetRect: null,
      });
      return;
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (!el || !(el instanceof HTMLElement)) {
      setCardPosition({
        x: Math.max(16, (vw - cardWidth) / 2),
        y: Math.max(16, (vh - cardHeight) / 2),
        placement: 'center',
        targetRect: null,
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const targetCenterX = rect.left + rect.width / 2;

    // Smart horizontal clamping: card NEVER overflows right or left viewport edges
    const cardX = Math.max(16, Math.min(targetCenterX - cardWidth / 2, vw - cardWidth - 16));
    const caretX = Math.max(20, Math.min(targetCenterX - cardX, cardWidth - 20));

    let placement = currentStep.position;
    let cardY = 0;

    if (placement === 'bottom') {
      cardY = rect.bottom + targetGap;
      // Auto flip if cut off at bottom of viewport
      if (cardY + cardHeight > vh - 16 && rect.top - cardHeight - targetGap > 16) {
        placement = 'top';
        cardY = rect.top - cardHeight - targetGap;
      }
    } else if (placement === 'top') {
      cardY = rect.top - cardHeight - targetGap;
      // Auto flip if cut off at top of viewport
      if (cardY < 16 && rect.bottom + cardHeight + targetGap < vh - 16) {
        placement = 'bottom';
        cardY = rect.bottom + targetGap;
      }
    } else {
      cardY = Math.max(16, Math.min(rect.top, vh - cardHeight - 16));
    }

    setCardPosition({
      x: cardX,
      y: cardY,
      placement,
      targetRect: rect,
      caretX,
    });
  }, [currentStep]);

  useEffect(() => {
    if (!isActive) return;

    updatePosition();

    // Poll position via animation frames to follow CSS width/height transitions smoothly
    let animFrameId: number;
    let frameCount = 0;
    const poll = () => {
      updatePosition();
      frameCount++;
      if (frameCount < 40) {
        animFrameId = requestAnimationFrame(poll);
      }
    };
    animFrameId = requestAnimationFrame(poll);

    // Observe body resizes
    const bodyObserver = new ResizeObserver(() => {
      updatePosition();
    });
    if (document.body) {
      bodyObserver.observe(document.body);
    }

    // Observe target element width/height resizes directly (e.g. topbar expanding/collapsing)
    let targetObserver: ResizeObserver | null = null;
    if (currentStep?.targetSelector) {
      const targetEl = document.querySelector(currentStep.targetSelector);
      if (targetEl instanceof HTMLElement) {
        targetObserver = new ResizeObserver(() => {
          updatePosition();
        });
        targetObserver.observe(targetEl);
      }
    }

    const handleWindowResize = () => updatePosition();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      bodyObserver.disconnect();
      if (targetObserver) targetObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isActive, currentStepIndex, currentStep, updatePosition]);

  const finishOnboarding = useCallback((skipped: boolean = false) => {
    setIsActive(false);
    setCompleted(true);
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');

    try {
      if (typeof window !== 'undefined' && (window as any).acquireVsCodeApi) {
        const vscode = (window as any).acquireVsCodeApi();
        vscode.postMessage({
          type: 'setOnboardingCompleted',
          completed: true,
          skipped,
        });
      }
    } catch {
      // Ignore if VS Code postMessage is not bound
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      finishOnboarding(false);
    }
  }, [currentStepIndex, finishOnboarding]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipOnboarding = useCallback(() => {
    finishOnboarding(true);
  }, [finishOnboarding]);

  const addTableAndFinish = useCallback(() => {
    try {
      const store = useSchemaStore.getState();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      store.addTable({
        x: (vw / 2 - store.pan.x) / store.zoom - 130,
        y: (vh / 2 - store.pan.y) / store.zoom - 60,
      });
    } catch {
      // Ignore if store not mounted
    }
    finishOnboarding(false);
  }, [finishOnboarding]);

  const setupAIAndFinish = useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent('schema:open-ai-chat'));
    } catch {
      // Ignore if event dispatch fails
    }
    finishOnboarding(false);
  }, [finishOnboarding]);

  // Trap focus inside onboarding card when active
  useEffect(() => {
    if (!isActive || !popupRef.current) return;

    const popup = popupRef.current;
    popup.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skipOnboarding();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button')) {
          return;
        }
        e.preventDefault();
        nextStep();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = popup.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, skipOnboarding]);

  return {
    isActive,
    completed,
    currentStepIndex,
    currentStep,
    totalSteps: ONBOARDING_STEPS.length,
    cardPosition,
    popupRef,
    nextStep,
    prevStep,
    skipOnboarding,
    addTableAndFinish,
    setupAIAndFinish,
  };
}
