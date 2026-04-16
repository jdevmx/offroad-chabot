'use client';

export default function MessageInput(): React.JSX.Element {
  return (
    <div className="flex gap-2 border-t border-gray-200 p-3">
      <input
        type="text"
        placeholder="Type a message..."
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        aria-label="Message input"
      />
      <button
        type="button"
        className="rounded bg-gray-800 px-4 py-2 text-sm text-white"
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
}
