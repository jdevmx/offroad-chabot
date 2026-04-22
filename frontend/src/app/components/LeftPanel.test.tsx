import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LeftPanel from './LeftPanel';

type AuthUser = { uid: string; displayName: string | null };

function makeSubscribe(user: AuthUser | null) {
  return (callback: (user: AuthUser | null) => void): (() => void) => {
    callback(user);
    return () => {};
  };
}

function noOpLogout(): Promise<void> {
  return Promise.resolve();
}

describe('LeftPanel', () => {
  describe('unauthenticated state', () => {
    it('shows Login and Register toggle buttons', async () => {
      render(<LeftPanel subscribeToAuth={makeSubscribe(null)} logout={noOpLogout} />);

      await waitFor(() => {
        // The toggle nav has two buttons; LoginForm also has a "Log in" submit, so we check for multiple
        const loginButtons = screen.getAllByRole('button', { name: /log in/i });
        expect(loginButtons.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
      });
    });

    it('renders LoginForm by default', async () => {
      render(<LeftPanel subscribeToAuth={makeSubscribe(null)} logout={noOpLogout} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/pin/i)).toBeInTheDocument();
      });
    });

    it('switches to RegisterForm when Register is clicked', async () => {
      render(<LeftPanel subscribeToAuth={makeSubscribe(null)} logout={noOpLogout} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        // RegisterForm renders a heading "Create account"
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });
    });

    it('switches back to LoginForm when Log in toggle is clicked', async () => {
      render(<LeftPanel subscribeToAuth={makeSubscribe(null)} logout={noOpLogout} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
      });

      // Switch to register
      fireEvent.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      });

      // Switch back to login — the toggle "Log in" is the first one in DOM
      const loginToggle = screen.getAllByRole('button', { name: /log in/i })[0];
      fireEvent.click(loginToggle);

      await waitFor(() => {
        expect(screen.getByLabelText(/pin/i)).toBeInTheDocument();
      });
    });
  });

  describe('authenticated state', () => {
    it('shows UserInfo with displayName when signed in', async () => {
      const user: AuthUser = { uid: 'u1', displayName: 'TrailRider' };
      render(<LeftPanel subscribeToAuth={makeSubscribe(user)} logout={noOpLogout} />);

      await waitFor(() => {
        expect(screen.getByText('TrailRider')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
      });
    });

    it('does not show Register toggle button when signed in', async () => {
      const user: AuthUser = { uid: 'u1', displayName: 'TrailRider' };
      render(<LeftPanel subscribeToAuth={makeSubscribe(user)} logout={noOpLogout} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
      });
    });

    it('calls logout when Log out is clicked', async () => {
      const user: AuthUser = { uid: 'u1', displayName: 'TrailRider' };
      let logoutCalled = false;
      const fakeLogout = async (): Promise<void> => {
        logoutCalled = true;
      };

      render(<LeftPanel subscribeToAuth={makeSubscribe(user)} logout={fakeLogout} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /log out/i }));
      });

      expect(logoutCalled).toBe(true);
    });
  });

  describe('auth state transitions', () => {
    it('switches from auth forms to UserInfo when user signs in', async () => {
      let authCallback: ((user: AuthUser | null) => void) | null = null;
      const subscribe = (callback: (user: AuthUser | null) => void): (() => void) => {
        authCallback = callback;
        callback(null);
        return () => {};
      };

      render(<LeftPanel subscribeToAuth={subscribe} logout={noOpLogout} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
      });

      act(() => {
        authCallback!({ uid: 'u1', displayName: 'TrailRider' });
      });

      await waitFor(() => {
        expect(screen.getByText('TrailRider')).toBeInTheDocument();
      });
    });

    it('switches from UserInfo back to auth forms when user signs out', async () => {
      let authCallback: ((user: AuthUser | null) => void) | null = null;
      const subscribe = (callback: (user: AuthUser | null) => void): (() => void) => {
        authCallback = callback;
        callback({ uid: 'u1', displayName: 'TrailRider' });
        return () => {};
      };

      render(<LeftPanel subscribeToAuth={subscribe} logout={noOpLogout} />);

      await waitFor(() => {
        expect(screen.getByText('TrailRider')).toBeInTheDocument();
      });

      act(() => {
        authCallback!(null);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
      });
    });
  });
});
