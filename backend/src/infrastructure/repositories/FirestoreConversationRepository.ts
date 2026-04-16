import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import {
  Conversation,
  ConversationData,
  Turn,
} from '../../domain/conversation/Conversation';
import { IConversationRepository } from '../../domain/conversation/IConversationRepository';

export class FirestoreConversationRepository implements IConversationRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async create(userId: string): Promise<Conversation> {
    const ref = this.db.collection('conversations').doc();
    const now = new Date();

    await ref.set({
      userId,
      summary: null,
      turns: [],
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    return new Conversation({
      id: ref.id,
      userId,
      summary: null,
      turns: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  async findById(id: string): Promise<Conversation | null> {
    const snapshot = await this.db.collection('conversations').doc(id).get();
    if (!snapshot.exists) {
      return null;
    }
    return this.toConversation(snapshot.data()!, snapshot.id);
  }

  async findByUserId(userId: string): Promise<Conversation | null> {
    const querySnapshot = await this.db
      .collection('conversations')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return this.toConversation(doc.data(), doc.id);
  }

  async appendTurn(id: string, turn: Turn): Promise<void> {
    await this.db.collection('conversations').doc(id).update({
      turns: FieldValue.arrayUnion(this.turnToFirestore(turn)),
      updatedAt: Timestamp.now(),
    });
  }

  async updateSummary(id: string, summary: string): Promise<void> {
    await this.db.collection('conversations').doc(id).update({
      summary,
      updatedAt: Timestamp.now(),
    });
  }

  private toConversation(
    data: FirebaseFirestore.DocumentData,
    id: string,
  ): Conversation {
    const rawTurns = (data.turns as FirebaseFirestore.DocumentData[]) ?? [];
    const turns: Turn[] = rawTurns.map((t) => ({
      userMessage: t.userMessage as string,
      assistantMessage: t.assistantMessage as string,
      timestamp: (t.timestamp as Timestamp).toDate(),
      toolsUsed: (t.toolsUsed as string[]) ?? [],
    }));

    const conversationData: ConversationData = {
      id,
      userId: data.userId as string,
      summary: (data.summary as string | null) ?? null,
      turns,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    };

    return new Conversation(conversationData);
  }

  private turnToFirestore(turn: Turn): Record<string, unknown> {
    return {
      userMessage: turn.userMessage,
      assistantMessage: turn.assistantMessage,
      timestamp: Timestamp.fromDate(turn.timestamp),
      toolsUsed: turn.toolsUsed,
    };
  }
}
