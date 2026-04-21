import type { NextFunction, Request, Response } from 'express';
import { getAuth } from '../../infrastructure/firebase/firebaseAdmin';

export interface AuthenticatedRequest extends Request {
  user?: { uid: string };
}

type TokenVerifier = (token: string) => Promise<{ uid: string }>;

function defaultVerifier(): TokenVerifier {
  return (token) => getAuth().verifyIdToken(token);
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
