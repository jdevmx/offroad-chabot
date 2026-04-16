export interface Turn {
  userMessage: string;
  assistantMessage: string;
  timestamp: Date;
  toolsUsed: string[];
}

export interface ConversationData {
  id: string;
  userId: string;
  summary: string | null;
  turns: Turn[];
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  readonly id: string;
  readonly userId: string;
  readonly summary: string | null;
  readonly turns: Turn[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: ConversationData) {
    this.id = data.id;
    this.userId = data.userId;
    this.summary = data.summary;
    this.turns = data.turns;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
