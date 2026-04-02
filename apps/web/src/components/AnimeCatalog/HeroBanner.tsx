'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import type { Anime } from './types';

interface HeroBannerProps {
  anime?: Anime;
  onWatchClick?: () => void;
  onInfoClick?: () => void;
}

// Cosmic Background with Canvas - Starfield particles
function CosmicBackground({ scrollYProgress }: { scrollYProgress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current?.parentElement) {
        setDimensions({
          width: window.innerWidth,
          height: canvasRef.current.parentElement.clientHeight
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      hue: number;
    }> = [];

    const particleCount = Math.floor((dimensions.width * dimensions.height) / 10000);
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.4 + 0.1,
        hue: Math.random() > 0.6 ? 20 : 200 + Math.random() * 80
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.6
      );
      gradient.addColorStop(0, 'rgba(5, 5, 5, 0)');
      gradient.addColorStop(0.5, 'rgba(5, 5, 5, 0.2)');
      gradient.addColorStop(1, 'rgba(5, 5, 5, 0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        glow.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${p.alpha})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [dimensions]);

  const y = useTransform(() => scrollYProgress * 150);
  const opacity = useTransform(() => 1 - scrollYProgress * 0.8);

  return (
    <motion.div 
      className="absolute inset-0 overflow-hidden"
      style={{ y, opacity }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black" />
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-purple-500/5" />
    </motion.div>
  );
}

export function HeroBanner({ anime, onWatchClick, onInfoClick }: HeroBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  if (!anime) {
    return (
      <div className="relative w-full h-[70vh] min-h-[600px] bg-[#0a0a0a] overflow-hidden">
        <CosmicBackground scrollYProgress={0} />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-2 border-orange-500/30 border-t-orange-500 rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-[70vh] min-h-[600px] overflow-hidden"
    >
      <CosmicBackground scrollYProgress={scrollYProgress.get()} />

      {/* Background Image with Parallax */}
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <motion.img
          src={anime.cover || anime.image || '/placeholder-banner.jpg'}
          alt={anime.titleEnglish || anime.title}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Gradient Overlays */}
      <motion.div style={{ opacity }} className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[#050505]" />
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 container h-full flex flex-col justify-end pb-12 md:pb-20">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
          className="max-w-3xl"
        >
          {/* Badges */}
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-5"
          >
            {anime.type && (
              <span className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md bg-[#ff4d00] text-white shadow-lg shadow-orange-500/30">
                {anime.type}
              </span>
            )}
            {anime.score && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-[#121212]/80 backdrop-blur-sm border border-[#262626] text-yellow-400">
                ★ {anime.score}
              </span>
            )}
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 leading-[1.05]"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}
          >
            {anime.titleEnglish || anime.title}
          </motion.h1>

          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap gap-2 mb-5"
            >
              {anime.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 text-xs font-medium rounded-md bg-white/5 text-white/70 backdrop-blur-sm border border-white/10"
                >
                  {genre}
                </span>
              ))}
            </motion.div>
          )}

          {/* Synopsis */}
          {anime.synopsis && (
            <motion.p
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6 }}
              className="text-white/60 text-sm md:text-base max-w-xl line-clamp-2 md:line-clamp-3 mb-7 leading-relaxed"
            >
              {anime.synopsis}
            </motion.p>
          )}

          {/* Action Buttons */}
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <motion.button
              onClick={onWatchClick}
              className="group flex items-center gap-2 px-8 py-4 bg-[#ff4d00] hover:bg-[#ff6b3d] text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ boxShadow: '0 8px 30px -5px rgba(255, 77, 0, 0.5)' }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Assistir
            </motion.button>
            <motion.button
              onClick={onInfoClick}
              className="group flex items-center gap-2 px-8 py-4 bg-[#121212]/80 hover:bg-[#1a1a1a] text-white font-bold text-sm uppercase tracking-wider rounded-xl border border-[#262626] backdrop-blur-sm transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mais Info
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <motion.div
              animate={{ opacity: [1, 0], y: [0, 8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-3 rounded-full bg-[#ff4d00]"
            />
          </div>
          <span className="text-[10px] text-white/30 uppercase tracking-widest">Scroll</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}