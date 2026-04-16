# Backend Implementation Plan: TASK-001 Backend scaffold + healthcheck

## Overview

Set up the Express backend project following Clean Architecture principles, with TypeScript strict mode, a working `GET /health` endpoint, and Vitest configured for unit testing. This is the foundational scaffold from which all subsequent backend tasks build — no database, auth, or agent code.

Architecture principles: Clean Architecture, DDD layering, dependency injection, single responsibility per file.

---

## Architecture Context

**Layers involved:** Presentation only (health route does not require domain/application layers).

**Components/files created:**

| File | Layer | Purpose |
|---|---|---|
| `backend/package.json` | — | Dependencies, scripts |
| `backend/tsconfig.json` | — | TypeScript strict config |
| `backend/vitest.config.ts` | — | Vitest test runner config |
| `backend/src/index.ts` | — | Server entry point |
| `backend/src/presentation/app.ts` | Presentation | Express app factory |
| `backend/src/presentation/routes/health.route.ts` | Presentation | `GET /health` route |
| `backend/src/presentation/routes/health.route.test.ts` | Test | Smoke test for health route |

All other layer directories (`domain/`, `application/`, `infrastructure/`) are created as empty scaffolds (with `.gitkeep`) to establish the folder structure for downstream tasks.

---

## Implementation Steps

### Step 0 — Create feature branch

```bash
git checkout main && git pull origin main
git checkout -b TASK-001-backend-scaffold
```

---

### Step 1 — Initialize `backend/` package

**File:** `backend/package.json`
**Action:** Create

```json
{
  "name": "offroad-chabot-backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/supertest": "^6.0.2",
    "@vitest/coverage-v8": "^1.2.0",
    "supertest": "^6.3.4",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  }
}
```

**Implementation notes:**
- `supertest` is used to test the Express app without starting a real server.
- `ts-node-dev` provides hot reload in development without a separate build step.

---

### Step 2 — TypeScript configuration

**File:** `backend/tsconfig.json`
**Action:** Create

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

### Step 3 — Vitest configuration

**File:** `backend/vitest.config.ts`
**Action:** Create

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

---

### Step 4 — Clean Architecture folder scaffold

**Action:** Create the following directories with `.gitkeep` so the structure is committed:

```
backend/src/domain/client/.gitkeep
backend/src/domain/conversation/.gitkeep
backend/src/application/auth/.gitkeep
backend/src/application/chat/.gitkeep
backend/src/infrastructure/firebase/.gitkeep
backend/src/infrastructure/repositories/.gitkeep
backend/src/infrastructure/agent/tools/.gitkeep
backend/src/infrastructure/agent/memory/.gitkeep
backend/src/presentation/middleware/.gitkeep
```

**Implementation notes:** These directories are stubs; they will be populated in TASK-003 onwards. Do not add any TypeScript files here in this ticket.

---

### Step 5 — Health route

**File:** `backend/src/presentation/routes/health.route.ts`
**Action:** Create

```typescript
import { Router, Request, Response } from 'express';

const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok' });
});

export { healthRouter };
```

**Function signature:** `GET /health` → `200 { status: "ok" }`

---

### Step 6 — Express app factory

**File:** `backend/src/presentation/app.ts`
**Action:** Create

```typescript
import express, { Application } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.route';

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter);

  return app;
}
```

**Implementation notes:**
- App factory pattern (not a singleton) enables test isolation — each test gets a fresh app instance.
- CORS is permissive here; will be tightened in the deployment ticket (TASK-018).

---

### Step 7 — Server entry point

**File:** `backend/src/index.ts`
**Action:** Create

```typescript
import { createApp } from './presentation/app';

const PORT = process.env.PORT ?? 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Implementation notes:** `process.env.PORT` allows the port to be overridden in any environment. No env validation here — that is TASK-003's responsibility.

---

### Step 8 — Health route smoke test

**File:** `backend/src/presentation/routes/health.route.test.ts`
**Action:** Create

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('GET /health', () => {
  const app = createApp();

  it('should return 200 with status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

**Test cases covered:**
- Happy path: `GET /health` returns `200 { status: "ok" }`

---

### Step 9 — Update technical documentation

**File:** `ARCHITECTURE.md`
**Action:** Update the `## Backend Structure` section to confirm the scaffold is in place if any file names or paths differ from the initial spec.

**File:** `ai-specs/specs/backend-standards.mdc`
**Action:** Verify the `### Development Scripts` section matches the scripts defined in `package.json` (update if `ts-node-dev` differs from what is documented).

---

## Implementation Order

| # | Step | File(s) |
|---|---|---|
| 0 | Create feature branch | — |
| 1 | `package.json` | `backend/package.json` |
| 2 | TypeScript config | `backend/tsconfig.json` |
| 3 | Vitest config | `backend/vitest.config.ts` |
| 4 | Folder scaffold | `backend/src/**/.gitkeep` |
| 5 | Health route | `backend/src/presentation/routes/health.route.ts` |
| 6 | App factory | `backend/src/presentation/app.ts` |
| 7 | Server entry point | `backend/src/index.ts` |
| 8 | Smoke test | `backend/src/presentation/routes/health.route.test.ts` |
| 9 | Documentation update | `ARCHITECTURE.md`, `backend-standards.mdc` |

---

## Testing Checklist

- [ ] `npm test` passes with zero failures
- [ ] `GET /health` returns `200 { status: "ok" }`
- [ ] Coverage report shows ≥ 80% for the presentation layer files in scope
- [ ] `npm run dev` starts the server without errors on port 3001
- [ ] `npm run build` compiles TypeScript without errors
- [ ] TypeScript strict mode produces no errors (`tsc --noEmit`)

---

## Error Response Format

This ticket only introduces the health endpoint, which has no error paths. The error response format convention (used from TASK-004 onwards) is:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable description",
    "code": "SCREAMING_SNAKE_CASE_CODE"
  }
}
```

HTTP status mapping:
| Status | Meaning |
|---|---|
| 400 | Validation error / bad request |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Resource not found |
| 500 | Unexpected server error |

---

## Dependencies

**Runtime:**
- `express` ^4.18 — HTTP framework
- `cors` ^2.8 — CORS middleware

**Dev:**
- `typescript` ^5.3 — Type compiler
- `ts-node-dev` ^2.0 — Hot-reload dev server
- `vitest` ^1.2 — Test runner
- `supertest` ^6.3 — HTTP integration testing for Express
- `@vitest/coverage-v8` ^1.2 — Coverage provider

No Firebase, LangChain, or bcrypt dependencies in this ticket.

---

## Notes

- All code and comments must be in English (project standard).
- No database, auth, or agent code belongs in this ticket.
- The app factory pattern (`createApp()`) is intentional — it keeps the server startup (`index.ts`) separate from the Express app definition, making the app fully testable without binding to a port.
- Coverage threshold is 80% per `ai-specs/project.yml`; Vitest config reflects this.

---

## Next Steps After Implementation

After TASK-001 is merged:
- **TASK-003** — Firebase Admin SDK init + env validation (populates `infrastructure/firebase/`)
- **TASK-004** — Client repository (populates `domain/client/` and `infrastructure/repositories/`)

---

## Implementation Verification

**Code quality:**
- [ ] No `any` types used
- [ ] All files have explicit return types on exported functions
- [ ] Imports are at the top of each file (no dynamic imports inside functions)
- [ ] Naming follows camelCase for files, PascalCase for classes/types

**Functionality:**
- [ ] `npm run dev` starts without errors
- [ ] `curl http://localhost:3001/health` returns `{"status":"ok"}`

**Testing:**
- [ ] `npm test` exits 0
- [ ] Coverage threshold (80%) met or exceeded

**Integration:**
- [ ] Folder structure matches `ARCHITECTURE.md` → Backend Structure exactly
- [ ] No files outside the defined structure are introduced

**Documentation:**
- [ ] `ARCHITECTURE.md` reflects the final scaffold if any names changed
