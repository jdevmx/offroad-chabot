'use client';

import { useState, useRef, useEffect } from 'react';
import { login as defaultLogin, type LoginPayload, type AuthResult } from '../services/auth.service';

type LoginFormProps = {
  onLoginSuccess?: () => void;
  login?: (payload: LoginPayload) => Promise<AuthResult>;
};

export default function LoginForm({
  onLoginSuccess,
  login = defaultLogin,
}: LoginFormProps): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      await login({ username, pin });
      onLoginSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">Log in</h2>

      <div>
        <label htmlFor="username" className="block text-sm">
          Username
        </label>
        <input
          id="username"
          ref={usernameRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
          aria-label="Username"
        />
      </div>

      <div>
        <label htmlFor="pin" className="block text-sm">
          PIN (4 digits)
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          disabled={isLoading}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
          aria-label="PIN"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {isLoading ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
