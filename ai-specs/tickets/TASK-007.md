---
id: TASK-007
title: "Implement auth middleware (Firebase ID token verification)"
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

Implement Express middleware that verifies Firebase ID tokens on protected routes. The middleware extracts the Bearer token from the `Authorization` header, verifies it with Firebase Admin SDK, and attaches the decoded token (uid) to the request object.

## Acceptance Criteria

- [ ] Middleware reads `Authorization: Bearer <token>` header
- [ ] Verifies token using `auth().verifyIdToken()`
- [ ] Attaches `uid` to `req.user` on success
- [ ] Returns `401` with a clear error message if token is missing or invalid
- [ ] Middleware is applied to routes that require authentication (e.g., `/chat` for authenticated users)
- [ ] Unit tests cover valid token, missing token, and invalid token cases

## Notes

The `/chat` endpoint supports both anonymous and authenticated usage — the middleware should be optional (not block anonymous requests, but populate `req.user` when a valid token is present).
