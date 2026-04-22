import { describe, it, expect, beforeEach } from 'vitest';
import { Conversation, ConversationData, Turn } from '../../../domain/conversation/Conversation';
import { IConversationRepository } from '../../../domain/conversation/IConversationRepository';
import { FirestoreChatMemory } from './firestoreMemory';

// ---------------------------------------------------------------------------
// In-memory nullable repository
// ---------------------------------------------------------------------------

class NullableConversationRepository implements IConversationRepository {
  private store: Map<string, ConversationData> = new Map();
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
    if (!data) return null;
    return new Conversation({ ...data, turns: [...data.turns] });
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
    data.updatedAt = new Date();
  }

  async updateSummary(id: string, summary: string): Promise<void> {
    const data = this.store.get(id);
    if (!data) throw new Error(`Conversation ${id} not found`);
    data.summary = summary;
    data.updatedAt = new Date();
  }

  getSummary(id: string): string | null {
    return this.store.get(id)?.summary ?? null;
  }

  getTurnCount(id: string): number {
    return this.store.get(id)?.turns.length ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONV_ID = 'conv-test';
const USER_ID = 'user-001';

function makeTurns(count: number): Turn[] {
  return Array.from({ length: count }, (_, i) => ({
    userMessage: `question ${i + 1}`,
    assistantMessage: `answer ${i + 1}`,
    timestamp: new Date(),
    toolsUsed: [],
  }));
}

function makeConversationData(overrides: Partial<ConversationData> = {}): ConversationData {
  return {
    id: CONV_ID,
    userId: USER_ID,
    summary: null,
    turns: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const noOpLlm = async (_prompt: string): Promise<string> => 'mocked summary';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FirestoreChatMemory', () => {
  let repo: NullableConversationRepository;

  beforeEach(() => {
    repo = new NullableConversationRepository();
  });

  // 1. Anonymous user — loadMemoryVariables
  it('loadMemoryVariables returns empty history for anonymous user', async () => {
    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: null,
      conversationRepository: repo,
      llmInvoke: noOpLlm,
    });

    const result = await memory.loadMemoryVariables();

    expect(result).toEqual({ history: '' });
    // Repository was never touched — store is empty
    expect(repo.getTurnCount(CONV_ID)).toBe(0);
  });

  // 2. Authenticated user — conversation not found
  it('loadMemoryVariables returns empty history when conversation does not exist', async () => {
    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: USER_ID,
      conversationRepository: repo,
      llmInvoke: noOpLlm,
    });

    const result = await memory.loadMemoryVariables();

    expect(result).toEqual({ history: '' });
  });

  // 3. Turns only (no summary) — returns formatted turns
  it('loadMemoryVariables formats turns without a summary', async () => {
    repo.seed(makeConversationData({ turns: makeTurns(3) }));

    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: USER_ID,
      conversationRepository: repo,
      llmInvoke: noOpLlm,
    });

    const { history } = await memory.loadMemoryVariables();

    expect(history).toContain('Human: question 1');
    expect(history).toContain('Assistant: answer 1');
    expect(history).toContain('Human: question 3');
    expect(history).not.toContain('Summary:');
  });

  // 4. Summary + turns — prepends "Summary: ..." prefix
  it('loadMemoryVariables prepends summary when present', async () => {
    repo.seed(
      makeConversationData({
        summary: 'User asked about tire pressure.',
        turns: makeTurns(2),
      }),
    );

    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: USER_ID,
      conversationRepository: repo,
      llmInvoke: noOpLlm,
    });

    const { history } = await memory.loadMemoryVariables();

    expect(history).toMatch(/^Summary: User asked about tire pressure\./);
    expect(history).toContain('Human: question 1');
  });

  // 5. More than 10 turns — only last 10 are included
  it('loadMemoryVariables includes only the last 10 turns', async () => {
    repo.seed(makeConversationData({ turns: makeTurns(15) }));

    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: USER_ID,
      conversationRepository: repo,
      llmInvoke: noOpLlm,
    });

    const { history } = await memory.loadMemoryVariables();

    expect(history).not.toContain('question 5');
    expect(history).toContain('question 6');
    expect(history).toContain('question 15');
  });

  // 6. Anonymous user — saveContext does nothing
  it('saveContext does nothing for anonymous user', async () => {
    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: null,
      conversationRepository: repo,
      llmInvoke: noOpLlm,
    });

    await memory.saveContext('hello', 'hi there');

    // Repository state unchanged — conversation was never created
    const conv = await repo.findById(CONV_ID);
    expect(conv).toBeNull();
  });

  // 7. saveContext appends turn to the repository
  it('saveContext appends the new turn', async () => {
    repo.seed(makeConversationData({ turns: [] }));

    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: USER_ID,
      conversationRepository: repo,
      llmInvoke: noOpLlm,
    });

    await memory.saveContext('user msg', 'assistant msg');

    expect(repo.getTurnCount(CONV_ID)).toBe(1);
  });

  // 8. No compression at exactly 20 turns
  it('saveContext does NOT call llmInvoke when turn count reaches exactly 20', async () => {
    // Seed 19 existing turns; saveContext will add the 20th → total = 20, no compression
    repo.seed(makeConversationData({ turns: makeTurns(19) }));

    let llmCallCount = 0;
    const trackingLlm = async (_prompt: string): Promise<string> => {
      llmCallCount++;
      return 'summary';
    };

    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: USER_ID,
      conversationRepository: repo,
      llmInvoke: trackingLlm,
    });

    await memory.saveContext('msg 20', 'resp 20');

    expect(repo.getTurnCount(CONV_ID)).toBe(20);
    expect(llmCallCount).toBe(0);
  });

  // 9. Compression triggered at 21 turns
  it('saveContext calls llmInvoke when turn count exceeds 20', async () => {
    // Seed 20 existing turns; saveContext adds the 21st → total = 21, triggers compression
    repo.seed(makeConversationData({ turns: makeTurns(20) }));

    let llmCallCount = 0;
    const trackingLlm = async (_prompt: string): Promise<string> => {
      llmCallCount++;
      return 'compressed summary';
    };

    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: USER_ID,
      conversationRepository: repo,
      llmInvoke: trackingLlm,
    });

    await memory.saveContext('msg 21', 'resp 21');

    expect(repo.getTurnCount(CONV_ID)).toBe(21);
    expect(llmCallCount).toBe(1);
  });

  // 10. compressHistory calls updateSummary with the LLM output
  it('compressHistory stores the LLM-generated summary in the repository', async () => {
    repo.seed(makeConversationData({ turns: makeTurns(20) }));

    const memory = new FirestoreChatMemory({
      conversationId: CONV_ID,
      userId: USER_ID,
      conversationRepository: repo,
      llmInvoke: async (_prompt: string) => 'the LLM summary text',
    });

    await memory.saveContext('trigger compression', 'response');

    expect(repo.getSummary(CONV_ID)).toBe('the LLM summary text');
  });
});
