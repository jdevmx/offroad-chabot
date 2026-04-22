import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { Firestore } from 'firebase-admin/firestore';
import { createHealthRouter } from './routes/health.route';
import { createAuthRouter } from './routes/auth.route';
import { createChatRouter } from './routes/chat.route';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors';

export function createApp(db: Firestore): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', createHealthRouter(db));
  app.use('/auth', createAuthRouter());
  app.use('/chat', createChatRouter());

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      console.warn(`[${req.method} ${req.path}] Validation error: ${err.message}`);
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      console.warn(`[${req.method} ${req.path}] Conflict error: ${err.message}`);
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof NotFoundError) {
      console.warn(`[${req.method} ${req.path}] Not found error: ${err.message}`);
      res.status(401).json({ error: err.message });
      return;
    }
    const grpcCode = (err as { code?: number }).code;
    if (grpcCode === 5) {
      console.error(
        `[${req.method} ${req.path}] Firestore NOT_FOUND (gRPC 5): The Firestore database does not exist or is unreachable. ` +
        `Check that Firestore is enabled in the Firebase console for project "${process.env.FIREBASE_PROJECT_ID}". ` +
        `If using a named database, set FIREBASE_DATABASE_ID in your .env.`,
        err,
      );
    } else {
      console.error(`[${req.method} ${req.path}] Unhandled error:`, err);
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
