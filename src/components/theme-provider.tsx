"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "taskflow-theme";

function getStoredTheme(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeTheme(theme: string) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

function applyTheme(theme: string) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type ThemeProviderProps = {
  children: ReactNode;
  initialTheme: string;
};

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setTheme] = useState<string>(() => {
    return getStoredTheme() || initialTheme;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored && stored !== initialTheme) {
      setTheme(stored);
    }
  }, [initialTheme]);

  return <>{children}</>;
}

export function setThemePreference(theme: string) {
  storeTheme(theme);
  applyTheme(theme);
}
