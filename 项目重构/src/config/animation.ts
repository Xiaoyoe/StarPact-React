import type { AutoAnimateOptions } from '@formkit/auto-animate/vue';

export const autoAnimateOptions: AutoAnimateOptions = {
  duration: 300,
  easing: 'ease-out',
  disrespectUserMotionPreference: false,
};

export const motionPresets = {
  fadeIn: {
    initial: { opacity: 0 },
    enter: { opacity: 1 },
  },
  slideIn: {
    initial: { opacity: 0, y: -10 },
    enter: { opacity: 1, y: 0 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    enter: { opacity: 1, scale: 1 },
  },
  bounceIn: {
    initial: { opacity: 0, scale: 0.3 },
    enter: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 600,
        damping: 15,
      },
    },
  },
  popIn: {
    initial: { opacity: 0, scale: 0.8 },
    enter: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
  },
};

export const transitionVariants = {
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  springBouncy: {
    type: 'spring',
    stiffness: 600,
    damping: 15,
  },
  smooth: {
    type: 'tween',
    duration: 300,
    ease: 'easeOut',
  },
  quick: {
    type: 'tween',
    duration: 150,
    ease: 'easeOut',
  },
};
