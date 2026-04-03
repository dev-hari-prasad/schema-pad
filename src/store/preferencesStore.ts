import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type CanvasColor = 'default' | 'white' | 'gray' | 'blue' | 'yellow' | 'pink';
export type FontPreference = 'manrope' | 'inter' | 'excalifont';
export type ChatDockPosition = 'bottom-right';

interface PreferencesStore {
  theme: Theme;
  canvasColor: CanvasColor;
  fontPreference: FontPreference;
  chatDockPosition: ChatDockPosition;
  setTheme: (theme: Theme) => void;
  setCanvasColor: (color: CanvasColor) => void;
  setFontPreference: (fontPreference: FontPreference) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: 'system',
      canvasColor: 'default',
      fontPreference: 'manrope',
      chatDockPosition: 'bottom-right',
      setTheme: (theme) => set({ theme }),
      setCanvasColor: (canvasColor) => set({ canvasColor }),
      setFontPreference: (fontPreference) => set({ fontPreference }),
    }),
    {
      name: 'preferences-storage',
      merge: (persistedState, currentState) => {
        return {
          ...currentState,
          ...(persistedState as object),
          chatDockPosition: 'bottom-right',
        };
      },
    }
  )
);
