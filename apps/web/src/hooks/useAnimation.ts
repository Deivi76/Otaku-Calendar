/**
 * Global Animation System for Otaku Calendar
 * 
 * This module provides a comprehensive animation infrastructure including:
 * - Custom hooks for complex animations
 * - Page-specific animation configurations
 * - Particle systems and visual effects
 * - Transition controllers
 */

import { 
  motion, 
  useAnimation, 
  useInView, 
  useMotionValue, 
  useTransform,
  useScroll,
  AnimatePresence,
  type Variants,
  type Transition
} from 'framer-motion';

// ============================================
// CORE ANIMATION UTILITIES
// ============================================

/**
 * Page transition variants with staggered reveal
 */
export const pageTransitionVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.3 }
  }
};

/**
 * Stagger container for list items
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

/**
 * Fade up animation for single elements
 */
export const fadeUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

/**
 * Scale in with bounce
 */
export const scaleInVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

/**
 * Slide in from directions
 */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

export const slideInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

// ============================================
// COMPLEX ANIMATION HOOKS
// ============================================

/**
 * Hook for parallax scrolling effect
 */
export function useParallax(speed: number = 0.5) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 1000 * speed]);
  return { y, scrollY };
}

/**
 * Hook for mouse position tracking
 */
export function useMousePosition() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const handleMouseMove = (e: MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    
    // Normalize to -1 to 1 range
    const normalizedX = (clientX / innerWidth - 0.5) * 2;
    const normalizedY = (clientY / innerHeight - 0.5) * 2;
    
    x.set(normalizedX);
    y.set(normalizedY);
  };

  return { x, y, handleMouseMove };
}

/**
 * Hook for cursor follower effect
 */
export function useCursorFollower() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  const handleMouseMove = (e: MouseEvent) => {
    x.set(e.clientX);
    y.set(e.clientY);
  };

  return { x, y, handleMouseMove };
}

/**
 * Hook for 3D tilt effect on cards
 */
export function useTiltEffect() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-15, 15]);
  
  const handleMouseMove = (e: React.MouseEvent<Element>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    x.set(mouseX / (rect.width / 2));
    y.set(mouseY / (rect.height / 2));
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  
  return { rotateX, rotateY, handleMouseMove, handleMouseLeave };
}

/**
 * Hook for infinite floating animation
 */
export function useFloatingAnimation(amplitude: number = 10) {
  const y = useMotionValue(0);
  
  const floatAnimation = {
    y: [0, -amplitude, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };
  
  return { y, floatAnimation };
}

/**
 * Hook for progress ring animation
 */
export function useProgressRing(progress: number) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = useTransform(
    () => circumference - (progress / 100) * circumference
  );
  
  return { circumference, strokeDashoffset };
}

// ============================================
// PAGE-SPECIFIC CONFIGURATIONS
// ============================================

export interface PageAnimationConfig {
  pageVariants: Variants;
  cardVariants: Variants;
  heroVariants?: Variants;
  backgroundEffect?: 'particles' | 'grid' | 'waves' | 'constellation' | 'none';
  enableMouseInteraction?: boolean;
}

export const homePageConfig: PageAnimationConfig = {
  pageVariants: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  },
  cardVariants: {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    },
    hover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  },
  heroVariants: {
    hidden: { opacity: 0, scale: 1.1 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  },
  backgroundEffect: 'particles',
  enableMouseInteraction: true
};

export const favoritesPageConfig: PageAnimationConfig = {
  pageVariants: {
    hidden: { opacity: 0, rotateX: 10 },
    visible: { 
      opacity: 1, 
      rotateX: 0,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 }
    }
  },
  cardVariants: {
    hidden: { opacity: 0, scale: 0.8, rotateY: -15 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      rotateY: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    },
    hover: {
      scale: 1.05,
      rotateY: 5,
      transition: { duration: 0.3 }
    }
  },
  backgroundEffect: 'constellation',
  enableMouseInteraction: true
};

export const radarPageConfig: PageAnimationConfig = {
  pageVariants: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  },
  cardVariants: {
    hidden: { opacity: 0, x: -30 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    }
  },
  backgroundEffect: 'waves',
  enableMouseInteraction: true
};

export const statsPageConfig: PageAnimationConfig = {
  pageVariants: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 }
    }
  },
  cardVariants: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    }
  },
  backgroundEffect: 'grid',
  enableMouseInteraction: false
};

export const paraVocePageConfig: PageAnimationConfig = {
  pageVariants: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.1 }
    }
  },
  cardVariants: {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
    },
    hover: {
      y: -5,
      transition: { duration: 0.2 }
    }
  },
  backgroundEffect: 'particles',
  enableMouseInteraction: true
};

export const animeDetailPageConfig: PageAnimationConfig = {
  pageVariants: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  },
  cardVariants: {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    }
  },
  backgroundEffect: 'none',
  enableMouseInteraction: false
};

// ============================================
// RE-EXPORT FROM FRAMER-MOTION
// ============================================

export { 
  motion, 
  useAnimation, 
  useInView, 
  useMotionValue, 
  useTransform,
  useScroll,
  AnimatePresence,
  type Variants,
  type Transition
};