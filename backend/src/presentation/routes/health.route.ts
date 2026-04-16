import { Router, Request, Response } from 'express';
import { Firestore } from 'firebase-admin/firestore';

export function createHealthRouter(db: Firestore): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
      await db.listCollections();
      res.status(200).json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', database: 'error' });
    }
  });

  return router;
}
