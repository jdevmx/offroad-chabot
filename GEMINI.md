# Gemini CLI Instructions - OffRoad Chabot

This document defines the development rules and guidelines for Gemini when working on the **OffRoad Chabot** project.

## 1. Core Principles

- **Small tasks, one at a time**: Work in baby steps. Implement one thing, verify it, then move to the next.
- **Test-Driven Development (TDD)**: Start with failing tests for any new functionality.
- **Type Safety**: Use strict TypeScript. No `any` unless absolutely unavoidable.
- **Clear Naming**: Use descriptive, English names for all variables, functions, and files.
- **Keep It Simple**: Avoid over-engineering. No speculative abstractions.
- **English Only**: All code, documentation, tickets, and commit messages must be in English.
- **No AI Metadata**: Never include AI-related metadata (model names, tool names, timestamps) in code or commits.

## 2. Project Context

- **Project**: OffRoad Chabot (AI Assistant for off-road enthusiasts).
- **Architecture**: Clean Architecture / Layered Architecture (Presentation, Application, Domain, Infrastructure).
- **Backend Stack**: Node.js, Express, TypeScript, Firebase Firestore SDK, Vitest.
- **Frontend Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Vitest.
- **Database**: Firebase Firestore.
- **Auth**: Firebase Auth (custom token, PIN-based).
- **Agent**: LangChain.js, Mistral, Tavily Search API.

## 3. Workflow (ai-specs driven)

Follow the established workflow in `ai-specs/` and `ARCHITECTURE.md`. When a command is requested (e.g., via slash syntax or direct mention), execute the logic defined in the corresponding markdown file in `.claude/commands/`:

### Command Mapping
| User Request | Command File | Description |
|---|---|---|
| `/explore` | `explore.md` | Think through ideas and clarify requirements before starting. |
| `/setup-project` | `setup-project.md` | Initialize project from `ai-specs/project.yml`. |
| `/create-ticket` | `create-ticket.md` | Create a local ticket in `ai-specs/tickets/`. |
| `/enrich-us` | `enrich-us.md` | Enrich a ticket with acceptance criteria and test scenarios. |
| `/plan-ticket` | `plan-ticket.md` | Generate implementation plans in `ai-specs/changes/`. |
| `/develop` | `develop.md` | Implement a ticket: update status, follow plan, TDD, commit, update Spec Tracker. |
| `/update-docs` | `update-docs.md` | Sync API spec, data model, and documentation. |
| `/commit` | `commit.md` | Create a structured git commit. |

### Execution Protocol
When executing any of the above commands:
1. **Read the source**: Always read the corresponding `.md` file in `.claude/commands/` (or `ai-specs/.commands/`) before starting.
2. **Follow every step**: Strictly adhere to the numbered steps and logic defined in that file.
3. **Use the right context**: Load `ai-specs/project.yml` and check `ARCHITECTURE.md` as required by the commands.

## 4. Specific Standards

### Backend (see `ai-specs/specs/backend-standards.mdc`)
- **Layers**: 
  - **Domain**: Entities, Value Objects, Repository Interfaces. No dependencies.
  - **Application**: Services (orchestration), Validators.
  - **Infrastructure**: Repository implementations (Firestore), Firebase Admin SDK init.
  - **Presentation**: Express Routes and Controllers.
- **Testing**: Vitest. Target 90% coverage. Use AAA pattern (Arrange-Act-Assert). Mock external dependencies.

### Frontend (see `ai-specs/specs/frontend-standards.mdc`)
- **Components**: Functional components with Hooks. PascalCase for files.
- **State**: Native React hooks (useState, useContext) preferred.
- **Styles**: Tailwind CSS.
- **Services**: Centralize API calls in `src/services/`.

## 5. Git Strategy

- **Direct to main**: This is a prototype. Commit directly to `main`.
- **Clean Tree**: Ensure the working tree is clean before starting a task.
- **Commit Messages**: Follow standard descriptive patterns (e.g., "feat: implement client repository", "fix: handle auth error").

## 6. Security & Secrets

- **Never commit secrets**: Check `.env.example` for required variables.
- **Firebase**: Use `firebase-admin` for backend operations and `firebase` (client SDK) for frontend.
- **PIN Auth**: Use bcrypt for PIN hashing on the backend.
