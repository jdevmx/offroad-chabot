---
id: TASK-002
title: "Frontend scaffold + single-page shell"
type: feature
status: in_progress
scope: frontend
assignee: Jorge Dominguez
created: 2026-04-16
branch: TASK-002-frontend-scaffold
plan_backend: ~
plan_frontend: ai-specs/changes/TASK-002_frontend.md
---

## Description

Initialize the Next.js (App Router) frontend with TypeScript and Tailwind CSS. Implement the single-page shell at route `/` with the two-column layout: a left panel (auth toggles placeholder) and a chat area (message list + input placeholders). Establish the `components/` and `services/` directory structure as defined in the architecture.

## Acceptance Criteria

- [ ] Next.js project bootstrapped with App Router, TypeScript, and Tailwind CSS
- [ ] `frontend/src/app/layout.tsx` renders Tailwind base styles as root layout
- [ ] `frontend/src/app/page.tsx` renders the two-column layout (left panel + chat area)
- [ ] `LeftPanel.tsx` stub component renders without errors
- [ ] `ChatArea.tsx` stub component renders without errors
- [ ] `MessageList.tsx` stub component renders without errors
- [ ] `MessageInput.tsx` stub component renders without errors (text input + send button)
- [ ] `auth.service.ts` and `chat.service.ts` files exist as empty typed modules
- [ ] `GET /` returns HTTP 200 with no console errors
- [ ] Vitest configured and a smoke test for `page.tsx` passes

## Notes

- Layout matches the ASCII diagram in ARCHITECTURE.md (§ UI Layout): left panel ~25% width, chat area fills remaining space
- No auth logic or API calls in this ticket — stubs only
- Anonymous and logged-in states are not wired up yet (handled in TASK-013–016)
- No Firebase SDK integration in this ticket
