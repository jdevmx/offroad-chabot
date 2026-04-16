import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('GET /health', () => {
  const app = createApp();

  it('should return 200 with status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
