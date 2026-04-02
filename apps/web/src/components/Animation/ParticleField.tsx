/**
 * Particle System Background Component
 * Used for: Home Page, Para Você Page
 * 
 * Creates an interactive cosmic particle field
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
  blur: number;
  moveX: number;
  moveY: number;
}

interface ParticleFieldProps {
  particleCount?: number;
  mouseInfluence?: boolean;
  className?: string;
}

const COLORS = [
  'rgba(255, 107, 53, 0.8)',
  'rgba(255, 107, 53, 0.5)',
  'rgba(255, 159, 107, 0.6)',
  'rgba(255, 255, 255, 0.4)',
];

export function ParticleField({
  particleCount = 50,
  mouseInfluence = true,
  className = ''
}: ParticleFieldProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const initialParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      speed: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.5 + 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      blur: Math.random() * 2,
      moveX: (Math.random() - 0.5) * 2,
      moveY: (Math.random() - 0.5) * 2,
    }));
    setParticles(initialParticles);
  }, [particleCount]);

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

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: (p.x + p.moveX * p.speed + 100) % 100,
        y: (p.y + p.moveY * p.speed + 100) % 100,
      })));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }} />

      {/* Particles */}
      {particles.map((particle) => {
        const distanceX = (mousePos.x * 100 - particle.x) / 100;
        const distanceY = (mousePos.y * 100 - particle.y) / 100;
        const influence = mouseInfluence ? 15 : 0;
        
        return (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            animate={{
              left: `${particle.x + distanceX * influence}%`,
              top: `${particle.y + distanceY * influence}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              filter: `blur(${particle.blur}px)`,
              opacity: particle.opacity,
            }}
          />
        );
      })}

      {/* Ambient gradient orbs */}
      <motion.div
        className="absolute w-64 h-64 rounded-full blur-3xl"
        style={{
          top: '20%',
          left: '20%',
          background: 'radial-gradient(circle, rgba(255, 107, 53, 0.12) 0%, transparent 70%)'
        }}
        animate={{
          x: [0, 40, 0],
          y: [0, 30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full blur-3xl"
        style={{
          bottom: '15%',
          right: '15%',
          background: 'radial-gradient(circle, rgba(255, 107, 53, 0.08) 0%, transparent 70%)'
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}

export default ParticleField;