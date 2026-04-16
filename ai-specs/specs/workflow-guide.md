# AI Development Workflow Guide

This document explains how this template is meant to be used. It survives the `/setup-project` process and serves as a reference for both AI agents and developers.

## Standard Flow

```text
/create-ticket Add user authentication   ← skip if using Jira, Linear, etc.
/enrich-us TASK-001                      ← adds acceptance criteria, edge cases, test scenarios
/plan-ticket TASK-001                    ← generates step-by-step implementation plan (backend, frontend, or both)
/develop TASK-001                        ← branch, TDD, commit, PR, kanban update
/update-docs                             ← sync API spec, data model, documentation
```

| Step | Command | What happens |
|---|---|---|
| Create | `/create-ticket <title>` | Create a local ticket in `ai-specs/tickets/` (skip if using an external system) |
| Enrich | `/enrich-us <TICKET_ID>` | Reads the ticket → adds acceptance criteria, technical details, test requirements |
| Plan | `/plan-ticket <TICKET_ID>` | Infers domain (backend/frontend/full-stack) and generates plan(s) in `ai-specs/changes/` |
| Implement | `/develop <TICKET_ID> [FIGMA_URL]` | Creates branch, reads plan, implements with TDD, commits, opens PR, updates kanban |
| Sync docs | `/update-docs` | Updates API spec, data model, and any affected documentation |

Both `/plan-ticket` and `/develop` automatically detect the domain from the ticket content and available plan files — no need to choose a backend or frontend variant.

## Variant Flows

### Requirements are unclear — explore first

```text
/explore    ← think through the problem, clarify requirements
            ← when direction is clear, continue with the standard flow
/create-ticket ...
/enrich-us ...
/develop ...
```

### Ticket already exists in external system (Jira, Linear, GitHub Issues)

```text
/enrich-us TASK-001     ← enrich the existing ticket
/plan-ticket TASK-001
/develop TASK-001
```

## Command Reference

| Command | Description |
|---|---|
| `/explore` | Think through ideas and clarify requirements before starting |
| `/setup-project` | Initialize project from `ai-specs/project.yml` — replaces all `{{MARKER}}` placeholders |
| `/create-ticket` | Create a local ticket (when `ticket_system = local`) |
| `/enrich-us` | Enrich a ticket with acceptance criteria, edge cases, test scenarios |
| `/plan-ticket` | Generate a step-by-step implementation plan — infers backend, frontend, or both from the ticket |
| `/develop` | Implement a ticket: branch, TDD, commit, PR, kanban — infers backend, frontend, or both from the ticket |
| `/update-docs` | Sync API spec, data model, and documentation after implementation |
| `/commit` | Create a structured git commit following project conventions |

> **Kiro users**: These commands are available as chat instructions. Ask Kiro to perform any command by describing the action (e.g., "Create a ticket for: Add user authentication"). For a full mapping, use the `#workflow-guide` steering file in chat. Kiro also supports Spec Driven Development — create a Kiro Spec to formalize Requirements → Design → Tasks for any feature.

## Configuration Reference

These flags live in `ai-specs/project.yml` under `project.workflow` and control how much the AI automates at the end of `/develop`.

| Flag | Default | Description |
|---|---|---|
| `workflow.auto_commit` | `true` | Stage and commit changes after implementation. Set to `false` to review and commit manually. |
| `workflow.auto_pr` | `true` | Push the branch and open a PR after committing. Set to `false` to push and create the PR manually. |

**Disabling both** gives maximum control and the lowest token usage — the AI implements and tests, then stops.

```yaml
# ai-specs/project.yml
project:
  workflow:
    auto_commit: false
    auto_pr: false
```

> `auto_pr: false` implies no push either — the branch stays local until you push manually.

## Team Usage

`ai-specs/changes/` is tracked in git — it contains the implementation plans that developers need to run `/develop` correctly. These are shared artifacts visible to all team members.

For teams, **an external ticket system (Jira, Linear, GitHub Issues) is strongly recommended** over `local`. This way:
- Tickets live in the shared platform, visible to everyone
- Implementation plans live in `ai-specs/changes/`, versioned in git
- No one depends on another developer's local state to pick up a task

## Branch Naming Convention

Before any implementation begins, agents must:

1. Pull `main` to ensure it is up to date (`git pull origin main`)
2. Create a branch from `main` using the format: `<TICKET_ID>-<short-description>`

Examples: `TASK-001-add-user-auth`, `SCRUM-42-fix-login-redirect`

This applies to all work types: backend, frontend, infrastructure, AI agents, MCP servers, etc.

## Key Principle for Agents

Always work **one task at a time**. Never implement beyond the current ticket or task. The workflow is intentionally sequential — explore first (if needed), enrich, plan, implement, then document.
