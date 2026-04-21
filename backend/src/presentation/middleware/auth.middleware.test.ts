import type { NextFunction, Response } from 'express';
import { describe, expect, it } from 'vitest';
import type { AuthenticatedRequest } from './auth.middleware';
import { verifyToken } from './auth.middleware';

class FakeResponse {
  statusCode = 0;
  body: unknown = null;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(data: unknown): this {
    this.body = data;
    return this;
  }
}

class FakeNext {
  called = false;

  fn(): NextFunction {
    return () => {
      this.called = true;
    };
  }
}

function makeReq(authHeader?: string): AuthenticatedRequest {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as AuthenticatedRequest;
}

const fakeVerifierOk = async (_token: string) => ({ uid: 'user-123' });
const fakeVerifierFail = async (_token: string): Promise<{ uid: string }> => {
  throw new Error('Token expired');
};

describe('verifyToken middleware — required mode', () => {
  it('calls next and sets req.user when token is valid', async () => {
    const req = makeReq('Bearer valid-token');
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: true }, fakeVerifierOk)(req, res as unknown as Response, nextFn.fn());

    expect(nextFn.called).toBe(true);
    expect(req.user).toEqual({ uid: 'user-123' });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = makeReq();
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: true }, fakeVerifierOk)(req, res as unknown as Response, nextFn.fn());

    expect(res.statusCode).toBe(401);
    expect(nextFn.called).toBe(false);
  });

  it('returns 401 when Authorization header has wrong format', async () => {
    const req = makeReq('Basic some-credentials');
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: true }, fakeVerifierOk)(req, res as unknown as Response, nextFn.fn());

    expect(res.statusCode).toBe(401);
    expect(nextFn.called).toBe(false);
  });

  it('returns 401 when token is invalid', async () => {
    const req = makeReq('Bearer bad-token');
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: true }, fakeVerifierFail)(req, res as unknown as Response, nextFn.fn());

    expect(res.statusCode).toBe(401);
    expect(nextFn.called).toBe(false);
  });

  it('returns the correct error shape on 401', async () => {
    const req = makeReq();
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: true }, fakeVerifierOk)(req, res as unknown as Response, nextFn.fn());

    expect(res.body).toEqual({
      success: false,
      error: { message: 'Unauthorized: Missing or invalid token', code: 'AUTH_ERROR' },
    });
  });
});

describe('verifyToken middleware — optional mode', () => {
  it('calls next and sets req.user when token is valid', async () => {
    const req = makeReq('Bearer valid-token');
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: false }, fakeVerifierOk)(req, res as unknown as Response, nextFn.fn());

    expect(nextFn.called).toBe(true);
    expect(req.user).toEqual({ uid: 'user-123' });
  });

  it('calls next without setting req.user when header is missing', async () => {
    const req = makeReq();
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: false }, fakeVerifierOk)(req, res as unknown as Response, nextFn.fn());

    expect(nextFn.called).toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('calls next without setting req.user when token is invalid', async () => {
    const req = makeReq('Bearer bad-token');
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: false }, fakeVerifierFail)(req, res as unknown as Response, nextFn.fn());

    expect(nextFn.called).toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('calls next without setting req.user when header format is wrong', async () => {
    const req = makeReq('Basic credentials');
    const res = new FakeResponse();
    const nextFn = new FakeNext();

    await verifyToken({ required: false }, fakeVerifierOk)(req, res as unknown as Response, nextFn.fn());

    expect(nextFn.called).toBe(true);
    expect(req.user).toBeUndefined();
  });
});
