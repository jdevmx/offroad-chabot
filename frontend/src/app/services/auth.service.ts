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

export async function register(_payload: RegisterPayload): Promise<AuthResult> {
  throw new Error('not implemented');
}

export async function login(_payload: LoginPayload): Promise<AuthResult> {
  throw new Error('not implemented');
}

export async function logout(): Promise<void> {
  throw new Error('not implemented');
}

export async function checkUsername(_username: string): Promise<{ available: boolean }> {
  throw new Error('not implemented');
}
