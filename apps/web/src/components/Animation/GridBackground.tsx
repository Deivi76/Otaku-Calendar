/**
 * Data Grid Background Effect
 * Used for: Stats Page
 * 
 * Creates a tech/data visualization grid
 * Represents analytics and statistics
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface DataPoint {
  id: number;
  x: number;
  y: number;
  value: number;
  pulse: boolean;
}

interface GridBackgroundProps {
  pointCount?: number;
  className?: string;
}

export function GridBackground({
  pointCount = 40,
  className = ''
}: GridBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  
  const scrollYProgress = useTransform(scrollY, [0, 500], [0, 50]);
  const gridOffset = useTransform(scrollYProgress, [0, 50], [0, 100]);

  // Generate data points
  useEffect(() => {
    const points: DataPoint[] = Array.from({ length: pointCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      value: Math.random() * 100,
      pulse: Math.random() > 0.7,
    }));
    setDataPoints(points);
  }, [pointCount]);

  // Random data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints(prev => prev.map(p => ({
        ...p,
        value: Math.random() * 100,
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Dark tech background */}
      <div className="absolute inset-0" style={{
        background: `
          linear-gradient(180deg, rgba(15, 15, 15, 0.97) 0%, rgba(20, 20, 20, 0.95) 100%),
          radial-gradient(circle at 30% 20%, rgba(34, 197, 94, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)
        `
      }} />

      {/* Animated grid */}
      <motion.div 
        className="absolute inset-0"
        style={{ 
          backgroundPosition: `0 ${gridOffset}`,
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.08) 1px, transparent 1px),
            linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 60px 60px, 120px 120px, 120px 120px'
        }}
      />

      {/* Glowing intersections */}
      <div className="absolute inset-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${10 + i * 8}%`,
              top: `${15 + (i % 4) * 20}%`,
              backgroundColor: i % 2 === 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(59, 130, 246, 0.6)',
              boxShadow: `0 0 8px ${i % 2 === 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Data points */}
      {dataPoints.map((point) => (
        <motion.div
          key={point.id}
          className="absolute"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 2 + (point.value / 50),
            repeat: Infinity,
          }}
        >
          <div 
            className="rounded-sm"
            style={{
              width: 4 + (point.value / 25),
              height: 4 + (point.value / 25),
              backgroundColor: point.pulse ? 'rgba(34, 197, 94, 0.8)' : 'rgba(59, 130, 246, 0.5)',
              boxShadow: point.pulse 
                ? '0 0 10px rgba(34, 197, 94, 0.5)' 
                : '0 0 5px rgba(59, 130, 246, 0.3)',
            }}
          />
        </motion.div>
      ))}

      {/* Horizontal scan line */}
      <motion.div
        className="absolute w-full h-px"
        style={{ top: scrollYProgress }}
        animate={{
          background: [
            'linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.6) 20%, rgba(34, 197, 94, 0.8) 50%, rgba(34, 197, 94, 0.6) 80%, transparent 100%)',
            'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.6) 20%, rgba(59, 130, 246, 0.8) 50%, rgba(59, 130, 246, 0.6) 80%, transparent 100%)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="absolute inset-0 blur-md" style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.4) 50%, transparent 100%)'
        }} />
      </motion.div>

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-16 h-16" style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 50%)'
      }} />
      <div className="absolute top-0 right-0 w-16 h-16" style={{
        background: 'linear-gradient(225deg, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
      }} />
      <div className="absolute bottom-0 left-0 w-16 h-16" style={{
        background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
      }} />
      <div className="absolute bottom-0 right-0 w-16 h-16" style={{
        background: 'linear-gradient(315deg, rgba(34, 197, 94, 0.1) 0%, transparent 50%)'
      }} />
    </div>
  );
}

export default GridBackground;