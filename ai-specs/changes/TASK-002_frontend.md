# Frontend Implementation Plan: TASK-002 Frontend scaffold + single-page shell

## Overview

Initialize the Next.js (App Router) frontend with TypeScript strict mode and Tailwind CSS. Implement the single-page shell at route `/` following the two-column ASCII layout defined in `ARCHITECTURE.md` (§ UI Layout): left panel (~25% width) and a chat area filling the remaining space. All components are stubs — no auth logic, no API calls, no Firebase SDK.

Architecture principles: component-based, service layer (typed stubs), local state only (no global state manager), `'use client'` boundary only where interaction is needed.

---

## Architecture Context

**Components/services involved:**

| File | Type | Purpose |
|---|---|---|
| `frontend/src/app/layout.tsx` | Layout | Root layout — Tailwind base styles, html/body |
| `frontend/src/app/page.tsx` | Page | Single page: left panel + chat area two-column layout |
| `frontend/src/app/components/LeftPanel.tsx` | Component (stub) | Auth state toggle placeholder |
| `frontend/src/app/components/ChatArea.tsx` | Component (stub) | Message list + input placeholder |
| `frontend/src/app/components/MessageList.tsx` | Component (stub) | Renders conversation turns (empty) |
| `frontend/src/app/components/MessageInput.tsx` | Component (stub) | Text input + send button |
| `frontend/src/app/services/auth.service.ts` | Service (stub) | Typed empty module: register, login, logout, checkUsername |
| `frontend/src/app/services/chat.service.ts` | Service (stub) | Typed empty module: sendMessage, loadHistory |
| `frontend/vitest.config.ts` | Config | Vitest with jsdom + @vitejs/plugin-react |
| `frontend/src/app/page.test.tsx` | Test | Smoke test for page.tsx |

**Routing:** Single route `/` — Next.js App Router, no additional routes in this ticket.

**State management:** None — stubs have no stateful behavior yet. Local `useState` will be introduced per component in TASK-013–016.

---

## Implementation Steps

### Step 0 — Create feature branch

```bash
git checkout main && git pull origin main
git checkout -b TASK-002-frontend-scaffold
```

---

### Step 1 — Bootstrap the Next.js project

**Action:** Run `create-next-app` inside the repo root targeting the `frontend/` directory.

```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias
```

**Flags explained:**
- `--app` → App Router (not Pages Router)
- `--src-dir` → places source under `frontend/src/`
- `--no-import-alias` → keeps `@/*` alias out; we use relative imports for clarity
- `--tailwind` → configures `tailwind.config.ts` and `globals.css`
- `--eslint` → scaffolds `.eslintrc.json` with Next.js rules

**Post-scaffold cleanup:**
- Remove the generated `frontend/src/app/page.tsx`, `layout.tsx`, and `globals.css` content — they will be replaced in Steps 3–4.
- Keep `tailwind.config.ts` and `postcss.config.js` as-is from the scaffold.

---

### Step 2 — Add Vitest and testing libraries

**File:** `frontend/package.json`
**Action:** Add dev dependencies (run after scaffold):

```bash
cd frontend && npm install -D \
  vitest \
  @vitejs/plugin-react \
  @vitest/coverage-v8 \
  @testing-library/react \
  @testing-library/jest-dom \
  jsdom
```

Add scripts to `frontend/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Note:** `create-next-app` adds `next`, `react`, `react-dom`, `typescript`, and Tailwind — do not duplicate these.

---

### Step 3 — Vitest configuration

**File:** `frontend/vitest.config.ts`
**Action:** Create

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
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

**File:** `frontend/src/test/setup.ts`
**Action:** Create

```typescript
import '@testing-library/jest-dom';
```

**Implementation notes:**
- `globals: true` makes `describe`, `it`, `expect` available without explicit imports in test files.
- `setupFiles` runs before each test file to inject jest-dom matchers.

---

### Step 4 — Root layout

**File:** `frontend/src/app/layout.tsx`
**Action:** Replace scaffold content

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OffRoad Chabot',
  description: 'AI assistant for off-road enthusiasts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
```

**File:** `frontend/src/app/globals.css`
**Action:** Replace scaffold content with Tailwind directives only

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

### Step 5 — Component stubs

Create each stub as a minimal typed functional component. None require `'use client'` in this ticket — they render static markup only. `MessageInput` is the exception: it contains an interactive `<button>`, so mark it as client.

---

#### Step 5a — `LeftPanel.tsx`

**File:** `frontend/src/app/components/LeftPanel.tsx`
**Action:** Create

```typescript
export default function LeftPanel(): React.JSX.Element {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3">
        <button className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
          Register
        </button>
        <button className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
          Log In
        </button>
      </div>
    </aside>
  );
}
```

---

#### Step 5b — `MessageList.tsx`

**File:** `frontend/src/app/components/MessageList.tsx`
**Action:** Create

```typescript
export default function MessageList(): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Messages will render here */}
    </div>
  );
}
```

---

#### Step 5c — `MessageInput.tsx`

**File:** `frontend/src/app/components/MessageInput.tsx`
**Action:** Create

```typescript
'use client';

export default function MessageInput(): React.JSX.Element {
  return (
    <div className="flex gap-2 border-t border-gray-200 p-3">
      <input
        type="text"
        placeholder="Type a message..."
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        aria-label="Message input"
      />
      <button
        type="button"
        className="rounded bg-gray-800 px-4 py-2 text-sm text-white"
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
}
```

---

#### Step 5d — `ChatArea.tsx`

**File:** `frontend/src/app/components/ChatArea.tsx`
**Action:** Create

```typescript
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatArea(): React.JSX.Element {
  return (
    <section className="flex flex-1 flex-col">
      <MessageList />
      <MessageInput />
    </section>
  );
}
```

---

### Step 6 — Single-page shell (`page.tsx`)

**File:** `frontend/src/app/page.tsx`
**Action:** Replace scaffold content

```typescript
import LeftPanel from './components/LeftPanel';
import ChatArea from './components/ChatArea';

export default function Home(): React.JSX.Element {
  return (
    <main className="flex h-screen">
      <LeftPanel />
      <ChatArea />
    </main>
  );
}
```

**Layout notes:**
- `h-screen` constrains the layout to the viewport height.
- `LeftPanel` has a fixed `w-64` (≈ 16rem); `ChatArea` uses `flex-1` to fill remaining width.
- This matches the ~25% / 75% split from the ASCII diagram at typical desktop widths.

---

### Step 7 — Service stubs

Both services export typed function signatures that return `Promise<never>` (throw `Error('not implemented')`) so TypeScript verifies call sites from TASK-013 onward without shipping dead code.

---

#### Step 7a — `auth.service.ts`

**File:** `frontend/src/app/services/auth.service.ts`
**Action:** Create

```typescript
export type RegisterPayload = {
  username: string;
  displayName: string;
  pin: string;
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
};

export type LoginPayload = {
  username: string;
  pin: string;
};

export type AuthResult = {
  token: string;
  userId: string;
};

export async function register(_payload: RegisterPayload): Promise<AuthResult> {
  throw new Error('not implemented');
}

export async function login(_payload: LoginPayload): Promise<AuthResult> {
  throw new Error('not implemented');
}

export async function logout(): Promise<void> {
  throw new Error('not implemented');
}

export async function checkUsername(_username: string): Promise<{ available: boolean }> {
  throw new Error('not implemented');
}
```

---

#### Step 7b — `chat.service.ts`

**File:** `frontend/src/app/services/chat.service.ts`
**Action:** Create

```typescript
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type SendMessagePayload = {
  message: string;
  userId?: string;
  conversationId?: string;
};

export type SendMessageResult = {
  message: string;
  conversationId: string;
};

export type ConversationTurn = {
  userMessage: string;
  assistantMessage: string;
  timestamp: string;
};

export async function sendMessage(_payload: SendMessagePayload): Promise<SendMessageResult> {
  throw new Error('not implemented');
}

export async function loadHistory(_conversationId: string): Promise<ConversationTurn[]> {
  throw new Error('not implemented');
}
```

**Implementation notes:**
- `_` prefix on parameters suppresses TypeScript "unused parameter" errors in strict mode.
- The type definitions here match the data model in `ARCHITECTURE.md` (§ Data Model) so downstream tickets can import and extend them without duplication.

---

### Step 8 — Smoke test for `page.tsx`

**File:** `frontend/src/app/page.test.tsx`
**Action:** Create

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home page', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the left panel', () => {
    render(<Home />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('renders the message input', () => {
    render(<Home />);
    expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });
});
```

**Test cases covered:**
- Happy path: page renders without throwing
- Left panel (`<aside>` = `complementary` ARIA role) is present
- `MessageInput` fields are accessible by ARIA role + label

---

### Step 9 — Update technical documentation

**File:** `ARCHITECTURE.md`
**Action:** Verify the `## Frontend Structure` section matches what was actually created. If any file was skipped (e.g., `RegisterForm.tsx`, `LoginForm.tsx` — intentionally omitted in this ticket), confirm they are stubs-to-be-added in TASK-013/014, not missing.

**File:** `ai-specs/specs/frontend-standards.mdc`
**Action:** Update the `### Development Scripts` section to match the actual `package.json` scripts (the standard file currently references `npm start` and `cypress`; this project uses `npm run dev` and `vitest`).

---

## Implementation Order

| # | Step | File(s) |
|---|---|---|
| 0 | Create feature branch | — |
| 1 | Bootstrap Next.js project | `frontend/` (via `create-next-app`) |
| 2 | Add Vitest + testing deps | `frontend/package.json` |
| 3 | Vitest config + setup | `frontend/vitest.config.ts`, `frontend/src/test/setup.ts` |
| 4 | Root layout + globals.css | `frontend/src/app/layout.tsx`, `globals.css` |
| 5a | `LeftPanel.tsx` stub | `frontend/src/app/components/LeftPanel.tsx` |
| 5b | `MessageList.tsx` stub | `frontend/src/app/components/MessageList.tsx` |
| 5c | `MessageInput.tsx` stub | `frontend/src/app/components/MessageInput.tsx` |
| 5d | `ChatArea.tsx` stub | `frontend/src/app/components/ChatArea.tsx` |
| 6 | `page.tsx` shell | `frontend/src/app/page.tsx` |
| 7a | `auth.service.ts` stub | `frontend/src/app/services/auth.service.ts` |
| 7b | `chat.service.ts` stub | `frontend/src/app/services/chat.service.ts` |
| 8 | Smoke test | `frontend/src/app/page.test.tsx` |
| 9 | Documentation update | `ARCHITECTURE.md`, `frontend-standards.mdc` |

---

## Testing Checklist

- [ ] `npm test` passes with zero failures
- [ ] All three smoke test cases pass
- [ ] `npm run dev` starts the Next.js server without errors
- [ ] `GET http://localhost:3000/` returns HTTP 200 with no console errors
- [ ] Two-column layout visible in browser: left panel + chat area
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
- [ ] Coverage threshold (80%) met for the files in scope

---

## Error Handling Patterns

No error paths in this ticket — all components are stubs. Error handling will follow this pattern from TASK-013 onwards:

- **Component-level:** `const [error, setError] = useState<string | null>(null)` — render an inline error message below the relevant input or action area.
- **Service-level:** services throw typed errors; components catch in `try/catch` inside event handlers.
- **User-facing messages:** plain English, no technical jargon (e.g., `"Unable to log in. Please check your username and PIN."`).

---

## UI/UX Considerations

- **Two-column layout:** `flex h-screen` on `<main>` with `w-64 shrink-0` for left panel and `flex-1` for chat area — matches the ASCII diagram in `ARCHITECTURE.md`.
- **Responsive design:** This ticket targets desktop only (single route, no mobile breakpoints). Responsive work is deferred — it is not in scope for the prototype.
- **Accessibility:** `aria-label` on all interactive elements (`MessageInput`). Semantic roles used (`<aside>`, `<section>`, `<main>`).
- **Loading states:** Not applicable for stubs — will be introduced per component in TASK-013–016.
- **Tailwind only:** No additional CSS-in-JS, no Bootstrap. Utility classes inline per component.

---

## Dependencies

**Runtime (added by `create-next-app`):**
- `next` ^14 — App Router framework
- `react` ^18
- `react-dom` ^18
- `tailwindcss`, `postcss`, `autoprefixer` — styling

**Dev (added manually):**
- `vitest` ^1.2 — test runner
- `@vitejs/plugin-react` — Vitest React JSX transform
- `@vitest/coverage-v8` — coverage provider
- `@testing-library/react` — component rendering utilities
- `@testing-library/jest-dom` — custom matchers (`toBeInTheDocument`, etc.)
- `jsdom` — browser-like DOM environment for Vitest

No Firebase SDK, no HTTP client (fetch is native), no state management library in this ticket.

---

## Notes

- All code and comments must be in English (project standard).
- No auth logic, no API calls, no Firebase SDK in this ticket — stubs only.
- `RegisterForm.tsx` and `LoginForm.tsx` are part of the architecture but are **not** created in this ticket; they belong to TASK-013 and TASK-014 respectively.
- The `'use client'` directive is required only on `MessageInput.tsx` (interactive element with potential event handlers). Server components by default for the rest.
- Stub services throw `Error('not implemented')` rather than returning empty values to prevent silent failures in downstream tests.

---

## Next Steps After Implementation

After TASK-002 is merged:
- **TASK-013** — Registration form (`RegisterForm.tsx` + `auth.service.register` wired)
- **TASK-014** — Login form (`LoginForm.tsx` + `auth.service.login` wired)
- **TASK-015** — Left panel wired with auth state toggle
- **TASK-016** — Chat interface with `chat.service.sendMessage` and history load

---

## Implementation Verification

**Code quality:**
- [ ] No `any` types used
- [ ] All exported functions and components have explicit return types
- [ ] All imports at the top of each file (no dynamic imports inside components)
- [ ] PascalCase for component files, camelCase for service files

**Functionality:**
- [ ] `npm run dev` starts without errors on port 3000
- [ ] Browser shows two-column layout at `http://localhost:3000`
- [ ] Left panel renders "Register" and "Log In" buttons
- [ ] Chat area renders message input and send button
- [ ] No console errors in browser devtools

**Testing:**
- [ ] `npm test` exits 0
- [ ] Coverage threshold (80%) met

**Integration:**
- [ ] `frontend/src/app/` structure matches `ARCHITECTURE.md` → Frontend Structure (accounting for stub-only components)
- [ ] Service type signatures are compatible with `ARCHITECTURE.md` → Data Model

**Documentation:**
- [ ] `ARCHITECTURE.md` Frontend Structure section verified
- [ ] `frontend-standards.mdc` dev scripts updated if needed
