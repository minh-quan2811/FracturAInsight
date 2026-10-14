import { ConversationItem } from "./ConversationItem";
import { ConversationBase } from '@/types';

interface ConversationListProps {
  conversations: ConversationBase[];
  activeConversationId: number | null;
  onSelectConversation: (conversation: ConversationBase) => void;
  onRenameConversation: (conversationId: number, title: string) => Promise<void>;
  onDeleteConversation: (conversationId: number) => Promise<void>;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="t-secondary text-sm font-medium">No conversations yet</p>
        <p className="t-tertiary mt-1 text-xs">Start a new chat to begin</p>
      </div>
    );
  }

  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-0.5 py-1">
      {sortedConversations.map((conv) => (
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
  );
}