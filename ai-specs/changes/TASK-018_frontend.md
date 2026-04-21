# Frontend Implementation Plan: TASK-018 Deployment setup

## Overview
Configure the production deployment setup for the Next.js frontend. This involves defining the deployment strategy (Vercel recommended), managing environment variables, and setting up CI/CD for automated testing and deployment.

Architecture principles:
- **Optimization**: Use Next.js optimized builds for production.
- **Environment Management**: Distinguish between build-time and run-time environment variables.
- **Automated Deployment**: Continuous deployment from the `main` branch.

## Architecture Context
- **Framework**: Next.js (App Router)
- **Deployment Target**: Vercel (preferred for Next.js) or a containerized solution.
- **Files involved**: 
  - `frontend/.env.example`
  - `.github/workflows/frontend-ci-cd.yml`
  - `vercel.json` (if applicable)

## Implementation Steps

### Step 0: Create feature branch
- **Action**: Create branch `feature/TASK-018-frontend`

### Step 1: Update Environment Variables Documentation
- **File**: `frontend/.env.example`
- **Action**: Document all required client-side environment variables.
- **Implementation Steps**:
  1. Document `NEXT_PUBLIC_API_URL` (pointing to the backend service).
  2. Document Firebase client configuration (API_KEY, AUTH_DOMAIN, etc.) if accessed directly.

### Step 2: Configure CI/CD Pipeline (Frontend)
- **File**: `.github/workflows/frontend-ci-cd.yml`
- **Action**: Set up GitHub Actions for frontend CI/CD.
- **Implementation Steps**:
  1. **Job: Lint & Test**: Run on pull requests. Install deps, run `npm run lint` and `npm test`.
  2. **Job: Deploy**: If using Vercel, integrate Vercel GitHub integration. If using containerization, create a `Dockerfile` for the frontend and push to a registry.

### Step 3: Create Frontend Dockerfile (Alternative Strategy)
- **File**: `frontend/Dockerfile`
- **Action**: Create a multi-stage Dockerfile for Next.js (only if Vercel is not used).
- **Implementation Steps**:
  1. **Build stage**: Use `node:20-slim`, install dependencies, and run `npm run build`.
  2. **Production stage**: Use `node:20-slim`, copy `.next`, `public`, and `node_modules`.
  3. Command: `npm start`.

### Step 4: Update Technical Documentation
- **File**: `ARCHITECTURE.md`
- **Action**: Document the frontend deployment process and environment variables. Update Spec Tracker.

## Implementation Order
1. Step 0: Branch.
2. Step 1: .env.example.
3. Step 2: CI/CD workflow configuration.
4. Step 3: Dockerfile (if required).
5. Step 4: Documentation.

## Testing Checklist
- [ ] Build process completes without errors (`npm run build`).
- [ ] Environment variables are correctly picked up in the production build.
- [ ] Linting and tests pass in the CI pipeline.

## Dependencies
- Vercel account or container registry configuration.
- GitHub repository secrets for environment variables.

## Implementation Verification
- `npm run build` locally in `frontend/`.
- Verify the deployed URL after merge to `main`.
