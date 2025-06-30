import { defineAction } from "astro:actions";

// Import the result type from the Durable Object
import {
  WhatsAppClient,
  type WhatsAppResult,
} from "../durable-objects/WhatsappClient";
import type { Chat } from "whatsapp-web.js";

// Types for WhatsApp client result - now using the DO's discriminated union
export type { WhatsAppResult } from "../durable-objects/WhatsappClient";

// Simplified chat data for UI
export interface ChatData {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp?: number;
}

// Helper function to get WhatsApp Durable Object instance
const getWhatsAppClient = () => {
  return WhatsAppClient.getInstance();
};

// Helper function to transform Chat to ChatData
const transformChatData = (chat: Chat): ChatData => ({
  id: chat.id?.user || '',
  name: chat.name || 'Unknown Contact',
  isGroup: chat.isGroup || false,
  unreadCount: chat.unreadCount || 0,
  timestamp: chat.timestamp
});

export const server = {
  // WhatsApp unread count action
  getWhatsAppUnread: defineAction({
    handler: async (
      _,
      { locals }
    ): Promise<WhatsAppResult<{ unreadCount: number; totalChats: number }>> => {
      try {
        // Call the RPC method directly on the Durable Object
        const client = getWhatsAppClient();
        const result = await client.getUnreadCount();

        return result;
      } catch (error) {
        console.error("Error fetching unread chats:", error);
        return {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  }),
  getWhatsAppChats: defineAction({
    handler: async (): Promise<WhatsAppResult<ChatData[]>> => {
      const client = getWhatsAppClient();
      const result = await client.getChats();
      
      if (result.status === 'ready') {
        return {
          status: 'ready',
          data: result.data.map(transformChatData)
        };
      }
      
      return result as WhatsAppResult<ChatData[]>;
    },
  }),
  getLatestWhatsAppChats: defineAction({
    handler: async (): Promise<WhatsAppResult<ChatData[]>> => {
      const client = getWhatsAppClient();
      const result = await client.getChats();
      
      if (result.status === 'ready') {
        // Sort chats by timestamp (newest first) and take the first 10
        const sortedChats = result.data.sort((a, b) => {
          const aTimestamp = a.timestamp || 0;
          const bTimestamp = b.timestamp || 0;
          return bTimestamp - aTimestamp;
        }).slice(0, 10);
        
        return {
          status: 'ready',
          data: sortedChats.map(transformChatData)
        };
      }
      
      return result as WhatsAppResult<ChatData[]>;
    },
  }),
};
