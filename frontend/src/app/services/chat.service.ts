export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type SendMessagePayload = {
  message: string;
  userId?: string;
  conversationId?: string;
  token?: string;
};

export type SendMessageResult = {
  message: string;
  conversationId: string;
};

export type ConversationTurn = {
  userMessage: string;
  assistantMessage: string;
  timestamp: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function sendMessage(payload: SendMessagePayload): Promise<SendMessageResult> {
  const { message, userId, conversationId, token } = payload;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, userId, conversationId }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Chat request failed with status ${response.status}`);
  }
  return response.json() as Promise<SendMessageResult>;
}

export async function loadHistory(_conversationId: string): Promise<ConversationTurn[]> {
  return [];
}
