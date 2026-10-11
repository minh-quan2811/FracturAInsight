import React from 'react';

interface HistorySectionProps {
  onNavigateToHistory: () => void;
}

export function HistorySection({ onNavigateToHistory }: HistorySectionProps) {
  return (
    <div 
      className="card card-interactive cursor-pointer p-4"
      onClick={onNavigateToHistory}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="eyebrow eyebrow-accent mb-1">History</p>
            <h4 className="heading text-base">Prediction History</h4>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">View all your previous predictions and performance</p>
          </div>
        </div>
        <svg 
          className="w-6 h-6 text-[var(--color-primary)]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}