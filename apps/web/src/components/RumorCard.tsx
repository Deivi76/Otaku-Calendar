"use client";

import React from "react";

export interface RumorSource {
  name: string;
  url: string;
  type: "twitter" | "reddit" | "4chan" | "telegram" | "youtube";
}

export interface Rumor {
  id: string;
  title: string;
  content?: string;
  status: "unverified" | "circulating" | "likely" | "confirmed" | "denied";
  confidenceScore: number;
  sources: RumorSource[];
  firstSeenAt: string;
}

interface RumorCardProps {
  rumor: Rumor;
}

const statusConfig = {
  unverified: {
    label: "Unverified",
    bg: "bg-gray-500/20",
    text: "text-gray-400",
    border: "border-gray-500",
  },
  circulating: {
    label: "Circulating",
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500",
  },
  likely: {
    label: "Likely",
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    border: "border-orange-500",
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500",
  },
  denied: {
    label: "Denied",
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500",
  },
};

const sourceIcons: Record<RumorSource["type"], string> = {
  twitter: "𝕏",
  reddit: "⬆",
  "4chan": "☰",
  telegram: "✈",
  youtube: "▶",
};

const confidenceColor = (score: number): string => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
};

const confidenceRingColor = (score: number): string => {
  if (score >= 80) return "stroke-green-500";
  if (score >= 60) return "stroke-yellow-500";
  if (score >= 40) return "stroke-orange-500";
  return "stroke-red-500";
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function RumorCard({ rumor }: RumorCardProps) {
  const status = statusConfig[rumor.status];
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (rumor.confidenceScore / 100) * circumference;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] hover:border-[var(--rumor)]/50 transition-all duration-300">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-semibold text-lg text-[var(--text-primary)] flex-1">
          {rumor.title}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} border ${status.border}`}
        >
          {status.label}
        </span>
      </div>

      {rumor.content && (
        <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-3">
          {rumor.content}
        </p>
      )}

      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="var(--bg-tertiary)"
                strokeWidth="4"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                className={confidenceRingColor(rumor.confidenceScore)}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
              {rumor.confidenceScore}%
            </span>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            <div>Confidence</div>
            <div className="w-24 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mt-1">
              <div
                className={`h-full rounded-full ${confidenceColor(rumor.confidenceScore)}`}
                style={{ width: `${rumor.confidenceScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-[var(--text-muted)]">
          <span>First seen: </span>
          <span className="text-[var(--text-secondary)]">
            {formatDate(rumor.firstSeenAt)}
          </span>
        </div>
      </div>

      {rumor.sources.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3">
          <div className="text-xs text-[var(--text-muted)] mb-2">Sources</div>
          <div className="flex flex-wrap gap-2">
            {rumor.sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--accent)]/20 hover:text-[var(--accent)] transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-[var(--bg-secondary)] rounded text-[10px]">
                  {sourceIcons[source.type]}
                </span>
                <span className="truncate max-w-[120px]">{source.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}