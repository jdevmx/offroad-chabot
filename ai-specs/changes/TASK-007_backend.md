# Backend Implementation Plan: TASK-007 Implement Auth Middleware

## Overview
Implement Express middleware that verifies Firebase ID tokens using the Firebase Admin SDK. The middleware will extract the `Bearer` token from the `Authorization` header, verify it, and attach the decoded `uid` to the request object. It will support both strict (required) and optional authentication modes to accommodate the `/chat` endpoint requirements.

## Architecture Context
- **Layer**: Presentation (Middleware)
- **Files**:
    - `backend/src/presentation/middleware/auth.middleware.ts` (New)
    - `backend/src/presentation/middleware/auth.middleware.test.ts` (New)
    - `backend/src/infrastructure/firebase/firebaseAdmin.ts` (Reference: for token verification)

## Implementation Steps

### Step 0: Create branch
- **Action**: Create feature branch `feature/TASK-007-backend`

### Step 1: Implement Auth Middleware
- **File**: `backend/src/presentation/middleware/auth.middleware.ts`
- **Action**: Create the middleware function.
- **Function Signature**:
    - `export const verifyToken = (options: { required: boolean }) => (req: Request, res: Response, next: NextFunction) => Promise<void>`
- **Implementation Steps**:
    1. Define an interface extending `express.Request` to include a `user?: { uid: string }` property.
    2. Extract the `Authorization` header.
    3. If header is missing:
        - If `options.required` is `true`, return `401 Unauthorized`.
        - If `options.required` is `false`, call `next()`.
    4. Extract the token from `Bearer <token>`.
    5. Verify the token using `getFirebaseAdmin().auth().verifyIdToken(token)`.
    6. On success:
        - Attach `{ uid: decodedToken.uid }` to `req.user`.
        - Call `next()`.
    7. On error (invalid/expired token):
        - If `options.required` is `true`, return `401 Unauthorized` with a clear message ("Invalid or expired token").
        - If `options.required` is `false`, call `next()`.

### Step 2: Implement Unit Tests
- **File**: `backend/src/presentation/middleware/auth.middleware.test.ts`
- **Action**: Create comprehensive tests using Vitest and `supertest` (or direct function calls with mocked `req`, `res`, `next`).
- **Scenarios**:
    - **Required mode**:
        - Should call `next()` if valid token is provided.
        - Should return `401` if header is missing.
        - Should return `401` if token format is invalid (not Bearer).
        - Should return `401` if token is invalid/expired.
    - **Optional mode**:
        - Should call `next()` and set `req.user` if valid token is provided.
        - Should call `next()` and NOT set `req.user` if header is missing.
        - Should call `next()` and NOT set `req.user` if token is invalid (log the error but don't block).

### Step 3: Update Technical Documentation
- **Action**: Update the `Spec Tracker` in `ARCHITECTURE.md` for TASK-007.
- **Action**: Update `ai-specs/tickets/TICKETS.md` to show the plan is ready.

## Implementation Order
1. `backend/src/presentation/middleware/auth.middleware.ts`
2. `backend/src/presentation/middleware/auth.middleware.test.ts`
3. `ARCHITECTURE.md`
4. `ai-specs/tickets/TICKETS.md`

## Testing Checklist
- [ ] Middleware handles missing `Authorization` header correctly based on `required` flag.
- [ ] Middleware handles malformed `Authorization` header (missing `Bearer` prefix).
- [ ] Firebase Admin SDK `verifyIdToken` is correctly called and mocked in tests.
- [ ] `req.user.uid` is correctly populated on successful verification.
- [ ] Error messages for `401` responses are descriptive.
- [ ] TypeScript types correctly reflect the presence of `req.user`.

## Error Response Format
- **401 Unauthorized**:
  ```json
  {
    "success": false,
    "error": {
      "message": "Unauthorized: Missing or invalid token",
      "code": "AUTH_ERROR"
    }
  }
  ```

## Dependencies
- `firebase-admin` (already in project)
- `express`

## Next Steps After Implementation
- Apply `verifyToken({ required: false })` to the `/chat` route in `TASK-012`.
- Apply `verifyToken({ required: true })` to profile routes if needed.
