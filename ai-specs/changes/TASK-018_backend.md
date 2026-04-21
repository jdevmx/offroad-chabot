# Backend Implementation Plan: TASK-018 Deployment setup

## Overview
Configure the production deployment setup for the Express backend. This involves creating a `Dockerfile`, ensuring environment variables are properly handled, and setting up a CI/CD pipeline for automated testing and deployment.

Architecture principles:
- **Containerization**: Use Docker for a consistent production environment.
- **Security**: Secrets managed via environment variables and secret managers.
- **CI/CD**: Automated testing on pull requests and deployment on merge.

## Architecture Context
- **Runtime**: Node.js
- **Framework**: Express
- **Deployment Target**: Cloud Run (recommended for Firebase/GCP integration) or Fly.io.
- **Files involved**: 
  - `backend/Dockerfile`
  - `backend/.env.example`
  - `.github/workflows/backend-cd.yml` (if GitHub Actions is used)

## Implementation Steps

### Step 0: Create feature branch
- **Action**: Create branch `feature/TASK-018-backend`

### Step 1: Create Backend Dockerfile
- **File**: `backend/Dockerfile`
- **Action**: Create a multi-stage Dockerfile for the Node.js application.
- **Implementation Steps**:
  1. **Build stage**: Use `node:20-slim`, install dependencies, and run `npm run build`.
  2. **Production stage**: Use `node:20-slim`, copy only necessary files (`dist`, `node_modules`, `package.json`), and set `NODE_ENV=production`.
  3. Expose port 3010 (or the configured backend port).
  4. Command: `node dist/index.js`.

### Step 2: Update Environment Variables Documentation
- **File**: `backend/.env.example`
- **Action**: Ensure all required environment variables are documented.
- **Implementation Steps**:
  1. Verify variables for Firebase Admin SDK (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY).
  2. Document `PORT`, `CORS_ORIGIN`, and `TAVILY_API_KEY`.
  3. Document `MISTRAL_API_KEY`.

### Step 3: Configure CI/CD Pipeline (Backend)
- **File**: `.github/workflows/backend-ci-cd.yml`
- **Action**: Set up GitHub Actions for backend CI/CD.
- **Implementation Steps**:
  1. **Job: Test**: Run on pull requests. Install deps, run `npm run test`.
  2. **Job: Deploy**: Run on merge to `main`. Build Docker image, push to registry (e.g., GCR), and deploy to Cloud Run.

### Step 4: Update Technical Documentation
- **File**: `ARCHITECTURE.md`
- **Action**: Document the deployment process and environment variables. Update Spec Tracker.

## Implementation Order
1. Step 0: Branch.
2. Step 1: Dockerfile.
3. Step 2: .env.example.
4. Step 3: CI/CD workflow.
5. Step 4: Documentation.

## Testing Checklist
- [ ] Docker image builds successfully.
- [ ] Container runs locally with valid environment variables.
- [ ] CI/CD pipeline correctly triggers on PR.
- [ ] (Optional) Simulated deployment to a staging environment.

## Dependencies
- Docker installed locally for verification.
- GitHub repository secrets configured for deployment.

## Implementation Verification
- `docker build -t offroad-chabot-backend ./backend`
- `npm run test` passes in CI.
