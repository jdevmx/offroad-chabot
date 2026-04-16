import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Firestore } from 'firebase-admin/firestore';
import { createApp } from '../app';

class NullFirestore {
  private readonly shouldFail: boolean;

  private constructor(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }

  static ok(): Firestore {
    return new NullFirestore(false) as unknown as Firestore;
  }

  static failing(): Firestore {
    return new NullFirestore(true) as unknown as Firestore;
  }

  listCollections(): Promise<[]> {
    if (this.shouldFail) {
      return Promise.reject(new Error('Firestore unavailable'));
    }
    return Promise.resolve([]);
  }
}

describe('GET /health', () => {
  it('returns 200 with database ok when Firestore is reachable', async () => {
    const app = createApp(NullFirestore.ok());

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'ok' });
  });

  it('returns 503 with database error when Firestore is unreachable', async () => {
    const app = createApp(NullFirestore.failing());

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', database: 'error' });
  });
});
