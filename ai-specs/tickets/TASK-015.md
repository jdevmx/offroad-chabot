---
id: TASK-015
title: "Implement left panel (auth toggle + user info)"
type: feature
status: todo
scope: frontend
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ~
plan_frontend: ai-specs/changes/TASK-015_frontend.md
---

## Description

Implement the `LeftPanel` component. It conditionally renders the authentication forms (Register / Login) when the user is anonymous, or the user info (username, vehicle summary, Logout button) when the user is logged in. It observes Firebase Auth state to switch between views.

## Acceptance Criteria

- [ ] `LeftPanel.tsx` component created in `frontend/src/app/components/`
- [ ] Unauthenticated state: shows Register and Login form toggle
- [ ] Authenticated state: shows username, vehicle make/model/year, and Logout button
- [ ] Logout calls Firebase `signOut()` and resets chat state
- [ ] Subscribes to `onAuthStateChanged` to reactively update UI
- [ ] Unit tests cover both unauthenticated and authenticated render states

## Notes

Hosts TASK-013 (RegisterForm) and TASK-014 (LoginForm). See UI Layout section in ARCHITECTURE.md for the panel structure.
