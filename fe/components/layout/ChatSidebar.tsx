import { User, ConversationBase } from "@/types";
import { ConversationList } from "../chat/ConversationList";

interface ChatSidebarProps {
  user: User | null;
  conversations: ConversationBase[];
  activeConversationId: number | null;
  onNewChat: () => Promise<void>;
  onSelectConversation: (conversation: ConversationBase) => Promise<void>;
  onRenameConversation: (conversationId: number, title: string) => Promise<void>;
  onDeleteConversation: (conversationId: number) => Promise<void>;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export function ChatSidebar({
  user,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onLogout,
  onToggleSidebar,
}: ChatSidebarProps) {
  const getInitials = (username: string) => {
    const parts = username.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return username.slice(0, 1).toUpperCase();
  };

  const roleLabel =
    user?.role === "student" ? "Student" : user?.role === "teacher" ? "Teacher" : "";

  return (
    <div className="sidebar-font flex h-full w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-raised)]">
      {/* Header: user profile + collapse button */}
      <div className="flex-shrink-0 px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
            <span className="text-xs font-semibold tracking-wide text-white">
              {user ? getInitials(user.username) : "-"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="t-primary truncate text-sm font-semibold leading-snug tracking-tight">
              {user?.username || "Guest"}
            </p>
            {roleLabel && <span className="pill pill-accent mt-1">{roleLabel}</span>}
          </div>

          <button
            onClick={onToggleSidebar}
            className="btn btn-outline btn-sm flex-shrink-0"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            Hide
          </button>
        </div>

        <button onClick={onNewChat} className="btn btn-solid mt-4 w-full">
          New chat
        </button>
      </div>

      <div className="hairline-t mx-4" />

      {/* List label */}
      <div className="flex-shrink-0 px-5 pb-2 pt-4">
        <p className="eyebrow">Conversations</p>
      </div>

      {/* Scrollable conversation list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onRenameConversation={onRenameConversation}
          onDeleteConversation={onDeleteConversation}
        />
      </div>

      {/* Sign out */}
      <div className="hairline-t flex-shrink-0 px-3 py-4">
        <button onClick={onLogout} className="btn btn-outline w-full">
          Sign out
        </button>
      </div>
    </div>
  );
}