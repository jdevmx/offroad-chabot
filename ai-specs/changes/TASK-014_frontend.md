# Frontend Implementation Plan: TASK-014 Login form (username + PIN)

## Overview
Implement the `LoginForm` component for the OffRoad Chabot. This component allows registered users to log in using their username and a 4-digit PIN. It handles user input, communicates with the backend via the `auth.service.ts`, and establishes a Firebase Auth session using a custom token.

Architecture principles:
- **Component-based**: Focused, reusable UI component.
- **Service Layer**: Decoupled API logic in `auth.service.ts`.
- **Type Safety**: Full TypeScript implementation for props, state, and API payloads.
- **TDD**: Component and service tests using Vitest and React Testing Library.

## Architecture Context
- **Components**: `src/app/components/LoginForm.tsx`
- **Services**: `src/app/services/auth.service.ts`
- **External Dependencies**: `firebase/auth`, `firebase/app`
- **State Management**: Local React hooks (`useState`)

## Implementation Steps

### Step 0: Create feature branch
- **Action**: Create branch `feature/TASK-014-frontend`

### Step 1: Install dependencies and Initialize Firebase
- **File**: `frontend/package.json`, `frontend/src/app/lib/firebase.ts` (new)
- **Action**: Install `firebase` package and create a singleton for Firebase initialization.
- **Implementation Steps**:
  1. `npm install firebase`
  2. Create `src/app/lib/firebase.ts` to initialize Firebase App and Auth using environment variables (`NEXT_PUBLIC_FIREBASE_CONFIG`).
  3. Export `auth` instance.

### Step 2: Implement Login method in Auth Service
- **File**: `frontend/src/app/services/auth.service.ts`
- **Action**: Implement the `login` function.
- **Function Signature**: `export async function login(payload: LoginPayload): Promise<AuthResult>`
- **Implementation Steps**:
  1. Use `fetch` to POST to `/api/auth/login` (or the configured backend endpoint).
  2. Handle non-200 responses by throwing meaningful errors.
  3. Return the `AuthResult` containing the custom token.

### Step 3: Create LoginForm Component
- **File**: `frontend/src/app/components/LoginForm.tsx`
- **Action**: Build the UI and logic for the login form.
- **Component Signature**: `export default function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void })`
- **Implementation Steps**:
  1. Define state for `username`, `pin`, `error`, and `isLoading`.
  2. Create a form with:
     - Text input for username.
     - Password/tel input for PIN (4 digits, numeric).
     - Submit button ("Log In").
  3. Form submission handler:
     - Validate that PIN is 4 digits.
     - Call `authService.login(payload)`.
     - On success, call `signInWithCustomToken(auth, token)` from Firebase.
     - Handle errors by updating the `error` state.
     - Disable inputs and show loading state during the request.
  4. Use Tailwind CSS for styling, following the project's aesthetics.

### Step 4: Add Unit Tests for LoginForm
- **File**: `frontend/src/app/components/LoginForm.test.tsx`
- **Action**: Create tests for the component.
- **Implementation Steps**:
  1. Mock `auth.service.ts` and `firebase/auth`.
  2. Test rendering of all fields and buttons.
  3. Test successful submission: verify service call and `onLoginSuccess` trigger.
  4. Test error handling: verify error message display on API failure.
  5. Test validation: verify PIN length constraint.

### Step 5: Update Technical Documentation
- **File**: `ARCHITECTURE.md` (if needed), `frontend/README.md`
- **Action**: Ensure the login flow and Firebase setup are documented.
- **Implementation Steps**:
  1. Verify `Auth Strategy` section in `ARCHITECTURE.md` is still accurate.
  2. Update `frontend/README.md` with instructions on required environment variables for Firebase.

## Implementation Order
1. Step 0: Feature branch.
2. Step 1: Firebase installation and init.
3. Step 2: Service implementation.
4. Step 3: Component implementation.
5. Step 4: Unit tests.
6. Step 5: Documentation update.

## Testing Checklist
- [ ] Form renders correctly with username and PIN fields.
- [ ] PIN input only accepts 4 digits (visual/basic validation).
- [ ] Submit button is disabled while loading.
- [ ] Successful login calls Firebase `signInWithCustomToken`.
- [ ] Invalid credentials show an error message.
- [ ] Network errors are handled gracefully.

## Error Handling Patterns
- Components: Use an `error` state string to display messages in a red alert box or under the inputs.
- Services: Throw errors with descriptive messages from the backend response or generic messages for network issues.

## UI/UX Considerations
- Input focus: Auto-focus username on mount.
- Feedback: Use a spinner or text change ("Logging in...") on the submit button.
- Accessibility: Proper `aria-label` for inputs, `role="alert"` for error messages.

## Dependencies
- `firebase`: For `signInWithCustomToken`.
- `auth.service.ts`: For the login API call.

## Notes
- The backend for login (TASK-006) should be available or mocked during development.
- The 4-digit PIN should be treated as sensitive; ensure the input type is `password` or similar.

## Implementation Verification
- Run `npm test` to ensure all tests pass.
- Verify the login flow end-to-end if the backend is available.
- Check Tailwind styles for consistency with the rest of the application.
