import React from 'react';
import { DocumentUpload } from '@/types';

interface DocumentHistorySectionProps {
  onNavigateToHistory: () => void;
  recentDocuments?: DocumentUpload[];
  isLoading?: boolean;
}

export function DocumentHistorySection({ 
  onNavigateToHistory,
  recentDocuments = []
}: DocumentHistorySectionProps) {
  const processingDocs = recentDocuments.filter(
    doc => doc.status === 'uploading' || doc.status === 'processing'
  );
  
  const completedCount = recentDocuments.filter(doc => doc.status === 'completed').length;
  const failedCount = recentDocuments.filter(doc => doc.status === 'failed').length;

  return (
    <div 
      className="card card-interactive cursor-pointer p-4"
      onClick={onNavigateToHistory}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <p className="eyebrow eyebrow-accent mb-1">Documents</p>
              <h4 className="heading text-base">Document Upload History</h4>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            View all your uploaded documents and their processing status
          </p>
          
          {/* Status Summary */}
          {recentDocuments.length > 0 && (
            <div className="flex items-center gap-4 text-xs">
              {processingDocs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[var(--color-warning)] rounded-full animate-pulse"></div>
                  <span className="text-[var(--color-warning-text)] font-medium">
                    {processingDocs.length} {processingDocs.length === 1 ? 'Processing' : 'Processing'}
                  </span>
                </div>
              )}
              {completedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[var(--color-success)] rounded-full"></div>
                  <span className="text-[var(--color-success-text)] font-medium">
                    {completedCount} Completed
                  </span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-[var(--color-error)] rounded-full"></div>
                  <span className="text-[var(--color-danger-text)] font-medium">
                    {failedCount} Failed
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Processing Documents List */}
          {processingDocs.length > 0 && (
            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              {processingDocs.map((doc) => (
                <div 
                  key={`${doc.id}-${doc.filename}`}
                  className="bg-[var(--color-surface-raised)]/60 rounded px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[var(--color-warning)] rounded-full animate-pulse flex-shrink-0"></div>
                    <span className="text-[var(--color-text-primary)] font-medium truncate flex-1">
                      {doc.filename}
                    </span>
                    <span className="text-[var(--color-warning-text)] text-xs capitalize whitespace-nowrap">
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <svg 
          className="w-6 h-6 text-[var(--color-success-text)] flex-shrink-0 ml-3" 
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