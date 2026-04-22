# Caso de Uso: OffRoad Chabot

Record of prompts used, design decisions made, and their rationale during the development of this project.

---

## Project Setup

### Prompt 1 — Project initialization

**Date:** 2026-04-16
**Command:** `/setup-project`

**Prompt:**
```
Develop an AI Assistant for off-road enthusiasts. The system must recognize users, know if they own a 4x4 vehicle and which model it is, and provide personalized advice.

Technical Stack:

Frontend: Next.js (App Router) with Tailwind CSS.
Backend: Node.js with TypeScript (using Express or Fastify).
Database: Firebase Firestore (Collections: clients and conversations).
AI Orchestration: LangChain.js with OpenAI and Tavily Search API.
```

**Decisions made:**

| Decision | Choice | Rationale |
|---|---|---|
| Project types | `fullstack` + `ai-agent` | Has both a UI and a backend API, plus an AI agent layer (LangChain.js) that justifies a dedicated agent type |
| Backend framework | Express | More established ecosystem; Fastify was also valid |
| Backend ORM | none | Firebase Firestore does not use a relational ORM; the Admin SDK is used directly |
| Backend architecture | Clean Architecture | Separates domain, application, infrastructure, and presentation layers — appropriate for a system with multiple responsibilities (user auth, AI orchestration, persistence) |
| Frontend router | Next.js App Router | Explicitly required in the stack |
| Frontend state management | none | Next.js App Router with Server Components reduces the need for client-side global state; native React hooks are sufficient |
| Frontend HTTP client | fetch | Native browser API; no extra dependency needed with Next.js |
| Test framework | **Vitest** (corrected from Jest) | User requested Vitest — faster, ESM-native, better suited for the TypeScript/Node.js stack |
| Agent orchestration | single-agent | One conversational agent with two tools is sufficient; multi-agent would over-engineer the current scope |
| Agent memory | Firebase Firestore | Reuses the existing database; conversations collection stores turn history per user |
| Agent model | gpt-4o | Best tool-calling support in the OpenAI lineup; required for reliable tool selection |
| Ticket system | local | No external ticket system specified; local markdown kanban in `ai-specs/tickets/` |
| Copilots | claude + kiro | Declared in `ai-specs/project.yml`; `init.sh` wired up both |

**Files created/updated:**
- `ai-specs/project.yml` — project configuration
- `README.md` — project header updated
- `ai-specs/specs/base-standards.mdc` — TICKET_SYSTEM and ADDITIONAL_STANDARDS resolved
- `ai-specs/specs/backend-standards.mdc` — all backend markers resolved
- `ai-specs/specs/frontend-standards.mdc` — all frontend markers resolved
- `ai-specs/.agents/backend-developer.md` — all backend markers resolved
- `ai-specs/.agents/frontend-developer.md` — all frontend markers resolved
- `ai-specs/.commands/plan-ticket.md` — TICKET_SYSTEM and FRONTEND_STATE_MANAGEMENT resolved
- `ai-specs/specs/agent-standards.mdc` — **new** — agent loop design, tool schemas, Firestore memory, prompt engineering, error recovery, observability, testing
- `ai-specs/.agents/ai-agent-developer.md` — **new** — LangChain.js agent developer role definition
- `.claude/agents/` — symlinks regenerated via `init.sh`
- `.kiro/steering/` — steering files regenerated via `init.sh`

---

## Design Decisions Log

### DD-001 — Firestore as the single persistence layer

**Date:** 2026-04-16
**Context:** The stack specifies Firebase Firestore as the database.
**Decision:** Use Firestore for both user profiles (`clients` collection) and conversation history (`conversations` collection). No secondary database.
**Rationale:** Keeping a single persistence layer reduces operational complexity. Firestore's document model maps naturally to both a user profile (nested vehicle object) and a conversation (array of turns).
**Trade-offs:** Firestore is not ideal for complex relational queries. If the product evolves to need analytics or cross-user queries, a secondary store (e.g., BigQuery export) may be needed.

---

### DD-002 — LangChain.js ReAct agent over a custom loop

**Date:** 2026-04-16
**Context:** The AI orchestration layer needs to decide when to call Tavily Search vs. vehicle lookup vs. answer directly.
**Decision:** Use LangChain.js `AgentExecutor` with tool-calling (ReAct pattern) rather than a hand-coded if/else routing layer.
**Rationale:** LangChain.js handles the tool selection loop, intermediate step tracking, and memory integration out of the box. Building a custom loop would replicate this work without benefit at the current scale.
**Trade-offs:** LangChain.js adds a dependency and its API changes frequently. The agent standards file explicitly calls for using Context7 MCP to fetch current docs before working on agent code.

---

### DD-003 — Stateless agent handler

**Date:** 2026-04-16
**Context:** The backend runs as an Express server, potentially behind a load balancer.
**Decision:** The agent handler loads all context (user profile, conversation history) from Firestore at the start of each request. No in-memory global state.
**Rationale:** Enables horizontal scaling without sticky sessions. Any instance can serve any request.
**Trade-offs:** Adds a Firestore read on every request. Mitigated by keeping conversation history bounded (last 20 turns, window of 10 for LLM context).

---

### DD-004 — Vitest over Jest

**Date:** 2026-04-16
**Context:** Initial configuration used Jest as the test framework.
**Decision:** Switched to Vitest across all layers (backend, frontend, agent).
**Rationale:** User preference. Vitest is faster, natively ESM, and requires less configuration for TypeScript projects compared to Jest.
**Impact:** All test framework references in spec files and project.yml updated to Vitest.

---

### DD-005 — PIN-only auth via Firebase custom tokens

**Date:** 2026-04-16
**Context:** This is a prototype. Full email/password auth adds friction; OAuth adds complexity.
**Decision:** Users register with a unique username + 4-digit PIN. Backend hashes PIN (bcrypt), verifies it on login, and issues a Firebase custom token. Frontend signs in with `signInWithCustomToken()`.
**Rationale:** Lowest friction for a prototype while keeping Firebase Auth UID valid for Firestore security rules. No email required.
**Trade-offs:** No password recovery. PIN brute-force risk (mitigate with rate limiting in a later iteration).

---

### DD-006 — Vehicle data entered at registration, stored in client profile

**Date:** 2026-04-16
**Context:** Initial design considered a static JSON dataset or external API for vehicle lookup.
**Decision:** Vehicle data (make, model, year, trim, modifications) is entered by the user in the registration form and stored in `clients/{userId}.vehicle`. No external vehicle lookup tool.
**Rationale:** Simpler for a prototype. The agent already has the vehicle data via the system prompt — no extra tool call needed.
**Trade-offs:** Vehicle data quality depends on user input. Not validated against a vehicle database.

---

### DD-007 — Single-page layout with anonymous + authenticated chat

**Date:** 2026-04-16
**Context:** App needs to be low-friction — users should be able to try the chat before registering.
**Decision:** Single route (`/`). Left panel shows Register/Login buttons (or user info when logged in). Anonymous users can chat freely; messages are in React state only (lost on refresh). Logged-in users get persistent history.
**Rationale:** Maximizes discoverability. No forced registration wall.
**Trade-offs:** Anonymous messages are not recoverable after refresh (accepted, intentional).

---

### DD-008 — Chat history compression (summary + last 10 turns)

**Date:** 2026-04-16
**Context:** Long conversations would blow up the LLM context window and increase cost.
**Decision:** When `turns.length > 20`, the oldest turns are summarized via LLM call and stored in `conversations/{id}.summary`. The `turns` array keeps only the last 10. LLM context = system prompt + summary (if any) + last 10 turns.
**Rationale:** Keeps per-request token count bounded without losing conversational continuity.
**Trade-offs:** Summary generation costs one extra LLM call. Summary may lose nuance from older turns.

---

### DD-009 — Real-time username uniqueness check

**Date:** 2026-04-16
**Context:** Unique usernames are required for login; user should know immediately if a name is taken.
**Decision:** Registration form calls `GET /auth/check-username?username=xxx` (debounced, ~400 ms) and shows inline availability feedback.
**Rationale:** Better UX than discovering a conflict on form submit.
**Trade-offs:** Small race condition window between check and submit (acceptable for prototype).

---

---

### DD-010 — Backend deployed to GCP Cloud Run; frontend to Firebase Hosting

**Date:** 2026-04-22
**Context:** Pending decision from DD-009 resolved. The project needed a deployment target that kept Firebase as the primary platform while supporting a containerised Node.js backend.
**Decision:** Backend → GCP Cloud Run (containerised, Docker). Frontend → Firebase Hosting (static export, Next.js `output: "export"`).
**Rationale:** Cloud Run integrates naturally with the same GCP project used by Firestore and Firebase Auth. Firebase Hosting gives a managed CDN for the static frontend with zero extra infrastructure.
**Trade-offs:** Next.js static export disables server-side features (Server Components data fetching at request time, API routes). Accepted because the app is fully client-driven at runtime.

---

### DD-011 — Application Default Credentials (ADC) on Cloud Run instead of a service account key file

**Date:** 2026-04-22
**Context:** Cloud Run needs to call Firestore and Firebase Auth. The initial prototype sourced a service account cert via environment variables, which is fragile and hard to rotate.
**Decision:** The Cloud Run service runs as a dedicated service account (`offroad-cloud-run`). The backend uses ADC (`admin.initializeApp()` with no explicit credential), which automatically picks up the ambient identity on Cloud Run.
**Rationale:** No private key to manage or rotate. IAM roles (`roles/datastore.user`, `roles/firebaseauth.admin`) are granted to the service account directly.
**Trade-offs:** Local dev still needs `GOOGLE_APPLICATION_CREDENTIALS` pointing to a local key, or `gcloud auth application-default login`.

---

### DD-012 — Workload Identity Federation for keyless CI/CD authentication

**Date:** 2026-04-22
**Context:** GitHub Actions needs to push Docker images to Artifact Registry and deploy to Cloud Run. Service account JSON keys stored in GitHub Secrets are a security anti-pattern.
**Decision:** Workload Identity Federation (WIF) — a WIF pool (`github-actions`) and OIDC provider (`github-actions-provider`) are created in GCP. The workflow exchanges a short-lived GitHub OIDC token for a GCP access token.
**Rationale:** No long-lived keys exist. Access is automatically scoped to the specific GitHub repository via `attribute.repository` condition.
**Trade-offs:** More initial setup than a JSON key. The `gcp-setup.sh` script automates the one-time provisioning.

---

### DD-013 — API secrets stored in GCP Secret Manager, injected at runtime

**Date:** 2026-04-22
**Context:** Third-party API keys (`TAVILY_API_KEY`, `MISTRAL_API_KEY`) and auth secret (`JWT_SECRET`) must be kept out of the container image and GitHub Actions environment variables.
**Decision:** Secrets are stored in GCP Secret Manager and mounted into Cloud Run via `--set-secrets`. The Cloud Run service account has `roles/secretmanager.secretAccessor` for each secret.
**Rationale:** Centralized secret lifecycle management. Secrets are never stored in source control, build artifacts, or GitHub Actions logs.
**Trade-offs:** `gcp-setup.sh` must be re-run (or secrets updated manually) whenever a key is rotated.

---

### DD-014 — Two independent GitHub Actions workflows, path-filtered

**Date:** 2026-04-22
**Context:** Monorepo with separate `backend/` and `frontend/` directories. An all-in-one workflow would redeploy both on every change.
**Decision:** Two workflows: `backend-ci-cd.yml` (triggers on `backend/**`) and `frontend-ci-cd.yml` (triggers on `frontend/**` and `firebase.json`). Both support `workflow_dispatch` for manual runs.
**Rationale:** Only the changed layer is tested and deployed. Frontend and backend can evolve independently without coupling their release cycles.
**Trade-offs:** Shared infra changes (e.g., `firebase.json` rewrites) must be accounted for in path filters.

---

### DD-015 — Chat API changed from request/response to Server-Sent Events (SSE)

**Date:** 2026-04-22
**Context:** The initial chat endpoint returned a full JSON response after the entire LLM generation completed, creating a noticeable wait with no feedback to the user.
**Decision:** `POST /chat` changed to stream tokens via SSE. Backend uses `res.write()` with `text/event-stream`. Frontend uses the `EventSource`-compatible fetch streaming pattern to render tokens progressively.
**Rationale:** Better perceived performance and UX — users see the response being built in real time, consistent with how most chat UIs work.
**Trade-offs:** SSE requires keeping the HTTP connection open for the duration of generation. Error handling is more complex (errors mid-stream must be encoded as SSE events, not HTTP status codes).

---

### DD-016 — Current date injected into agent system prompt at request time

**Date:** 2026-04-22
**Context:** The LLM lacks awareness of the current date, leading to stale advice for time-sensitive queries (e.g., seasonal trail conditions, event dates).
**Decision:** `buildSystemPrompt()` injects the current date (`new Date().toISOString().split('T')[0]`) into the system prompt on every request.
**Rationale:** Minimal change with meaningful improvement to response accuracy for date-sensitive queries.
**Trade-offs:** None significant at this scale.

---

## Pending Decisions

- [ ] Rate limiting strategy — per-user token budget or request-per-minute cap

---

## Architecture Reference

Full system architecture, data model, UI layout, agent design, and spec tracker:
→ [ARCHITECTURE.md](./ARCHITECTURE.md)
