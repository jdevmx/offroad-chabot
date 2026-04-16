# Backend Implementation Plan: TASK-005 Conversation repository (Firestore conversations collection)

## Overview

Implement the `Conversation` domain entity, the `IConversationRepository` interface, and the `FirestoreConversationRepository` infrastructure implementation that reads and writes to the `conversations/{conversationId}` Firestore collection.

This is the foundational persistence layer for all chat turns and compressed summaries. The `ChatUseCase` (TASK-012) and Firestore memory module (TASK-009) both depend on this repository. It follows the same structural pattern established by TASK-004 (Client repository): domain entity + interface in the domain layer, Firestore implementation in the infrastructure layer.

Anonymous sessions are **not** persisted — only authenticated users have conversation documents written to Firestore. The repository itself is not responsible for enforcing this rule; the application layer (ChatUseCase) handles it.

Architecture principles: Domain layer owns the entity and the repository interface. Infrastructure layer owns the Firestore implementation. No application or presentation code is touched in this ticket.

---

## Architecture Context

**Layer:** Domain + Infrastructure

**Components/files created:**

| File | Action | Purpose |
|---|---|---|
| `backend/src/domain/conversation/Conversation.ts` | Create | `Conversation` entity + `Turn` type definition |
| `backend/src/domain/conversation/IConversationRepository.ts` | Create | Repository interface |
| `backend/src/infrastructure/repositories/FirestoreConversationRepository.ts` | Create | Firestore implementation |
| `backend/src/infrastructure/repositories/FirestoreConversationRepository.test.ts` | Create | Unit tests with Firestore mocked at SDK boundary |

**No application, presentation, or other infrastructure files are touched in this ticket.**

**Dependencies on prior tickets:**
- **TASK-003**: `getFirestore()` from `backend/src/infrastructure/firebase/firebaseAdmin.ts` must be available before the repository is instantiated.

---

## Implementation Steps

### Step 0 — Create feature branch

```bash
git checkout main && git pull origin main
git checkout -b TASK-005-backend
```

---

### Step 1 — Conversation entity

**File:** `backend/src/domain/conversation/Conversation.ts`
**Action:** Create

**Type definitions and class signature:**
```typescript
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

  constructor(data: ConversationData) { ... }
}
```

**Implementation steps:**
1. Define the `Turn` interface — each element of the `turns` array in Firestore maps to this shape. `timestamp` is a `Date` inside the entity (the repository converts from/to Firestore `Timestamp`).
2. Define `ConversationData` as the plain-object input to the constructor. This decouples construction from Firestore-specific types.
3. Implement the `Conversation` constructor that assigns each field from `ConversationData`. No validation — data integrity is the responsibility of the application layer.
4. Mark all fields `readonly` — `Conversation` is an immutable snapshot. The repository's `appendTurn` and `updateSummary` methods perform targeted Firestore writes; they do not construct a new `Conversation` entity.
5. Export the class and all supporting types from the same file.

**Implementation notes:**
- `summary` is `string | null`. The entity stores `null` until the first compression cycle runs (TASK-009).
- `turns` is always `Turn[]`. The infrastructure layer must guard against `undefined` from Firestore and default to `[]`.
- `id` is the Firestore document ID — the repository generates it via `db.collection('conversations').doc()` on `create`.
- `userId` is the Firebase Auth UID of the authenticated user. Anonymous sessions are not represented as `Conversation` entities.
- `timestamp` inside each `Turn` is a `Date` in the entity; the repository converts to/from Firestore `Timestamp` at the persistence boundary.

---

### Step 2 — IConversationRepository interface

**File:** `backend/src/domain/conversation/IConversationRepository.ts`
**Action:** Create

**Interface definition:**
```typescript
import { Conversation, Turn } from './Conversation';

export interface IConversationRepository {
  create(userId: string): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  findByUserId(userId: string): Promise<Conversation | null>;
  appendTurn(id: string, turn: Turn): Promise<void>;
  updateSummary(id: string, summary: string): Promise<void>;
}
```

**Implementation steps:**
1. Import `Conversation` and `Turn` from the same domain directory.
2. Define a minimal interface with exactly the five methods required by the acceptance criteria.
3. `create` accepts `userId` and returns a new `Conversation` with an auto-generated `id`, empty `turns`, `null` summary, and current timestamps.
4. `findByUserId` returns at most one `Conversation` — the most recent one for that user. The agent memory layer (TASK-009) uses this to resume a session.
5. `appendTurn` and `updateSummary` perform targeted writes; they return `void` and do not return the updated entity.

**Implementation notes:**
- The interface lives in the domain layer. The infrastructure implementation imports this interface — the dependency arrow points inward.
- No `delete` method is defined — YAGNI. Conversation cleanup is not required for the prototype.
- `updateSummary` takes only a `string` (not `string | null`) — once a summary exists it is always replaced with a non-null value by the compression step.

---

### Step 3 — FirestoreConversationRepository

**File:** `backend/src/infrastructure/repositories/FirestoreConversationRepository.ts`
**Action:** Create

**Class signature:**
```typescript
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { Conversation, ConversationData, Turn } from '../../domain/conversation/Conversation';
import { IConversationRepository } from '../../domain/conversation/IConversationRepository';

export class FirestoreConversationRepository implements IConversationRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) { ... }

  async create(userId: string): Promise<Conversation> { ... }
  async findById(id: string): Promise<Conversation | null> { ... }
  async findByUserId(userId: string): Promise<Conversation | null> { ... }
  async appendTurn(id: string, turn: Turn): Promise<void> { ... }
  async updateSummary(id: string, summary: string): Promise<void> { ... }

  private toConversation(data: FirebaseFirestore.DocumentData, id: string): Conversation { ... }
  private turnToFirestore(turn: Turn): Record<string, unknown> { ... }
}
```

**Implementation steps:**

**`constructor`:**
- Accept a `Firestore` instance and assign to `this.db`.
- Do not call `getFirestore()` internally — receive it via constructor injection so the class remains testable without mocking the module.

**`create`:**
1. Generate a new document reference: `const ref = this.db.collection('conversations').doc()`.
2. Build the document payload: `{ userId, summary: null, turns: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now() }`.
3. Call `ref.set(payload)`.
4. Construct and return a `new Conversation({ id: ref.id, userId, summary: null, turns: [], createdAt: new Date(), updatedAt: new Date() })`.

**`findById`:**
1. Call `this.db.collection('conversations').doc(id).get()`.
2. If `snapshot.exists` is false, return `null`.
3. Call `this.toConversation(snapshot.data()!, snapshot.id)` and return the result.

**`findByUserId`:**
1. Call `this.db.collection('conversations').where('userId', '==', userId).orderBy('updatedAt', 'desc').limit(1).get()`.
2. If `querySnapshot.empty` is true, return `null`.
3. Take `querySnapshot.docs[0]`, call `this.toConversation(doc.data(), doc.id)`, and return.

**`appendTurn`:**
1. Build the Firestore-compatible turn object via `this.turnToFirestore(turn)`.
2. Import `FieldValue` from `'firebase-admin/firestore'`.
3. Call:
   ```typescript
   this.db.collection('conversations').doc(id).update({
     turns: FieldValue.arrayUnion(firestoreTurn),
     updatedAt: Timestamp.now(),
   });
   ```
4. Return `void`.

**`updateSummary`:**
1. Call:
   ```typescript
   this.db.collection('conversations').doc(id).update({
     summary,
     updatedAt: Timestamp.now(),
   });
   ```
2. Return `void`.

**`toConversation` (private):**
1. Accept raw `DocumentData` and `id` string.
2. Map each Firestore field to the `ConversationData` shape:
   - Convert `Timestamp` fields (`createdAt`, `updatedAt`) to `Date` via `.toDate()`.
   - Map `turns` array: for each raw turn, convert `timestamp` from `Timestamp` to `Date` via `.toDate()`. Guard `toolsUsed` with `?? []`.
   - Guard `turns` itself with `?? []` in case the field is absent.
   - `summary` may be `null` — pass through as-is.
3. Construct and return a `new Conversation(conversationData)`.

**`turnToFirestore` (private):**
1. Accept a `Turn` instance.
2. Return a plain object with:
   - `userMessage`, `assistantMessage`, `toolsUsed` copied directly.
   - `timestamp` as `Timestamp.fromDate(turn.timestamp)`.

**Implementation notes:**
- Pass `Firestore` via constructor, not via `getFirestore()` at call time — this allows tests to inject a mock without touching the module system.
- `appendTurn` uses `FieldValue.arrayUnion` to atomically append without reading the document first. This is safe for concurrent writes during a single agent turn.
- `findByUserId` orders by `updatedAt desc` and takes `limit(1)` — this retrieves the user's most recent active conversation. A Firestore composite index on `(userId ASC, updatedAt DESC)` is required in production; note this in the documentation step.
- Do not catch Firestore errors — let them propagate. HTTP error mapping is out of scope for this ticket.
- Import `FieldValue` and `Timestamp` from `'firebase-admin/firestore'` (sub-path import).

---

### Step 4 — Unit tests

**File:** `backend/src/infrastructure/repositories/FirestoreConversationRepository.test.ts`
**Action:** Create

**Test cases:**

| Scenario | Method | Expected outcome |
|---|---|---|
| Document exists | `findById` | Returns a `Conversation` instance with all fields mapped |
| Document does not exist | `findById` | Returns `null` |
| User has a conversation | `findByUserId` | Returns the most recent `Conversation` |
| User has no conversation | `findByUserId` | Returns `null` |
| Create a new conversation | `create` | Calls `set()` with correct payload; returns `Conversation` with generated id |
| Append a turn | `appendTurn` | Calls `update()` with `FieldValue.arrayUnion` and updated `updatedAt` |
| Update summary | `updateSummary` | Calls `update()` with the summary string and updated `updatedAt` |
| Timestamps are converted | `findById` | `createdAt`, `updatedAt`, and each turn's `timestamp` are `Date` instances |
| Missing turns field | `findById` | `turns` defaults to `[]` |
| Missing toolsUsed in turn | `findById` | `turn.toolsUsed` defaults to `[]` |

**Implementation steps:**
1. Create a mock Firestore object (typed as `Firestore`) with `vi.fn()` stubs for `collection`, `doc`, `get`, `set`, `update`, `where`, `orderBy`, `limit`, and `arrayUnion`.
2. Chain the stubs to reflect the Firestore fluent API:
   - `collection()` → `doc()` → `get()` (for `findById`)
   - `collection()` → `doc()` → `set()` (for `create`)
   - `collection()` → `doc()` → `update()` (for `appendTurn`, `updateSummary`)
   - `collection()` → `where()` → `orderBy()` → `limit()` → `get()` (for `findByUserId`)
3. For `findById` (found): make `get()` resolve with `{ exists: true, data: () => firestoreData, id: conversationId }`.
4. For `findById` (not found): make `get()` resolve with `{ exists: false }`.
5. For `findByUserId` (found): make `get()` resolve with `{ empty: false, docs: [{ data: () => firestoreData, id: conversationId }] }`.
6. For `findByUserId` (not found): make `get()` resolve with `{ empty: true, docs: [] }`.
7. For `create`: make `doc()` return `{ id: 'generated-id', set: vi.fn().mockResolvedValue(undefined) }`. Assert `set()` was called with the expected payload.
8. For `appendTurn`: make `update()` resolve with `undefined`. Assert `update` was called with an object containing `turns` (via `FieldValue.arrayUnion`) and `updatedAt`.
9. For `updateSummary`: make `update()` resolve with `undefined`. Assert `update` was called with `{ summary: '...', updatedAt: expect.any(Object) }`.
10. Use a `firestoreData` factory that includes `Timestamp` instances for `createdAt`, `updatedAt`, and each turn's `timestamp` so `.toDate()` conversion is verified.

**Implementation notes:**
- Do not use `vi.mock('firebase-admin')` — inject a plain mock object through the constructor instead.
- Mock `FieldValue.arrayUnion` by importing and mocking it from `'firebase-admin/firestore'` only if needed; alternatively, verify the `update` call argument shape contains a turn-shaped object.
- Use `beforeEach` to reset all mock function call counts and implementations.
- Keep test data realistic: valid `conversationId`, `userId`, `turns` with full `Turn` fields.

---

### Step 5 — Update technical documentation

**File:** `ARCHITECTURE.md`
**Action:** Verify

- Confirm `## Backend Structure` already lists `domain/conversation/Conversation.ts`, `domain/conversation/IConversationRepository.ts`, and `infrastructure/repositories/FirestoreConversationRepository.ts` — these are present in the architecture spec. No content changes expected.
- Confirm `## Data Model` → `conversations` collection field names match the entity definition exactly. No content changes expected.
- **Add a note** to the `conversations` collection data model section (or a new `## Firestore Indexes` section) documenting that a composite index on `(userId ASC, updatedAt DESC)` is required on the `conversations` collection for `findByUserId` to work in production.

---

## Implementation Order

| # | Step | File(s) |
|---|---|---|
| 0 | Create feature branch | — |
| 1 | `Conversation` entity + `Turn` type | `backend/src/domain/conversation/Conversation.ts` |
| 2 | `IConversationRepository` interface | `backend/src/domain/conversation/IConversationRepository.ts` |
| 3 | `FirestoreConversationRepository` | `backend/src/infrastructure/repositories/FirestoreConversationRepository.ts` |
| 4 | Unit tests | `backend/src/infrastructure/repositories/FirestoreConversationRepository.test.ts` |
| 5 | Documentation verification / index note | `ARCHITECTURE.md` |

---

## Testing Checklist

- [ ] `npm test` passes with zero failures
- [ ] `findById` — found: returns a `Conversation` with all fields mapped
- [ ] `findById` — not found: returns `null`
- [ ] `findByUserId` — found: returns the most recent `Conversation`
- [ ] `findByUserId` — not found: returns `null`
- [ ] `create` — calls `set()` on `conversations/{generatedId}` with correct payload
- [ ] `appendTurn` — calls `update()` with `FieldValue.arrayUnion` and refreshed `updatedAt`
- [ ] `updateSummary` — calls `update()` with the summary string and refreshed `updatedAt`
- [ ] `createdAt`, `updatedAt`, and turn `timestamp` are `Date` instances after `toConversation` conversion
- [ ] `turns` defaults to `[]` when absent from Firestore document
- [ ] `turn.toolsUsed` defaults to `[]` when absent
- [ ] Coverage ≥ 80% for `FirestoreConversationRepository.ts`
- [ ] No `any` types in entity, interface, or repository

---

## Error Response Format

This ticket does not introduce HTTP endpoints. Firestore errors propagate as uncaught exceptions to the caller (future application service layer). HTTP error mapping is out of scope here.

---

## Partial Update Support

`appendTurn` uses `FieldValue.arrayUnion` for atomic turn appending. `updateSummary` uses `update()` to replace only the `summary` field. Neither method reads the full document before writing — both are targeted partial writes.

---

## Dependencies

**Runtime:**
- `firebase-admin` ^12 — installed in TASK-003. Import from `firebase-admin/firestore` sub-path.

**Dev:**
- `vitest` — already added in TASK-001.

**Ticket dependencies:**
- **TASK-003** must be merged first (provides `getFirestore()`). The repository does not call `getFirestore()` directly — it accepts `Firestore` via constructor injection — but the consuming application service will obtain the instance from TASK-003.
- **TASK-004** is not a hard dependency at the code level, but it should be merged first to establish the repository pattern that TASK-005 mirrors.

---

## Notes

- All code and comments must be in English (project standard).
- Anonymous sessions are **not** persisted — the `Conversation` entity only ever holds an authenticated `userId`. The application layer (ChatUseCase, TASK-012) is responsible for skipping repository calls for anonymous users.
- `turns` is stored as a Firestore array of maps (not a sub-collection) — Firestore arrays are append-friendly and fit the read pattern (always loaded in full).
- `summary` is `null` until the first compression cycle. The entity and interface allow this; `updateSummary` always receives a non-null string.
- `findByUserId` requires a composite Firestore index on `(userId ASC, updatedAt DESC)`. This must be created in the Firebase console (or via `firestore.indexes.json`) before deploying.
- `FieldValue.arrayUnion` requires importing `FieldValue` from `'firebase-admin/firestore'`.
- Timestamps: the entity uses JavaScript `Date`; Firestore uses its own `Timestamp` class. Always convert at the repository boundary.

---

## Next Steps After Implementation

After TASK-005 is merged:
- **TASK-006** — PIN auth backend — depends on `IClientRepository` (TASK-004), not this repository directly.
- **TASK-009** — Firestore conversation memory + summary compression — depends on `IConversationRepository` from this ticket (`appendTurn`, `updateSummary`, `findByUserId`).
- **TASK-012** — POST /chat endpoint — depends on `IConversationRepository` (`create`, `findByUserId`, `appendTurn`).

---

## Implementation Verification

**Code quality:**
- [ ] No `any` types in any file created by this ticket
- [ ] `Conversation` fields are all `readonly`
- [ ] `FirestoreConversationRepository` receives `Firestore` via constructor (not module import)
- [ ] `toConversation` and `turnToFirestore` are private methods
- [ ] `appendTurn` uses `FieldValue.arrayUnion`, not a read-modify-write pattern

**Functionality:**
- [ ] `findById` returns `null` for non-existent documents
- [ ] `findByUserId` uses `.where('userId', '==', ...).orderBy('updatedAt', 'desc').limit(1)`
- [ ] `createdAt`, `updatedAt`, and turn `timestamp` are correctly converted between `Date` ↔ `Timestamp`
- [ ] `turns ?? []` and `turn.toolsUsed ?? []` guards are in place

**Testing:**
- [ ] `npm test` exits 0
- [ ] All 10 test cases listed in Step 4 pass
- [ ] Coverage ≥ 80% for `FirestoreConversationRepository.ts`

**Integration:**
- [ ] `IConversationRepository` is imported from domain layer only — never from infrastructure
- [ ] `FirestoreConversationRepository` imports `IConversationRepository` from domain layer

**Documentation:**
- [ ] `ARCHITECTURE.md` `conversations` data model still matches the entity definition
- [ ] Firestore composite index requirement documented
