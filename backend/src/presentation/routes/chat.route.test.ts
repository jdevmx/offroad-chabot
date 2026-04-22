import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Client, ClientData } from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { Conversation, ConversationData, Turn } from '../../domain/conversation/Conversation';
import { IConversationRepository } from '../../domain/conversation/IConversationRepository';
import { RunAgentParams, RunAgentResult } from '../../infrastructure/agent/agentExecutor';
import { ChatUseCase } from '../../application/chat/ChatUseCase';
import { createChatRouter } from './chat.route';

// ---------------------------------------------------------------------------
// Nullable repositories (same as in ChatUseCase.test.ts)
// ---------------------------------------------------------------------------

class NullableClientRepository implements IClientRepository {
  private readonly store: Map<string, Client> = new Map();

  seed(client: Client): void {
    this.store.set(client.uid, client);
  }

  async findByUid(uid: string): Promise<Client | null> {
    return this.store.get(uid) ?? null;
  }

  async findByUsername(username: string): Promise<Client | null> {
    for (const c of this.store.values()) {
      if (c.username === username) return c;
    }
    return null;
  }

  async save(client: Client): Promise<void> {
    this.store.set(client.uid, client);
  }
}

class NullableConversationRepository implements IConversationRepository {
  private readonly store: Map<string, ConversationData> = new Map();
  private idCounter = 1;

  async create(userId: string): Promise<Conversation> {
    const id = `conv-${this.idCounter++}`;
    const data: ConversationData = {
      id,
      userId,
      summary: null,
      turns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.set(id, data);
    return new Conversation(data);
  }

  async findById(id: string): Promise<Conversation | null> {
    const data = this.store.get(id);
    return data ? new Conversation({ ...data, turns: [...data.turns] }) : null;
  }

  async findByUserId(userId: string): Promise<Conversation | null> {
    for (const data of this.store.values()) {
      if (data.userId === userId) return new Conversation({ ...data, turns: [...data.turns] });
    }
    return null;
  }

  async appendTurn(id: string, turn: Turn): Promise<void> {
    const data = this.store.get(id);
    if (!data) throw new Error(`Conversation ${id} not found`);
    data.turns.push({ ...turn });
  }

  async updateSummary(id: string, summary: string): Promise<void> {
    const data = this.store.get(id);
    if (!data) throw new Error(`Conversation ${id} not found`);
    data.summary = summary;
  }
}

// ---------------------------------------------------------------------------
// Null agent runner
// ---------------------------------------------------------------------------

function makeNullAgent(
  responseMessage = 'Trail advice here.',
): (params: RunAgentParams) => Promise<RunAgentResult> {
  return async (_params) => ({ message: responseMessage, toolsUsed: [] });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClientData(uid: string): ClientData {
  return {
    uid,
    username: 'trail_rider',
    displayName: 'Trail Rider',
    pinHash: 'hash',
    vehicle: { make: 'Toyota', model: '4Runner', year: 2022, modifications: [] },
    preferences: { terrainTypes: ['rock'], experience: 'intermediate' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const fakeVerifier = async (_token: string) => ({ uid: 'uid-auth' });

function makeApp(useCase: ChatUseCase, verifier?: (token: string) => Promise<{ uid: string }>) {
  const app = express();
  app.use(express.json());
  app.use('/chat', createChatRouter(useCase, verifier));
  return app;
}

function makeUseCase(
  clientRepo: IClientRepository = new NullableClientRepository(),
  convRepo: IConversationRepository = new NullableConversationRepository(),
  agentRunner = makeNullAgent(),
) {
  return new ChatUseCase(clientRepo, convRepo, agentRunner, async () => 'summary');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /chat', () => {
  it('returns 400 when message is missing', async () => {
    const app = makeApp(makeUseCase());

    const res = await request(app).post('/chat').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when message is an empty string', async () => {
    const app = makeApp(makeUseCase());

    const res = await request(app).post('/chat').send({ message: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with message for anonymous request', async () => {
    const app = makeApp(makeUseCase(undefined, undefined, makeNullAgent('Anon trail tip')));

    const res = await request(app).post('/chat').send({ message: 'Any trail tips?' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Anon trail tip');
    expect(res.body.conversationId).toBeUndefined();
  });

  it('returns 200 with conversationId for authenticated request', async () => {
    const clientRepo = new NullableClientRepository();
    clientRepo.seed(new Client(makeClientData('uid-auth')));
    const convRepo = new NullableConversationRepository();

    const app = makeApp(makeUseCase(clientRepo, convRepo), fakeVerifier);

    const res = await request(app)
      .post('/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ message: 'Trail conditions?' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Trail advice here.');
    expect(res.body.conversationId).toBeDefined();
  });

  it('returns 500 when the agent throws', async () => {
    const failingAgent = async (_params: RunAgentParams): Promise<RunAgentResult> => {
      throw new Error('LLM unavailable');
    };

    const app = makeApp(makeUseCase(undefined, undefined, failingAgent));
    app.use(
      (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to process chat', code: 'INTERNAL_ERROR' },
        });
      },
    );

    const res = await request(app).post('/chat').send({ message: 'Hello' });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
