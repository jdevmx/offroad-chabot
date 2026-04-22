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
    const mockApp = { firestore: vi.fn(() => ({})), auth: vi.fn(() => ({})) };
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

    const { getFirebaseAdmin } = await import('./firebaseAdmin');
    expect(() => getFirebaseAdmin()).toThrow('FIREBASE_PROJECT_ID');
  });

  it('uses ADC when FIREBASE_CLIENT_EMAIL is missing', async () => {
    setValidEnv();
    delete process.env.FIREBASE_CLIENT_EMAIL;

    const adcCredential = { type: 'adc' };
    const initializeApp = vi.fn(() => ({ auth: vi.fn() }));

    vi.doMock('firebase-admin', () => ({
      apps: [],
      initializeApp,
      credential: { cert: vi.fn(), applicationDefault: vi.fn(() => adcCredential) },
    }));

    const { getFirebaseAdmin } = await import('./firebaseAdmin');
    expect(getFirebaseAdmin()).toBeDefined();
    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ credential: adcCredential }),
    );
  });

  it('uses ADC when FIREBASE_PRIVATE_KEY is missing', async () => {
    setValidEnv();
    delete process.env.FIREBASE_PRIVATE_KEY;

    const adcCredential = { type: 'adc' };
    const initializeApp = vi.fn(() => ({ auth: vi.fn() }));

    vi.doMock('firebase-admin', () => ({
      apps: [],
      initializeApp,
      credential: { cert: vi.fn(), applicationDefault: vi.fn(() => adcCredential) },
    }));

    const { getFirebaseAdmin } = await import('./firebaseAdmin');
    expect(getFirebaseAdmin()).toBeDefined();
    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ credential: adcCredential }),
    );
  });

  it('throws only for missing FIREBASE_PROJECT_ID regardless of other vars', async () => {
    setValidEnv();
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_PRIVATE_KEY;

    vi.doMock('firebase-admin', () => ({
      apps: [],
      initializeApp: vi.fn(),
      credential: { cert: vi.fn(), applicationDefault: vi.fn() },
    }));

    const { getFirebaseAdmin } = await import('./firebaseAdmin');
    expect(() => getFirebaseAdmin()).toThrow('FIREBASE_PROJECT_ID');
  });

  it('does not call initializeApp when apps is already populated', async () => {
    setValidEnv();
    const existingApp = { firestore: vi.fn(() => ({})), auth: vi.fn(() => ({})) };
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
