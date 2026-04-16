import express, { Application } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.route';

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter);

  return app;
}
