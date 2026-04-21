# Frontend Implementation Plan: TASK-017 User profile view (vehicle display + edit modifications)

## Overview
Implement the UI for viewing and editing the user's vehicle profile. This feature is accessible from the `LeftPanel` when the user is authenticated. It allows users to see their vehicle specs and update their current modifications list.

Architecture principles:
- **Service Layer**: All profile data fetching and updates go through `auth.service.ts`.
- **Component-Based**: Create a dedicated `ProfileView` component.
- **User Feedback**: Provide loading and success/error indicators during updates.

## Architecture Context
- **Components**:
  - `src/app/components/ProfileView.tsx` (New)
  - `src/app/components/LeftPanel.tsx` (Update to navigate to ProfileView)
- **Services**:
  - `src/app/services/auth.service.ts` (Update: Implement `getProfile` and `updateVehicle`)
- **State Management**: Local component state for editing.

## Implementation Steps

### Step 0: Create feature branch
- **Action**: Create branch `feature/TASK-017-frontend`

### Step 1: Update Auth Service
- **File**: `frontend/src/app/services/auth.service.ts`
- **Action**: Implement profile management methods.
- **Implementation Steps**:
  1. `getProfile()`: GET `/auth/profile` with Authorization header.
  2. `updateVehicle(vehicle: Vehicle)`: PATCH `/auth/vehicle` with Authorization header.
  3. Ensure tokens are retrieved from Firebase Auth before calls.

### Step 2: Create ProfileView Component
- **File**: `frontend/src/app/components/ProfileView.tsx`
- **Action**: Create a component to display and edit vehicle data.
- **Implementation Steps**:
  1. Fetch profile on mount using `auth.service.ts`.
  2. Display Make, Model, Year, Trim as read-only.
  3. Render `modifications` as an editable list (e.g., tags with "add" and "remove" buttons).
  4. Implement a "Save" button that calls `updateVehicle`.
  5. Add a "Back" button to return to the main left panel view.

### Step 3: Update LeftPanel Component
- **File**: `frontend/src/app/components/LeftPanel.tsx`
- **Action**: Add a way to trigger the Profile View.
- **Implementation Steps**:
  1. In the `authenticated` state of `UserInfo` (from TASK-015), add a "View Profile" or "Edit Vehicle" button.
  2. Manage a sub-view state in `LeftPanel`: `'info' | 'profile'`.
  3. Render `ProfileView` when state is `'profile'`.

### Step 4: Unit Tests
- **File**: `frontend/src/app/components/ProfileView.test.tsx`
- **Action**: Test profile interactions.
- **Implementation Steps**:
  1. Mock `auth.service.ts` methods.
  2. Verify that profile data is displayed on mount.
  3. Verify that adding/removing a modification updates the local state.
  4. Verify that clicking "Save" calls the service with correct data.

### Step 5: Update Technical Documentation
- **File**: `ARCHITECTURE.md`
- **Action**: Update Spec Tracker.

## Implementation Order
1. Step 0: Branch.
2. Step 1: Service updates.
3. Step 2: `ProfileView` component.
4. Step 3: `LeftPanel` integration.
5. Step 4: Tests.
6. Step 5: Documentation.

## Testing Checklist
- [ ] "Edit Vehicle" button appears when logged in.
- [ ] Profile view displays correct vehicle information.
- [ ] User can add/remove modifications from the list.
- [ ] Save button correctly calls the backend and shows feedback.
- [ ] Changes persist after refreshing (and re-logging if needed).

## UI/UX Considerations
- Use a clear layout for vehicle details.
- Modifications should be easy to manage (e.g., a simple input with "Enter to add tag" pattern).
- Loading spinner while saving.

## Dependencies
- `auth.service.ts`: For API communication.
- `firebase/auth`: For token management.

## Implementation Verification
- `npm test` in `frontend/`
- Manual verification of profile edit flow.
