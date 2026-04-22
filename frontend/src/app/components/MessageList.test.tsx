import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageList from './MessageList';
import type { ChatMessage } from '../services/chat.service';

const userMsg: ChatMessage = { role: 'user', content: 'What tires for sand?' };
const botMsg: ChatMessage = { role: 'assistant', content: 'Go with low-pressure wide tires.' };

describe('MessageList', () => {
  describe('rendering messages', () => {
    it('renders all messages', () => {
      render(<MessageList messages={[userMsg, botMsg]} />);

      expect(screen.getByText('What tires for sand?')).toBeInTheDocument();
      expect(screen.getByText('Go with low-pressure wide tires.')).toBeInTheDocument();
    });

    it('renders correct number of message bubbles', () => {
      render(<MessageList messages={[userMsg, botMsg]} />);

      expect(screen.getAllByText(/.+/).length).toBeGreaterThanOrEqual(2);
    });

    it('renders empty list without errors', () => {
      render(<MessageList messages={[]} />);

      expect(screen.queryByText(/bot is/i)).not.toBeInTheDocument();
    });
  });

  describe('status indicator', () => {
    it('shows thinking indicator when statusText is set', () => {
      render(<MessageList messages={[]} statusText="Bot is thinking…" />);

      expect(screen.getByText('Bot is thinking…')).toBeInTheDocument();
    });

    it('shows searching indicator when statusText indicates searching', () => {
      render(<MessageList messages={[]} statusText="Bot is searching the web…" />);

      expect(screen.getByText('Bot is searching the web…')).toBeInTheDocument();
    });

    it('hides status indicator when statusText is null', () => {
      render(<MessageList messages={[]} statusText={null} />);

      expect(screen.queryByText(/bot is/i)).not.toBeInTheDocument();
    });

    it('hides status indicator when statusText is not provided', () => {
      render(<MessageList messages={[]} />);

      expect(screen.queryByText(/bot is/i)).not.toBeInTheDocument();
    });
  });

  describe('Markdown rendering', () => {
    it('renders **bold** in assistant message as a <strong> element', () => {
      const msg: ChatMessage = { role: 'assistant', content: '**bold**' };
      const { container } = render(<MessageList messages={[msg]} />);

      expect(container.querySelector('strong')).not.toBeNull();
      expect(container.querySelector('strong')?.textContent).toBe('bold');
    });

    it('renders *italic* in assistant message as an <em> element', () => {
      const msg: ChatMessage = { role: 'assistant', content: '*italic*' };
      const { container } = render(<MessageList messages={[msg]} />);

      expect(container.querySelector('em')).not.toBeNull();
      expect(container.querySelector('em')?.textContent).toBe('italic');
    });

    it('renders `code` in assistant message as a <code> element', () => {
      const msg: ChatMessage = { role: 'assistant', content: '`code`' };
      const { container } = render(<MessageList messages={[msg]} />);

      expect(container.querySelector('code')).not.toBeNull();
      expect(container.querySelector('code')?.textContent).toBe('code');
    });

    it('renders a fenced code block in assistant message as a <pre> element', () => {
      const msg: ChatMessage = { role: 'assistant', content: '```\nblock\n```' };
      const { container } = render(<MessageList messages={[msg]} />);

      expect(container.querySelector('pre')).not.toBeNull();
    });

    it('renders - item in assistant message as an <li> element', () => {
      const msg: ChatMessage = { role: 'assistant', content: '- item' };
      const { container } = render(<MessageList messages={[msg]} />);

      expect(container.querySelector('li')).not.toBeNull();
      expect(container.querySelector('li')?.textContent).toBe('item');
    });

    it('renders **bold** in user message as literal text, not a <strong> element', () => {
      const msg: ChatMessage = { role: 'user', content: '**bold**' };
      const { container } = render(<MessageList messages={[msg]} />);

      expect(container.querySelector('strong')).toBeNull();
      expect(screen.getByText('**bold**')).toBeInTheDocument();
    });

    it('does not render <script> tags from assistant message content (XSS safety)', () => {
      const msg: ChatMessage = { role: 'assistant', content: '<script>alert(1)</script>' };
      const { container } = render(<MessageList messages={[msg]} />);

      expect(container.querySelector('script')).toBeNull();
    });
  });
});
