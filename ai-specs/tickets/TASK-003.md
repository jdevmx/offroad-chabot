---
id: TASK-003
title: "Firebase Admin SDK init + env validation"
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

Initialize the Firebase Admin SDK singleton for backend use and validate all required environment variables at startup. This is a foundational task — all Firestore repository implementations and the auth token issuance depend on the Admin SDK being correctly initialized before the Express app handles any requests.

## Acceptance Criteria

- [ ] `backend/src/infrastructure/firebase/firebaseAdmin.ts` exports an initialized Admin SDK singleton
- [ ] SDK is initialized once (guard against re-initialization in hot-reload environments)
- [ ] Required environment variables are validated at startup: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (or equivalent service account config)
- [ ] Application fails fast with a clear error message if any required env var is missing
- [ ] A Vitest unit test verifies that missing env vars cause the expected error
- [ ] No Firebase credentials are hard-coded or committed to the repository

## Notes

- Follows the backend structure defined in ARCHITECTURE.md: `backend/src/infrastructure/firebase/firebaseAdmin.ts`
- Use the Firebase Admin SDK (`firebase-admin` package)
- Private key env var may need newline handling (`\\n` → `\n`)
- `.env.example` should document all required variables
