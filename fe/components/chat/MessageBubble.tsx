import { Message } from "@/types";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: Message;
  /**
   * When true, renders a blinking cursor at the end of the content.
   * Used while the AI response is still being streamed in.
   */
  streaming?: boolean;
}

export function MessageBubble({ message, streaming = false }: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUser = message.role !== "assistant";

  return (
    <div className="flex flex-col">
      <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-2xl px-4 py-3 ${
            isUser
              ? "rounded-2xl rounded-br-md bg-[var(--color-primary)] text-white"
              : "card rounded-2xl rounded-bl-md"
          }`}
        >
          <div className={`max-w-none text-[15px] leading-relaxed ${isUser ? "" : "t-primary"}`}>
            {isUser ? (
              <p className="m-0 whitespace-pre-wrap break-words text-white">
                {message.content}
              </p>
            ) : (
              <div>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="m-0 mb-2 last:mb-0">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => (
                      <ul className="my-2 list-inside list-disc space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-2 list-inside list-decimal space-y-1">{children}</ol>
                    ),
                    li: ({ children }) => <li>{children}</li>,
                    code: ({ children }) => (
                      <code className="rounded-md bg-[var(--color-primary-subtle)] px-1.5 py-0.5 text-sm text-[var(--color-accent-text)]">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="my-2 overflow-x-auto rounded-lg bg-[var(--color-surface-inset)] p-3 text-sm">
                        {children}
                      </pre>
                    ),
                    h1: ({ children }) => (
                      <h1 className="mb-1 mt-2 text-xl font-semibold tracking-tight">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mb-1 mt-2 text-lg font-semibold tracking-tight">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-1 mt-2 text-base font-semibold tracking-tight">{children}</h3>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>

                {/* Blinking cursor shown while tokens are still arriving */}
                {streaming && <span className="streaming-cursor" aria-hidden="true" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {isUser && (
        <div className="mr-1 mt-1 flex justify-end">
          <span className="t-tertiary select-none text-[10px] leading-none">
            {formatTime(message.created_at)}
          </span>
        </div>
      )}
    </div>
  );
}