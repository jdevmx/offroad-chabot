# Backend Implementation Plan: TASK-006 PIN Auth Backend (register, login, check-username, custom token)

## Overview

Implement the full PIN-based authentication flow on the backend. This covers two application-layer use cases (`RegisterUseCase`, `LoginUseCase`), one endpoint for username availability (`GET /auth/check-username`), and two auth endpoints (`POST /auth/register`, `POST /auth/login`).

**PIN hashing** is handled with bcrypt. **Firebase custom tokens** are issued via the Firebase Admin SDK (`firebase-admin/auth`). No password recovery or email is required — this is a prototype.

Architecture principles: Domain layer is read-only (entities and interfaces already exist from TASK-004). Application layer owns the use cases and all business rules. Infrastructure layer wires up the repository. Presentation layer provides thin controllers and route registration.

---

## Architecture Context

**Layers involved:** Application → Domain → Infrastructure → Presentation

**Components / files created or modified:**

| File | Action | Purpose |
|---|---|---|
| `backend/src/application/auth/RegisterUseCase.ts` | Create | Validates input, checks uniqueness, hashes PIN, creates Firebase Auth user, saves client, returns custom token |
| `backend/src/application/auth/LoginUseCase.ts` | Create | Looks up client by username, verifies PIN, returns custom token |
| `backend/src/application/auth/RegisterUseCase.test.ts` | Create | Unit tests for `RegisterUseCase` |
| `backend/src/application/auth/LoginUseCase.test.ts` | Create | Unit tests for `LoginUseCase` |
| `backend/src/presentation/controllers/auth.controller.ts` | Create | Thin controller — delegates to use cases, maps to HTTP |
| `backend/src/presentation/routes/auth.route.ts` | Create | Route registration for `/auth/*` |
| `backend/src/presentation/app.ts` | Modify | Mount the auth router |

**Consumed (must already exist):**
- `backend/src/domain/client/Client.ts` — `Client` entity, `Vehicle`, `Preferences`, `ClientData` types (TASK-004)
- `backend/src/domain/client/IClientRepository.ts` — `IClientRepository` interface (TASK-004)
- `backend/src/infrastructure/firebase/firebaseAdmin.ts` — `getFirestore()`, `getAuth()` (TASK-003)
- `backend/src/infrastructure/repositories/FirestoreClientRepository.ts` — `FirestoreClientRepository` (TASK-004)

---

## Implementation Steps

### Step 0 — Verify working tree and start on main

```bash
git checkout main && git pull origin main
```

> Per project convention: prototype work is committed directly to `main`. No feature branch is created.

---

### Step 1 — RegisterUseCase

**File:** `backend/src/application/auth/RegisterUseCase.ts`
**Action:** Create

**Input / output types:**

```typescript
export interface RegisterInput {
  username: string;
  displayName: string;
  pin: string;           // raw 4-digit string, validated here
  vehicle: {
    make: string;
    model: string;
    year: number;
    trim?: string;
    modifications: string[];
  };
  preferences: {
    terrainTypes: string[];
    experience: 'beginner' | 'intermediate' | 'expert';
  };
}

export interface RegisterOutput {
  customToken: string;
  uid: string;
}
```

**Class signature:**

```typescript
import bcrypt from 'bcrypt';
import { Auth } from 'firebase-admin/auth';
import { Client } from '../../domain/client/Client';
import { IClientRepository } from '../../domain/client/IClientRepository';

export class RegisterUseCase {
  constructor(
    private readonly repo: IClientRepository,
    private readonly auth: Auth,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> { ... }
}
```

**Implementation steps:**

1. **Validate input** (fail fast):
   - `username`: non-empty string, 3–30 characters, alphanumeric + underscores only (`/^[a-zA-Z0-9_]{3,30}$/`). Throw a `ValidationError` if invalid.
   - `displayName`: non-empty string, max 60 characters. Throw `ValidationError` if invalid.
   - `pin`: exactly 4 digits (`/^\d{4}$/`). Throw `ValidationError` if invalid.
   - `vehicle.make`, `vehicle.model`: non-empty strings. Throw `ValidationError` if missing.
   - `vehicle.year`: integer, 1950 ≤ year ≤ current year + 1. Throw `ValidationError` if out of range.
   - `preferences.experience`: must be one of `'beginner' | 'intermediate' | 'expert'`. Throw `ValidationError` if invalid.

2. **Check username uniqueness:**
   - Call `this.repo.findByUsername(input.username)`.
   - If a client is returned, throw a `ConflictError('Username already taken')`.

3. **Create Firebase Auth user:**
   - Call `this.auth.createUser({ displayName: input.displayName })` (no email, no password — Firebase generates the UID).
   - Capture the returned `uid`.

4. **Hash the PIN:**
   - Call `await bcrypt.hash(input.pin, 10)` to get `pinHash`.

5. **Build and save the Client entity:**
   - Construct a `ClientData` object with all fields, `uid` from step 3, `pinHash` from step 4, `createdAt: new Date()`, `updatedAt: new Date()`.
   - Instantiate `new Client(clientData)`.
   - Call `await this.repo.save(client)`.

6. **Issue custom token:**
   - Call `await this.auth.createCustomToken(uid)`.

7. **Return** `{ customToken, uid }`.

**Error classes to define in this file or a shared `errors.ts`:**

```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

> Place `ValidationError` and `ConflictError` in `backend/src/domain/errors.ts` (create if it does not exist) so they can be reused in `LoginUseCase` and future use cases.

**Implementation notes:**
- `bcrypt.hash` cost factor `10` is sufficient for a prototype. Do not make this configurable.
- `this.auth.createUser()` can throw `FirebaseAuthError`. Let it propagate — the controller will catch it as an unhandled 500.
- The use case does **not** receive or return a `FirestoreClientRepository` directly — it depends on the `IClientRepository` interface (DIP).
- `vehicle.modifications` defaults to `[]` if not provided by the caller. Guard with `input.vehicle.modifications ?? []`.

---

### Step 2 — LoginUseCase

**File:** `backend/src/application/auth/LoginUseCase.ts`
**Action:** Create

**Input / output types:**

```typescript
export interface LoginInput {
  username: string;
  pin: string;
}

export interface LoginOutput {
  customToken: string;
  uid: string;
}
```

**Class signature:**

```typescript
import bcrypt from 'bcrypt';
import { Auth } from 'firebase-admin/auth';
import { IClientRepository } from '../../domain/client/IClientRepository';
import { NotFoundError, ValidationError } from '../../domain/errors';

export class LoginUseCase {
  constructor(
    private readonly repo: IClientRepository,
    private readonly auth: Auth,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> { ... }
}
```

**Implementation steps:**

1. **Validate input:**
   - `username`: non-empty string. Throw `ValidationError` if empty.
   - `pin`: exactly 4 digits. Throw `ValidationError` if invalid.

2. **Look up client:**
   - Call `await this.repo.findByUsername(input.username)`.
   - If `null`, throw a `NotFoundError('Invalid username or PIN')`. Use the same generic message to avoid username enumeration.

3. **Verify PIN:**
   - Call `await bcrypt.compare(input.pin, client.pinHash)`.
   - If `false`, throw a `NotFoundError('Invalid username or PIN')`.

4. **Issue custom token:**
   - Call `await this.auth.createCustomToken(client.uid)`.

5. **Return** `{ customToken, uid: client.uid }`.

**Add to `backend/src/domain/errors.ts`:**

```typescript
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

**Implementation notes:**
- The same generic error message for "not found" and "wrong PIN" prevents username enumeration.
- Do not log the raw PIN at any point.

---

### Step 3 — Domain error classes

**File:** `backend/src/domain/errors.ts`
**Action:** Create (if it does not already exist)

```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

> Create this file first (before the use cases) so both use cases can import from it.

---

### Step 4 — Auth controller

**File:** `backend/src/presentation/controllers/auth.controller.ts`
**Action:** Create

**Function signatures:**

```typescript
import { Request, Response, NextFunction } from 'express';

export async function checkUsername(req: Request, res: Response, next: NextFunction): Promise<void> { ... }
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> { ... }
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> { ... }
```

**Implementation steps for each handler:**

**`checkUsername`:**
1. Read `username` from `req.query.username` (string). If absent or empty, return 400 `{ error: 'username query param required' }`.
2. Obtain an `IClientRepository` instance via `new FirestoreClientRepository(getFirestore())`.
3. Call `await repo.findByUsername(username)`.
4. Return 200 `{ available: client === null }`.

**`register`:**
1. Destructure `username`, `displayName`, `pin`, `vehicle`, `preferences` from `req.body`.
2. Instantiate `new RegisterUseCase(new FirestoreClientRepository(getFirestore()), getAuth())`.
3. Call `await useCase.execute({ username, displayName, pin, vehicle, preferences })`.
4. Return 201 `{ customToken, uid }`.

**`login`:**
1. Destructure `username`, `pin` from `req.body`.
2. Instantiate `new LoginUseCase(new FirestoreClientRepository(getFirestore()), getAuth())`.
3. Call `await useCase.execute({ username, pin })`.
4. Return 200 `{ customToken, uid }`.

**Error mapping in controller (via `next(error)`):**
- Use Express error middleware (already established or to be added in `app.ts`) to map domain errors to HTTP codes:
  - `ValidationError` → 400
  - `ConflictError` → 409
  - `NotFoundError` → 401 (for login) / 404 elsewhere
- Controllers should call `next(error)` on catch — no inline HTTP mapping.

**Implementation notes:**
- Instantiate use cases inside each handler (no module-level singletons). This keeps the controller simple and avoids shared state.
- Do not validate the request body in the controller — that is the use case's responsibility.
- Import `getFirestore` and `getAuth` from `../../infrastructure/firebase/firebaseAdmin`.

---

### Step 5 — Auth router

**File:** `backend/src/presentation/routes/auth.route.ts`
**Action:** Create

```typescript
import { Router } from 'express';
import { checkUsername, register, login } from '../controllers/auth.controller';

const router = Router();

router.get('/check-username', checkUsername);
router.post('/register', register);
router.post('/login', login);

export default router;
```

---

### Step 6 — Mount router in app.ts

**File:** `backend/src/presentation/app.ts`
**Action:** Modify

1. Import the auth router: `import authRouter from './routes/auth.route';`
2. Mount it: `app.use('/auth', authRouter);`
3. Ensure the global error middleware (see below) is registered **after** all routes.

**Global error middleware to add (if not already present):**

```typescript
import { ValidationError, ConflictError, NotFoundError } from '../domain/errors';

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(401).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});
```

---

### Step 7 — Unit tests: RegisterUseCase

**File:** `backend/src/application/auth/RegisterUseCase.test.ts`
**Action:** Create

**Test cases:**

| Scenario | Expected |
|---|---|
| Valid input — happy path | Calls `repo.findByUsername`, `auth.createUser`, `bcrypt.hash`, `repo.save`, `auth.createCustomToken`; returns `{ customToken, uid }` |
| Username already taken | `repo.findByUsername` returns a client → throws `ConflictError` |
| Invalid username format (too short, special chars) | Throws `ValidationError` before any repo call |
| Invalid PIN (not 4 digits, letters, 5+ digits) | Throws `ValidationError` before any repo call |
| Invalid vehicle year (before 1950) | Throws `ValidationError` |
| Invalid experience level | Throws `ValidationError` |
| Missing vehicle.make | Throws `ValidationError` |
| `modifications` absent | Defaults to `[]` — `repo.save` is called with `vehicle.modifications = []` |

**Mock strategy:**
- Mock `IClientRepository` with `vi.fn()` stubs for `findByUsername` and `save`.
- Mock `Auth` with `vi.fn()` stubs for `createUser` (resolves `{ uid: 'test-uid' }`) and `createCustomToken` (resolves `'test-token'`).
- Mock `bcrypt` module: `vi.mock('bcrypt')` — stub `hash` to return `'hashed-pin'`.
- Do not mock domain errors — let them throw naturally.

---

### Step 8 — Unit tests: LoginUseCase

**File:** `backend/src/application/auth/LoginUseCase.test.ts`
**Action:** Create

**Test cases:**

| Scenario | Expected |
|---|---|
| Valid credentials — happy path | `repo.findByUsername` returns client, `bcrypt.compare` returns `true`, returns `{ customToken, uid }` |
| Username not found | `repo.findByUsername` returns `null` → throws `NotFoundError` with generic message |
| Wrong PIN | `bcrypt.compare` returns `false` → throws `NotFoundError` with same generic message |
| Empty username | Throws `ValidationError` before any repo call |
| Invalid PIN format | Throws `ValidationError` before any repo call |

**Mock strategy:**
- Mock `IClientRepository` with a `vi.fn()` stub for `findByUsername`.
- Mock `Auth` with a `vi.fn()` stub for `createCustomToken`.
- Mock `bcrypt`: `vi.mock('bcrypt')` — stub `compare` to return configurable boolean per test.

---

### Step 9 — Install bcrypt dependency

```bash
cd backend && npm install bcrypt && npm install --save-dev @types/bcrypt
```

Verify the package is added to `backend/package.json` under `dependencies`.

---

### Step 10 — Update technical documentation

**File:** `ARCHITECTURE.md`
**Action:** Verify the `## Auth Strategy` and `## Backend Structure` sections match the implementation. Specifically:
- `auth.route.ts` maps to the three endpoints described in the auth strategy section.
- `RegisterUseCase.ts` and `LoginUseCase.ts` are listed under `application/auth/`.
- `errors.ts` is listed under `domain/`.

No structural changes to `ARCHITECTURE.md` are expected — the spec already describes this feature. Add any detail only if a discrepancy is found.

---

## Implementation Order

| # | Step | File(s) |
|---|---|---|
| 0 | Verify clean `main` branch | — |
| 1 | Domain error classes | `backend/src/domain/errors.ts` |
| 2 | `RegisterUseCase` | `backend/src/application/auth/RegisterUseCase.ts` |
| 3 | `LoginUseCase` | `backend/src/application/auth/LoginUseCase.ts` |
| 4 | Auth controller | `backend/src/presentation/controllers/auth.controller.ts` |
| 5 | Auth router | `backend/src/presentation/routes/auth.route.ts` |
| 6 | Mount router + error middleware in `app.ts` | `backend/src/presentation/app.ts` |
| 7 | Install `bcrypt` | `backend/package.json` |
| 8 | Unit tests — `RegisterUseCase` | `backend/src/application/auth/RegisterUseCase.test.ts` |
| 9 | Unit tests — `LoginUseCase` | `backend/src/application/auth/LoginUseCase.test.ts` |
| 10 | Documentation verification | `ARCHITECTURE.md` |

---

## Testing Checklist

- [ ] `npm test` (in `backend/`) passes with zero failures
- [ ] `RegisterUseCase` — happy path: `customToken` and `uid` returned
- [ ] `RegisterUseCase` — duplicate username: `ConflictError` thrown
- [ ] `RegisterUseCase` — invalid username format: `ValidationError` thrown
- [ ] `RegisterUseCase` — invalid PIN: `ValidationError` thrown
- [ ] `RegisterUseCase` — invalid year: `ValidationError` thrown
- [ ] `RegisterUseCase` — missing modifications: defaults to `[]`
- [ ] `LoginUseCase` — happy path: `customToken` and `uid` returned
- [ ] `LoginUseCase` — username not found: `NotFoundError` with generic message
- [ ] `LoginUseCase` — wrong PIN: `NotFoundError` with same generic message
- [ ] `LoginUseCase` — invalid PIN format: `ValidationError` thrown
- [ ] Coverage ≥ 80% for both use case files

---

## Error Response Format

All errors are caught by the global Express error middleware in `app.ts`.

| Domain Error | HTTP Status | Response body |
|---|---|---|
| `ValidationError` | 400 | `{ "error": "<message>" }` |
| `ConflictError` | 409 | `{ "error": "<message>" }` |
| `NotFoundError` | 401 | `{ "error": "Invalid username or PIN" }` |
| Unhandled error | 500 | `{ "error": "Internal server error" }` |

**Example — duplicate username:**
```json
HTTP 409
{ "error": "Username already taken" }
```

**Example — wrong PIN:**
```json
HTTP 401
{ "error": "Invalid username or PIN" }
```

**Example — check-username (available):**
```json
HTTP 200
{ "available": true }
```

---

## Dependencies

**Runtime (new):**
- `bcrypt` — PIN hashing. Install via `npm install bcrypt`.
- `@types/bcrypt` (dev) — TypeScript types.

**Runtime (already installed):**
- `firebase-admin` ^12 — Firebase Auth and Firestore (TASK-003)
- `express` — web framework (TASK-001)

**Ticket dependencies:**
- **TASK-003** — `firebaseAdmin.ts` must export `getAuth()` in addition to `getFirestore()`. If it does not yet export `getAuth()`, add it as part of this ticket.
- **TASK-004** — `Client` entity, `IClientRepository`, and `FirestoreClientRepository` must be available.

---

## Notes

- All code, comments, variable names, and error messages must be in English (project standard).
- No password recovery flow — this is an explicit prototype trade-off documented in `ARCHITECTURE.md`.
- Custom tokens expire after one hour (Firebase default). The frontend must refresh via `signInWithCustomToken` if the session is still needed after expiry.
- Do not log raw PIN values at any point.
- `createUser` in Firebase Admin creates a new Auth user without email/password. The UID generated by Firebase becomes the Firestore document key.
- Username enumeration is mitigated by returning the same generic error for "not found" and "wrong PIN" in the login flow.
- `bcrypt` cost factor `10` is intentional — do not lower it below 10.

---

## Next Steps After Implementation

- **TASK-007** — Auth middleware: verify Firebase ID tokens on protected routes. Depends on TASK-006 having established the Firebase Auth user creation pattern.
- **TASK-012** — POST /chat endpoint: uses the auth middleware from TASK-007 to identify the authenticated user.

---

## Implementation Verification

**Code quality:**
- [ ] No `any` types in use case files, controller, or router
- [ ] `RegisterUseCase` and `LoginUseCase` depend on `IClientRepository` interface, not the concrete `FirestoreClientRepository`
- [ ] `ValidationError`, `ConflictError`, `NotFoundError` are defined in `domain/errors.ts` and imported from there
- [ ] Controller instantiates use cases inline — no module-level singletons

**Functionality:**
- [ ] `GET /auth/check-username?username=xxx` returns `{ available: boolean }`
- [ ] `POST /auth/register` returns 201 with `{ customToken, uid }` on success
- [ ] `POST /auth/login` returns 200 with `{ customToken, uid }` on success
- [ ] Duplicate username returns 409
- [ ] Wrong PIN returns 401 with the same message as "not found"
- [ ] Invalid input returns 400

**Testing:**
- [ ] `npm test` exits 0
- [ ] All `RegisterUseCase` test cases pass
- [ ] All `LoginUseCase` test cases pass
- [ ] Coverage ≥ 80% for `RegisterUseCase.ts` and `LoginUseCase.ts`

**Integration:**
- [ ] `app.ts` mounts `authRouter` at `/auth`
- [ ] Global error middleware is registered after all routes in `app.ts`
- [ ] `getAuth()` is exported from `firebaseAdmin.ts`

**Documentation:**
- [ ] `ARCHITECTURE.md` auth strategy and backend structure sections still match implementation
