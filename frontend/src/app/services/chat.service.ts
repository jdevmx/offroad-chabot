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

export async function sendMessage(
  payload: SendMessagePayload,
  onStatus: (text: string) => void = () => {},
): Promise<SendMessageResult> {
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

  const body = response.body;
  if (!body) {
    throw new Error('Response body is null');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const line = part.startsWith('data: ') ? part.slice(6) : part;
      if (!line.trim()) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (event.type === 'status' && typeof event.text === 'string') {
        onStatus(event.text);
      } else if (event.type === 'message') {
        return {
          message: event.message as string,
          conversationId: event.conversationId as string,
        };
      } else if (event.type === 'error') {
        throw new Error(typeof event.message === 'string' ? event.message : 'Stream error');
      }
    }
  }

  throw new Error('Stream ended without a message');
}

export type LoadHistoryResult = {
  conversationId: string | null;
  turns: ConversationTurn[];
};

export async function loadHistory(token: string): Promise<LoadHistoryResult> {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `History request failed with status ${response.status}`);
  }
  return response.json() as Promise<LoadHistoryResult>;
}
