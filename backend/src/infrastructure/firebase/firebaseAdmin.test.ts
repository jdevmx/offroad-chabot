import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_ENV = {
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----\\n',
};

describe('firebaseAdmin', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = savedEnv;
    vi.restoreAllMocks();
  });

  function setValidEnv(overrides: Partial<typeof VALID_ENV> = {}): void {
    Object.assign(process.env, { ...VALID_ENV, ...overrides });
  }

  function makeMock(appsInitial: unknown[] = []) {
    const mockApp = { firestore: vi.fn(() => ({})) };
    const apps = [...appsInitial];
    const initializeApp = vi.fn(() => {
      apps.push(mockApp);
      return mockApp;
    });
    const cert = vi.fn((creds: unknown) => creds);

    return { apps, initializeApp, cert, mockApp };
  }

  it('initializes successfully when all env vars are present', async () => {
    setValidEnv();
    const { apps, initializeApp, cert } = makeMock();

    vi.doMock('firebase-admin', () => ({
      apps,
      initializeApp,
      credential: { cert },
    }));

    const { getFirebaseAdmin } = await import('./firebaseAdmin');
    expect(getFirebaseAdmin()).toBeDefined();
    expect(initializeApp).toHaveBeenCalledOnce();
  });

  it('throws when FIREBASE_PROJECT_ID is missing', async () => {
    setValidEnv();
    delete process.env.FIREBASE_PROJECT_ID;

    vi.doMock('firebase-admin', () => ({
      apps: [],
      initializeApp: vi.fn(),
      credential: { cert: vi.fn() },
    }));

    await expect(import('./firebaseAdmin')).rejects.toThrow('FIREBASE_PROJECT_ID');
  });

  it('throws when FIREBASE_CLIENT_EMAIL is missing', async () => {
    setValidEnv();
    delete process.env.FIREBASE_CLIENT_EMAIL;

    vi.doMock('firebase-admin', () => ({
      apps: [],
      initializeApp: vi.fn(),
      credential: { cert: vi.fn() },
    }));

    await expect(import('./firebaseAdmin')).rejects.toThrow('FIREBASE_CLIENT_EMAIL');
  });

  it('throws when FIREBASE_PRIVATE_KEY is missing', async () => {
    setValidEnv();
    delete process.env.FIREBASE_PRIVATE_KEY;

    vi.doMock('firebase-admin', () => ({
      apps: [],
      initializeApp: vi.fn(),
      credential: { cert: vi.fn() },
    }));

    await expect(import('./firebaseAdmin')).rejects.toThrow('FIREBASE_PRIVATE_KEY');
  });

  it('throws listing all missing vars when multiple are absent', async () => {
    setValidEnv();
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_PRIVATE_KEY;

    vi.doMock('firebase-admin', () => ({
      apps: [],
      initializeApp: vi.fn(),
      credential: { cert: vi.fn() },
    }));

    await expect(import('./firebaseAdmin')).rejects.toThrow(
      /FIREBASE_PROJECT_ID.*FIREBASE_PRIVATE_KEY|FIREBASE_PRIVATE_KEY.*FIREBASE_PROJECT_ID/,
    );
  });

  it('does not call initializeApp when apps is already populated', async () => {
    setValidEnv();
    const existingApp = { firestore: vi.fn(() => ({})) };
    const apps = [existingApp];
    const initializeApp = vi.fn();
    const cert = vi.fn((creds: unknown) => creds);

    vi.doMock('firebase-admin', () => ({
      apps,
      initializeApp,
      credential: { cert },
    }));

    const { getFirebaseAdmin } = await import('./firebaseAdmin');
    expect(initializeApp).not.toHaveBeenCalled();
    expect(getFirebaseAdmin()).toBeDefined();
  });
});
