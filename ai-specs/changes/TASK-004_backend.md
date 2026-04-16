# Backend Implementation Plan: TASK-004 Client repository (Firestore clients collection)

## Overview

Implement the `Client` domain entity, the `IClientRepository` interface, and the `FirestoreClientRepository` infrastructure implementation that reads and writes to the `clients/{userId}` Firestore collection.

This is the foundational data layer for user profiles, vehicle information, and PIN auth. All auth use cases (`RegisterUseCase`, `LoginUseCase`) introduced in TASK-006 depend on this repository. It consumes the `getFirestore()` accessor established by TASK-003.

Architecture principles: Domain layer owns the entity and the repository interface. Infrastructure layer owns the Firestore implementation. No application or presentation code is touched in this ticket.

---

## Architecture Context

**Layer:** Domain + Infrastructure

**Components/files created:**

| File | Action | Purpose |
|---|---|---|
| `backend/src/domain/client/Client.ts` | Create | `Client` entity + nested type definitions |
| `backend/src/domain/client/IClientRepository.ts` | Create | Repository interface |
| `backend/src/infrastructure/repositories/FirestoreClientRepository.ts` | Create | Firestore implementation |
| `backend/src/infrastructure/repositories/FirestoreClientRepository.test.ts` | Create | Unit tests with Firestore mocked at SDK boundary |

**No application, presentation, or other infrastructure files are touched in this ticket.**

**Dependencies on prior tickets:**
- **TASK-003**: `getFirestore()` from `backend/src/infrastructure/firebase/firebaseAdmin.ts` must be available before the repository is instantiated.

---

## Implementation Steps

### Step 0 — Create feature branch

```bash
git checkout main && git pull origin main
git checkout -b TASK-004-backend
```

---

### Step 1 — Client entity

**File:** `backend/src/domain/client/Client.ts`
**Action:** Create

**Type definitions and function signatures:**
```typescript
export interface Vehicle {
  make: string;
  model: string;
  year: number;
  trim?: string;
  modifications: string[];
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'expert';

export interface Preferences {
  terrainTypes: string[];
  experience: ExperienceLevel;
}

export interface ClientData {
  uid: string;
  username: string;
  displayName: string;
  pinHash: string;
  vehicle: Vehicle;
  preferences: Preferences;
  createdAt: Date;
  updatedAt: Date;
}

export class Client {
  readonly uid: string;
  readonly username: string;
  readonly displayName: string;
  readonly pinHash: string;
  readonly vehicle: Vehicle;
  readonly preferences: Preferences;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: ClientData) { ... }
}
```

**Implementation steps:**
1. Define `Vehicle`, `ExperienceLevel`, `Preferences`, and `ClientData` interfaces/types in the same file — they are value objects that belong to the `Client` aggregate.
2. Implement `Client` constructor that accepts `ClientData` and assigns each field. No validation — the repository and application layers are responsible for ensuring data integrity before constructing the entity.
3. Mark all fields `readonly` — `Client` is an immutable snapshot. Mutation is handled by creating a new instance (write path is the `save` method on the repository).
4. Export the class and all supporting types from the same file.

**Implementation notes:**
- `pinHash` is assigned as-is from the data source. The entity never hashes or validates the PIN — that responsibility belongs to the auth use case (TASK-006).
- `modifications` defaults conceptually to `[]` but is stored as `string[]` — the infrastructure layer must guard against `undefined` when reading from Firestore.
- `createdAt` and `updatedAt` are `Date` objects inside the entity. The repository converts to/from Firestore `Timestamp` at the persistence boundary.
- No `id` field separate from `uid` — the Firebase Auth UID is the document ID and the entity identity.

---

### Step 2 — IClientRepository interface

**File:** `backend/src/domain/client/IClientRepository.ts`
**Action:** Create

**Interface definition:**
```typescript
import { Client } from './Client';

export interface IClientRepository {
  findByUid(uid: string): Promise<Client | null>;
  findByUsername(username: string): Promise<Client | null>;
  save(client: Client): Promise<void>;
}
```

**Implementation steps:**
1. Import `Client` from the same domain directory.
2. Define a minimal interface with exactly the three methods required by the acceptance criteria and the auth use cases.
3. `save` is `Promise<void>` — the Firestore `set()` call is a write with no meaningful return value at the domain level.

**Implementation notes:**
- The interface lives in the domain layer. The infrastructure implementation in Step 3 imports this interface — the dependency arrow points inward.
- No `update` or `delete` methods are defined — YAGNI. The auth use cases need create and lookup only.

---

### Step 3 — FirestoreClientRepository

**File:** `backend/src/infrastructure/repositories/FirestoreClientRepository.ts`
**Action:** Create

**Class signature:**
```typescript
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { Client, ClientData, Vehicle, Preferences } from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';

export class FirestoreClientRepository implements IClientRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) { ... }

  async findByUid(uid: string): Promise<Client | null> { ... }
  async findByUsername(username: string): Promise<Client | null> { ... }
  async save(client: Client): Promise<void> { ... }

  private toClient(data: FirebaseFirestore.DocumentData, uid: string): Client { ... }
  private toFirestore(client: Client): Record<string, unknown> { ... }
}
```

**Implementation steps:**

**`constructor`:**
- Accept a `Firestore` instance and assign to `this.db`.
- Do not call `getFirestore()` internally — receive it via constructor injection so the class remains testable without mocking the module.

**`findByUid`:**
1. Call `this.db.collection('clients').doc(uid).get()`.
2. If `snapshot.exists` is false, return `null`.
3. Call `this.toClient(snapshot.data()!, uid)` and return the result.

**`findByUsername`:**
1. Call `this.db.collection('clients').where('username', '==', username).limit(1).get()`.
2. If `querySnapshot.empty` is true, return `null`.
3. Take `querySnapshot.docs[0]`, call `this.toClient(doc.data(), doc.id)`, and return.

**`save`:**
1. Build the Firestore-compatible object via `this.toFirestore(client)`.
2. Call `this.db.collection('clients').doc(client.uid).set(firestoreData)`.
3. Return `void` (no return value needed).

**`toClient` (private):**
1. Accept raw `DocumentData` and `uid` string.
2. Map each Firestore field to the `ClientData` shape:
   - Convert `Timestamp` fields (`createdAt`, `updatedAt`) to `Date` via `.toDate()`.
   - Guard `vehicle.modifications` with `?? []` in case the array is absent.
   - Cast `preferences.experience` to `ExperienceLevel`.
3. Construct and return a `new Client(clientData)`.

**`toFirestore` (private):**
1. Accept a `Client` instance.
2. Return a plain object with:
   - All scalar fields copied directly.
   - `createdAt` and `updatedAt` as `Timestamp.fromDate(client.createdAt)`.
   - `vehicle` and `preferences` as plain objects (Firestore serializes them as maps automatically).

**Implementation notes:**
- Pass `Firestore` via constructor, not via `getFirestore()` at call time — this allows tests to inject a mock without touching the module system.
- `set()` (not `create()`) is used for `save` so the same method handles both first-write and subsequent overwrites. The auth use case (TASK-006) is responsible for ensuring uniqueness before calling `save`.
- Do not catch Firestore errors — let them propagate. Error handling at the HTTP layer is out of scope for this ticket.
- Import from `'firebase-admin/firestore'` (sub-path import), not `'firebase-admin'` directly, to keep the import surface minimal.

---

### Step 4 — Unit tests

**File:** `backend/src/infrastructure/repositories/FirestoreClientRepository.test.ts`
**Action:** Create

**Test cases:**

| Scenario | Method | Expected outcome |
|---|---|---|
| Document exists | `findByUid` | Returns a `Client` instance with all fields mapped correctly |
| Document does not exist | `findByUid` | Returns `null` |
| Username query returns result | `findByUsername` | Returns a `Client` instance |
| Username query returns empty | `findByUsername` | Returns `null` |
| Save a new client | `save` | Calls `set()` on the correct document reference with serialized data |
| Timestamps are converted | `findByUid` | `createdAt` and `updatedAt` are `Date` instances, not `Timestamp` |
| Missing modifications field | `findByUid` | `vehicle.modifications` defaults to `[]` |

**Implementation steps:**
1. Create a mock Firestore object (typed as `Firestore`) with `vi.fn()` stubs for `collection`, `doc`, `get`, `set`, `where`, `limit`.
2. Chain the stubs to reflect the Firestore fluent API: `collection()` → `doc()` → `get()`, and `collection()` → `where()` → `limit()` → `get()`.
3. For `findByUid` (found): make `get()` resolve with `{ exists: true, data: () => firestoreData, id: uid }`.
4. For `findByUid` (not found): make `get()` resolve with `{ exists: false }`.
5. For `findByUsername` (found): make `get()` resolve with `{ empty: false, docs: [{ data: () => firestoreData, id: uid }] }`.
6. For `findByUsername` (not found): make `get()` resolve with `{ empty: true, docs: [] }`.
7. For `save`: make `set()` resolve with `undefined`. Assert `set` was called with `expect.objectContaining({ uid, username, ... })` on the correct doc reference.
8. Use a `firestoreData` factory that includes `Timestamp` instances for `createdAt`/`updatedAt` so the `toDate()` conversion is verified.

**Implementation notes:**
- Do not use `vi.mock('firebase-admin')` — inject a plain mock object through the constructor instead. This is simpler and avoids module-level mocking complexity.
- Use `beforeEach` to reset all mock function call counts and implementations.
- Keep test data realistic (valid `uid`, `username`, `vehicle`, `preferences`, `pinHash`).

---

### Step 5 — Update technical documentation

**File:** `ARCHITECTURE.md`
**Action:** Verify the `## Backend Structure` section lists both `domain/client/Client.ts`, `domain/client/IClientRepository.ts`, and `infrastructure/repositories/FirestoreClientRepository.ts` — these are already present in the architecture spec. No content changes expected.

**File:** `ARCHITECTURE.md` — `## Data Model` → `clients` collection
**Action:** Verify field names match the entity exactly. No content changes expected.

---

## Implementation Order

| # | Step | File(s) |
|---|---|---|
| 0 | Create feature branch | — |
| 1 | `Client` entity + types | `backend/src/domain/client/Client.ts` |
| 2 | `IClientRepository` interface | `backend/src/domain/client/IClientRepository.ts` |
| 3 | `FirestoreClientRepository` | `backend/src/infrastructure/repositories/FirestoreClientRepository.ts` |
| 4 | Unit tests | `backend/src/infrastructure/repositories/FirestoreClientRepository.test.ts` |
| 5 | Documentation verification | `ARCHITECTURE.md` |

---

## Testing Checklist

- [ ] `npm test` passes with zero failures
- [ ] `findByUid` — found: returns a `Client` with all fields mapped
- [ ] `findByUid` — not found: returns `null`
- [ ] `findByUsername` — found: returns a `Client`
- [ ] `findByUsername` — not found: returns `null`
- [ ] `save` — calls `set()` on `clients/{uid}` with serialized data
- [ ] `createdAt` / `updatedAt` are `Date` instances after `toClient` conversion
- [ ] `vehicle.modifications` defaults to `[]` when absent from Firestore document
- [ ] Coverage ≥ 80% for `FirestoreClientRepository.ts`
- [ ] No `any` types in entity, interface, or repository

---

## Error Response Format

This ticket does not introduce HTTP endpoints. Firestore errors propagate as uncaught exceptions to the caller (future application service layer). HTTP error mapping is out of scope here.

---

## Partial Update Support

`save` uses Firestore `set()` which overwrites the entire document. Partial updates are not required for this ticket — the auth use case (TASK-006) always saves the full `Client` object.

---

## Dependencies

**Runtime:**
- `firebase-admin` ^12 — installed in TASK-003. Specifically, import from `firebase-admin/firestore` sub-path.

**Dev:**
- `vitest` — already added in TASK-001

**Ticket dependencies:**
- **TASK-003** must be merged first (provides `getFirestore()`). The repository itself does not call `getFirestore()` directly — it accepts `Firestore` via constructor injection — but the consuming application service (TASK-006) will obtain the instance from TASK-003.

---

## Notes

- All code and comments must be in English (project standard).
- `pinHash` is stored and retrieved verbatim. The repository never inspects, hashes, or validates it.
- `vehicle` is stored as a Firestore map (nested object), not a sub-collection.
- `modifications` is `string[]` and defaults to `[]` — guard against `undefined` when reading from Firestore.
- `preferences.experience` is a union type: `"beginner" | "intermediate" | "expert"`. Use a type cast at the persistence boundary; do not introduce runtime validation here.
- Timestamps: the entity uses JavaScript `Date`; Firestore uses its own `Timestamp` class. Always convert at the repository boundary.

---

## Next Steps After Implementation

After TASK-004 is merged:
- **TASK-005** — Conversation repository — follows the same pattern (entity + interface + Firestore implementation) for the `conversations` collection
- **TASK-006** — PIN auth backend — `RegisterUseCase` and `LoginUseCase` depend on `IClientRepository` and will call `findByUsername` and `save`

---

## Implementation Verification

**Code quality:**
- [ ] No `any` types in any file created by this ticket
- [ ] `Client` fields are all `readonly`
- [ ] `FirestoreClientRepository` receives `Firestore` via constructor (not module import)
- [ ] `toClient` and `toFirestore` are private methods
- [ ] `save` uses `set()`, not `create()` or `update()`

**Functionality:**
- [ ] `findByUid` returns `null` for non-existent documents
- [ ] `findByUsername` uses `.where('username', '==', ...).limit(1)`
- [ ] `createdAt` and `updatedAt` are correctly converted between `Date` ↔ `Timestamp`
- [ ] `vehicle.modifications ?? []` guard is in place

**Testing:**
- [ ] `npm test` exits 0
- [ ] All 7 test cases listed in Step 4 pass
- [ ] Coverage ≥ 80% for `FirestoreClientRepository.ts`

**Integration:**
- [ ] `IClientRepository` is imported from domain layer only — never from infrastructure
- [ ] `FirestoreClientRepository` imports `IClientRepository` from domain layer

**Documentation:**
- [ ] `ARCHITECTURE.md` backend structure still matches implementation
