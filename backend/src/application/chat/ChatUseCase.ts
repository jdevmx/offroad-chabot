import { ChatMistralAI } from '@langchain/mistralai';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { IConversationRepository } from '../../domain/conversation/IConversationRepository';
import { runAgent, RunAgentParams, RunAgentResult } from '../../infrastructure/agent/agentExecutor';
import { FirestoreChatMemory } from '../../infrastructure/agent/memory/firestoreMemory';
import { buildSystemPrompt } from '../../infrastructure/agent/systemPrompt';

export interface ChatRequest {
  userId?: string;
  conversationId?: string;
  message: string;
  onToolCall?: (toolName: string) => void;
}

export interface ChatResponse {
  message: string;
  conversationId?: string;
}

function createDefaultLlmInvoke(): (prompt: string) => Promise<string> {
  const llm = new ChatMistralAI({
    apiKey: process.env.MISTRAL_API_KEY,
    model: 'mistral-medium-latest',
  });
  return async (prompt: string) => {
    const result = await llm.invoke(prompt);
    return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  };
}

export class ChatUseCase {
  private readonly clientRepo: IClientRepository;
  private readonly convRepo: IConversationRepository;
  private readonly agentRunner: (params: RunAgentParams) => Promise<RunAgentResult>;
  private readonly llmInvoke: (prompt: string) => Promise<string>;

  constructor(
    clientRepo: IClientRepository,
    convRepo: IConversationRepository,
    agentRunner: (params: RunAgentParams) => Promise<RunAgentResult> = runAgent,
    llmInvoke: (prompt: string) => Promise<string> = createDefaultLlmInvoke(),
  ) {
    this.clientRepo = clientRepo;
    this.convRepo = convRepo;
    this.agentRunner = agentRunner;
    this.llmInvoke = llmInvoke;
  }

  async execute(params: ChatRequest): Promise<ChatResponse> {
    const { userId, conversationId, message } = params;
    const isAuthenticated = !!userId;

    let effectiveConversationId: string | undefined;

    const client = isAuthenticated ? await this.clientRepo.findByUid(userId!) : null;

    if (isAuthenticated) {
      let conv = conversationId ? await this.convRepo.findById(conversationId) : null;
      if (!conv) {
        conv = await this.convRepo.findByUserId(userId!);
      }
      if (!conv) {
        conv = await this.convRepo.create(userId!);
      }
      effectiveConversationId = conv.id;
    }

    const systemPrompt = buildSystemPrompt(client ?? undefined);

    const memory = new FirestoreChatMemory({
      conversationId: effectiveConversationId ?? '',
      userId: userId ?? null,
      conversationRepository: this.convRepo,
      llmInvoke: this.llmInvoke,
    });

    const result = await this.agentRunner({ message, systemPrompt, memory, onToolCall: params.onToolCall });

    return { message: result.message, conversationId: effectiveConversationId };
  }
}
