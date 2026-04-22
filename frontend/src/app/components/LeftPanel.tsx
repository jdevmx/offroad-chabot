'use client';

import { useState, useEffect } from 'react';
import RegisterForm from './RegisterForm';
import LoginForm from './LoginForm';
import UserInfo from './UserInfo';
import ProfileView from './ProfileView';
import { logout as defaultLogout } from '../services/auth.service';
import { subscribe as subscribeToStore, getSession } from '../lib/authStore';

type AuthUser = { uid: string; displayName: string | null };
type View = 'login' | 'register';
type AuthedView = 'info' | 'profile';

type LeftPanelProps = {
  subscribeToAuth?: (callback: (user: AuthUser | null) => void) => () => void;
  logout?: () => Promise<void>;
};

function defaultSubscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  callback(getSession());
  return subscribeToStore(callback);
}

export default function LeftPanel({
  subscribeToAuth = defaultSubscribeToAuth,
  logout = defaultLogout,
}: LeftPanelProps): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [view, setView] = useState<View>('login');
  const [authedView, setAuthedView] = useState<AuthedView>('info');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
      if (!authUser) setAuthedView('info');
    });
    return unsubscribe;
  }, [subscribeToAuth]);

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (user === undefined) {
    return (
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto" />
    );
  }

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto">
      {user !== null ? (
        authedView === 'profile' ? (
          <ProfileView onBack={() => setAuthedView('info')} />
        ) : (
          <UserInfo
            displayName={user.displayName}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
            onViewProfile={() => setAuthedView('profile')}
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              className={`flex-1 rounded border px-3 py-2 text-sm ${view === 'login' ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-300'}`}
              onClick={() => setView('login')}
            >
              Log in
            </button>
            <button
              className={`flex-1 rounded border px-3 py-2 text-sm ${view === 'register' ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-300'}`}
              onClick={() => setView('register')}
            >
              Register
            </button>
          </div>
          {view === 'login' ? (
            <LoginForm />
          ) : (
            <RegisterForm />
          )}
        </div>
      )}
    </aside>
  );
}
