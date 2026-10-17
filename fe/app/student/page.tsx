"use client";
import { useEffect } from "react";
import { ConversationBase } from "@/types";

// Hooks
import { useAuth } from "@/hooks/auth";
import { useConversations, useMessages } from "@/hooks/chat";
import { useDocumentHistory } from "@/hooks/upload";
import { useSidebar, usePreventBodyScroll } from "@/hooks/shared";

// Components
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ChatSidebar } from "@/components/layout/ChatSidebar";
import { EmptyChatState } from "@/components/layout/EmptyChatState";
import { EmptyMessageState } from "@/components/layout/EmptyMessageState";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FractureDetectionPanel } from "@/components/fracture/detection";
import { ResizableLayout } from "@/components/ui/ResizableLayout";
import { SidebarToggleButton } from "@/components/ui/SidebarToggleButton";

export default function StudentPage() {
  // Auth
  const { authorized, user, token, logout } = useAuth();

  // Conversations
  const {
    conversations,
    activeConversation,
    loadConversations,
    createNewConversation,
    renameConversation,
    deleteConversation,
    selectConversation,
  } = useConversations();

  // Messages — includes streaming state
  const {
    messages,
    loading,
    isStreaming,
    streamingContent,
    currentNode,
    loadMessages,
    sendMessage,
    clearMessages,
    messagesEndRef,
    messagesContainerRef,
  } = useMessages();

  // Document History
  const {
    combinedHistory,
    loadDocumentHistory,
    handleDocumentUploadStart,
    handleDocumentUploadComplete,
    triggerRefresh,
  } = useDocumentHistory();

  // Sidebar
  const { sidebarVisible, toggleSidebar } = useSidebar();

  // Prevent body scroll
  usePreventBodyScroll();

  // Load conversations on mount
  useEffect(() => {
    if (token) {
      loadConversations(token);
    }
  }, [token, loadConversations]);

  // Load document history on mount and when refreshed
  useEffect(() => {
    if (token) {
      loadDocumentHistory(token);
    }
  }, [token, loadDocumentHistory]);

  const handleNewConversation = async () => {
    const created = await createNewConversation(token);
    if (created) clearMessages();
  };

  const handleSelectConversation = async (conversation: ConversationBase) => {
    selectConversation({ ...conversation, messages: [] });
    await loadMessages(conversation.id, token);
  };

  const handleRenameConversation = async (conversationId: number, title: string) => {
    await renameConversation(conversationId, title, token);
  };

  const handleDeleteConversation = async (conversationId: number) => {
    await deleteConversation(conversationId, token);
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!activeConversation) return;
    try {
      await sendMessage(
        activeConversation.id,
        messageContent,
        token,
        () => loadConversations(token)
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  };

  const handleDocumentRefresh = () => {
    if (token) {
      triggerRefresh();
      loadDocumentHistory(token);
    }
  };

  if (authorized === null) {
    return (
      <div data-theme="dark" className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div
        className="flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarVisible ? "260px" : "0px" }}
      >
        <div className="w-[260px] h-full">
          <ChatSidebar
            user={user}
            conversations={conversations}
            activeConversationId={activeConversation?.id || null}
            onNewChat={handleNewConversation}
            onSelectConversation={handleSelectConversation}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            onLogout={logout}
            onToggleSidebar={toggleSidebar}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ResizableLayout className="flex-1">
          <ResizableLayout.Panel defaultSize={50} minSize={35} className="flex flex-col overflow-hidden">
            {activeConversation ? (
              <>
                {/* Chat header */}
                <div className="flex-shrink-0 bg-[var(--color-surface-raised)] border-b border-[var(--color-border)] px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {!sidebarVisible && (
                      <SidebarToggleButton isVisible={sidebarVisible} onToggle={toggleSidebar} />
                    )}
                    <div>
                      <h2 className="t-primary font-semibold text-sm tracking-tight leading-snug">
                        {activeConversation.title || "New Chat"}
                      </h2>
                      <p className="t-tertiary text-xs mt-0.5">
                        Ask me about bone fractures and injuries
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto px-6 py-8 space-y-5 min-h-0"
                >
                  {messages.length === 0 && !isStreaming ? (
                    <EmptyMessageState userRole={user?.role} />
                  ) : (
                    <>
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}

                      {/*
                        Phase 1 — No tokens yet: show TypingIndicator with current node label.
                        Phase 2 — Tokens arriving: swap to a streaming MessageBubble with cursor.
                      */}
                      {isStreaming && !streamingContent && (
                        <TypingIndicator currentNode={currentNode} />
                      )}
                      {isStreaming && streamingContent && (
                        <MessageBubble
                          message={{
                            id: -1,
                            role: "assistant",
                            content: streamingContent,
                            created_at: new Date().toISOString(),
                          }}
                          streaming
                        />
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    loading={loading || isStreaming}
                    placeholder="Ask about bone fractures, treatments, or symptoms..."
                    token={token}
                    showDocumentUpload={true}
                    onDocumentUploadStart={(filename) =>
                      handleDocumentUploadStart(filename, user?.id || 0)
                    }
                    onDocumentUploadComplete={handleDocumentUploadComplete}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-shrink-0 bg-[var(--color-surface-raised)] border-b border-[var(--color-border)] px-4 py-3">
                  {!sidebarVisible && (
                    <SidebarToggleButton isVisible={sidebarVisible} onToggle={toggleSidebar} />
                  )}
                </div>
                <EmptyChatState onNewChat={handleNewConversation} />
              </div>
            )}
          </ResizableLayout.Panel>

          <ResizableLayout.Splitter />

          <ResizableLayout.Panel defaultSize={50} minSize={30} className="flex flex-col overflow-hidden">
            <FractureDetectionPanel
              token={token}
              documentHistory={combinedHistory}
              onRefreshDocuments={handleDocumentRefresh}
            />
          </ResizableLayout.Panel>
        </ResizableLayout>
      </div>
    </DashboardLayout>
  );
}