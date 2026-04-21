---
id: TASK-018
title: "Configure deployment setup"
type: chore
status: todo
scope: fullstack
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ai-specs/changes/TASK-018_backend.md
plan_frontend: ai-specs/changes/TASK-018_frontend.md
---

## Description

Set up production deployment configuration for both the backend (Express) and frontend (Next.js). This includes Dockerfiles, environment variable management, and any CI/CD pipeline configuration needed to deploy the application.

## Acceptance Criteria

- [ ] `Dockerfile` for the backend service
- [ ] `Dockerfile` (or Vercel/Next.js export config) for the frontend
- [ ] `docker-compose.yml` for local production simulation (optional but recommended)
- [ ] Environment variable documentation (`.env.example` files for both services)
- [ ] CI/CD pipeline (GitHub Actions or equivalent) runs tests on PR and deploys on merge to main
- [ ] Deployment target documented (e.g., Cloud Run, Fly.io, Vercel)
- [ ] Secrets (Firebase credentials, API keys) managed via secret manager, not committed

## Notes

Deployment target is TBD. Backend can be deployed to Cloud Run or Fly.io. Frontend to Vercel is the simplest option. Firebase credentials must never be committed to the repo.
