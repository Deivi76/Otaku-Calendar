/**
 * Animated List Components
 * Staggered reveals, hover effects, and list animations
 */

'use client';

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useState } from 'react';

/**
 * Staggered Grid - animates children with staggered delay
 */

interface StaggeredGridProps {
  children: React.ReactNode[];
  columns?: number;
  gap?: number;
  staggerDelay?: number;
  className?: string;
}

export function StaggeredGrid({
  children,
  columns = 4,
  gap = 16,
  staggerDelay = 0.05,
  className = ''
}: StaggeredGridProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
    }
  };

  return (
    <motion.div
      className={`grid`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          className={className}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Animated Card with hover effects
 */

interface AnimatedCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  enableTilt?: boolean;
  enableScale?: boolean;
}

export function AnimatedCard({
  children,
  onClick,
  className = '',
  enableTilt = true,
  enableScale = true
}: AnimatedCardProps) {
  return (
    <motion.div
      className={`cursor-pointer ${className}`}
      onClick={onClick}
      whileHover={enableScale ? { 
        scale: 1.02,
        y: -4,
        transition: { duration: 0.2 }
      } : undefined}
      whileTap={enableScale ? { scale: 0.98 } : undefined}
      style={{
        transformStyle: 'preserve-3d',
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
    >
      <motion.div
        whileHover={enableTilt ? {
          rotateX: 5,
          rotateY: -5,
          transition: { duration: 0.3 }
        } : undefined}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * Flip Card - reveals back on hover
 */

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}

export function FlipCard({ front, back, className = '' }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ perspective: 1000 }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Front */}
        <div style={{ backfaceVisibility: 'hidden' }}>{front}</div>
        
        {/* Back */}
        <div 
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            inset: 0,
          }}
        >
          {back}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Marquee - infinite scrolling text or images
 */

interface MarqueeProps {
  children: React.ReactNode[];
  speed?: number;
  direction?: 'left' | 'right';
  className?: string;
}

export function Marquee({
  children,
  speed = 30,
  direction = 'left',
  className = ''
}: MarqueeProps) {
  const duplicatedChildren = [...children, ...children, ...children];
  
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        className="flex gap-4"
        animate={{
          x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ width: 'fit-content' }}
      >
        {duplicatedChildren.map((child, index) => (
          <div key={index} className="flex-shrink-0">
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Shimmer loading placeholder
 */

interface ShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export function Shimmer({
  className = '',
  width = '100%',
  height = '20px',
  borderRadius = 8
}: ShimmerProps) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(255, 255, 255, 0.05)',
      }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
        }}
      />
    </motion.div>
  );
}

/**
 * Fade in on scroll - reveals content when it enters viewport
 */

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function FadeIn({
  children,
  delay = 0,
  className = '',
  direction = 'up'
}: FadeInProps) {
  const directionMap = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directionMap[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Accordion with smooth expand/collapse
 */

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function Accordion({ title, children, isOpen = false, onToggle }: AccordionProps) {
  return (
    <div className="border border-otaku-border rounded-lg overflow-hidden">
      <motion.button
        className="w-full px-4 py-3 flex items-center justify-between bg-otaku-bg-secondary"
        onClick={onToggle}
        whileTap={{ scale: 0.98 }}
      >
        <span className="font-medium">{title}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 py-3 bg-otaku-bg-tertiary">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StaggeredGrid;