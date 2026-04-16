import { Router, Request, Response } from 'express';

const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok' });
});

export { healthRouter };
