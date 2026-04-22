import { Router, Response, NextFunction } from 'express';
import { checkUsername, login, register } from '../controllers/auth.controller';
import { AuthenticatedRequest, verifyToken } from '../middleware/auth.middleware';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { FirestoreClientRepository } from '../../infrastructure/repositories/FirestoreClientRepository';
import { Client } from '../../domain/client/Client';
import { getFirestore } from '../../infrastructure/firebase/firebaseAdmin';

type TokenVerifier = (token: string) => Promise<{ uid: string }>;

export function createAuthRouter(
  clientRepo?: IClientRepository,
  tokenVerifier?: TokenVerifier,
): Router {
  const router = Router();

  function getRepo(): IClientRepository {
    return clientRepo ?? new FirestoreClientRepository(getFirestore());
  }

  const protect = (required: boolean) =>
    tokenVerifier ? verifyToken({ required }, tokenVerifier) : verifyToken({ required });

  router.get('/check-username', checkUsername);
  router.post('/register', register);
  router.post('/login', login);

  router.get(
    '/profile',
    protect(true),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const uid = req.user!.uid;
        const client = await getRepo().findByUid(uid);

        if (!client) {
          res.status(404).json({ success: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
          return;
        }

        const { pinHash: _pinHash, ...profile } = client;
        res.status(200).json(profile);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/vehicle',
    protect(true),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const uid = req.user!.uid;
        const repo = getRepo();
        const existing = await repo.findByUid(uid);

        if (!existing) {
          res.status(404).json({ success: false, error: { message: 'Client not found', code: 'NOT_FOUND' } });
          return;
        }

        const { modifications } = req.body as { modifications?: unknown };

        if (!Array.isArray(modifications)) {
          res.status(400).json({ success: false, error: { message: 'modifications must be an array', code: 'VALIDATION_ERROR' } });
          return;
        }

        const updated = new Client({
          uid: existing.uid,
          username: existing.username,
          displayName: existing.displayName,
          pinHash: existing.pinHash,
          vehicle: { ...existing.vehicle, modifications: modifications as string[] },
          preferences: existing.preferences,
          createdAt: existing.createdAt,
          updatedAt: new Date(),
        });

        await repo.save(updated);

        const { pinHash: _pinHash, ...profile } = updated;
        res.status(200).json(profile);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export default createAuthRouter();
