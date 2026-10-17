import { ConversationItem } from "./ConversationItem";
import { ConversationBase } from "@/types";

interface ConversationListProps {
  conversations: ConversationBase[];
  activeConversationId: number | null;
  searchQuery?: string;
  onSelectConversation: (conversation: ConversationBase) => void;
  onRenameConversation: (conversationId: number, title: string) => Promise<void>;
  onDeleteConversation: (conversationId: number) => Promise<void>;
}

type GroupKey = "recent" | "previous7" | "older";

const GROUP_LABELS: Record<GroupKey, string> = {
  recent: "Recent",
  previous7: "Previous 7 days",
  older: "Older",
};

const GROUP_ORDER: GroupKey[] = ["recent", "previous7", "older"];

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Recent       -> today and yesterday
 * Previous 7   -> 2 to 7 days ago
 * Older        -> anything beyond 7 days (so no chat ever disappears)
 */
function getGroupKey(dateString: string, now: Date): GroupKey {
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(new Date(dateString))) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 1) return "recent";
  if (diffDays <= 7) return "previous7";
  return "older";
}

export function ConversationList({
  conversations,
  activeConversationId,
  searchQuery = "",
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}: ConversationListProps) {
  if (conversations.length === 0) {
    const searching = searchQuery.trim().length > 0;
    return (
      <div className="px-3 py-8 text-center">
        <p className="t-secondary text-sm font-medium">
          {searching ? "No chats found" : "No conversations yet"}
        </p>
        <p className="t-tertiary mt-1 text-xs">
          {searching ? "Try a different search" : "Start a new chat to begin"}
        </p>
      </div>
    );
  }

  const now = new Date();
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const groups: Record<GroupKey, ConversationBase[]> = {
    recent: [],
    previous7: [],
    older: [],
  };
  sorted.forEach((conv) => groups[getGroupKey(conv.created_at, now)].push(conv));

  return (
    <div className="pb-2">
      {GROUP_ORDER.filter((key) => groups[key].length > 0).map((key) => (
        <section key={key} className="mb-3">
          <h3 className="t-tertiary px-3 pb-1.5 pt-3 text-xs font-medium">
            {GROUP_LABELS[key]}
          </h3>
          <div className="space-y-0.5">
            {groups[key].map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversationId === conv.id}
                onClick={() => onSelectConversation(conv)}
                onRename={onRenameConversation}
                onDelete={onDeleteConversation}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}