---
id: TASK-014
title: "Implement login form (username + PIN)"
type: feature
status: todo
scope: frontend
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ~
plan_frontend: ~
---

## Description

Implement the `LoginForm` component for the frontend. It collects a username and 4-digit PIN, submits credentials to the backend login endpoint, and establishes a Firebase session via the returned custom token.

## Acceptance Criteria

- [ ] `LoginForm.tsx` component created in `frontend/src/app/components/`
- [ ] Fields: username (text), PIN (4-digit masked input)
- [ ] On submit: calls `auth.service.ts#login`, calls `signInWithCustomToken(token)`
- [ ] Displays error message on invalid credentials
- [ ] Disables submit button while request is in flight
- [ ] Unit tests cover successful login and error state rendering

## Notes

Lives in the Left Panel (TASK-015). Backend login endpoint implemented in TASK-006.
