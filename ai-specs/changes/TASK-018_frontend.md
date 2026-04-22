# Frontend Implementation Plan: TASK-018 Deployment setup

## Overview
Configure the production deployment setup for the Next.js frontend on **Firebase Hosting** using a static export. The app is a single-page, fully client-rendered application with no Next.js API routes or SSR — all data fetching goes to the Express backend. This makes static export viable and keeps the frontend on the same GCP/Firebase project as Firestore and Auth.

Architecture principles:
- **Static export**: `next build` with `output: 'export'` generates a static site deployable to Firebase Hosting.
- **Environment baked at build time**: `NEXT_PUBLIC_*` variables are inlined during the build in CI.
- **Automated Deployment**: Continuous deployment from `main` via GitHub Actions using Workload Identity Federation.

## Architecture Context
- **Framework**: Next.js (App Router), fully client-rendered
- **Deployment Target**: Firebase Hosting (same GCP project as backend, Firestore, and Auth)
- **Files involved**:
  - `frontend/next.config.ts`
  - `frontend/.env.example`
  - `.github/workflows/frontend-ci-cd.yml`
  - `firebase.json` (hosting config, already exists)

## Implementation Steps

### Step 1: Configure Next.js Static Export
- **File**: `frontend/next.config.ts`
- **Action**: Add `output: 'export'` to generate a static site on `npm run build`.
- **Note**: Verify no server-only Next.js features are used (server actions, middleware, image optimization with remote URLs). The current single-page structure does not use any of these.

### Step 2: Update Environment Variables Documentation
- **File**: `frontend/.env.example`
- **Action**: Document all required build-time environment variables.
- **Implementation Steps**:
  1. `NEXT_PUBLIC_API_URL` — URL of the deployed Cloud Run backend service. Injected as a GitHub Actions secret at build time.
  2. Firebase client config variables (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.) — public, safe to expose; can be stored as GitHub Actions variables (not secrets).

### Step 3: Update Firebase Hosting Configuration
- **File**: `firebase.json`
- **Action**: Ensure the `hosting` section points to Next.js static export output.
- **Implementation Steps**:
  1. Set `"public": "frontend/out"` (Next.js static export writes to `out/` by default).
  2. Add a `"rewrites"` rule to redirect all routes to `index.html` (SPA fallback).

### Step 4: Configure CI/CD Pipeline
- **File**: `.github/workflows/frontend-ci-cd.yml`
- **Action**: Set up GitHub Actions for frontend CI/CD.
- **Implementation Steps**:
  1. **Job: test** — triggers on all pushes. Install deps, run `npm run lint` and `npm test`.
  2. **Job: deploy** — triggers on push to `main`, after `test` passes.
     - Authenticate to GCP using `google-github-actions/auth` with Workload Identity Federation (same WIF pool as backend, same GitHub repo binding).
     - Inject `NEXT_PUBLIC_API_URL` and Firebase config variables as environment variables.
     - Run `npm run build` in `frontend/` (generates `out/`).
     - Deploy to Firebase Hosting using `firebase deploy --only hosting` (authenticated via the GCP service account).

### Step 5: Update Technical Documentation
- **File**: `ARCHITECTURE.md`
- **Action**: Document the Firebase Hosting deployment, static export config, and environment variables. Update Spec Tracker.

## Implementation Order
1. Step 1: next.config.ts static export
2. Step 2: .env.example
3. Step 3: firebase.json hosting config
4. Step 4: CI/CD workflow
5. Step 5: Documentation

## Testing Checklist
- [ ] `npm run build` completes without errors in `frontend/`.
- [ ] `out/` directory is generated with `index.html`.
- [ ] Static site works locally: `npx serve frontend/out` — Firebase auth and chat function correctly.
- [ ] Lint and tests pass in CI.
- [ ] Deployed Firebase Hosting URL loads the app and connects to the Cloud Run backend.

## Dependencies
- Firebase Hosting enabled in the GCP/Firebase project.
- Workload Identity Federation configured (shared with backend workflow).
- GitHub Actions variables: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
- GitHub Actions secret: `NEXT_PUBLIC_API_URL` (Cloud Run backend URL).
