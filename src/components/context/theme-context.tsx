import React, { createContext, useContext, useEffect, useState } from 'react';


type Theme = 'system' | 'auto' | 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme';
const LIGHT_THEME_COLOR = '#eae9e3';
const DARK_THEME_COLOR = '#413a2c';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getAutoTheme(): 'light' | 'dark' {
  const hour = new Date().getHours();
  // 18:00 - 06:00 为暗黑主题
  return (hour >= 18 || hour < 6) ? 'dark' : 'light';
}

function updateMetaThemeColor(theme: 'light' | 'dark') {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }

  metaThemeColor.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

function applyTheme(theme: 'light' | 'dark') {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  updateMetaThemeColor(theme);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = STORAGE_KEY,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'auto') {
        return stored;
      }
    } catch {
      // localStorage not available, use default
    }

    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') return getSystemTheme();
    if (theme === 'auto') return getAutoTheme();
    return theme;
  });

  // Apply theme on mount and when theme changes
  useEffect(() => {
    let resolved: 'light' | 'dark';
    if (theme === 'system') {
      resolved = getSystemTheme();
    } else if (theme === 'auto') {
      resolved = getAutoTheme();
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // Timer for auto theme mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const interval = setInterval(() => {
      const newResolved = getAutoTheme();
      if (newResolved !== resolvedTheme) {
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    }, 60000); // 每分钟检查一次

    return () => clearInterval(interval);
  }, [theme, resolvedTheme]);

  // Persist theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // localStorage not available
    }
  }, [theme, storageKey]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
