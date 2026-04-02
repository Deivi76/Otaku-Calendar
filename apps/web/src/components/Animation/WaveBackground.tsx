/**
 * Wave/Scan Background Effect
 * Used for: Radar Page
 * 
 * Creates a holographic scanning wave effect
 * Represents searching and discovering new content
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface WavePoint {
  x: number;
  y: number;
  offset: number;
  speed: number;
}

interface WaveBackgroundProps {
  waveCount?: number;
  className?: string;
}

export function WaveBackground({
  waveCount = 5,
  className = ''
}: WaveBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [time, setTime] = useState(0);
  
  const scrollYProgress = useTransform(scrollY, [0, 1000], [0, 1]);
  const waveOffset = useTransform(scrollYProgress, [0, 1], [0, 100]);

  // Generate wave points
  const [waves, setWaves] = useState<WavePoint[][]>([]);

  useEffect(() => {
    const pointsPerWave = 20;
    const newWaves = Array.from({ length: waveCount }, (_, waveIndex) => {
      return Array.from({ length: pointsPerWave }, (_, pointIndex) => ({
        x: (pointIndex / (pointsPerWave - 1)) * 100,
        y: 50 + waveIndex * 10,
        offset: Math.random() * 20,
        speed: 0.5 + waveIndex * 0.2,
      }));
    });
    setWaves(newWaves);
  }, [waveCount]);

  // Time update for animation
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 0.02);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Dark gradient base */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(26, 26, 26, 0.9) 50%, rgba(15, 15, 15, 0.95) 100%)'
      }} />

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />

      {/* Animated scan line */}
      <motion.div
        className="absolute h-px w-full"
        style={{ top: waveOffset }}
        animate={{ 
          background: [
            'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.8) 50%, transparent 100%)',
            'linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.8) 50%, transparent 100%)',
            'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.8) 50%, transparent 100%)',
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="absolute inset-0 blur-sm" style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.5) 50%, transparent 100%)'
        }} />
      </motion.div>

      {/* Wave curves */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
        {waves.map((wave, waveIndex) => {
          const points = wave.map((p, i) => {
            const yOffset = Math.sin((i / wave.length) * Math.PI * 2 + time * p.speed + waveIndex) * p.offset;
            return `${p.x}%,${p.y + yOffset + Math.sin(time * 0.5 + waveIndex) * 5}%`;
          }).join(' ');
          
          return (
            <motion.path
              key={waveIndex}
              d={`M ${points}`}
              fill="none"
              stroke={waveIndex % 2 === 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'}
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: 1, 
                opacity: 0.5 - waveIndex * 0.08,
                d: `M ${wave.map((p, i) => {
                  const yOffset = Math.sin((i / wave.length) * Math.PI * 2 + time * p.speed + waveIndex) * p.offset;
                  return `${p.x}%,${p.y + yOffset + Math.sin(time * 0.5 + waveIndex) * 5}%`;
                }).join(' ')}`
              }}
              transition={{ duration: 0.5 }}
            />
          );
        })}
      </svg>

      {/* Pulsing radar circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: 200 + i * 150,
              height: 200 + i * 150,
              borderColor: i % 2 === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.15)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 1,
            }}
          />
        ))}
      </div>

      {/* Scan effect overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)',
            'linear-gradient(180deg, transparent 0%, rgba(168, 85, 247, 0.03) 50%, transparent 100%)',
            'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)',
          ]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </div>
  );
}

export default WaveBackground;