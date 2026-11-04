/**
 * Configurable Theme Provider & Factory
 * Allows customization for multi-tenant / white-label instances while preserving MikuMantra defaults.
 */

import { colors, typography, shadows, borderRadius, breakpoints, transitions } from './tokens.js';

export const defaultTheme = {
  name: 'MikuMantra Luxury',
  colors,
  typography,
  shadows,
  borderRadius,
  breakpoints,
  transitions,
};

/**
 * Create a customized design theme by overriding parts of the default theme.
 * @param {Partial<typeof defaultTheme>} overrides 
 * @returns {typeof defaultTheme}
 */
export function createTheme(overrides = {}) {
  return {
    ...defaultTheme,
    ...overrides,
    colors: {
      ...defaultTheme.colors,
      ...(overrides.colors || {}),
      luxe: {
        ...defaultTheme.colors.luxe,
        ...(overrides.colors?.luxe || {}),
      }
    },
    typography: {
      ...defaultTheme.typography,
      ...(overrides.typography || {}),
    },
    shadows: {
      ...defaultTheme.shadows,
      ...(overrides.shadows || {}),
    },
    borderRadius: {
      ...defaultTheme.borderRadius,
      ...(overrides.borderRadius || {}),
    }
  };
}

/**
 * Returns inline CSS style variables for dynamic theme application.
 * @param {typeof defaultTheme} theme 
 * @returns {Record<string, string>}
 */
export function getThemeCssVariables(theme = defaultTheme) {
  const { luxe } = theme.colors;
  return {
    '--luxe-primary': luxe.primary,
    '--luxe-primary-hover': luxe.primaryHover,
    '--luxe-gold': luxe.gold,
    '--luxe-accent': luxe.accent,
    '--luxe-dark': luxe.dark,
    '--luxe-surface': luxe.surface,
    '--luxe-border': luxe.border,
    '--luxe-text': luxe.text,
    '--luxe-shadow': theme.shadows.luxe,
    '--luxe-shadow-lg': theme.shadows.luxeLg,
  };
}
