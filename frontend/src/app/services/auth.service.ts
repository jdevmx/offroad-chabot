import { setSession, clearSession, getToken } from '../lib/authStore';

export type Vehicle = {
  make: string;
  model: string;
  year: number;
  trim?: string;
  modifications: string[];
};

export type RegisterPayload = {
  username: string;
  displayName: string;
  pin: string;
  vehicle: Vehicle;
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
  displayName: string;
};

export type UserProfile = {
  uid: string;
  username: string;
  displayName: string;
  vehicle: Vehicle;
  preferences: {
    terrainTypes: string[];
    experience: 'beginner' | 'intermediate' | 'expert';
  };
  createdAt: string;
  updatedAt: string;
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
  const result = await response.json() as AuthResult;
  setSession({ token: result.token, uid: result.userId, displayName: result.displayName });
  return result;
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Login failed with status ${response.status}`);
  }
  const result = await response.json() as AuthResult;
  setSession({ token: result.token, uid: result.userId, displayName: result.displayName });
  return result;
}

export async function logout(): Promise<void> {
  clearSession();
}

export async function getProfile(): Promise<UserProfile> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${BASE_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Failed to load profile: ${response.status}`);
  }
  return response.json() as Promise<UserProfile>;
}

export async function updateVehicle(modifications: string[]): Promise<UserProfile> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${BASE_URL}/auth/vehicle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ modifications }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Failed to update vehicle: ${response.status}`);
  }
  return response.json() as Promise<UserProfile>;
}
