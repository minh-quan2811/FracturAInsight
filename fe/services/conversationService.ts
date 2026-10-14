import { Conversation } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Conversation Service
 * Handles conversation API operations
 */

export class ConversationService {
  private static async getErrorMessage(response: Response, fallback: string): Promise<string> {
    const body = await response.json().catch(() => null);
    return body?.detail || fallback;
  }

  /**
   * Fetch all conversations for the user
   */
  static async fetchConversations(token: string): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/chat/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch conversations");
    }

    return res.json();
  }

  /**
   * Create a new conversation
   */
  static async createConversation(title: string, token: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/chat/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      throw new Error("Failed to create conversation");
    }

    return res.json();
  }

  /**
   * Rename a conversation
   */
  static async renameConversation(
    conversationId: number,
    title: string,
    token: string
  ): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      throw new Error(await this.getErrorMessage(res, "Failed to rename conversation"));
    }

    return res.json();
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(conversationId: number, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(await this.getErrorMessage(res, "Failed to delete conversation"));
    }
  }
}
