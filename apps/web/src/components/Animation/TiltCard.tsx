/**
 * 3D Tilt Card Component
 * Creates an interactive 3D card with tilt effect on hover
 */

'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltAmount?: number;
  perspective?: number;
  onClick?: () => void;
  enableGlow?: boolean;
}

export function TiltCard({
  children,
  className = '',
  tiltAmount = 15,
  perspective = 1000,
  onClick,
  enableGlow = true
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-0.5, 0.5], [tiltAmount, -tiltAmount]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-tiltAmount, tiltAmount]);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = (e.clientX - centerX) / (rect.width / 2);
    const mouseY = (e.clientY - centerY) / (rect.height / 2);
    
    x.set(mouseX);
    y.set(mouseY);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
    >
      {/* Glow effect on hover */}
      <AnimatePresence>
        {isHovered && enableGlow && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              boxShadow: '0 0 30px rgba(255, 107, 53, 0.3), inset 0 0 30px rgba(255, 107, 53, 0.1)',
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Card content */}
      <div style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </motion.div>
  );
}

/**
 * Animated Border Card
 * Card with animated gradient border
 */

interface BorderCardProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}

export function BorderCard({ 
  children, 
  className = '',
  accentColor = 'rgba(255, 107, 53, 0.5)'
}: BorderCardProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Animated border */}
      <div className="absolute inset-0 rounded-xl" style={{
        background: `linear-gradient(135deg, ${accentColor} 0%, transparent 50%, ${accentColor} 100%)`,
        padding: '2px',
      }}>
        <div className="w-full h-full bg-[#1a1a1a] rounded-xl" />
      </div>
      
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

/**
 * Glass Card
 * Translucent glassmorphism card
 */

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: number;
}

export function GlassCard({
  children,
  className = '',
  blur = 12
}: GlassCardProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: 'rgba(26, 26, 26, 0.6)',
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
      }}
    >
      {children}
    </motion.div>
  );
}

export default TiltCard;