import express, { Application } from 'express';
import cors from 'cors';
import { Firestore } from 'firebase-admin/firestore';
import { createHealthRouter } from './routes/health.route';

export function createApp(db: Firestore): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', createHealthRouter(db));

  return app;
}
