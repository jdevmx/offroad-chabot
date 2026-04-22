import { describe, it, expect } from 'vitest';
import { Client, ClientData } from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { Conversation, ConversationData, Turn } from '../../domain/conversation/Conversation';
import { IConversationRepository } from '../../domain/conversation/IConversationRepository';
import { RunAgentParams, RunAgentResult } from '../../infrastructure/agent/agentExecutor';
import { ChatUseCase } from './ChatUseCase';

// ---------------------------------------------------------------------------
// Nullable client repository
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

// ---------------------------------------------------------------------------
// Nullable conversation repository
// ---------------------------------------------------------------------------

class NullableConversationRepository implements IConversationRepository {
  private readonly store: Map<string, ConversationData> = new Map();
  private idCounter = 1;

  seed(data: ConversationData): void {
    this.store.set(data.id, { ...data, turns: [...data.turns] });
  }

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

  createdCount(): number {
    return this.idCounter - 1;
  }

  getById(id: string): ConversationData | undefined {
    return this.store.get(id);
  }
}

// ---------------------------------------------------------------------------
// Null agent runner
// ---------------------------------------------------------------------------

function makeNullAgent(responseMessage = 'Agent response'): (params: RunAgentParams) => Promise<RunAgentResult> {
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
    vehicle: { make: 'Toyota', model: '4Runner', year: 2022, modifications: ['lift kit'] },
    preferences: { terrainTypes: ['rock'], experience: 'intermediate' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeUseCase(
  clientRepo: IClientRepository,
  convRepo: IConversationRepository,
  agentRunner = makeNullAgent(),
) {
  return new ChatUseCase(clientRepo, convRepo, agentRunner, async () => 'summary');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatUseCase', () => {
  describe('anonymous path', () => {
    it('returns a message without a conversationId', async () => {
      const clientRepo = new NullableClientRepository();
      const convRepo = new NullableConversationRepository();
      const useCase = makeUseCase(clientRepo, convRepo, makeNullAgent('Anon advice'));

      const result = await useCase.execute({ message: 'What tires should I use?' });

      expect(result.message).toBe('Anon advice');
      expect(result.conversationId).toBeUndefined();
    });

    it('does not create a conversation for anonymous users', async () => {
      const clientRepo = new NullableClientRepository();
      const convRepo = new NullableConversationRepository();
      const useCase = makeUseCase(clientRepo, convRepo);

      await useCase.execute({ message: 'Hello' });

      expect(convRepo.createdCount()).toBe(0);
    });
  });

  describe('authenticated path — new conversation', () => {
    it('creates a conversation when none exists and returns its id', async () => {
      const clientRepo = new NullableClientRepository();
      const convRepo = new NullableConversationRepository();
      clientRepo.seed(new Client(makeClientData('uid-1')));

      const useCase = makeUseCase(clientRepo, convRepo);
      const result = await useCase.execute({ userId: 'uid-1', message: 'Trail advice?' });

      expect(convRepo.createdCount()).toBe(1);
      expect(result.conversationId).toBeDefined();
    });

    it('returns the agent message', async () => {
      const clientRepo = new NullableClientRepository();
      const convRepo = new NullableConversationRepository();
      clientRepo.seed(new Client(makeClientData('uid-1')));

      const useCase = makeUseCase(clientRepo, convRepo, makeNullAgent('Personalized advice'));
      const result = await useCase.execute({ userId: 'uid-1', message: 'Tips?' });

      expect(result.message).toBe('Personalized advice');
    });
  });

  describe('authenticated path — existing conversation', () => {
    it('uses provided conversationId when valid', async () => {
      const clientRepo = new NullableClientRepository();
      const convRepo = new NullableConversationRepository();
      clientRepo.seed(new Client(makeClientData('uid-2')));

      const existing = await convRepo.create('uid-2');

      const useCase = makeUseCase(clientRepo, convRepo);
      const result = await useCase.execute({
        userId: 'uid-2',
        conversationId: existing.id,
        message: 'Follow-up?',
      });

      expect(result.conversationId).toBe(existing.id);
      expect(convRepo.createdCount()).toBe(1);
    });

    it('finds existing conversation by userId when no conversationId provided', async () => {
      const clientRepo = new NullableClientRepository();
      const convRepo = new NullableConversationRepository();
      clientRepo.seed(new Client(makeClientData('uid-3')));

      const existing = await convRepo.create('uid-3');

      const useCase = makeUseCase(clientRepo, convRepo);
      const result = await useCase.execute({ userId: 'uid-3', message: 'Continue?' });

      expect(result.conversationId).toBe(existing.id);
      expect(convRepo.createdCount()).toBe(1);
    });
  });

  describe('client not found', () => {
    it('falls back to generic prompt when userId is provided but client not found', async () => {
      const clientRepo = new NullableClientRepository();
      const convRepo = new NullableConversationRepository();

      let capturedSystemPrompt = '';
      const agentRunner = async (params: RunAgentParams): Promise<RunAgentResult> => {
        capturedSystemPrompt = params.systemPrompt;
        return { message: 'Generic advice', toolsUsed: [] };
      };

      const useCase = makeUseCase(clientRepo, convRepo, agentRunner);
      await useCase.execute({ userId: 'unknown-uid', message: 'Help?' });

      expect(capturedSystemPrompt).toContain('not registered a vehicle');
    });
  });
});
