/**
 * Constellation Background Effect
 * Used for: Favorites Page
 * 
 * Creates a starfield with connecting lines between nearby stars
 * Represents the user's personal anime galaxy
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleDelay: number;
}

interface ConstellationBackgroundProps {
  starCount?: number;
  connectionDistance?: number;
  className?: string;
}

export function ConstellationBackground({
  starCount = 80,
  connectionDistance = 15,
  className = ''
}: ConstellationBackgroundProps) {
  const [stars, setStars] = useState<Star[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const generatedStars: Star[] = Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      brightness: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 2 + 1,
      twinkleDelay: Math.random() * 3,
    }));
    setStars(generatedStars);
  }, [starCount]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Calculate connections between nearby stars
  const connections = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
    
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < connectionDistance) {
          lines.push({
            x1: stars[i].x,
            y1: stars[i].y,
            x2: stars[j].x,
            y2: stars[j].y,
            opacity: (connectionDistance - distance) / connectionDistance * 0.3,
          });
        }
      }
    }
    return lines;
  }, [stars, connectionDistance]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Deep space gradient */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(26, 26, 26, 0.5) 0%, rgba(15, 15, 15, 1) 100%)'
      }} />

      {/* Connection lines (constellation) */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.6 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
            <stop offset="100%" stopColor="rgba(255, 107, 53, 0.4)" />
          </linearGradient>
        </defs>
        {connections.map((line, i) => (
          <motion.line
            key={i}
            x1={`${line.x1}%`}
            y1={`${line.y1}%`}
            x2={`${line.x2}%`}
            y2={`${line.y2}%`}
            stroke="url(#lineGradient)"
            strokeWidth="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: line.opacity }}
            transition={{ duration: 1, delay: i * 0.01 }}
          />
        ))}
      </svg>

      {/* Stars */}
      {stars.map((star) => {
        const distToMouse = Math.sqrt(
          Math.pow((star.x / 100 - mousePos.x), 2) + 
          Math.pow((star.y / 100 - mousePos.y), 2)
        );
        const glowSize = distToMouse < 0.2 ? (0.2 - distToMouse) * 50 : 0;

        return (
          <motion.div
            key={star.id}
            className="absolute rounded-full"
            animate={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              boxShadow: glowSize > 0 
                ? `0 0 ${glowSize}px rgba(255, 107, 53, 0.5)`
                : 'none',
            }}
            style={{
              width: star.size,
              height: star.size,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.brightness})`,
            }}
          >
            {/* Twinkle effect */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: star.twinkleSpeed,
                repeat: Infinity,
                delay: star.twinkleDelay,
                ease: "easeInOut"
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }}
            />
          </motion.div>
        );
      })}

      {/* Mouse follower glow */}
      <motion.div
        className="absolute w-32 h-32 rounded-full pointer-events-none"
        animate={{
          left: `${mousePos.x * 100}%`,
          top: `${mousePos.y * 100}%`,
        }}
        style={{
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255, 107, 53, 0.15) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

export default ConstellationBackground;