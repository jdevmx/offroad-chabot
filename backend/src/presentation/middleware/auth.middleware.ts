import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: { uid: string };
}

type TokenVerifier = (token: string) => Promise<{ uid: string }>;

function defaultVerifier(): TokenVerifier {
  return async (token) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    const payload = jwt.verify(token, secret) as { uid: string };
    return { uid: payload.uid };
  };
}

export function verifyToken(
  options: { required: boolean },
  verifier: TokenVerifier = defaultVerifier(),
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (options.required) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized: Missing or invalid token', code: 'AUTH_ERROR' },
        });
        return;
      }
      next();
      return;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await verifier(token);
      req.user = { uid: decoded.uid };
      next();
    } catch {
      if (options.required) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized: Missing or invalid token', code: 'AUTH_ERROR' },
        });
        return;
      }
      next();
    }
  };
}
