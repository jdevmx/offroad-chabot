# Backend Implementation Plan: TASK-017 User profile view (vehicle display + edit modifications)

## Overview
Implement backend support for retrieving the user's profile and updating their vehicle's modifications. This involves adding new endpoints to `auth.route.ts` and corresponding logic in `auth.controller.ts`, utilizing the existing `IClientRepository`.

Architecture principles:
- **Clean Architecture**: Orchestration handled in the controller (or a dedicated use case if logic grows).
- **Security**: Both endpoints require a valid Firebase ID token.
- **DDD**: The `Client` entity is used to maintain domain integrity.

## Architecture Context
- **Layers**: 
  - **Presentation**: `auth.route.ts`, `auth.controller.ts`
  - **Domain**: `Client.ts`, `IClientRepository.ts`
  - **Infrastructure**: `FirestoreClientRepository.ts`
- **Authentication**: `verifyToken({ required: true })` middleware.

## Implementation Steps

### Step 0: Create feature branch
- **Action**: Create branch `feature/TASK-017-backend`

### Step 1: Implement getProfile in Auth Controller
- **File**: `backend/src/presentation/controllers/auth.controller.ts`
- **Action**: Add `getProfile` function.
- **Function Signature**: `export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`
- **Implementation Steps**:
  1. Extract `uid` from `req.user`.
  2. Use `FirestoreClientRepository` to find the client by `uid`.
  3. If not found, return 404.
  4. Return the client data (excluding `pinHash`).

### Step 2: Implement updateVehicle in Auth Controller
- **File**: `backend/src/presentation/controllers/auth.controller.ts`
- **Action**: Add `updateVehicle` function.
- **Function Signature**: `export async function updateVehicle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`
- **Implementation Steps**:
  1. Extract `uid` from `req.user`.
  2. Extract `vehicle` (or just `modifications`) from `req.body`.
  3. Load the existing client.
  4. Create a new `Client` instance with updated vehicle data.
  5. Save the updated client back to the repository.
  6. Return the updated client data.

### Step 3: Register Routes
- **File**: `backend/src/presentation/routes/auth.route.ts`
- **Action**: Add `GET /profile` and `PATCH /vehicle` routes.
- **Implementation Steps**:
  1. `router.get('/profile', verifyToken({ required: true }), getProfile);`
  2. `router.patch('/vehicle', verifyToken({ required: true }), updateVehicle);`

### Step 4: Unit Tests
- **File**: `backend/src/presentation/routes/auth.route.test.ts` (or new controller test)
- **Action**: Test the new endpoints.
- **Implementation Steps**:
  1. Mock the auth middleware to simulate a logged-in user.
  2. Test `GET /auth/profile` returns 200 and correct data.
  3. Test `GET /auth/profile` returns 404 if client not in DB.
  4. Test `PATCH /auth/vehicle` updates modifications and returns 200.
  5. Test 401 response when token is missing.

### Step 5: Update Technical Documentation
- **File**: `ARCHITECTURE.md`
- **Action**: Ensure the API spec section (if any) reflects these additions. Update Spec Tracker.

## Implementation Order
1. Step 0: Branch.
2. Step 1 & 2: Controller methods.
3. Step 3: Routes.
4. Step 4: Tests.
5. Step 5: Documentation.

## Testing Checklist
- [ ] `GET /auth/profile` returns user details for a valid token.
- [ ] `PATCH /auth/vehicle` correctly updates the modifications list in Firestore.
- [ ] Unauthorized requests (no token/invalid token) return 401.

## Error Response Format
- Standard JSON error: `{ success: false, error: { message: string, code: string } }`

## Dependencies
- `firebase-admin`: For Firestore access (via repo).
- `auth.middleware.ts`: For token verification.

## Implementation Verification
- `npm test` in `backend/`
