'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import type { ChatMessage } from '../services/chat.service';

type MessageListProps = {
  messages: ChatMessage[];
  statusText?: string | null;
};

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className="font-mono text-xs">{children}</code>;
    }
    return <code className="font-mono bg-gray-200 rounded px-1 text-xs">{children}</code>;
  },
  pre: ({ children }) => <pre className="bg-gray-200 rounded p-2 overflow-x-auto my-2">{children}</pre>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  h1: ({ children }) => <h1 className="font-bold text-lg">{children}</h1>,
  h2: ({ children }) => <h2 className="font-bold text-base">{children}</h2>,
  h3: ({ children }) => <h3 className="font-bold text-sm">{children}</h3>,
};

export default function MessageList({ messages, statusText = null }: MessageListProps): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, statusText]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {msg.role === 'assistant' ? (
              <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={markdownComponents}>
                {msg.content}
              </ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        </div>
      ))}
      {statusText && (
        <div className="flex justify-start">
          <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-500 italic">
            {statusText}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
