---
id: TASK-018
title: "Configure deployment setup"
type: chore
status: done
scope: fullstack
assignee: Jorge Dominguez
created: 2026-04-16
branch: ~
plan_backend: ai-specs/changes/TASK-018_backend.md
plan_frontend: ai-specs/changes/TASK-018_frontend.md
---

## Description

Set up production deployment configuration for both the backend (Express) and frontend (Next.js) targeting GCP. Backend deploys to Cloud Run; frontend deploys to Firebase Hosting as a static export. Both use GitHub Actions with Workload Identity Federation for keyless GCP authentication — no service account key files stored in secrets.

## Acceptance Criteria

- [ ] `backend/Dockerfile` — multi-stage build for the Express service
- [ ] `backend/.dockerignore` — excludes `node_modules`, `.env*`, test files
- [ ] `frontend/next.config.ts` — `output: 'export'` for static site generation
- [ ] `firebase.json` — hosting `public` points to `frontend/out`, SPA fallback rewrite
- [ ] `.env.example` files for both backend and frontend documenting all required variables
- [ ] GCP prerequisites documented: Artifact Registry repo, Cloud Run service account, Workload Identity Federation pool/provider
- [ ] `.github/workflows/backend-ci-cd.yml` — test on push, deploy to Cloud Run on merge to `main`
- [ ] `.github/workflows/frontend-ci-cd.yml` — test on push, static build + Firebase Hosting deploy on merge to `main`
- [ ] Firebase Admin SDK on Cloud Run uses ADC (no service account key in environment)
- [ ] `TAVILY_API_KEY` and `MISTRAL_API_KEY` stored in Secret Manager, referenced in Cloud Run config
- [ ] Deployed backend responds to `GET /health`
- [ ] Deployed frontend loads and connects to the Cloud Run backend

## Notes

- Deployment targets: **Cloud Run** (backend) + **Firebase Hosting** (frontend, static export).
- Firebase Admin SDK on Cloud Run uses Application Default Credentials via the attached service account — no `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` env vars needed in production.
- GitHub Actions authenticates to GCP via Workload Identity Federation (no service account key JSON in GitHub secrets).
- Firebase credentials must never be committed to the repo.
