import Groq from 'groq-sdk';
import type { Chat, Message } from 'whatsapp-web.js';

const groq = new Groq({
  apiKey: import.meta.env.GROQ_API_KEY,
});

export interface MessageData {
  id: string;
  body: string;
  from: string;
  timestamp: number;
  fromMe: boolean;
}

export interface ChatWithMessages {
  chatName: string;
  chatId: string;
  isGroup: boolean;
  unreadCount: number;
  lastActivity: number;
  messages: MessageData[];
}

export interface WhatsAppBrief {
  summary: string;
  urgentItems: string[];
  canIgnore: string[];
  totalUnread: number;
  generatedAt: string;
}

// Transform WhatsApp data for AI processing
export function transformChatDataForAI(chatData: { chat: Chat; messages: Message[] }[]): ChatWithMessages[] {
  return chatData.map(({ chat, messages }) => ({
    chatName: chat.name || 'Unknown Contact',
    chatId: chat.id?.user || '',
    isGroup: chat.isGroup || false,
    unreadCount: chat.unreadCount || 0,
    lastActivity: chat.timestamp || 0,
    messages: messages.map(msg => ({
      id: msg.id?._serialized || '',
      body: msg.body || '',
      from: msg.from || '',
      timestamp: msg.timestamp || 0,
      fromMe: msg.fromMe || false
    }))
  }));
}

// Helper function to extract JSON from response (handles markdown formatting)
function extractJSON(text: string): any {
  // Try to parse as-is first
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    // If that fails, try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        throw new Error('Invalid JSON in code block');
      }
    }
    
    // Try to find JSON object boundaries
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      } catch (e) {
        throw new Error('Could not extract valid JSON from response');
      }
    }
    
    throw new Error('No valid JSON found in response');
  }
}

// Generate AI brief using Groq
export async function generateWhatsAppBrief(chatData: ChatWithMessages[]): Promise<WhatsAppBrief> {
  const currentTime = new Date();
  const totalUnread = chatData.reduce((sum, chat) => sum + chat.unreadCount, 0);

  // Prepare context for AI
  const context = {
    currentTime: currentTime.toISOString(),
    totalChats: chatData.length,
    totalUnread,
    chats: chatData.map(chat => ({
      name: chat.chatName,
      type: chat.isGroup ? 'group' : 'individual',
      unreadCount: chat.unreadCount,
      lastActivity: new Date(chat.lastActivity * 1000).toISOString(),
      recentMessages: chat.messages.slice(0, 10).map(msg => ({
        content: msg.body,
        from: msg.fromMe ? 'me' : (chat.isGroup ? 'group_member' : 'contact'),
        timestamp: new Date(msg.timestamp * 1000).toISOString(),
        isFromMe: msg.fromMe
      }))
    }))
  };

  const prompt = `You are an AI assistant that analyzes WhatsApp activity to create concise, actionable briefs. 

Current time: ${currentTime.toLocaleString()}

WHATSAPP DATA:
${JSON.stringify(context, null, 2)}

Please analyze this WhatsApp data and create a brief that includes:

1. **SUMMARY**: A 2-3 sentence overview of current WhatsApp activity
2. **NEEDS ATTENTION**: List specific items that require immediate action or response (be specific about who and what)
3. **CAN IGNORE**: List items that are low priority or informational only
4. **KEY INSIGHTS**: Any patterns or important context (time-sensitive messages, group activity, etc.)

Guidelines:
- Be concise but specific 
- Focus on actionable insights
- Identify time-sensitive matters
- Distinguish between urgent vs casual conversations
- Consider message recency and sender importance
- For group chats, note if there's relevant discussion
- If someone is trying to reach me multiple times, highlight that
- Consider context clues (words like "urgent", "important", "please call", etc.)

CRITICAL: Your response must be ONLY a valid JSON object. Do not include any markdown formatting, explanations, or code blocks. Return only the raw JSON with these exact fields:
- summary: string
- urgentItems: string[] (specific actionable items)
- canIgnore: string[] (low priority items)
- keyInsights: string[] (important patterns or context)

Keep each item concise (1-2 sentences max).

Example format (return only the JSON, nothing else):
{"summary":"Your summary here","urgentItems":["Item 1","Item 2"],"canIgnore":["Item 1"],"keyInsights":["Insight 1"]}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response using robust extraction
    const briefData = extractJSON(response);
    
    return {
      summary: briefData.summary || 'No summary available',
      urgentItems: briefData.urgentItems || [],
      canIgnore: briefData.canIgnore || [],
      totalUnread,
      generatedAt: currentTime.toISOString()
    };
  } catch (error) {
    console.error('Error generating AI brief:', error);
    throw new Error(`Failed to generate brief: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 