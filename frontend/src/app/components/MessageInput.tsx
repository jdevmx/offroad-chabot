'use client';

import { useState } from 'react';

type MessageInputProps = {
  onSend: (text: string) => void;
  disabled: boolean;
};

export default function MessageInput({ onSend, disabled }: MessageInputProps): React.JSX.Element {
  const [value, setValue] = useState('');

  function handleSubmit(): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex gap-2 border-t border-gray-200 p-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
        aria-label="Message input"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled}
        className="rounded bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
}
