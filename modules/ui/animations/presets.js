/**
 * MikuMantra Reusable Framer Motion Presets & Tokens
 * Designed to replace fragmented inline variants across pages and components.
 * Fully compatible with user reduced-motion preferences.
 */

export const transitions = {
  instant: { duration: 0 },
  fast: { duration: 0.15, ease: 'easeOut' },
  default: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  smooth: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  spring: { type: 'spring', stiffness: 350, damping: 25 },
  gentleSpring: { type: 'spring', stiffness: 200, damping: 20 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.default },
  exit: { opacity: 0, transition: transitions.fast },
};

export const fadeOut = {
  initial: { opacity: 1 },
  animate: { opacity: 0, transition: transitions.fast },
};

export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: transitions.smooth },
  exit: { opacity: 0, y: 16, transition: transitions.fast },
};

export const slideDown = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0, transition: transitions.smooth },
  exit: { opacity: 0, y: -16, transition: transitions.fast },
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: transitions.smooth },
  exit: { opacity: 0, x: 20, transition: transitions.fast },
};

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: transitions.smooth },
  exit: { opacity: 0, x: -20, transition: transitions.fast },
};

export const scaleUp = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: transitions.default },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
};

export const scaleDown = {
  initial: { opacity: 1, scale: 1 },
  animate: { opacity: 0, scale: 0.95, transition: transitions.fast },
};

export const hoverLift = {
  rest: { y: 0 },
  hover: { y: -4, transition: transitions.fast },
  tap: { y: -1, transition: transitions.instant },
};

export const hoverScale = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: transitions.fast },
  tap: { scale: 0.98, transition: transitions.instant },
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const staggerContainer = (staggerChildren = 0.06, delayChildren = 0) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const scrollReveal = {
  viewport: { once: true, margin: '-40px' },
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0, transition: transitions.smooth },
};

export const pulseAnimation = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const spinAnimation = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};
