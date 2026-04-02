'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Início', icon: '◇' },
  { href: '/radar', label: 'Radar', icon: '◈' },
  { href: '/favorites', label: 'Favoritos', icon: '★' },
  { href: '/stats', label: 'Stats', icon: '◉' },
];

interface HeaderProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function Header({ showSearch = false, onSearchClick }: HeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1
      }}
      className="sticky top-0 z-50"
    >
      {/* Noise + Glass Background */}
      <div className="absolute inset-0 bg-[#050505]/90 backdrop-blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#ff4d00]/5 to-transparent opacity-50" />
      
      {/* Border gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff4d00]/30 to-transparent" />

      <div className="relative container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3"
          >
            <Link href="/" className="group flex items-center gap-2">
              {/* Logo Mark - Animated */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-lg border border-[#ff4d00]/20"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-1 rounded-md border border-[#ff4d00]/40"
                />
                <span className="text-[#ff4d00] text-xl font-bold">O</span>
              </div>
              
              {/* Logo Text */}
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg tracking-tight leading-none">
                  OTAKU
                </span>
                <span className="text-[#ff4d00] text-xs tracking-widest uppercase leading-none">
                  Calendar
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className={`
                      relative group flex items-center gap-2 px-4 py-2 rounded-lg
                      transition-all duration-300
                      ${isActive 
                        ? 'text-white' 
                        : 'text-[#a1a1a1] hover:text-white'
                      }
                    `}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-[#ff4d00]/10 rounded-lg border border-[#ff4d00]/30"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    <span className={`
                      text-sm transition-all duration-300
                      ${isActive ? 'text-[#ff4d00]' : 'group-hover:text-[#ff4d00]'}
                    `}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-semibold tracking-wide">
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {showSearch && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSearchClick}
                className="w-10 h-10 rounded-xl bg-[#121212] border border-[#262626] hover:border-[#ff4d00]/50 flex items-center justify-center text-[#a1a1a1] hover:text-[#ff4d00] transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </motion.button>
            )}

            {/* Mobile Menu Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden w-10 h-10 rounded-xl bg-[#121212] border border-[#262626] flex items-center justify-center"
            >
              <div className="flex flex-col gap-1.5 w-5">
                <motion.span
                  animate={{ 
                    rotate: isMenuOpen ? 45 : 0,
                    y: isMenuOpen ? 6 : 0
                  }}
                  className="w-full h-0.5 bg-white rounded-full origin-left"
                />
                <motion.span
                  animate={{ opacity: isMenuOpen ? 0 : 1 }}
                  className="w-full h-0.5 bg-white rounded-full"
                />
                <motion.span
                  animate={{ 
                    rotate: isMenuOpen ? -45 : 0,
                    y: isMenuOpen ? -6 : 0
                  }}
                  className="w-full h-0.5 bg-white rounded-full origin-left"
                />
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[#262626] bg-[#0a0a0a]/95 backdrop-blur-xl"
          >
            <nav className="container py-4 flex flex-col gap-2">
              {NAV_ITEMS.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-300
                        ${isActive 
                          ? 'bg-[#ff4d00]/10 text-[#ff4d00] border border-[#ff4d00]/20' 
                          : 'text-[#a1a1a1] hover:bg-[#121212] hover:text-white'
                        }
                      `}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-semibold">{item.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}