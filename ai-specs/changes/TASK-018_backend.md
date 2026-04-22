# Backend Implementation Plan: TASK-018 Deployment setup

## Overview
Configure the production deployment setup for the Express backend on GCP Cloud Run. This involves creating a `Dockerfile`, managing environment variables via Secret Manager, and setting up a CI/CD pipeline using GitHub Actions with Workload Identity Federation for keyless GCP authentication.

Architecture principles:
- **Containerization**: Docker image pushed to Artifact Registry, deployed to Cloud Run.
- **Security**: No service account key files. Firebase Admin SDK uses Application Default Credentials (ADC) via the Cloud Run service account. Other secrets managed via Secret Manager.
- **CI/CD**: Automated testing on push; deployment on merge to `main`.

## Architecture Context
- **Runtime**: Node.js 20
- **Framework**: Express
- **Deployment Target**: Cloud Run (same GCP project as Firebase/Firestore)
- **Container Registry**: Artifact Registry (`REGION-docker.pkg.dev/PROJECT/REPO`)
- **Files involved**:
  - `backend/Dockerfile`
  - `backend/.dockerignore`
  - `backend/.env.example`
  - `.github/workflows/backend-ci-cd.yml`

## Implementation Steps

### Step 1: Create Backend Dockerfile
- **File**: `backend/Dockerfile`
- **Action**: Create a multi-stage Dockerfile for the Node.js application.
- **Implementation Steps**:
  1. **Build stage**: Use `node:20-slim`, copy source, install all deps, run `npm run build`.
  2. **Production stage**: Use `node:20-slim`, copy only `dist/`, `package.json`, `package-lock.json`. Run `npm ci --omit=dev`.
  3. Set `NODE_ENV=production`.
  4. Expose port `$PORT` (Cloud Run injects this at runtime; default 8080).
  5. Command: `node dist/index.js`.

### Step 2: Create .dockerignore
- **File**: `backend/.dockerignore`
- **Action**: Exclude files that must not enter the Docker build context.
- **Content**: `node_modules`, `.env*`, `src/`, test files (`**/*.test.ts`, `**/*.spec.ts`), coverage reports.

### Step 3: Update Environment Variables Documentation
- **File**: `backend/.env.example`
- **Action**: Document all required environment variables with GCP deployment notes.
- **Implementation Steps**:
  1. `PORT` — Cloud Run injects this automatically; document default as `8080`.
  2. `CORS_ORIGIN` — URL of the deployed Firebase Hosting frontend.
  3. `TAVILY_API_KEY` — stored in Secret Manager, injected as env var in Cloud Run.
  4. `MISTRAL_API_KEY` — stored in Secret Manager, injected as env var in Cloud Run.
  5. Firebase Admin SDK credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) — **only needed for local development**. On Cloud Run, the service account identity provides ADC automatically; no key file is used.

### Step 4: Configure GCP Project Prerequisites
- **Action**: One-time setup of GCP resources (documented, not automated).
- **Implementation Steps**:
  1. Create an Artifact Registry Docker repository in the target region.
  2. Create a Cloud Run service account with roles: `roles/datastore.user`, `roles/firebaseauth.admin`.
  3. Set up **Workload Identity Federation**: create a pool and provider that trusts the GitHub Actions OIDC issuer, bound to the specific repository.
  4. Grant the GitHub Actions identity permission to impersonate the Cloud Run service account.
  5. Store `TAVILY_API_KEY` and `MISTRAL_API_KEY` in Secret Manager; grant the Cloud Run service account `roles/secretmanager.secretAccessor`.

### Step 5: Configure CI/CD Pipeline
- **File**: `.github/workflows/backend-ci-cd.yml`
- **Action**: Set up GitHub Actions for backend CI/CD.
- **Implementation Steps**:
  1. **Job: test** — triggers on all pushes. Install deps, run `npm run test`.
  2. **Job: deploy** — triggers on push to `main`, after `test` passes.
     - Authenticate to GCP using `google-github-actions/auth` with Workload Identity Federation (no service account key stored in GitHub secrets).
     - Build and push Docker image to Artifact Registry.
     - Deploy to Cloud Run: set `--service-account`, pass Secret Manager references for `TAVILY_API_KEY` and `MISTRAL_API_KEY`, set `CORS_ORIGIN`.

### Step 6: Update Technical Documentation
- **File**: `ARCHITECTURE.md`
- **Action**: Document deployment architecture, GCP services used, and environment variables. Update Spec Tracker.

## Implementation Order
1. Step 1: Dockerfile
2. Step 2: .dockerignore
3. Step 3: .env.example
4. Step 4: GCP prerequisites (manual, one-time)
5. Step 5: CI/CD workflow
6. Step 6: Documentation

## Testing Checklist
- [ ] Docker image builds successfully: `docker build -t offroad-backend ./backend`
- [ ] Container runs locally with `.env` file: `docker run --env-file .env offroad-backend`
- [ ] `npm run test` passes in CI.
- [ ] Deployed Cloud Run service responds to `GET /health`.
- [ ] Firestore reads/writes work from Cloud Run (validates ADC + service account permissions).

## Dependencies
- GCP project with billing enabled.
- Artifact Registry repository created.
- Workload Identity pool and provider configured.
- GitHub repository secrets: `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `CLOUD_RUN_REGION`, `CORS_ORIGIN`.
