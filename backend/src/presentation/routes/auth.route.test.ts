import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Client, ClientData } from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { createAuthRouter } from './auth.route';

// ---------------------------------------------------------------------------
// Nullable repository
// ---------------------------------------------------------------------------

class NullableClientRepository implements IClientRepository {
  private readonly store: Map<string, Client> = new Map();

  seed(client: Client): void {
    this.store.set(client.uid, client);
  }

  async findByUid(uid: string): Promise<Client | null> {
    return this.store.get(uid) ?? null;
  }

  async findByUsername(username: string): Promise<Client | null> {
    for (const c of this.store.values()) {
      if (c.username === username) return c;
    }
    return null;
  }

  async save(client: Client): Promise<void> {
    this.store.set(client.uid, client);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClientData(overrides: Partial<ClientData> = {}): ClientData {
  return {
    uid: 'uid-test',
    username: 'trail_rider',
    displayName: 'Trail Rider',
    pinHash: 'secret-hash',
    vehicle: { make: 'Toyota', model: '4Runner', year: 2022, modifications: ['lift kit'] },
    preferences: { terrainTypes: ['rock'], experience: 'intermediate' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const fakeVerifier = async (_token: string) => ({ uid: 'uid-test' });
const rejectVerifier = async (_token: string): Promise<{ uid: string }> => {
  throw new Error('invalid token');
};

function makeApp(repo: IClientRepository, verifier?: (token: string) => Promise<{ uid: string }>) {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter(repo, verifier));
  return app;
}

// ---------------------------------------------------------------------------
// GET /auth/profile
// ---------------------------------------------------------------------------

describe('GET /auth/profile', () => {
  it('returns 200 with profile (excluding pinHash) for a valid token', async () => {
    const repo = new NullableClientRepository();
    repo.seed(new Client(makeClientData()));
    const app = makeApp(repo, fakeVerifier);

    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.uid).toBe('uid-test');
    expect(res.body.username).toBe('trail_rider');
    expect(res.body.vehicle.make).toBe('Toyota');
    expect(res.body.pinHash).toBeUndefined();
  });

  it('returns 404 when client does not exist in repository', async () => {
    const repo = new NullableClientRepository();
    const app = makeApp(repo, fakeVerifier);

    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const repo = new NullableClientRepository();
    const app = makeApp(repo, rejectVerifier);

    const res = await request(app).get('/auth/profile');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_ERROR');
  });

  it('returns 401 when token is invalid', async () => {
    const repo = new NullableClientRepository();
    const app = makeApp(repo, rejectVerifier);

    const res = await request(app)
      .get('/auth/profile')
      .set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_ERROR');
  });
});

// ---------------------------------------------------------------------------
// PATCH /auth/vehicle
// ---------------------------------------------------------------------------

describe('PATCH /auth/vehicle', () => {
  it('returns 200 with updated modifications', async () => {
    const repo = new NullableClientRepository();
    repo.seed(new Client(makeClientData()));
    const app = makeApp(repo, fakeVerifier);

    const res = await request(app)
      .patch('/auth/vehicle')
      .set('Authorization', 'Bearer valid-token')
      .send({ modifications: ['snorkel', 'ARB bumper'] });

    expect(res.status).toBe(200);
    expect(res.body.vehicle.modifications).toEqual(['snorkel', 'ARB bumper']);
    expect(res.body.pinHash).toBeUndefined();
  });

  it('persists the updated modifications to the repository', async () => {
    const repo = new NullableClientRepository();
    repo.seed(new Client(makeClientData()));
    const app = makeApp(repo, fakeVerifier);

    await request(app)
      .patch('/auth/vehicle')
      .set('Authorization', 'Bearer valid-token')
      .send({ modifications: ['winch'] });

    const saved = await repo.findByUid('uid-test');
    expect(saved?.vehicle.modifications).toEqual(['winch']);
  });

  it('returns 400 when modifications is not an array', async () => {
    const repo = new NullableClientRepository();
    repo.seed(new Client(makeClientData()));
    const app = makeApp(repo, fakeVerifier);

    const res = await request(app)
      .patch('/auth/vehicle')
      .set('Authorization', 'Bearer valid-token')
      .send({ modifications: 'snorkel' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when client does not exist', async () => {
    const repo = new NullableClientRepository();
    const app = makeApp(repo, fakeVerifier);

    const res = await request(app)
      .patch('/auth/vehicle')
      .set('Authorization', 'Bearer valid-token')
      .send({ modifications: [] });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const repo = new NullableClientRepository();
    const app = makeApp(repo, rejectVerifier);

    const res = await request(app)
      .patch('/auth/vehicle')
      .send({ modifications: [] });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_ERROR');
  });
});
