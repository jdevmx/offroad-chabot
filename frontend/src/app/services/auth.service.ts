export type RegisterPayload = {
  username: string;
  displayName: string;
  pin: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    trim?: string;
    modifications: string[];
  };
  preferences: {
    terrainTypes: string[];
    experience: 'beginner' | 'intermediate' | 'expert';
  };
};

export type LoginPayload = {
  username: string;
  pin: string;
};

export type AuthResult = {
  token: string;
  userId: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function checkUsername(username: string): Promise<{ available: boolean }> {
  const response = await fetch(`${BASE_URL}/auth/check-username?username=${encodeURIComponent(username)}`);
  if (!response.ok) {
    throw new Error(`Unexpected status ${response.status}`);
  }
  return response.json() as Promise<{ available: boolean }>;
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Registration failed with status ${response.status}`);
  }
  return response.json() as Promise<AuthResult>;
}

export async function login(_payload: LoginPayload): Promise<AuthResult> {
  throw new Error('not implemented');
}

export async function logout(): Promise<void> {
  throw new Error('not implemented');
}
