"use client";

import { useEffect } from "react";
import SchemaCanvas from "@/components/canvas/SchemaCanvas";
import { usePreferencesStore } from "@/store/preferencesStore";

export default function SchemaCanvasPage() {
  const { theme, canvasColor, fontPreference } = usePreferencesStore();

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => {
      if (theme === "system") {
        const sysTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        root.classList.remove("light", "dark");
        root.classList.add(sysTheme);
      } else {
        root.classList.remove("light", "dark");
        root.classList.add(theme);
      }
    };

    updateTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", updateTheme);
      return () => mediaQuery.removeEventListener("change", updateTheme);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(
      "canvas-bg-white",
      "canvas-bg-gray",
      "canvas-bg-blue",
      "canvas-bg-yellow",
      "canvas-bg-pink"
    );
    if (canvasColor !== "default") {
      root.classList.add(`canvas-bg-${canvasColor}`);
    }
  }, [canvasColor]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("font-manrope-local", "font-inter-local", "font-excalifont-local");
    root.classList.add(
      fontPreference === "inter"
        ? "font-inter-local"
        : fontPreference === "excalifont"
          ? "font-excalifont-local"
          : "font-manrope-local"
    );
  }, [fontPreference]);

  return (
    <div className="w-full h-full">
      <SchemaCanvas />
    </div>
  );
}
