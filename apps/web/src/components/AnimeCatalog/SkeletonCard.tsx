'use client';

import { motion } from 'framer-motion';

interface SkeletonCardProps {
  withDetails?: boolean;
}

export function SkeletonCard({ withDetails = false }: SkeletonCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-otaku-bg-tertiary">
      <div className="aspect-[2/3] w-full relative">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        
        {withDetails && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

// Additional skeleton for list items
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-3 bg-otaku-bg-secondary rounded-lg">
      <div className="w-10 h-10 bg-otaku-bg-tertiary rounded animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-otaku-bg-tertiary rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-otaku-bg-tertiary rounded w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

// Skeleton for text content
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-otaku-bg-tertiary rounded animate-pulse ${
            i === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}
