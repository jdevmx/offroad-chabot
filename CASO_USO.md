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

## Pending Decisions

- [ ] Authentication strategy — Firebase Auth vs. custom JWT vs. session cookies
- [ ] API design — REST vs. tRPC for the backend endpoints
- [ ] Vehicle lookup tool data source — static JSON dataset, external API, or scraped data
- [ ] Deployment target — Firebase Hosting + Cloud Functions, Vercel + Railway, or other
- [ ] Rate limiting strategy — per-user token budget or request-per-minute cap
