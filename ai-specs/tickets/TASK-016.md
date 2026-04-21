---
id: TASK-016
title: "Implement chat interface (message list + input + history load)"
type: feature
status: todo
scope: frontend
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ~
plan_frontend: ai-specs/changes/TASK-016_frontend.md
---

## Description

Implement the `ChatArea`, `MessageList`, and `MessageInput` components. Anonymous users start with an empty chat stored in React state only. Logged-in users have their conversation history loaded from the backend on mount. Every turn is sent to `POST /chat` and the response is appended to the message list.

## Acceptance Criteria

- [ ] `ChatArea.tsx`, `MessageList.tsx`, `MessageInput.tsx` created in `frontend/src/app/components/`
- [ ] Anonymous: empty on load, messages held in React state, lost on refresh
- [ ] Authenticated: conversation history loaded via `chat.service.ts#loadHistory` on mount
- [ ] Send button and Enter key both submit the message
- [ ] While waiting for response: input disabled, loading indicator shown
- [ ] New turn appended optimistically; bot response replaces placeholder on resolve
- [ ] `chat.service.ts` calls `POST /chat` with optional `userId` and `conversationId`
- [ ] Unit tests for MessageInput submit behavior and MessageList rendering

## Notes

See UI Layout and Agent Loop sections in ARCHITECTURE.md. History is loaded from `GET /chat/history` or equivalent — confirm with backend design in TASK-012.
