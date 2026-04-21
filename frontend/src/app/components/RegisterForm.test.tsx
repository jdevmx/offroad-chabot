import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RegisterForm from './RegisterForm';
import type { RegisterPayload } from '../services/auth.service';

// Fake implementations — no vi.fn/vi.mock

function makeCheckUsername(available: boolean) {
  return async (_username: string): Promise<{ available: boolean }> => {
    return { available };
  };
}

function makeRegister(result: { token: string; userId: string } | Error) {
  return async (_payload: RegisterPayload): Promise<{ token: string; userId: string }> => {
    if (result instanceof Error) throw result;
    return result;
  };
}

async function noOpSignIn(_token: string): Promise<void> {
  // no-op — avoids real Firebase auth in tests
}

// Firebase sign-in is injected via prop so no Firebase module is loaded in tests.

function fillRequiredFields(): void {
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
  fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '1234' } });
  fireEvent.change(screen.getByLabelText(/make/i), { target: { value: 'Toyota' } });
  fireEvent.change(screen.getByLabelText(/model/i), { target: { value: 'Land Cruiser' } });
  fireEvent.change(screen.getByLabelText(/year/i), { target: { value: '2020' } });
  fireEvent.change(screen.getByLabelText(/experience level/i), { target: { value: 'beginner' } });
}

describe('RegisterForm', () => {
  beforeEach(() => {
    // no-op
  });

  afterEach(() => {
    // nothing to clean up
  });

  describe('renders all required fields', () => {
    it('renders account fields', () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pin/i)).toBeInTheDocument();
    });

    it('renders vehicle fields', () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );
      expect(screen.getByLabelText(/make/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/trim/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/modifications/i)).toBeInTheDocument();
    });

    it('renders terrain checkboxes and experience select', () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );
      for (const terrain of ['sand', 'mud', 'rock', 'trail', 'snow']) {
        expect(screen.getByLabelText(terrain)).toBeInTheDocument();
      }
      expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument();
    });
  });

  describe('username availability check', () => {
    it('shows "checking" status when user starts typing', async () => {
      // This check never resolves so the "checking" status stays on screen
      // while the debounce timeout is pending.
      const neverResolveCheck = (_u: string): Promise<{ available: boolean }> =>
        new Promise(() => {
          // intentionally never resolves for this test
        });

      render(
        <RegisterForm
          checkUsername={neverResolveCheck}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );

      act(() => {
        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'abc' } });
      });

      // "checking" is shown synchronously when username changes (before debounce fires)
      await waitFor(() => {
        expect(screen.getByText(/checking/i)).toBeInTheDocument();
      });
    });

    it('shows "available" when username is free', async () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );

      act(() => {
        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'freeuser' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/available/i)).toBeInTheDocument();
      });
    });

    it('shows "taken" when username is not available', async () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(false)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );

      act(() => {
        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'takenuser' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/taken/i)).toBeInTheDocument();
      });
    });
  });

  describe('form validation on submit', () => {
    it('shows error for missing username without calling register', async () => {
      let registerCalled = false;
      const trackRegister = async (_p: RegisterPayload): Promise<{ token: string; userId: string }> => {
        registerCalled = true;
        return { token: 't', userId: 'u' };
      };

      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={trackRegister}
          signIn={noOpSignIn}
        />
      );

      // Fill everything except username
      fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '1234' } });
      fireEvent.change(screen.getByLabelText(/make/i), { target: { value: 'Toyota' } });
      fireEvent.change(screen.getByLabelText(/model/i), { target: { value: 'FJ' } });
      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: '2020' } });
      fireEvent.change(screen.getByLabelText(/experience level/i), { target: { value: 'beginner' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);
      });

      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(registerCalled).toBe(false);
    });

    it('shows error for missing required vehicle fields', async () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);
      });

      expect(screen.getByText(/make is required/i)).toBeInTheDocument();
      expect(screen.getByText(/model is required/i)).toBeInTheDocument();
      expect(screen.getByText(/year is required/i)).toBeInTheDocument();
    });

    it('shows error when experience level is not selected', async () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );

      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
      fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '1234' } });
      fireEvent.change(screen.getByLabelText(/make/i), { target: { value: 'Ford' } });
      fireEvent.change(screen.getByLabelText(/model/i), { target: { value: 'Bronco' } });
      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: '2022' } });
      // intentionally do not select experience

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);
      });

      expect(screen.getByText(/experience level is required/i)).toBeInTheDocument();
    });
  });

  describe('PIN field validation', () => {
    it('shows error when PIN is not exactly 4 digits', async () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );

      fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
      fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'User' } });
      fireEvent.change(screen.getByLabelText(/pin/i), { target: { value: '12' } }); // only 2 digits
      fireEvent.change(screen.getByLabelText(/make/i), { target: { value: 'Ford' } });
      fireEvent.change(screen.getByLabelText(/model/i), { target: { value: 'Bronco' } });
      fireEvent.change(screen.getByLabelText(/year/i), { target: { value: '2022' } });
      fireEvent.change(screen.getByLabelText(/experience level/i), { target: { value: 'expert' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);
      });

      expect(screen.getByText(/pin must be exactly 4 digits/i)).toBeInTheDocument();
    });

    it('PIN field has maxLength of 4 and type password', () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('not called'))}
          signIn={noOpSignIn}
        />
      );
      const pinInput = screen.getByLabelText(/pin/i);
      expect(pinInput).toHaveAttribute('type', 'password');
      expect(pinInput).toHaveAttribute('maxLength', '4');
    });
  });

  describe('error on failed registration', () => {
    it('displays error message when register call throws', async () => {
      render(
        <RegisterForm
          checkUsername={makeCheckUsername(true)}
          register={makeRegister(new Error('Username already exists'))}
          signIn={noOpSignIn}
        />
      );

      fillRequiredFields();

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/username already exists/i);
      });
    });
  });
});
