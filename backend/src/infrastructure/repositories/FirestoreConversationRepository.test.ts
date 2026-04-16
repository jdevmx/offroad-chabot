import { describe, it, expect, beforeEach } from 'vitest';
import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { Conversation } from '../../domain/conversation/Conversation';
import { FirestoreConversationRepository } from './FirestoreConversationRepository';

// ---------------------------------------------------------------------------
// Nullable Firestore — in-memory document store, no mock library
// ---------------------------------------------------------------------------

interface UpdateRecord {
  id: string;
  data: Record<string, unknown>;
}

class NullableFirestore {
  private readonly docs = new Map<string, Record<string, unknown>>();
  private docCounter = 0;
  readonly updates: UpdateRecord[] = [];

  seed(id: string, data: Record<string, unknown>): NullableFirestore {
    this.docs.set(id, data);
    return this;
  }

  docAt(id: string): Record<string, unknown> | undefined {
    return this.docs.get(id);
  }

  asFirestore(): Firestore {
    const self = this;

    const makeDocRef = (docId: string) => ({
      id: docId,
      get() {
        const data = self.docs.get(docId);
        return Promise.resolve({
          exists: data !== undefined,
          id: docId,
          data: () => data,
        });
      },
      set(payload: Record<string, unknown>) {
        self.docs.set(docId, payload);
        return Promise.resolve();
      },
      update(payload: Record<string, unknown>) {
        self.updates.push({ id: docId, data: payload });
        const existing = self.docs.get(docId) ?? {};
        self.docs.set(docId, { ...existing, ...payload });
        return Promise.resolve();
      },
    });

    return {
      collection(_name: string) {
        return {
          doc(id?: string) {
            const docId = id ?? `null-doc-${++self.docCounter}`;
            return makeDocRef(docId);
          },
          where(_field: string, _op: string, value: unknown) {
            return {
              orderBy(_f: string, _d: string) {
                return {
                  limit(_n: number) {
                    return {
                      get() {
                        const matches = [...self.docs.entries()].filter(
                          ([_, d]) => d['userId'] === value,
                        );
                        if (matches.length === 0) {
                          return Promise.resolve({ empty: true, docs: [] });
                        }
                        const [matchId, matchData] = matches[0];
                        return Promise.resolve({
                          empty: false,
                          docs: [{ id: matchId, data: () => matchData }],
                        });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as Firestore;
  }
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const NOW = new Date('2026-01-15T10:00:00Z');
const NOW_TS = Timestamp.fromDate(NOW);
const TURN_TS = Timestamp.fromDate(new Date('2026-01-15T10:05:00Z'));

const STORED_CONVERSATION = {
  userId: 'user-abc',
  summary: null,
  turns: [
    {
      userMessage: 'What tires for mud?',
      assistantMessage: 'Go with BFGoodrich MT.',
      timestamp: TURN_TS,
      toolsUsed: ['tavily_search'],
    },
  ],
  createdAt: NOW_TS,
  updatedAt: NOW_TS,
};

const CONVERSATION_ID = 'conv-001';
const USER_ID = 'user-abc';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FirestoreConversationRepository', () => {
  let store: NullableFirestore;
  let repo: FirestoreConversationRepository;

  beforeEach(() => {
    store = new NullableFirestore();
    repo = new FirestoreConversationRepository(store.asFirestore());
  });

  describe('create', () => {
    it('returns a Conversation with generated id and empty turns', async () => {
      const conv = await repo.create(USER_ID);

      expect(conv).toBeInstanceOf(Conversation);
      expect(conv.userId).toBe(USER_ID);
      expect(conv.turns).toEqual([]);
      expect(conv.summary).toBeNull();
      expect(conv.id).toBeTruthy();
    });

    it('persists the document in Firestore', async () => {
      const conv = await repo.create(USER_ID);

      const stored = store.docAt(conv.id);
      expect(stored).toBeDefined();
      expect(stored?.userId).toBe(USER_ID);
      expect(stored?.turns).toEqual([]);
      expect(stored?.summary).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns a Conversation when the document exists', async () => {
      store.seed(CONVERSATION_ID, STORED_CONVERSATION);

      const conv = await repo.findById(CONVERSATION_ID);

      expect(conv).toBeInstanceOf(Conversation);
      expect(conv?.id).toBe(CONVERSATION_ID);
      expect(conv?.userId).toBe(USER_ID);
    });

    it('returns null when the document does not exist', async () => {
      const conv = await repo.findById('nonexistent');
      expect(conv).toBeNull();
    });

    it('converts Timestamp fields to Date instances', async () => {
      store.seed(CONVERSATION_ID, STORED_CONVERSATION);

      const conv = await repo.findById(CONVERSATION_ID);

      expect(conv?.createdAt).toBeInstanceOf(Date);
      expect(conv?.updatedAt).toBeInstanceOf(Date);
      expect(conv?.turns[0].timestamp).toBeInstanceOf(Date);
    });

    it('defaults turns to [] when the field is absent', async () => {
      store.seed(CONVERSATION_ID, { ...STORED_CONVERSATION, turns: undefined });

      const conv = await repo.findById(CONVERSATION_ID);

      expect(conv?.turns).toEqual([]);
    });

    it('defaults turn.toolsUsed to [] when absent', async () => {
      const turnWithoutTools = { ...STORED_CONVERSATION.turns[0], toolsUsed: undefined };
      store.seed(CONVERSATION_ID, { ...STORED_CONVERSATION, turns: [turnWithoutTools] });

      const conv = await repo.findById(CONVERSATION_ID);

      expect(conv?.turns[0].toolsUsed).toEqual([]);
    });
  });

  describe('findByUserId', () => {
    it('returns a Conversation when a matching document exists', async () => {
      store.seed(CONVERSATION_ID, STORED_CONVERSATION);

      const conv = await repo.findByUserId(USER_ID);

      expect(conv).toBeInstanceOf(Conversation);
      expect(conv?.userId).toBe(USER_ID);
    });

    it('returns null when no conversation exists for the user', async () => {
      const conv = await repo.findByUserId('unknown-user');
      expect(conv).toBeNull();
    });
  });

  describe('appendTurn', () => {
    it('calls update with FieldValue.arrayUnion and a refreshed updatedAt', async () => {
      store.seed(CONVERSATION_ID, STORED_CONVERSATION);

      const turn = {
        userMessage: 'Best lift kit?',
        assistantMessage: 'Old Man Emu for comfort.',
        timestamp: new Date(),
        toolsUsed: [],
      };

      await repo.appendTurn(CONVERSATION_ID, turn);

      const lastUpdate = store.updates[store.updates.length - 1];
      expect(lastUpdate.id).toBe(CONVERSATION_ID);
      expect(lastUpdate.data.turns).toBeInstanceOf(FieldValue);
      expect(lastUpdate.data.updatedAt).toBeInstanceOf(Timestamp);
    });
  });

  describe('updateSummary', () => {
    it('calls update with the summary string and a refreshed updatedAt', async () => {
      store.seed(CONVERSATION_ID, STORED_CONVERSATION);

      await repo.updateSummary(CONVERSATION_ID, 'User asked about tires and lifts.');

      const lastUpdate = store.updates[store.updates.length - 1];
      expect(lastUpdate.id).toBe(CONVERSATION_ID);
      expect(lastUpdate.data.summary).toBe('User asked about tires and lifts.');
      expect(lastUpdate.data.updatedAt).toBeInstanceOf(Timestamp);
    });
  });
});
