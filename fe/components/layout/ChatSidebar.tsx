import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, PanelLeftClose, Search, Settings, SquarePen, X } from "lucide-react";
import { User, ConversationBase } from "@/types";
import { ConversationList } from "../chat/ConversationList";
import { BrandIcon } from "../ui/BrandIcon";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close the settings menu when clicking outside it
  useEffect(() => {
    if (!settingsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [settingsOpen]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conv) =>
      (conv.title || "New Chat").toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const getInitials = (username: string) => {
    const parts = username.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return username.slice(0, 1).toUpperCase();
  };

  const roleLabel =
    user?.role === "student" ? "Student" : user?.role === "teacher" ? "Teacher" : "";

  const iconButton =
    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]";

  return (
    <div className="sidebar-font flex h-full w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-raised)]">
      {/* Top: brand + collapse */}
      <div className="flex flex-shrink-0 items-center gap-2.5 px-3 pb-2 pt-3">
        <BrandIcon className="h-8 w-8 flex-shrink-0" />
        <span className="t-primary min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
          Bone Vision
        </span>
        <button
          onClick={onToggleSidebar}
          className={iconButton}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* New chat + search */}
      <div className="flex-shrink-0 space-y-1 px-2 pb-2">
        <button
          onClick={() => void onNewChat()}
          className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <SquarePen size={17} className="text-[var(--color-accent-text)]" />
          New chat
        </button>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearchQuery("");
            }}
            placeholder="Search chats"
            aria-label="Search chats"
            className="w-full rounded-lg border border-transparent bg-[var(--color-field)] py-2 pl-9 pr-8 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] hover:border-[var(--color-border)] focus:border-[var(--color-primary-medium)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable chat history */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <ConversationList
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          searchQuery={searchQuery}
          onSelectConversation={onSelectConversation}
          onRenameConversation={onRenameConversation}
          onDeleteConversation={onDeleteConversation}
        />
      </div>

      {/* Bottom: user + settings */}
      <div className="hairline-t relative flex-shrink-0 p-2" ref={settingsRef}>
        {settingsOpen && (
          <div
            role="menu"
            className="absolute bottom-full right-2 z-30 mb-2 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 shadow-lg"
          >
            <button
              role="menuitem"
              onClick={() => {
                setSettingsOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
            <span className="text-xs font-semibold tracking-wide text-white">
              {user ? getInitials(user.username) : "-"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="t-primary truncate text-sm font-medium leading-tight">
              {user?.username || "Guest"}
            </p>
            {roleLabel && (
              <p className="t-tertiary mt-0.5 truncate text-xs leading-tight">{roleLabel}</p>
            )}
          </div>

          <button
            onClick={() => setSettingsOpen((open) => !open)}
            className={iconButton}
            title="Settings"
            aria-label="Settings"
            aria-haspopup="menu"
            aria-expanded={settingsOpen}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}