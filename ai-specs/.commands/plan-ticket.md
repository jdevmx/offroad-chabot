# Plan Ticket

$ARGUMENTS

# Goal

Produce a step-by-step implementation plan for a ticket, ready to hand off for development.

---

## Step -2: Read ARCHITECTURE.md Spec Tracker

Read the `## Spec Tracker` table in `ARCHITECTURE.md`. Locate the row for this ticket ID and use its `Title` and `Layer` as additional context while producing the plan.

---

## Step -1: Conflict Check (MANDATORY — run before anything else)

Read `ai-specs/project.yml` and load `project.ticket_system`.

**If `ticket_system` is `local`:**

Read `ai-specs/tickets/[ticket-id].md` and inspect the frontmatter:
- If `status` is `in_progress` or `done`, **STOP** and report:
  > ⚠️ Ticket `[ID]` is already `[status]` (assignee: `[assignee]`). Check `ai-specs/changes/` for existing plans before proceeding.
- If `status` is `todo` or `backlog`, proceed.

**If `ticket_system` is an external system (Jira, Linear, etc.):**

Fetch the ticket via the local MCP and inspect:
- If assigned to someone else **and** status is `In Progress` or further, **STOP** and report:
  > ⚠️ Ticket `[ID]` is already in progress by `[assignee]`. Check `ai-specs/changes/` for existing plans before proceeding.
- If unassigned or status is `To Do` / `Backlog`, proceed.

**Always (both modes):**

Run:
```bash
git fetch origin && git branch -r | grep [ticket-id]
```
If a remote branch matching the ticket ID already exists, **STOP** and report:
> ⚠️ Branch `[branch-name]` already exists on remote. Another developer may be working on this.

If all checks pass, continue.

---

## Step 0: Determine the planning domain

Read the ticket content and determine which domains apply:
- Ticket mentions APIs, services, database, repositories, migrations, auth logic → **backend**
- Ticket mentions components, UI, pages, layouts, styles, Figma, design → **frontend**
- Ticket spans both → **full-stack** (produce both plans)

---

## Step 1: Produce the plan(s)

Analyze the ticket and apply the project's best practices from `ai-specs/specs/`. Do not write code — only produce the plan(s).

Run only the phases that apply.

### Backend plan

Adopt the role of `ai-specs/.agents/backend-developer.md`.

Output a Markdown document at `ai-specs/changes/[ticket-id]_backend.md` following this structure:

- **Header**: `# Backend Implementation Plan: [TICKET-ID] [Feature Name]`
- **Overview**: Brief description and architecture principles (DDD, clean architecture)
- **Architecture Context**: Layers involved (Domain, Application, Presentation), components/files referenced
- **Implementation Steps**:
  - **Step 0**: Create feature branch (`feature/[ticket-id]-backend`). Must be the first step.
  - **Step N**: Per step — File, Action, Function Signature, Implementation Steps, Dependencies, Implementation Notes. Common sequence: validation → service method → controller method → route → unit tests (success, validation errors, not found, edge cases).
  - **Step N+1**: Update technical documentation (data model, API spec, standards files as applicable). This step is MANDATORY.
- **Implementation Order**: Numbered sequence from Step 0 to documentation step
- **Testing Checklist**
- **Error Response Format**: JSON structure + HTTP status code mapping
- **Partial Update Support** (if applicable)
- **Dependencies**
- **Notes**: Business rules, constraints, language requirements
- **Next Steps After Implementation**
- **Implementation Verification**: Code quality, functionality, testing, integration, documentation

### Frontend plan

Adopt the role of `ai-specs/.agents/frontend-developer.md`.

Output a Markdown document at `ai-specs/changes/[ticket-id]_frontend.md` following this structure:

- **Header**: `# Frontend Implementation Plan: [TICKET-ID] [Feature Name]`
- **Overview**: Brief description and frontend architecture principles (component-based, service layer, React patterns)
- **Architecture Context**: Components/services involved, files referenced, routing considerations, state management approach (global: `none` vs local hooks)
- **Implementation Steps**:
  - **Step 0**: Create feature branch (`feature/[ticket-id]-frontend`). Must be the first step.
  - **Step N**: Per step — File, Action, Component/Function Signature, Implementation Steps, Dependencies, Implementation Notes. Common sequence: service methods → components → routing → Cypress E2E tests.
  - **Step N+1**: Update technical documentation (API spec, frontend standards, routing docs as applicable). This step is MANDATORY.
- **Implementation Order**: Numbered sequence from Step 0 to documentation step
- **Testing Checklist**: E2E coverage, component functionality, error handling
- **Error Handling Patterns**: Error state in components, user-facing messages, API error handling in services
- **UI/UX Considerations**: UI library component usage, responsive design, accessibility, loading states
- **Dependencies**
- **Notes**: Business rules, constraints, language requirements
- **Next Steps After Implementation**
- **Implementation Verification**: Code quality, functionality, testing, integration, documentation

---

## Step 2: Update ticket metadata (local ticket system only)

Update `ai-specs/tickets/[ticket-id].md` frontmatter:
- Set `plan_backend` to `ai-specs/changes/[ticket-id]_backend.md` (if backend plan was produced)
- Set `plan_frontend` to `ai-specs/changes/[ticket-id]_frontend.md` (if frontend plan was produced)

Update `ai-specs/tickets/TICKETS.md` to reflect the plan is ready.

## Step 3: Update ARCHITECTURE.md Spec Tracker

Open `ARCHITECTURE.md` and find the `## Spec Tracker` table.

- Locate the row whose `ID` matches the ticket ID.
- Set the `Planned` column to today's date (`YYYY-MM-DD`).
- Leave all other columns unchanged.
