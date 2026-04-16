# OffRoad Chabot — Architecture

AI Assistant for off-road enthusiasts. Single-page web app with a personalized chat agent that knows the user's 4x4 vehicle and tailors advice accordingly.

---

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [UI Layout](#ui-layout)
- [Auth Strategy](#auth-strategy)
- [Data Model](#data-model)
- [AI Agent](#ai-agent)
- [Chat History Compression](#chat-history-compression)
- [Backend Structure](#backend-structure)
- [Frontend Structure](#frontend-structure)
- [Spec Tracker](#spec-tracker)

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     OffRoad Chabot                      │
│                                                         │
│  ┌─────────────┐       ┌───────────────────────────┐   │
│  │  Next.js    │──────▶│  Express Backend           │   │
│  │  (App Router│ fetch │  (Clean Architecture)      │   │
│  │  Tailwind)  │       └──────────┬────────────────┘   │
│  └─────────────┘                  │                    │
│                         ┌─────────▼──────────────┐     │
│                         │   LangChain.js Agent    │     │
│                         │   Mistral + ReAct loop  │     │
│                         └──────────┬─────────────┘     │
│                                    │                    │
│                         ┌──────────▼─────────────┐     │
│                         │   Tavily Search Tool   │     │
│                         └────────────────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Firebase Firestore                  │   │
│  │   clients/{userId}     conversations/{id}        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Firebase Auth                       │   │
│  │   Custom token (PIN-based)                       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Frontend HTTP | native `fetch` |
| Backend | Node.js, TypeScript, Express |
| Backend architecture | Clean Architecture |
| Database | Firebase Firestore |
| Auth | Firebase Auth (custom token, PIN-based) |
| Agent framework | LangChain.js |
| LLM | Mistral (`mistral-medium-latest`) |
| Agent tools | Tavily Search API |
| Testing | Vitest (backend + frontend) |
| Test coverage target | 80% |

---

## UI Layout

Single page, single route (`/`). No navigation.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │  Left Panel  │  │  Chat Area                          │ │
│  │              │  │                                     │ │
│  │  [Register]  │  │  ┌─────────────────────────────┐   │ │
│  │  [Log In]    │  │  │  (anon: empty on load)      │   │ │
│  │              │  │  │  (logged in: history loads) │   │ │
│  │  ──────────  │  │  │                             │   │ │
│  │  (logged in) │  │  │  You: how do I air down?    │   │ │
│  │  username    │  │  │  Bot: For your Land Cruiser │   │ │
│  │  vehicle     │  │  │       ...                   │   │ │
│  │  [Log out]   │  │  │                             │   │ │
│  │              │  │  └─────────────────────────────┘   │ │
│  │              │  │  ┌─────────────────────────────┐   │ │
│  │              │  │  │  Type a message...   [Send] │   │ │
│  │              │  │  └─────────────────────────────┘   │ │
│  └──────────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Anonymous users:**
- Chat is fully functional
- Messages live in React state only — lost on page refresh (intentional)
- No Firestore writes, no Firebase Auth session

**Logged-in users:**
- Chat history loads from Firestore on page load
- Every turn is persisted to Firestore
- Left panel shows username, vehicle info, and Logout button

---

## Auth Strategy

PIN-only authentication via Firebase custom tokens. Designed for prototype use.

**Registration flow:**
1. User submits: `username` + vehicle fields + 4-digit PIN
2. Backend checks username uniqueness in Firestore
3. Backend hashes PIN with bcrypt and stores it in `clients/{userId}`
4. Backend creates a Firebase Auth user and returns a custom token
5. Frontend calls `signInWithCustomToken(token)` to establish the session

**Login flow:**
1. User submits: `username` + PIN
2. Backend looks up `clients` by `username`, verifies `bcrypt.compare(pin, hash)`
3. On success, backend issues a Firebase custom token
4. Frontend calls `signInWithCustomToken(token)`

**Username availability check:**
- `GET /auth/check-username?username=xxx`
- Returns `{ available: boolean }`
- Called in real time from the registration form (debounced, ~400 ms)

**Trade-offs:**
- No password recovery (acceptable for prototype)
- No email required — user identity is username + generated Firebase UID
- Custom token keeps Firebase Auth UID valid for Firestore security rules

---

## Data Model

### `clients` collection

```
clients/{userId}
  uid:           string       -- Firebase Auth UID
  username:      string       -- unique, chosen at registration
  displayName:   string       -- free-text display name
  pinHash:       string       -- bcrypt hash of the 4-digit PIN
  vehicle: {
    make:          string     -- e.g. "Toyota"
    model:         string     -- e.g. "Land Cruiser 200"
    year:          number     -- e.g. 2021
    trim:          string?    -- e.g. "GX"
    modifications: string[]   -- e.g. ["lift kit", "snorkel", "ARB bumper"]
  }
  preferences: {
    terrainTypes:  string[]   -- e.g. ["sand", "rock crawling", "mud"]
    experience:    "beginner" | "intermediate" | "expert"
  }
  createdAt:     Timestamp
  updatedAt:     Timestamp
```

### `conversations` collection

```
conversations/{conversationId}
  userId:        string | null  -- null for anonymous sessions (not persisted)
  summary:       string | null  -- LLM-generated summary of older turns
  turns: Array<{
    userMessage:      string
    assistantMessage: string
    timestamp:        Timestamp
    toolsUsed:        string[]
  }>
  createdAt:     Timestamp
  updatedAt:     Timestamp
```

---

## AI Agent

### Agent Loop

```
POST /chat  { userId?, conversationId?, message }
    │
    ├─ if userId: load client profile from Firestore
    │
    ▼
Build system prompt (vehicle + experience injected if user known)
    │
    ▼
Load compressed history from Firestore (summary + last 10 turns)
    │
    ▼
Invoke LangChain agent executor
    ┌──────────────────────────────────────┐
    │  LLM reasons → selects tool or       │
    │  answers directly                    │
    │  Tool result appended → repeat       │
    └──────────────────────────────────────┘
    │
    ├─ if userId: persist new turn to Firestore
    │             trigger compression if turns > 20
    │
    ▼
Return { message, conversationId }
```

### Tools

| Tool | When used |
|---|---|
| `tavily_search` | Trail reports, gear reviews, technical specs, current regulations |

Vehicle data is **not** a separate tool. It is injected directly into the system prompt from the user's client profile. The agent does not need to look it up.

### System Prompt Template

```
You are an expert off-road driving assistant specializing in 4x4 vehicles,
trail navigation, vehicle maintenance, and overlanding gear.

{vehicleSection}        ← injected from clients/{userId}.vehicle
{experienceSection}     ← injected from clients/{userId}.preferences.experience

Guidelines:
- Provide practical, safety-first advice tailored to the user's vehicle.
- Use tavily_search for trail reports, regulations, and gear reviews.
- If the user has not registered a vehicle, ask about it naturally.
- Always answer in the same language the user uses.
```

---

## Chat History Compression

Keeps LLM context small and costs predictable without losing conversation continuity.

```
turns.length ≤ 20  →  send all turns to LLM (no compression yet)
turns.length > 20  →  send summary + last 10 turns to LLM
```

**Compression trigger:** after appending a new turn, if `turns.length > 20`:
1. Take the oldest `turns.length - 10` turns
2. Call LLM: "Summarize this conversation history in 3-5 sentences, focusing on what the user needs, their vehicle, and any recommendations already given."
3. Store result in `conversations/{id}.summary`
4. Remove the summarized turns from the `turns` array (keep last 10)

**LLM context built per request:**
```
[system prompt]
[summary section — if summary exists]
[last 10 turns]
[current user message]
```

---

## Backend Structure

Clean Architecture. Four layers: domain, application, infrastructure, presentation.

```
backend/src/
├── domain/
│   ├── client/
│   │   ├── Client.ts              -- entity
│   │   └── IClientRepository.ts   -- repository interface
│   └── conversation/
│       ├── Conversation.ts
│       └── IConversationRepository.ts
├── application/
│   ├── auth/
│   │   ├── RegisterUseCase.ts
│   │   └── LoginUseCase.ts
│   └── chat/
│       └── ChatUseCase.ts
├── infrastructure/
│   ├── firebase/
│   │   └── firebaseAdmin.ts       -- Admin SDK singleton
│   ├── repositories/
│   │   ├── FirestoreClientRepository.ts
│   │   └── FirestoreConversationRepository.ts
│   └── agent/
│       ├── agentExecutor.ts       -- LangChain executor setup
│       ├── systemPrompt.ts        -- prompt builder
│       ├── memory/
│       │   └── firestoreMemory.ts -- BufferWindowMemory + compression
│       └── tools/
│           └── tavilySearch.tool.ts
└── presentation/
    ├── routes/
    │   ├── health.route.ts        -- GET /health
    │   ├── auth.route.ts          -- POST /auth/register, /auth/login, GET /auth/check-username
    │   └── chat.route.ts          -- POST /chat
    ├── middleware/
    │   └── auth.middleware.ts     -- Firebase ID token verification
    └── app.ts                     -- Express app factory
```

---

## Frontend Structure

```
frontend/src/
└── app/
    ├── layout.tsx           -- root layout (Tailwind base)
    ├── page.tsx             -- single page: left panel + chat area
    ├── components/
    │   ├── LeftPanel.tsx    -- auth state toggle (register/login vs user info)
    │   ├── ChatArea.tsx     -- message list + input
    │   ├── MessageList.tsx  -- renders conversation turns
    │   ├── MessageInput.tsx -- text input + send button
    │   ├── RegisterForm.tsx -- username (real-time check) + vehicle + PIN
    │   └── LoginForm.tsx    -- username + PIN
    └── services/
        ├── auth.service.ts  -- register, login, logout, checkUsername
        └── chat.service.ts  -- sendMessage, loadHistory
```

---

## Spec Tracker

Tracks all planned specs with lifecycle dates. Updated as tickets move through the workflow.

| ID | Title | Layer | Created | Planned | Implemented |
|---|---|---|---|---|---|
| TASK-001 | Backend scaffold + healthcheck | Backend | — | 2026-04-16 | 2026-04-16 |
| TASK-002 | Frontend scaffold + single-page shell | Frontend | 2026-04-16 | 2026-04-16 | 2026-04-16 |
| TASK-003 | Firebase Admin SDK init + env validation | Backend | 2026-04-16 | 2026-04-16 | — |
| TASK-004 | Client repository (Firestore clients collection) | Backend | 2026-04-16 | 2026-04-16 | — |
| TASK-005 | Conversation repository (Firestore conversations collection) | Backend | 2026-04-16 | — | — |
| TASK-006 | PIN auth backend (register, login, check-username, custom token) | Backend | 2026-04-16 | — | — |
| TASK-007 | Auth middleware (Firebase ID token verification) | Backend | 2026-04-16 | — | — |
| TASK-008 | Tavily Search tool | Agent | 2026-04-16 | — | — |
| TASK-009 | Firestore conversation memory + summary compression | Agent | 2026-04-16 | — | — |
| TASK-010 | System prompt builder (user + vehicle context) | Agent | 2026-04-16 | — | — |
| TASK-011 | LangChain agent executor (Mistral + Tavily) | Agent | 2026-04-16 | — | — |
| TASK-012 | POST /chat endpoint (anon + authenticated) | Backend | 2026-04-16 | — | — |
| TASK-013 | Registration form (username check + vehicle + PIN) | Frontend | 2026-04-16 | — | — |
| TASK-014 | Login form (username + PIN) | Frontend | 2026-04-16 | — | — |
| TASK-015 | Left panel (auth toggle + user info) | Frontend | 2026-04-16 | — | — |
| TASK-016 | Chat interface (message list + input + history load) | Frontend | 2026-04-16 | — | — |
| TASK-017 | User profile view (vehicle display + edit modifications) | Frontend | 2026-04-16 | — | — |
| TASK-018 | Deployment setup | Infra | 2026-04-16 | — | — |
