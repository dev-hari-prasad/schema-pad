export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  bullets?: string[];
  targetSelector: string | null;
  position: 'center' | 'bottom' | 'top' | 'top-right';
  primaryCta?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to SchemaPad',
    description: 'Design database schemas visually with live code sync and AI assistance.',
    targetSelector: null,
    position: 'center',
    primaryCta: 'Next',
  },
  {
    id: 'toolbar-controls',
    title: 'Toolbar Controls',
    bullets: [
      'Add tables (press T on canvas)',
      'Create visual table groups',
      'Toggle grid snapping (press G)',
    ],
    targetSelector: '[data-onboarding="toolbar-controls"]',
    position: 'bottom',
    primaryCta: 'Next',
  },
  {
    id: 'sql-import',
    title: 'SQL & Import',
    bullets: [
      'View live generated DDL queries (press V)',
      'Import existing .sql schema files',
    ],
    targetSelector: '[data-onboarding="toolbar-sql-import"]',
    position: 'bottom',
    primaryCta: 'Next',
  },
  {
    id: 'agents-ai',
    title: 'Agents & AI',
    bullets: [
      'Prompt AI to generate complete schemas',
      'Refactor tables and add relationships',
      'Press / anywhere for slash commands',
    ],
    targetSelector: '[data-onboarding="chat-composer"]',
    position: 'top',
    primaryCta: 'Next',
  },
  {
    id: 'history-zoom',
    title: 'Zoom & History',
    bullets: [
      'Zoom in, out, or reset canvas view',
      'Undo and redo schema changes',
    ],
    targetSelector: '[data-onboarding="canvas-history-zoom"]',
    position: 'top',
    primaryCta: 'Next',
  },
  {
    id: 'ready',
    title: "You're Ready!",
    description: 'Start building your database schema now. Code and canvas sync in real time.',
    targetSelector: null,
    position: 'center',
    primaryCta: 'Start Designing',
  },
];
