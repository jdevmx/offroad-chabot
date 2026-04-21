# Frontend Implementation Plan: TASK-016 Implement chat interface (message list + input + history load)

## Overview
Implement the core chat functionality for OffRoad Chabot. This includes the `ChatArea` container, the `MessageList` for displaying turns, and the `MessageInput` for sending new messages. The implementation must support both anonymous sessions (local state only) and authenticated sessions (persisted history).

Architecture principles:
- **Client-Side Only State**: Chat messages for anonymous users live only in React state.
- **Service-Driven**: All API calls (sending messages, loading history) go through `chat.service.ts`.
- **Optimistic UI**: Append user messages immediately to the list before the API responds.
- **Graceful Loading**: Show loading indicators and disable inputs during API calls.

## Architecture Context
- **Components**:
  - `src/app/components/ChatArea.tsx` (Update)
  - `src/app/components/MessageList.tsx` (Update)
  - `src/app/components/MessageInput.tsx` (Update)
- **Services**:
  - `src/app/services/chat.service.ts` (Update: Implement `sendMessage` and `loadHistory`)
- **State Management**: Local React hooks (`useState`, `useEffect`) in `ChatArea`.

## Implementation Steps

### Step 0: Create feature branch
- **Action**: Create branch `feature/TASK-016-frontend`

### Step 1: Implement Chat Service methods
- **File**: `frontend/src/app/services/chat.service.ts`
- **Action**: Implement `sendMessage` and `loadHistory` using `fetch`.
- **Implementation Steps**:
  1. `sendMessage`: POST to `/chat` with payload. Return response.
  2. `loadHistory`: GET from `/chat/history` (verify exact route with TASK-012, or use a placeholder if not yet ready).
  3. Use `process.env.NEXT_PUBLIC_API_URL` for the base path.

### Step 2: Update MessageList Component
- **File**: `frontend/src/app/components/MessageList.tsx`
- **Action**: Render an array of messages.
- **Component Signature**: `export default function MessageList({ messages }: { messages: ChatMessage[] })`
- **Implementation Steps**:
  1. Map over `messages` and render each turn.
  2. Distinguish between 'user' and 'assistant' roles with different styling (e.g., alignment and background colors).
  3. Add a "loading" state indicator at the bottom when the bot is thinking.
  4. Ensure the list auto-scrolls to the bottom on new messages.

### Step 3: Update MessageInput Component
- **File**: `frontend/src/app/components/MessageInput.tsx`
- **Action**: Handle text input and emission of messages.
- **Component Signature**: `export default function MessageInput({ onSend, disabled }: { onSend: (text: string) => void, disabled: boolean })`
- **Implementation Steps**:
  1. Use `useState` for the input value.
  2. Implement `handleSubmit` to call `onSend` and clear the input.
  3. Disable input and button when `disabled` prop is true.
  4. Handle "Enter" key for submission.

### Step 4: Update ChatArea Component (The Orchestrator)
- **File**: `frontend/src/app/components/ChatArea.tsx`
- **Action**: Manage chat state, auth state, and coordination between input and list.
- **Implementation Steps**:
  1. Add `'use client'`.
  2. Initialize `messages` state: `const [messages, setMessages] = useState<ChatMessage[]>([])`.
  3. Use `onAuthStateChanged` to detect user login.
  4. **History Loading**: When a user logs in, call `chat.service.ts#loadHistory` and populate `messages`.
  5. **Message Sending**:
     - Create `handleSendMessage(text: string)`.
     - Optimistically add the user message to state.
     - Call `chat.service.ts#sendMessage`.
     - Replace the "thinking" placeholder or append the bot's response.
     - Handle errors by showing an error message in the chat or a toast.

### Step 5: Unit Tests
- **Files**: 
  - `frontend/src/app/components/MessageInput.test.tsx`
  - `frontend/src/app/components/MessageList.test.tsx`
- **Action**: Verify core component behaviors.
- **Implementation Steps**:
  1. Test `MessageInput` calls `onSend` with correct text.
  2. Test `MessageInput` is disabled when instructed.
  3. Test `MessageList` renders the correct number of messages with correct content.

### Step 6: Update Technical Documentation
- **File**: `ARCHITECTURE.md`
- **Action**: Update Spec Tracker and ensure Chat History section matches frontend implementation.

## Implementation Order
1. Step 0: Branch.
2. Step 1: Service implementation.
3. Step 2 & 3: Presentation components (List & Input).
4. Step 4: Orchestration (ChatArea).
5. Step 5: Tests.
6. Step 6: Documentation.

## Testing Checklist
- [ ] Anonymous chat works (messages held in state).
- [ ] Authenticated chat loads history on login.
- [ ] Message input is disabled while waiting for response.
- [ ] Optimistic UI: user message appears immediately.
- [ ] Auto-scroll to bottom on new messages.
- [ ] Pressing "Enter" sends the message.
- [ ] API errors are handled gracefully (input re-enabled, error shown).

## UI/UX Considerations
- Bot response should feel distinct from user message.
- Loading indicator (e.g., "Bot is typing...") provides feedback.
- Responsive design: chat should occupy full height but remain scrollable.

## Dependencies
- `firebase/auth`: For detecting login state.
- `chat.service.ts`: For API communication.

## Notes
- If `GET /chat/history` is not yet implemented in the backend, use a mock in the service or hardcoded sample data for testing.
- The `conversationId` should be stored in state after the first message or loaded with history.

## Implementation Verification
- `npm test` in `frontend/`
- Manual verification of chat loop (anon and logged in).
