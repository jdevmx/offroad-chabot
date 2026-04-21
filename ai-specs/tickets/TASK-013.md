---
id: TASK-013
title: "Implement registration form (username check + vehicle + PIN)"
type: feature
status: in_progress
scope: frontend
assignee: Jorge Dominguez
created: 2026-04-16
branch: ~
plan_backend: ~
plan_frontend: ai-specs/changes/TASK-013_frontend.md
---

## Description

Implement the `RegisterForm` component for the frontend. It collects username (with real-time availability check), vehicle details (make, model, year, trim, modifications), and a 4-digit PIN. On successful submission it calls the registration service and signs the user in via Firebase custom token.

## Acceptance Criteria

- [ ] `RegisterForm.tsx` component created in `frontend/src/app/components/`
- [ ] Username field performs debounced (≥ 400 ms) availability check via `GET /auth/check-username`
- [ ] Shows visual feedback: available / taken / checking
- [ ] Vehicle fields: make, model, year, trim (optional), modifications (comma-separated or tag input)
- [ ] PIN field: 4 digits, masked input
- [ ] On submit: calls `auth.service.ts#register`, calls `signInWithCustomToken(token)`
- [ ] Form validation: required fields, PIN format, year is a number
- [ ] Unit tests for username check debounce logic and form validation

## Notes

See Auth Strategy section in ARCHITECTURE.md. The form lives in the Left Panel (TASK-015). `auth.service.ts` is defined in TASK-006 backend, but the service layer calling it is part of this ticket.
