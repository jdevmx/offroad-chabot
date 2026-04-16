---
id: TASK-010
title: "Implement system prompt builder (user + vehicle context)"
type: feature
status: todo
scope: backend
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ~
plan_frontend: ~
---

## Description

Implement the system prompt builder function that constructs the agent's system prompt. When a user is authenticated, the prompt includes their vehicle details and experience level. For anonymous users, the prompt omits personalization and prompts the agent to ask about the vehicle naturally.

## Acceptance Criteria

- [ ] Builder function in `infrastructure/agent/systemPrompt.ts`
- [ ] Fully typed input: optional `Client` entity (user profile)
- [ ] Injects `{vehicleSection}` from `client.vehicle` fields when user is known
- [ ] Injects `{experienceSection}` from `client.preferences.experience` when user is known
- [ ] Falls back to generic prompt when no user profile is provided
- [ ] Unit tests cover both authenticated and anonymous paths

## Notes

System prompt template defined in AI Agent section of ARCHITECTURE.md. Vehicle data is injected directly — it is NOT fetched via a tool.
