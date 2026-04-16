---
id: TASK-001
title: "Backend scaffold + healthcheck"
type: feature
status: done
scope: backend
assignee: Jorge Dominguez
created: 2026-04-16
branch: TASK-001-backend-scaffold
plan_backend: ai-specs/changes/TASK-001_backend.md
plan_frontend: ~
---

## Description

Set up the Express backend project following Clean Architecture (domain / application / infrastructure / presentation layers), with TypeScript, a working `GET /health` endpoint, and Vitest configured for testing.

This is the foundational backend scaffold from which all subsequent backend tasks will build.

## Acceptance Criteria

- [ ] `backend/` directory exists with a valid `package.json` and TypeScript config
- [ ] Clean Architecture folder structure is in place (`domain/`, `application/`, `infrastructure/`, `presentation/`)
- [ ] Express app factory is implemented in `presentation/app.ts`
- [ ] `GET /health` route returns `200 { status: "ok" }`
- [ ] Vitest is configured and a smoke test for the health route passes
- [ ] Server starts without errors via `npm run dev`

## Notes

Refer to `ARCHITECTURE.md` → Backend Structure section for the expected folder layout and file names.
No database, auth, or agent code in this ticket — scaffold and healthcheck only.
