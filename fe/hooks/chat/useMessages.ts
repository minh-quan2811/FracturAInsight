import { useState, useCallback, useRef, useEffect } from "react";
import { Message } from "@/types";
import { MessageService } from "@/services/messageService";

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  currentNode: string | null;
  loadMessages: (conversationId: number, token: string) => Promise<void>;
  sendMessage: (
    conversationId: number,
    content: string,
    token: string,
    onSuccess: () => Promise<void>
  ) => Promise<void>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * useMessages Hook
 * Manages message state and operations.
 * Handles message loading, streaming responses, and auto-scroll.
 *
 * State breakdown:
 *   loading        — true while fetching existing messages (conversation switch)
 *   isStreaming    — true while the AI is generating a response
 *   streamingContent — partial AI response text built up token by token
 *   currentNode    — the LangGraph node currently executing ("classify", "retrieve", "generate")
 */
export function useMessages(): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentNode, setCurrentNode] = useState<string | null>(null);

  // Text that arrived from the server but is not shown yet
  const pendingRef = useRef("");
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealDoneRef = useRef<(() => void) | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Auto-scroll whenever messages update or streaming content grows
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, streamingContent, isStreaming, scrollToBottom]);

  // Show waiting text a few characters at a time so it looks like typing
  const startReveal = useCallback(() => {
    if (revealTimerRef.current) return;

    revealTimerRef.current = setInterval(() => {
      const pending = pendingRef.current;

      if (!pending) {
        if (revealTimerRef.current) clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
        revealDoneRef.current?.();
        revealDoneRef.current = null;
        return;
      }

      // Show more characters when a lot is waiting, so we never fall far behind
      const count = Math.max(2, Math.ceil(pending.length / 20));
      pendingRef.current = pending.slice(count);
      setStreamingContent((prev) => prev + pending.slice(0, count));
    }, 20);
  }, []);

  const stopReveal = useCallback(() => {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    revealTimerRef.current = null;
    pendingRef.current = "";
    revealDoneRef.current?.();
    revealDoneRef.current = null;
  }, []);

  // Stop the timer if the page is closed
  useEffect(() => stopReveal, [stopReveal]);

  const loadMessages = useCallback(
    async (conversationId: number, token: string) => {
      try {
        setLoading(true);
        const msgs = await MessageService.fetchMessages(conversationId, token);
        setMessages(msgs);
        setTimeout(() => scrollToBottom("auto"), 100);
      } catch (error) {
        console.error("Failed to load messages:", error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [scrollToBottom]
  );

  const sendMessage = useCallback(
    async (
      conversationId: number,
      content: string,
      token: string,
      onSuccess: () => Promise<void>
    ) => {
      // Show the user's message immediately
      const userMessage: Message = {
        id: Date.now(),
        content,
        role: "user",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Enter streaming mode
      setIsStreaming(true);
      setStreamingContent("");
      setCurrentNode(null);

      try {
        await MessageService.streamMessage(
          conversationId,
          content,
          token,
          // Called each time LangGraph moves to a new node
          (node) => setCurrentNode(node),
          // Called for each streamed token — append to build up the response
          (chunk) => {
            pendingRef.current += chunk;
            startReveal();
          }
        );

        // Let the typing finish before swapping in the saved message
        await new Promise<void>((resolve) => {
          if (!pendingRef.current && !revealTimerRef.current) {
            resolve();
          } else {
            revealDoneRef.current = resolve;
          }
        });

        // Stream finished — fetch the now-persisted messages from the server
        const msgs = await MessageService.fetchMessages(conversationId, token);
        setMessages(msgs);
        await onSuccess();
      } catch (error) {
        stopReveal();
        // On failure, remove the optimistic user message
        setMessages((prev) => prev.slice(0, -1));
        console.error("Failed to send message:", error);
        throw error;
      } finally {
        // Always clear streaming state when done or on error
        setIsStreaming(false);
        setStreamingContent("");
        setCurrentNode(null);
      }
    },
    [startReveal, stopReveal]
  );

  return {
    messages,
    loading,
    isStreaming,
    streamingContent,
    currentNode,
    loadMessages,
    sendMessage,
    scrollToBottom,
    messagesEndRef,
    messagesContainerRef,
  };
}