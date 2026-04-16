---
id: TASK-006
title: "Implement PIN auth backend (register, login, check-username, custom token)"
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

Implement the full PIN-based authentication flow on the backend. This includes use cases for registration and login, the check-username availability endpoint, bcrypt PIN hashing, and Firebase custom token issuance.

## Acceptance Criteria

- [ ] `RegisterUseCase` validates uniqueness, hashes PIN with bcrypt, stores client in Firestore, returns custom token
- [ ] `LoginUseCase` looks up client by username, verifies PIN with bcrypt, returns custom token
- [ ] `GET /auth/check-username?username=xxx` returns `{ available: boolean }`
- [ ] `POST /auth/register` and `POST /auth/login` routes wired up
- [ ] All inputs validated (username format, PIN is 4 digits, required vehicle fields)
- [ ] Unit tests for both use cases (≥ 80% coverage)

## Notes

See Auth Strategy section in ARCHITECTURE.md. Custom tokens are issued via Firebase Admin SDK. No password recovery flow needed (prototype scope).
