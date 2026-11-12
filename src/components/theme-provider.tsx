'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = 'shelf_theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') return val;
  } catch {}
  return 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Apply theme to DOM documentElement
  const applyTheme = useCallback((targetTheme: Theme): 'light' | 'dark' => {
    if (typeof document === 'undefined') return 'light';
    const isDark =
      targetTheme === 'dark' || (targetTheme === 'system' && getSystemTheme() === 'dark');

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    const finalResolved = isDark ? 'dark' : 'light';
    setResolvedTheme(finalResolved);
    return finalResolved;
  }, []);

  // Initialize and attach listeners on mount
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    applyTheme(stored);

    // 1. Listen for browser / OS prefers-color-scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const currentStored = getStoredTheme();
      if (currentStored === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    // 2. React Hydration Guard:
    // Next.js / React 19 hydration can overwrite document.documentElement's class list
    // during reconciliation. MutationObserver ensures 'dark' is never stripped by hydration.
    let isInternalUpdate = false;
    const observer = new MutationObserver(() => {
      if (isInternalUpdate) return;
      const currentStored = getStoredTheme();
      const shouldBeDark =
        currentStored === 'dark' || (currentStored === 'system' && getSystemTheme() === 'dark');
      const hasDark = document.documentElement.classList.contains('dark');
      if (shouldBeDark !== hasDark) {
        isInternalUpdate = true;
        if (shouldBeDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
        isInternalUpdate = false;
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // 3. Listen for changes from other tabs via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const newTheme = (e.newValue as Theme) || 'system';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [applyTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        if (newTheme === 'system') {
          localStorage.removeItem(THEME_STORAGE_KEY);
        } else {
          localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        }
      } catch {}
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    // If currently dark, switch to light; if light, switch to dark
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'system' as Theme,
      resolvedTheme: 'light' as 'light' | 'dark',
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

