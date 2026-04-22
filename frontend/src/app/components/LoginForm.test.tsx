import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LoginForm from './LoginForm';
import type { LoginPayload, AuthResult } from '../services/auth.service';

function makeLogin(result: AuthResult | Error) {
  return async (_payload: LoginPayload): Promise<AuthResult> => {
    if (result instanceof Error) throw result;
    return result;
  };
}

describe('LoginForm', () => {
  describe('renders all fields', () => {
    it('renders username and PIN inputs and submit button', () => {
      render(<LoginForm login={makeLogin(new Error('not called'))} />);
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pin/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('PIN input has type password and maxLength 4', () => {
      render(<LoginForm login={makeLogin(new Error('not called'))} />);
      const pinInput = screen.getByLabelText(/pin/i);
      expect(pinInput).toHaveAttribute('type', 'password');
      expect(pinInput).toHaveAttribute('maxLength', '4');
    });
  });

  describe('PIN validation', () => {
    it('shows error when PIN is not exactly 4 digits', async () => {
      render(<LoginForm login={makeLogin(new Error('not called'))} />);

      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'rider' } });
      fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '12' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);
      });

      expect(screen.getByRole('alert')).toHaveTextContent(/pin must be exactly 4 digits/i);
    });
  });

  describe('successful login', () => {
    it('calls login service and triggers onLoginSuccess', async () => {
      let successCalled = false;

      const fakeLogin = makeLogin({ token: 'tok123', userId: 'u1', displayName: 'Rider' });
      const fakeOnSuccess = (): void => {
        successCalled = true;
      };

      render(<LoginForm login={fakeLogin} onLoginSuccess={fakeOnSuccess} />);

      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'rider' } });
      fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '1234' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);
      });

      await waitFor(() => {
        expect(successCalled).toBe(true);
      });
    });
  });

  describe('error state', () => {
    it('displays error message when login call throws', async () => {
      render(<LoginForm login={makeLogin(new Error('Invalid credentials'))} />);

      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'rider' } });
      fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '9999' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i);
      });
    });
  });

  describe('loading state', () => {
    it('disables submit button while request is in flight', async () => {
      let resolve: ((v: AuthResult) => void) | null = null;
      const pendingLogin = (_p: LoginPayload): Promise<AuthResult> =>
        new Promise((res) => {
          resolve = res;
        });

      render(<LoginForm login={pendingLogin} />);

      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'rider' } });
      fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '1234' } });

      act(() => {
        fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);
      });

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
      });

      await act(async () => {
        resolve!({ token: 't', userId: 'u', displayName: 'User' });
      });
    });
  });
});
