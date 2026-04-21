import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { Firestore } from 'firebase-admin/firestore';
import { createHealthRouter } from './routes/health.route';
import authRouter from './routes/auth.route';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors';

export function createApp(db: Firestore): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', createHealthRouter(db));
  app.use('/auth', authRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(401).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
