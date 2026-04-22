import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageInput from './MessageInput';

describe('MessageInput', () => {
  describe('submit behavior', () => {
    it('calls onSend with the trimmed input text when Send is clicked', () => {
      const sent: string[] = [];
      render(<MessageInput onSend={(text) => sent.push(text)} disabled={false} />);

      fireEvent.change(screen.getByLabelText(/message input/i), { target: { value: '  hello  ' } });
      fireEvent.click(screen.getByRole('button', { name: /send message/i }));

      expect(sent).toEqual(['hello']);
    });

    it('calls onSend when Enter key is pressed', () => {
      const sent: string[] = [];
      render(<MessageInput onSend={(text) => sent.push(text)} disabled={false} />);

      const input = screen.getByLabelText(/message input/i);
      fireEvent.change(input, { target: { value: 'trail tip' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(sent).toEqual(['trail tip']);
    });

    it('clears the input after submit', () => {
      render(<MessageInput onSend={() => {}} disabled={false} />);

      const input = screen.getByLabelText(/message input/i);
      fireEvent.change(input, { target: { value: 'hello' } });
      fireEvent.click(screen.getByRole('button', { name: /send message/i }));

      expect(input).toHaveValue('');
    });

    it('does not call onSend when input is blank', () => {
      const sent: string[] = [];
      render(<MessageInput onSend={(text) => sent.push(text)} disabled={false} />);

      fireEvent.click(screen.getByRole('button', { name: /send message/i }));

      expect(sent).toHaveLength(0);
    });
  });

  describe('disabled state', () => {
    it('disables the input and button when disabled prop is true', () => {
      render(<MessageInput onSend={() => {}} disabled={true} />);

      expect(screen.getByLabelText(/message input/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
    });

    it('does not disable input or button when disabled prop is false', () => {
      render(<MessageInput onSend={() => {}} disabled={false} />);

      expect(screen.getByLabelText(/message input/i)).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled();
    });
  });
});
