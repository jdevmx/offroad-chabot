import { Conversation, Turn } from '../../../domain/conversation/Conversation';
import { IConversationRepository } from '../../../domain/conversation/IConversationRepository';

const WINDOW_SIZE = 10;
const COMPRESSION_THRESHOLD = 20;

export interface FirestoreChatMemoryParams {
  conversationId: string;
  userId: string | null;
  conversationRepository: IConversationRepository;
  llmInvoke: (prompt: string) => Promise<string>;
}

function formatTurns(turns: Turn[]): string {
  return turns
    .map(t => `Human: ${t.userMessage}\nAssistant: ${t.assistantMessage}`)
    .join('\n\n');
}

export class FirestoreChatMemory {
  private readonly conversationId: string;
  private readonly userId: string | null;
  private readonly conversationRepository: IConversationRepository;
  private readonly llmInvoke: (prompt: string) => Promise<string>;

  constructor(params: FirestoreChatMemoryParams) {
    this.conversationId = params.conversationId;
    this.userId = params.userId;
    this.conversationRepository = params.conversationRepository;
    this.llmInvoke = params.llmInvoke;
  }

  async loadMemoryVariables(): Promise<{ history: string }> {
    if (this.userId === null) {
      return { history: '' };
    }

    const conversation = await this.conversationRepository.findById(this.conversationId);
    if (conversation === null) {
      return { history: '' };
    }

    const recentTurns = conversation.turns.slice(-WINDOW_SIZE);
    const turnsText = formatTurns(recentTurns);

    if (conversation.summary) {
      const combined =
        turnsText.length > 0
          ? `Summary: ${conversation.summary}\n\n${turnsText}`
          : `Summary: ${conversation.summary}`;
      return { history: combined };
    }

    return { history: turnsText };
  }

  async saveContext(userMessage: string, assistantMessage: string): Promise<void> {
    if (this.userId === null) {
      return;
    }

    const turn: Turn = {
      userMessage,
      assistantMessage,
      timestamp: new Date(),
      toolsUsed: [],
    };

    await this.conversationRepository.appendTurn(this.conversationId, turn);

    const updated = await this.conversationRepository.findById(this.conversationId);
    if (updated !== null && updated.turns.length > COMPRESSION_THRESHOLD) {
      await this.compressHistory(updated);
    }
  }

  private async compressHistory(conversation: Conversation): Promise<void> {
    const turnsToCompress = conversation.turns.slice(0, conversation.turns.length - WINDOW_SIZE);
    let turnsText = formatTurns(turnsToCompress);

    if (conversation.summary) {
      turnsText = `${conversation.summary}\n\n${turnsText}`;
    }

    const prompt =
      `Summarize this conversation history in 3-5 sentences, focusing on what the user needs, ` +
      `their vehicle, and any recommendations already given.\n\n${turnsText}`;

    const newSummary = await this.llmInvoke(prompt);
    await this.conversationRepository.updateSummary(this.conversationId, newSummary);
  }
}
