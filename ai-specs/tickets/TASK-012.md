---
id: TASK-012
title: "Implement POST /chat endpoint (anon + authenticated)"
type: feature
status: todo
scope: backend
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ai-specs/changes/TASK-012_backend.md
plan_frontend: ~
---

## Description

Implement the `POST /chat` endpoint and its `ChatUseCase`. The endpoint handles both anonymous and authenticated users. For authenticated users, it loads the client profile, persists turns to Firestore, and triggers compression if needed. For anonymous users, it processes the message without any persistence.

## Acceptance Criteria

- [ ] `ChatUseCase` in `application/chat/ChatUseCase.ts`
- [ ] Request body: `{ userId?: string, conversationId?: string, message: string }`
- [ ] Response body: `{ message: string, conversationId: string }`
- [ ] Authenticated path: load client profile → build system prompt → load history → invoke agent → persist turn
- [ ] Anonymous path: build generic system prompt → invoke agent (no persistence)
- [ ] Route wired in `presentation/routes/chat.route.ts`
- [ ] Unit tests cover both paths; integration test for the full request cycle

## Notes

Depends on TASK-005 (conversation repo), TASK-006 (auth), TASK-009 (memory), TASK-010 (prompt), TASK-011 (agent). See agent loop diagram in ARCHITECTURE.md.
