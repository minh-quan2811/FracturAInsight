import { UploadStatusDisplayProps } from '@/types';

export function UploadStatusDisplay({ 
  status, 
  message, 
  fileName 
}: UploadStatusDisplayProps) {
  if (status === 'idle') return null;

  const configs = {
    uploading: {
      icon: (
        <svg className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ),
      bgColor: 'bg-[var(--color-primary-subtle)]',
      borderColor: 'border-[var(--color-primary-border)]',
      textColor: 'text-[var(--color-accent-text)]'
    },
    success: {
      icon: (
        <svg className="w-5 h-5" style={{ color: 'var(--color-success)' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      ),
      bgColor: 'bg-[var(--color-success-surface)]',
      borderColor: 'border-[var(--color-success-border)]',
      textColor: 'text-[var(--color-success-text)]'
    },
    error: {
      icon: (
        <svg className="w-5 h-5" style={{ color: 'var(--color-error)' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      ),
      bgColor: 'bg-[var(--color-danger-surface)]',
      borderColor: 'border-[var(--color-danger-border)]',
      textColor: 'text-[var(--color-danger-text)]'
    }
  };

  const config = configs[status];

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex-shrink-0 mt-0.5">
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        {fileName && (
          <p className={`text-sm font-medium ${config.textColor} truncate`}>
            {fileName}
          </p>
        )}
        {message && (
          <p className={`text-sm ${config.textColor} ${fileName ? 'mt-1' : ''}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}