# Frontend Implementation Plan: TASK-015 Left panel (auth toggle + user info)

## Overview
Implement the logic and UI transitions for the `LeftPanel` component. The panel serves as the main navigation and authentication hub, switching between registration/login forms for anonymous users and a profile summary for authenticated users. It relies on Firebase Auth for session management.

Architecture principles:
- **Reactive Auth State**: Use `onAuthStateChanged` to drive UI updates.
- **Conditional Rendering**: Cleanly switch between `RegisterForm`, `LoginForm`, and `UserInfo` views.
- **Service Layer**: Use `auth.service.ts` for logout functionality.
- **Local State**: Manage internal view toggles (Login vs. Register) using React hooks.

## Architecture Context
- **Components**: 
  - `src/app/components/LeftPanel.tsx` (Update)
  - `src/app/components/UserInfo.tsx` (New - Profile summary)
- **External Dependencies**: `firebase/auth`
- **State Management**: Local React hooks (`useState`) for view switching; Firebase Auth for global session.

## Implementation Steps

### Step 0: Create feature branch
- **Action**: Create branch `feature/TASK-015-frontend`

### Step 1: Implement Logout in Auth Service
- **File**: `frontend/src/app/services/auth.service.ts`
- **Action**: Implement the `logout` function.
- **Function Signature**: `export async function logout(): Promise<void>`
- **Implementation Steps**:
  1. Call `signOut(auth)` from Firebase.
  2. (Optional) Clear any local storage or chat state if necessary.

### Step 2: Create UserInfo Component
- **File**: `frontend/src/app/components/UserInfo.tsx`
- **Action**: Create a component to display the logged-in user's profile and vehicle.
- **Component Signature**: `export default function UserInfo({ user, onLogout }: { user: User, onLogout: () => void })`
- **Implementation Steps**:
  1. Receive the Firebase `User` object.
  2. (Note: Vehicle info might need a separate fetch or be part of the custom token/user profile if implemented in TASK-004/006. For now, focus on username and a placeholder for vehicle).
  3. Render username and "Logout" button.
  4. Style with Tailwind CSS.

### Step 3: Update LeftPanel Component
- **File**: `frontend/src/app/components/LeftPanel.tsx`
- **Action**: Implement auth state observation and view switching.
- **Implementation Steps**:
  1. Import `auth` from `src/app/lib/firebase.ts`.
  2. Use `useEffect` to subscribe to `onAuthStateChanged(auth, (user) => { ... })`.
  3. Define a `view` state: `'login' | 'register' | 'authenticated'`.
  4. **Anonymous Mode**:
     - Provide buttons to toggle between `LoginForm` and `RegisterForm`.
     - Render the selected component.
  5. **Authenticated Mode**:
     - Render `UserInfo`.
  6. Handle the `onLoginSuccess` callback from forms to ensure the UI updates if `onAuthStateChanged` hasn't fired yet (though it usually fires immediately).

### Step 4: Add Unit Tests for LeftPanel
- **File**: `frontend/src/app/components/LeftPanel.test.tsx`
- **Action**: Test the various states of the panel.
- **Implementation Steps**:
  1. Mock `firebase/auth` to simulate authenticated and unauthenticated users.
  2. Test that it shows Login/Register buttons when unauthenticated.
  3. Test that it switches to `RegisterForm` when "Register" is clicked.
  4. Test that it shows `UserInfo` when authenticated.
  5. Test that clicking "Logout" calls the auth service.

### Step 5: Update Technical Documentation
- **File**: `ARCHITECTURE.md`, `frontend/README.md`
- **Action**: Document the component structure and auth flow.
- **Implementation Steps**:
  1. Ensure the `UI Layout` section in `ARCHITECTURE.md` matches the implementation.

## Implementation Order
1. Step 0: Feature branch.
2. Step 1: `auth.service.ts` logout implementation.
3. Step 2: `UserInfo.tsx` component.
4. Step 3: `LeftPanel.tsx` logic update.
5. Step 4: Unit tests.
6. Step 5: Documentation.

## Testing Checklist
- [ ] Shows Login/Register options on load for guest.
- [ ] Toggling between Login and Register works.
- [ ] Automatically switches to UserInfo when a user signs in.
- [ ] Automatically switches back to Auth forms when signing out.
- [ ] Logout button works and signs the user out of Firebase.

## Error Handling Patterns
- Auth failures during logout should be logged and potentially shown as a toast/alert if persistent.

## UI/UX Considerations
- Smooth transitions between forms.
- Clear active state for Login/Register buttons.
- Profile summary should be visually distinct.

## Dependencies
- `firebase`: For auth state subscription.
- `auth.service.ts`: For logout.
- `LoginForm`, `RegisterForm`: Integrated as children.

## Notes
- `UserInfo` will eventually need to display vehicle details. This depends on how the user profile data is fetched after login (e.g., a `useProfile` hook or fetching from Firestore).

## Implementation Verification
- `npm test`
- Manual verification of auth flow in the browser.
