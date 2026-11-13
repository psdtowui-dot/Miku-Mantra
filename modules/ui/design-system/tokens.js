/**
 * MikuMantra Luxury Design System - Core Tokens
 * Preserves the brand identity: Bronze, Gold, Charcoal, and Warm Cream.
 * Configurable for future white-label e-commerce platforms.
 */

export const colors = {
  luxe: {
    primary: '#9C6B30',
    primaryHover: '#B07B37',
    primaryDark: '#7A5223',
    primaryLight: '#FAF6EF',
    gold: '#D4AF37',
    goldLight: '#F3E5AB',
    goldGradient: 'linear-gradient(90deg, #9C6B30 0%, #D4AF37 50%, #C79B3B 100%)',
    accent: '#C79B3B',
    dark: '#1A1A1A',
    darkElevated: '#242424',
    darkSurface: '#0F0F10',
    surface: '#FAF6EF',
    surfaceAlt: '#F5EFE6',
    border: '#E8E8E8',
    borderDark: '#2E2E32',
    text: '#333333',
    textMuted: '#737373',
    textLight: '#9E9E9E',
    white: '#FFFFFF',
    // Semantic alerts
    success: '#15803D',
    successBg: '#F0FDF4',
    successBorder: '#BBF7D0',
    destructive: '#DC2626',
    destructiveBg: '#FEF2F2',
    destructiveBorder: '#FECACA',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    info: '#2563EB',
    infoBg: '#EFF6FF',
    infoBorder: '#BFDBFE',
  }
};

export const typography = {
  fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSerif: "'Cormorant Garamond', Georgia, serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.15em',
  }
};

export const shadows = {
  luxe: '0 20px 60px -20px rgba(156, 107, 48, .15), 0 8px 24px -12px rgba(26, 26, 26, .06)',
  luxeLg: '0 40px 80px -30px rgba(156, 107, 48, .25), 0 16px 40px -20px rgba(26, 26, 26, .08)',
  subtle: '0 1px 3px rgba(0, 0, 0, 0.05)',
  card: '0 4px 20px rgba(0, 0, 0, 0.04)',
  elevated: '0 10px 30px -10px rgba(0, 0, 0, 0.1)',
  drawer: '-10px 0 30px rgba(0, 0, 0, 0.15)',
};

export const borderRadius = {
  none: '0px',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
};

export const breakpoints = {
  xxs: '280px',
  xs: '350px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
};

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
};
