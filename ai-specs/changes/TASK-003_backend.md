# Backend Implementation Plan: TASK-003 Firebase Admin SDK init + env validation

## Overview

Initialize the Firebase Admin SDK as a singleton in `backend/src/infrastructure/firebase/firebaseAdmin.ts` and validate all required environment variables at process startup. All Firestore repository implementations (TASK-004, TASK-005) and the auth token issuer (TASK-006) depend on this singleton being available before any request is handled. The app must fail fast with a clear error message if any required variable is missing — no silent partial initialization.

Architecture principles: Infrastructure layer only (no domain or application code touched). Singleton pattern with re-initialization guard. Environment validation at module load time, not at request time.

---

## Architecture Context

**Layer:** Infrastructure

**Components/files created or modified:**

| File | Action | Purpose |
|---|---|---|
| `backend/src/infrastructure/firebase/firebaseAdmin.ts` | Create | Admin SDK singleton + env validation |
| `backend/src/infrastructure/firebase/firebaseAdmin.test.ts` | Create | Unit tests: missing env vars, re-init guard |
| `backend/.env.example` | Create | Documents all required env vars |
| `backend/src/index.ts` | Modify | Import `firebaseAdmin` early so validation runs at startup |

**No domain, application, or presentation layer files are touched in this ticket.**

---

## Implementation Steps

### Step 0 — Create feature branch

```bash
git checkout main && git pull origin main
git checkout -b TASK-003-firebase-admin-init
```

---

### Step 1 — Install `firebase-admin`

**File:** `backend/package.json`
**Action:** Add runtime dependency

```bash
cd backend && npm install firebase-admin
```

**Implementation notes:**
- `firebase-admin` is a runtime dependency, not dev-only.
- No type package needed — `firebase-admin` ships its own TypeScript declarations.

---

### Step 2 — Firebase Admin SDK singleton

**File:** `backend/src/infrastructure/firebase/firebaseAdmin.ts`
**Action:** Create

**Function signatures:**
```typescript
function validateEnv(): void   // throws if any required var is missing
export function getFirebaseAdmin(): admin.app.App   // returns initialized singleton
export function getFirestore(): admin.firestore.Firestore  // convenience accessor
```

**Implementation steps:**
1. Read `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` from `process.env`.
2. Call `validateEnv()` — throw `Error` with a descriptive message listing every missing variable.
3. Handle the `FIREBASE_PRIVATE_KEY` newline escape: replace `\\n` with `\n` (service account JSON private keys stored in `.env` files serialize newlines as literal `\\n`).
4. Guard re-initialization: check `admin.apps.length > 0` before calling `admin.initializeApp()`.
5. Export `getFirebaseAdmin()` and `getFirestore()` accessors so callers never hold a direct reference to the singleton — they always go through the getter.

**Dependencies:** `firebase-admin`

**Implementation notes:**
- Module-level validation (called at `import` time) means the process exits before Express binds to a port if env vars are absent. This is intentional — it surfaces misconfigurations in CI/CD before any traffic arrives.
- The private key newline transform (`\\n` → `\n`) is required because `.env` files do not support multi-line values natively; most env management tools store the key with literal `\n` escape sequences.
- Do not log the private key or client email at any log level.

---

### Step 3 — `.env.example`

**File:** `backend/.env.example`
**Action:** Create

```
# Server
PORT=3001

# Firebase Admin SDK — required
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Implementation notes:**
- The `FIREBASE_PRIVATE_KEY` value must be quoted in the actual `.env` file if it contains newlines.
- Add `backend/.env` to `.gitignore` if not already present (check root `.gitignore`).

---

### Step 4 — Wire startup import in `index.ts`

**File:** `backend/src/index.ts`
**Action:** Add import at the top of the file (before `createApp()` is called)

```typescript
import './infrastructure/firebase/firebaseAdmin';
```

**Implementation notes:**
- Importing the module triggers `validateEnv()` at module load time, so the process fails before the Express app is constructed if env vars are missing.
- The import has a side effect (initialization) — this is intentional and acceptable for a singleton infrastructure module.

---

### Step 5 — Unit tests

**File:** `backend/src/infrastructure/firebase/firebaseAdmin.test.ts`
**Action:** Create

**Test cases:**

| Scenario | Expected outcome |
|---|---|
| All required env vars present | `getFirebaseAdmin()` returns an `app.App` instance |
| `FIREBASE_PROJECT_ID` missing | throws `Error` mentioning `FIREBASE_PROJECT_ID` |
| `FIREBASE_CLIENT_EMAIL` missing | throws `Error` mentioning `FIREBASE_CLIENT_EMAIL` |
| `FIREBASE_PRIVATE_KEY` missing | throws `Error` mentioning `FIREBASE_PRIVATE_KEY` |
| Multiple vars missing | throws `Error` listing all missing vars |
| Module imported twice | only one Firebase app is initialized (re-init guard) |

**Implementation steps:**
1. Mock `firebase-admin` with `vi.mock('firebase-admin')` to avoid real SDK initialization.
2. For each missing-var test: `delete process.env.FIREBASE_XXX` before re-importing the module via `vi.resetModules()` + dynamic `import()` inside the test body.
3. Assert the thrown error message contains the variable name(s).
4. For the re-init guard test: mock `admin.apps` to return a non-empty array and verify `initializeApp` is not called a second time.

**Implementation notes:**
- Use `vi.resetModules()` before each test that needs to re-evaluate the module with different env vars — this is essential because Node caches modules by default.
- Restore `process.env` after each test to avoid test pollution (`afterEach` with stored original values).

---

### Step 6 — Update technical documentation

**File:** `ARCHITECTURE.md`
**Action:** Verify the `## Backend Structure` section shows `infrastructure/firebase/firebaseAdmin.ts` — no change expected, this already matches the spec.

**File:** `backend/.gitignore` (or root `.gitignore`)
**Action:** Confirm `backend/.env` is listed. Add if missing:
```
backend/.env
```

---

## Implementation Order

| # | Step | File(s) |
|---|---|---|
| 0 | Create feature branch | — |
| 1 | Install `firebase-admin` | `backend/package.json` |
| 2 | Firebase Admin singleton | `backend/src/infrastructure/firebase/firebaseAdmin.ts` |
| 3 | `.env.example` | `backend/.env.example` |
| 4 | Startup import in `index.ts` | `backend/src/index.ts` |
| 5 | Unit tests | `backend/src/infrastructure/firebase/firebaseAdmin.test.ts` |
| 6 | Documentation + `.gitignore` check | `ARCHITECTURE.md`, `.gitignore` |

---

## Testing Checklist

- [ ] `npm test` passes with zero failures
- [ ] Test: all env vars present → SDK initializes without error
- [ ] Test: each required env var missing individually → descriptive error thrown
- [ ] Test: multiple missing vars → error lists all of them
- [ ] Test: re-import of the module does not call `initializeApp` twice
- [ ] `npm run dev` fails with a clear error message when `.env` is absent or incomplete
- [ ] `npm run dev` starts normally when `.env` is present and valid
- [ ] Coverage ≥ 80% for `firebaseAdmin.ts`

---

## Error Response Format

This ticket is infrastructure-only and does not introduce HTTP endpoints. The validation error is thrown as a plain `Error` before Express starts, and is surfaced via `process.exit` or uncaught exception at startup:

```
Error: Missing required environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY
    at validateEnv (backend/src/infrastructure/firebase/firebaseAdmin.ts:N:N)
```

No HTTP error response format applies here. HTTP error conventions are established in TASK-001 and used from TASK-006 onwards.

---

## Dependencies

**Runtime (new):**
- `firebase-admin` ^12 — Firebase Admin SDK (Firestore, Auth, custom tokens)

**Dev (no new additions):**
- `vitest` — already added in TASK-001
- `vi.mock` — built into Vitest, no extra package

---

## Notes

- All code and comments must be in English (project standard).
- Never hard-code credentials. Never log `FIREBASE_PRIVATE_KEY` or `FIREBASE_CLIENT_EMAIL`.
- The private key newline transform (`\\n` → `\n`) is a known Firebase Admin SDK requirement when the key is stored as a single-line env var. Document this in `.env.example` with the quoted format.
- This singleton is consumed by TASK-004 (`FirestoreClientRepository`), TASK-005 (`FirestoreConversationRepository`), and TASK-006 (auth custom token issuance). They must not re-import `firebase-admin` directly — they must call `getFirestore()` or `getFirebaseAdmin()` from this module.

---

## Next Steps After Implementation

After TASK-003 is merged:
- **TASK-004** — Client repository (`FirestoreClientRepository`) — calls `getFirestore()`
- **TASK-005** — Conversation repository (`FirestoreConversationRepository`) — calls `getFirestore()`
- **TASK-006** — PIN auth backend — calls `getFirebaseAdmin().auth()` to issue custom tokens

---

## Implementation Verification

**Code quality:**
- [ ] No `any` types
- [ ] `validateEnv` is a private function (not exported); only `getFirebaseAdmin()` and `getFirestore()` are exported
- [ ] `FIREBASE_PRIVATE_KEY` newline transform is applied before `initializeApp`
- [ ] Re-initialization guard (`admin.apps.length > 0`) is in place

**Functionality:**
- [ ] `npm run dev` exits with a non-zero code and prints which env vars are missing when `.env` is absent
- [ ] `npm run dev` starts normally when `.env` is complete

**Testing:**
- [ ] `npm test` exits 0
- [ ] All 6 test cases listed in Step 5 pass
- [ ] Coverage ≥ 80% for `firebaseAdmin.ts`

**Integration:**
- [ ] `backend/src/index.ts` imports `firebaseAdmin` before `createApp()` is called
- [ ] `backend/.env.example` documents all three required Firebase vars with example values
- [ ] `backend/.env` is in `.gitignore`

**Documentation:**
- [ ] `ARCHITECTURE.md` backend structure still matches implementation
- [ ] `.env.example` is accurate and complete
