import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, verifyToken } from '../middleware/auth.middleware';
import { ChatUseCase } from '../../application/chat/ChatUseCase';
import { FirestoreClientRepository } from '../../infrastructure/repositories/FirestoreClientRepository';
import { FirestoreConversationRepository } from '../../infrastructure/repositories/FirestoreConversationRepository';
import { getFirestore } from '../../infrastructure/firebase/firebaseAdmin';

type TokenVerifier = (token: string) => Promise<{ uid: string }>;

export function createChatRouter(useCase?: ChatUseCase, tokenVerifier?: TokenVerifier): Router {
  const router = Router();

  let resolvedUseCase: ChatUseCase | undefined = useCase;
  let resolvedConvRepo: FirestoreConversationRepository | undefined;

  function getUseCase(): ChatUseCase {
    if (!resolvedUseCase) {
      resolvedUseCase = new ChatUseCase(
        new FirestoreClientRepository(getFirestore()),
        new FirestoreConversationRepository(getFirestore()),
      );
    }
    return resolvedUseCase;
  }

  function getConvRepo(): FirestoreConversationRepository {
    if (!resolvedConvRepo) {
      resolvedConvRepo = new FirestoreConversationRepository(getFirestore());
    }
    return resolvedConvRepo;
  }

  router.get(
    '/',
    verifyToken({ required: true }, tokenVerifier),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const conversation = await getConvRepo().findByUserId(userId);

        if (!conversation) {
          res.status(200).json({ conversationId: null, turns: [] });
          return;
        }

        const turns = conversation.turns.map((t) => ({
          userMessage: t.userMessage,
          assistantMessage: t.assistantMessage,
          timestamp: t.timestamp.toISOString(),
        }));

        res.status(200).json({ conversationId: conversation.id, turns });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/',
    verifyToken({ required: false }, tokenVerifier),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { message, conversationId } = req.body as {
          message?: string;
          conversationId?: string;
        };

        if (!message || typeof message !== 'string') {
          res.status(400).json({
            success: false,
            error: { message: 'Message is required', code: 'VALIDATION_ERROR' },
          });
          return;
        }

        const userId = req.user?.uid;

        const result = await getUseCase().execute({ userId, conversationId, message });

        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
