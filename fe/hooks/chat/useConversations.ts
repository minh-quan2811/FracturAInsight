import { useState, useCallback } from "react";
import { Conversation } from "@/types";
import { ConversationService } from "@/services/conversationService";

interface UseConversationsReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  loading: boolean;
  loadConversations: (token: string) => Promise<void>;
  createNewConversation: (token: string) => Promise<void>;
  renameConversation: (conversationId: number, title: string, token: string) => Promise<void>;
  deleteConversation: (conversationId: number, token: string) => Promise<void>;
  selectConversation: (conversation: Conversation) => void;
  clearActiveConversation: () => void;
}

/**
 * useConversations Hook
 * Manages conversation state and operations
 */
export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async (token: string) => {
    try {
      setLoading(true);
      const convs = await ConversationService.fetchConversations(token);
      setConversations(convs);
      setActiveConversation((current) => {
        if (!current) return current;
        const updated = convs.find((conversation) => conversation.id === current.id);
        return updated ? { ...current, title: updated.title } : current;
      });
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewConversation = useCallback(
    async (token: string) => {
      try {
        const newConv = await ConversationService.createConversation("New Chat", token);
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversation(newConv);
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    },
    []
  );

  const renameConversation = useCallback(
    async (conversationId: number, title: string, token: string) => {
      const updated = await ConversationService.renameConversation(conversationId, title, token);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, title: updated.title }
            : conversation
        )
      );
      setActiveConversation((current) =>
        current?.id === conversationId ? { ...current, title: updated.title } : current
      );
    },
    []
  );

  const deleteConversation = useCallback(
    async (conversationId: number, token: string) => {
      await ConversationService.deleteConversation(conversationId, token);
      setConversations((previous) =>
        previous.filter((conversation) => conversation.id !== conversationId)
      );
      setActiveConversation((current) =>
        current?.id === conversationId ? null : current
      );
    },
    []
  );

  const selectConversation = useCallback((conversation: Conversation) => {
    setActiveConversation({ ...conversation, messages: [] });
  }, []);

  const clearActiveConversation = useCallback(() => {
    setActiveConversation(null);
  }, []);

  return {
    conversations,
    activeConversation,
    loading,
    loadConversations,
    createNewConversation,
    renameConversation,
    deleteConversation,
    selectConversation,
    clearActiveConversation,
  };
}
