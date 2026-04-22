'use client';

import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { sendMessage, loadHistory } from '../services/chat.service';
import type { ChatMessage, ConversationTurn, LoadHistoryResult } from '../services/chat.service';
import { subscribe as subscribeToStore, getSession } from '../lib/authStore';

type AuthUser = {
  uid: string;
  token: string;
};

type ChatAreaProps = {
  subscribeToAuth?: (callback: (user: AuthUser | null) => void) => () => void;
};

function defaultSubscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  const session = getSession();
  callback(session ? { uid: session.uid, token: session.token } : null);
  return subscribeToStore((s) => callback(s ? { uid: s.uid, token: s.token } : null));
}

function turnsToMessages(turns: ConversationTurn[]): ChatMessage[] {
  return turns.flatMap((turn) => [
    { role: 'user' as const, content: turn.userMessage },
    { role: 'assistant' as const, content: turn.assistantMessage },
  ]);
}

export default function ChatArea({
  subscribeToAuth = defaultSubscribeToAuth,
}: ChatAreaProps): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
    });
    return unsubscribe;
  }, [subscribeToAuth]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setConversationId(undefined);
      return;
    }

    async function fetchHistory(): Promise<void> {
      try {
        const result: LoadHistoryResult = await loadHistory(user!.token);
        if (result.conversationId) {
          setConversationId(result.conversationId);
        }
        setMessages(turnsToMessages(result.turns));
      } catch {
        // history load failure is non-fatal — start with empty chat
      }
    }

    fetchHistory();
  }, [user]);

  async function handleSend(text: string): Promise<void> {
    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setStatus('thinking');

    try {
      const token = user?.token;

      const result = await sendMessage(
        {
          message: text,
          userId: user?.uid,
          conversationId,
          token,
        },
        (s) => setStatus(s),
      );

      if (result.conversationId) {
        setConversationId(result.conversationId);
      }

      const botMessage: ChatMessage = { role: 'assistant', content: result.message };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setStatus(null);
    }
  }

  return (
    <section className="flex flex-1 flex-col">
      <MessageList messages={messages} statusText={status === 'searching' ? 'Bot is searching the web…' : status ? 'Bot is thinking…' : null} />
      {error && (
        <div role="alert" className="mx-4 mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <MessageInput onSend={handleSend} disabled={status !== null} />
    </section>
  );
}
