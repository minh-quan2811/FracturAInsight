/**
 * Maps internal LangGraph node names to user-facing status labels.
 * These names must match the node names defined in _build_graph() on the backend.
 */
const NODE_LABELS: Record<string, string> = {
  classify: "Classifying question...",
  retrieve: "Searching knowledge base...",
  generate: "Generating answer...",
};

interface TypingIndicatorProps {
  /** Current LangGraph node name, e.g. "classify" | "retrieve" | "generate" */
  currentNode?: string | null;
}

export function TypingIndicator({ currentNode }: TypingIndicatorProps) {
  const label =
    currentNode && NODE_LABELS[currentNode]
      ? NODE_LABELS[currentNode]
      : "AI is thinking...";

  return (
    <div className="flex justify-start">
      <div className="card flex max-w-2xl items-center gap-3 rounded-2xl rounded-bl-md px-4 py-3">
        <span className="pill pill-accent">AI</span>
        <div className="flex space-x-1">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-medium)]" />
          <div
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-medium)]"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-medium)]"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
        <span className="t-secondary text-sm">{label}</span>
      </div>
    </div>
  );
}