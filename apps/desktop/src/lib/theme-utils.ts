/**
 * ESpice Theme Utilities
 * Provides helper functions for theme management and synchronization
 */

export type Theme = 'light' | 'dark';

export interface ThemeConfig {
  theme: Theme;
  systemPreference: boolean;
}

/**
 * Get the current theme from localStorage or system preference
 */
export function getCurrentTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  const savedTheme = localStorage.getItem('espace-theme') as Theme;
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  return savedTheme || (systemPrefersDark ? 'dark' : 'light');
}

/**
 * Set the theme and update localStorage
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('espace-theme', theme);
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme(): Theme {
  const currentTheme = getCurrentTheme();
  const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
  
  setTheme(newTheme);
  return newTheme;
}

/**
 * Get system color scheme preference
 */
export function getSystemPreference(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Listen for system theme changes
 */
export function onSystemThemeChange(callback: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    const theme: Theme = e.matches ? 'dark' : 'light';
    callback(theme);
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

/**
 * Check if a color has sufficient contrast with another color
 * Returns true if contrast ratio meets WCAG AA standards (4.5:1)
 */
export function hasSufficientContrast(
  foreground: string,
  background: string
): boolean {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  
  if (!fg || !bg) return false;
  
  const fgLuminance = getLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);
  
  const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                (Math.min(fgLuminance, bgLuminance) + 0.05);
  
  return ratio >= 4.5;
}

/**
 * Get CSS variable value as HSL string
 */
export function getCSSVariable(name: string): string {
  if (typeof window === 'undefined') return '';
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  
  return value;
}

/**
 * Set CSS variable value
 */
export function setCSSVariable(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  
  document.documentElement.style.setProperty(name, value);
}

/**
 * Get theme-aware color value
 */
export function getThemeColor(colorName: string): string {
  const isDark = getCurrentTheme() === 'dark';
  const suffix = isDark ? '-dark' : '';
  const variableName = `--${colorName}${suffix}`;
  
  return getCSSVariable(variableName) || getCSSVariable(`--${colorName}`);
}

/**
 * Apply theme to a specific element
 */
export function applyThemeToElement(
  element: HTMLElement,
  theme: Theme
): void {
  if (theme === 'dark') {
    element.classList.add('dark');
  } else {
    element.classList.remove('dark');
  }
}

/**
 * Create a theme-aware CSS class
 */
export function createThemeClass(
  baseClass: string,
  lightClass: string,
  darkClass: string
): string {
  const theme = getCurrentTheme();
  return `${baseClass} ${theme === 'dark' ? darkClass : lightClass}`;
}

/**
 * Theme-aware color palette generator
 */
export function generateThemeColors(baseColor: string): {
  light: string;
  dark: string;
} {
  // This is a simplified color generation
  // In practice, you'd want more sophisticated color manipulation
  return {
    light: baseColor,
    dark: baseColor // You'd adjust this based on your color theory
  };
}

/**
 * Validate theme configuration
 */
export function validateThemeConfig(config: Partial<ThemeConfig>): boolean {
  if (config.theme && !['light', 'dark'].includes(config.theme)) {
    return false;
  }
  
  if (typeof config.systemPreference !== 'boolean' && config.systemPreference !== undefined) {
    return false;
  }
  
  return true;
}

/**
 * Get theme statistics for debugging
 */
export function getThemeStats(): {
  currentTheme: Theme;
  systemPreference: Theme;
  localStorageValue: string | null;
  documentClass: string;
} {
  return {
    currentTheme: getCurrentTheme(),
    systemPreference: getSystemPreference(),
    localStorageValue: typeof window !== 'undefined' ? localStorage.getItem('espace-theme') : null,
    documentClass: typeof window !== 'undefined' ? document.documentElement.className : ''
  };
} 