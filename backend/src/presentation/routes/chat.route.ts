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
    async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
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

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const send = (data: object): void => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      send({ type: 'status', text: 'thinking' });

      const userId = req.user?.uid;

      try {
        const result = await getUseCase().execute({
          userId,
          conversationId,
          message,
          onToolCall: (toolName) => {
            if (toolName === 'tavily_search') {
              send({ type: 'status', text: 'searching' });
            }
          },
        });

        send({ type: 'message', message: result.message, conversationId: result.conversationId ?? null });
        res.end();
      } catch (_err) {
        send({ type: 'error', message: 'Something went wrong' });
        res.end();
      }
    },
  );

  return router;
}
