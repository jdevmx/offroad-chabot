export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type SendMessagePayload = {
  message: string;
  userId?: string;
  conversationId?: string;
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

export async function sendMessage(_payload: SendMessagePayload): Promise<SendMessageResult> {
  throw new Error('not implemented');
}

export async function loadHistory(_conversationId: string): Promise<ConversationTurn[]> {
  throw new Error('not implemented');
}
