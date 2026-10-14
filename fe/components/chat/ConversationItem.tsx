import { useState } from "react";
import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { ConversationBase } from "@/types";

interface ConversationItemProps {
  conversation: ConversationBase;
  isActive: boolean;
  onClick: () => void;
  onRename: (conversationId: number, title: string) => Promise<void>;
  onDelete: (conversationId: number) => Promise<void>;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onRename,
  onDelete,
}: ConversationItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title || "New Chat");
  const [error, setError] = useState("");

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

  const handleSave = async () => {
    const title = editTitle.trim();
    if (!title) {
      setError("A title is required.");
      return;
    }

    try {
      await onRename(conversation.id, title);
      setEditing(false);
      setError("");
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Failed to rename conversation.");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(conversation.id);
      setConfirmDelete(false);
      setError("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete conversation.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`group relative rounded-xl border px-2 py-2 transition-colors duration-150 ${
        isActive
          ? "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]"
          : "border-transparent bg-transparent hover:bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex items-center gap-1">
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <input
              autoFocus
              value={editTitle}
              maxLength={200}
              aria-label="Conversation title"
              onChange={(event) => setEditTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setEditing(false);
                  setEditTitle(conversation.title || "New Chat");
                  setError("");
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-2 py-1 text-sm text-[var(--color-text-primary)]"
            />
            <button type="submit" aria-label="Save conversation title" title="Save">
              <Check size={16} />
            </button>
            <button
              type="button"
              aria-label="Cancel rename"
              title="Cancel"
              onClick={() => {
                setEditing(false);
                setEditTitle(conversation.title || "New Chat");
                setError("");
              }}
            >
              <X size={16} />
            </button>
          </form>
        ) : (
          <>
            <button
              onClick={onClick}
              className="min-w-0 flex-1 py-0.5 text-left"
              aria-current={isActive ? "page" : undefined}
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
            <div className="relative flex-shrink-0">
              <button
                type="button"
                aria-label={`Conversation options for ${conversation.title || "New Chat"}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="Conversation options"
                onClick={() => setMenuOpen((open) => !open)}
                className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm t-primary hover:bg-[var(--color-surface)]"
                    onClick={() => {
                      setEditTitle(conversation.title || "New Chat");
                      setEditing(true);
                      setMenuOpen(false);
                      setError("");
                    }}
                  >
                    <Pencil size={15} />
                    Rename
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-surface)]"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                      setError("");
                    }}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 px-1 text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setConfirmDelete(false);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-chat-title-${conversation.id}`}
            aria-describedby={`delete-chat-description-${conversation.id}`}
            className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-xl"
          >
            <h2
              id={`delete-chat-title-${conversation.id}`}
              className="text-lg font-semibold t-primary"
            >
              Delete chat?
            </h2>
            <p
              id={`delete-chat-description-${conversation.id}`}
              className="mt-2 text-sm t-secondary"
            >
              Are you sure you want to delete this chat? This action cannot be undone.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium t-primary hover:bg-[var(--color-surface)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete chat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
