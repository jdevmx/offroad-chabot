# Frontend Implementation Plan: TASK-013 RegisterForm

## Overview
Implement the `RegisterForm` component for user registration. This form collects user profile information (username, display name), vehicle details (make, model, year, trim, modifications), and off-roading preferences (terrain types, experience level), along with a 4-digit PIN for authentication. It features real-time, debounced username availability checks and integrates with Firebase to establish a session via a custom token returned by the backend.

## Architecture Context
- **Layer**: Presentation (Components) and Application (Services)
- **Architecture Principles**: Component-based architecture, service layer pattern, local state management.
- **Components/Files Involved**:
    - `frontend/src/app/components/RegisterForm.tsx` (New)
    - `frontend/src/app/services/auth.service.ts` (Modified: implementation of `register` and `checkUsername`)
    - `frontend/src/app/lib/firebase.ts` (New: Firebase client initialization)
    - `frontend/src/app/components/LeftPanel.tsx` (Modified: integrate `RegisterForm`)
- **State Management**: Native React hooks (`useState`, `useEffect`).
- **HTTP Client**: Native `fetch`.
- **UI Library**: Tailwind CSS.

## Implementation Steps

### Step 0: Create feature branch
```bash
git checkout main && git pull origin main
git checkout -b feature/TASK-013-frontend
```

### Step 1: Add Dependencies
- Action: Install Firebase client SDK.
- Command: `npm install firebase` in `frontend/` directory.

### Step 2: Initialize Firebase Client
- File: `frontend/src/app/lib/firebase.ts`
- Action: Initialize the Firebase application and authentication module using environment variables for the configuration.
- Implementation Details:
    - Use `getApps().length === 0 ? initializeApp(config) : getApp()` pattern for Next.js.
    - Export `auth` instance.
- Notes: Define `NEXT_PUBLIC_FIREBASE_CONFIG` in `frontend/.env.local`.

### Step 3: Implement `auth.service.ts`
- File: `frontend/src/app/services/auth.service.ts`
- Action: Implement the placeholder functions for username check and registration.
- Implementation Steps:
    1. Implement `checkUsername(username)`:
        - Call `GET /auth/check-username?username=${username}`.
        - Handle response and potential errors.
    2. Implement `register(payload)`:
        - Call `POST /auth/register` with the full payload.
        - Return the result including the custom token.
- Implementation Notes:
    - Base API URL should be retrieved from `process.env.NEXT_PUBLIC_API_URL` (defaulting to `http://localhost:3001`).

### Step 4: Implement `RegisterForm.tsx`
- File: `frontend/src/app/components/RegisterForm.tsx`
- Action: Create the registration form component with multi-step or grouped fields (User Info, Vehicle, Preferences).
- Implementation Details:
    1. **Username Availability**: Use `useEffect` with a `setTimeout` (400ms debounce) to call `checkUsername`.
    2. **Field Groups**:
        - **Account**: `username`, `displayName`, `pin` (4-digit, type="password", maxLength="4", inputMode="numeric").
        - **Vehicle**: `make`, `model`, `year` (number), `trim` (optional), `modifications` (comma-separated).
        - **Preferences**: `terrainTypes` (multi-select or checkboxes), `experience` (select: beginner, intermediate, expert).
    3. **Form State**: Single object state or multiple `useState` hooks.
    4. **Submission**:
        - Validate required fields and formats (PIN must be 4 digits).
        - Call `authService.register(payload)`.
        - On success, call `signInWithCustomToken(auth, token)` from Firebase SDK.
    5. **Styling**: Tailwind CSS for a modern, responsive layout.

### Step 5: Integrate into `LeftPanel.tsx`
- File: `frontend/src/app/components/LeftPanel.tsx`
- Action: Manage the display state of the `RegisterForm`.
- Implementation Details:
    - Add state to toggle between the initial action buttons and the `RegisterForm`.
    - Handle successful registration (close form/show user info - future tasks).

### Step 6: Unit Testing
- File: `frontend/src/app/components/RegisterForm.test.tsx`
- Action: Verify form functionality and validation.
- Test Scenarios:
    - Correctly renders all input fields.
    - Triggers debounced username check on input change.
    - Validates required fields before submission.
    - PIN input restricts length and characters correctly.
    - Successfully calls registration service and Firebase auth on valid submission.
    - Displays appropriate error messages for failed registration or unavailable username.

### Step 7: Update Technical Documentation
- **Action**: Update the `Spec Tracker` in `ARCHITECTURE.md` to record the planned date for TASK-013.
- **Action**: Update `ai-specs/tickets/TICKETS.md` to reflect that the plan is ready.

## Implementation Order
1. Step 1: Install `firebase`.
2. Step 2: `frontend/src/app/lib/firebase.ts`.
3. Step 3: `frontend/src/app/services/auth.service.ts`.
4. Step 4: `frontend/src/app/components/RegisterForm.tsx`.
5. Step 5: `frontend/src/app/components/LeftPanel.tsx`.
6. Step 6: `frontend/src/app/components/RegisterForm.test.tsx`.
7. Step 7: Update documentation.

## Testing Checklist
- [ ] `npm test` passes with full coverage for new logic.
- [ ] Username availability feedback works with debounce.
- [ ] Registration payload matches backend `RegisterPayload` type.
- [ ] Firebase `signInWithCustomToken` is called with the correct token.
- [ ] Responsive design works on mobile and desktop viewports.

## Error Handling Patterns
- **User-Facing Messages**: Display clear, localized (English) error messages for API failures.
- **Field Validation**: Inline error messages for validation failures.
- **Service Errors**: Services catch and propagate errors for component-level handling.

## UI/UX Considerations
- **Visual Feedback**: Use subtle animations or status indicators for username checks.
- **Form Layout**: Group related fields to avoid overwhelming the user.
- **Accessibility**: Ensure all inputs have proper labels and aria-attributes.

## Dependencies
- `firebase` SDK.
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom` (existing).

## Notes
- Base API URL must be configurable via `NEXT_PUBLIC_API_URL`.
- Adhere to naming conventions (PascalCase for components, camelCase for services).
- Maintain 100% English code, comments, and documentation.

## Next Steps After Implementation
- TASK-014: Implement login form.
- TASK-015: Refine Left Panel (toggle between forms and logged-in view).

## Implementation Verification
- Verify that the registration flow results in a valid Firebase session (can be checked via `onAuthStateChanged`).
- Ensure Firestore `clients` collection is correctly updated by the backend as a result of the registration call (integration check).
