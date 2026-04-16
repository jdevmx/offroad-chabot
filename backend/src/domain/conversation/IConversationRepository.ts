import { Conversation, Turn } from './Conversation';

export interface IConversationRepository {
  create(userId: string): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  findByUserId(userId: string): Promise<Conversation | null>;
  appendTurn(id: string, turn: Turn): Promise<void>;
  updateSummary(id: string, summary: string): Promise<void>;
}
