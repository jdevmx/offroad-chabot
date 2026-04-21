import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatResult } from '@langchain/core/outputs';
import { Runnable } from '@langchain/core/runnables';
import { Conversation, ConversationData, Turn } from '../../domain/conversation/Conversation';
import { IConversationRepository } from '../../domain/conversation/IConversationRepository';
import { FirestoreChatMemory } from './memory/firestoreMemory';
import { runAgent } from './agentExecutor';
import { createTavilySearchTool } from './tools/tavilySearch.tool';

// ---------------------------------------------------------------------------
// Nullable LLM — returns pre-configured AIMessage responses in sequence
// ---------------------------------------------------------------------------

class NullableLlm extends BaseChatModel {
  private readonly queue: AIMessage[];
  readonly capturedInputs: BaseMessage[][] = [];
  private callIndex = 0;

  constructor(responses: AIMessage[]) {
    super({});
    this.queue = responses;
  }

  _llmType(): string {
    return 'nullable';
  }

  _combineLLMOutput(): Record<string, unknown> {
    return {};
  }

  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    this.capturedInputs.push([...messages]);
    const message = this.queue[this.callIndex % this.queue.length];
    this.callIndex++;
    return {
      generations: [{ message, text: String(message.content) }],
    };
  }

  bindTools(_tools: unknown[]): Runnable {
    return this as unknown as Runnable;
  }
}

// ---------------------------------------------------------------------------
// In-memory nullable conversation repository
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

  getTurnCount(id: string): number {
    return this.store.get(id)?.turns.length ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONV_ID = 'conv-agent-test';
const USER_ID = 'user-agent-001';
const SYSTEM_PROMPT = 'You are an off-road assistant.';

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

function makeMemory(
  repo: NullableConversationRepository,
  userId: string | null = USER_ID,
): FirestoreChatMemory {
  return new FirestoreChatMemory({
    conversationId: CONV_ID,
    userId,
    conversationRepository: repo,
    llmInvoke: async () => 'summary',
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runAgent', () => {
  let repo: NullableConversationRepository;

  beforeEach(() => {
    repo = new NullableConversationRepository();
  });

  it('returns a direct answer without calling tools when the LLM does not emit tool calls', async () => {
    repo.seed(makeConversationData());

    const llm = new NullableLlm([new AIMessage('Just take the high trail.')]);

    const result = await runAgent({
      message: 'What trail should I take?',
      systemPrompt: SYSTEM_PROMPT,
      memory: makeMemory(repo),
      llm,
      tools: [],
    });

    expect(result.message).toBe('Just take the high trail.');
    expect(result.toolsUsed).toEqual([]);
  });

  it('invokes the tavily_search tool when the LLM emits a tool call', async () => {
    const savedKey = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = 'test-api-key';

    repo.seed(makeConversationData());

    const toolCallResponse = new AIMessage({
      content: '',
      tool_calls: [{ name: 'tavily_search', args: { query: 'Rubicon trail conditions' }, id: 'call-1', type: 'tool_call' }],
    });
    const finalResponse = new AIMessage('The Rubicon trail is open and in good condition.');
    const llm = new NullableLlm([toolCallResponse, finalResponse]);

    let capturedQuery = '';
    const fakeFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      capturedQuery = body.query;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [{ title: 'Rubicon Trail', url: 'https://example.com', content: 'Open and clear.' }],
        }),
      } as Response;
    };

    const result = await runAgent({
      message: 'What are the current trail conditions on the Rubicon?',
      systemPrompt: SYSTEM_PROMPT,
      memory: makeMemory(repo),
      llm,
      tools: [createTavilySearchTool(fakeFetch)],
    });

    expect(result.toolsUsed).toContain('tavily_search');
    expect(capturedQuery).toBe('Rubicon trail conditions');
    expect(result.message).toContain('Rubicon');

    if (savedKey === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = savedKey;
  });

  it('persists the conversation turn to memory after execution', async () => {
    repo.seed(makeConversationData());

    const llm = new NullableLlm([new AIMessage('Check your tire pressure.')]);

    await runAgent({
      message: 'Quick tip?',
      systemPrompt: SYSTEM_PROMPT,
      memory: makeMemory(repo),
      llm,
      tools: [],
    });

    expect(repo.getTurnCount(CONV_ID)).toBe(1);
  });

  it('does not persist turns for anonymous users', async () => {
    const llm = new NullableLlm([new AIMessage('General advice here.')]);

    await runAgent({
      message: 'Any advice?',
      systemPrompt: SYSTEM_PROMPT,
      memory: makeMemory(repo, null),
      llm,
      tools: [],
    });

    expect(repo.getTurnCount(CONV_ID)).toBe(0);
  });

  it('includes conversation history in messages sent to the LLM', async () => {
    const turn: Turn = {
      userMessage: 'What is a snorkel?',
      assistantMessage: 'A snorkel raises the air intake.',
      timestamp: new Date(),
      toolsUsed: [],
    };
    repo.seed(makeConversationData({ turns: [turn] }));

    const llm = new NullableLlm([new AIMessage('Yes, that is correct.')]);

    await runAgent({
      message: 'Remind me about the snorkel.',
      systemPrompt: SYSTEM_PROMPT,
      memory: makeMemory(repo),
      llm,
      tools: [],
    });

    const allContent = llm.capturedInputs
      .flat()
      .map(m => String(m.content))
      .join(' ');
    expect(allContent).toContain('snorkel');
  });
});
