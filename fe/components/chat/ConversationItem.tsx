import { ConversationBase } from '@/types';

interface ConversationItemProps {
  conversation: ConversationBase;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 ${
        isActive
          ? "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]"
          : "border-transparent bg-transparent hover:bg-[var(--color-surface)]"
      }`}
    >
      <p
        className={`truncate text-sm font-medium leading-snug tracking-tight ${
          isActive ? "text-[var(--color-accent-text)]" : "t-primary"
        }`}
      >
        {conversation.title || "New Chat"}
      </p>
      <p
        className={`mt-0.5 text-xs leading-tight ${
          isActive ? "text-[var(--color-accent-text)]" : "t-tertiary"
        }`}
      >
        {formatDate(conversation.created_at)}
      </p>
    </button>
  );
}