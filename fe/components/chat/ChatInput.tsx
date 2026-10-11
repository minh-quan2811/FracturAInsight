import { useState } from "react";
import { DocumentUpload } from "../upload/DocumentUpload";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  loading: boolean;
  placeholder?: string;
  token?: string;
  showDocumentUpload?: boolean;
  onDocumentUploadStart?: (filename: string) => void;
  onDocumentUploadComplete?: () => void;
}

export function ChatInput({
  onSendMessage,
  loading,
  placeholder = "Type your message...",
  token,
  showDocumentUpload = false,
  onDocumentUploadStart,
  onDocumentUploadComplete,
}: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const message = inputMessage;
    setInputMessage("");

    try {
      await onSendMessage(message);
    } catch {
      setInputMessage(message);
    }
  };

  const handleUploadSuccess = () => {
    onDocumentUploadComplete?.();
  };

  const handleUploadError = () => {
    onDocumentUploadComplete?.();
  };

  const handleUploadStart = (filename: string) => {
    onDocumentUploadStart?.(filename);
  };

  return (
    <div className="hairline-t bg-[var(--color-surface-raised)]">
      <div className="p-3">
        <div className="flex items-center gap-2">
          {showDocumentUpload && token && (
            <div className="flex items-center">
              <DocumentUpload
                token={token}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                onUploadStart={handleUploadStart}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative flex-1">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={placeholder}
              className="field rounded-full py-3 pl-5 pr-14"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              aria-label="Send message"
              title="Send"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}