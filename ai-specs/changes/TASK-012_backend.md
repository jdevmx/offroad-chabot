# Backend Implementation Plan: TASK-012 Implement POST /chat endpoint (anon + authenticated)

## Overview
Implement the core `POST /chat` endpoint and its corresponding `ChatUseCase`. This is the primary entry point for the AI assistant, orchestrating the client profile lookup, system prompt construction, conversation history management, and the LangChain agent execution. It handles both anonymous users (stateless) and authenticated users (persisted in Firestore with compression).

## Architecture Context
- **Layer**: Presentation (Route) & Application (Use Case)
- **Files**:
    - `backend/src/application/chat/ChatUseCase.ts` (New)
    - `backend/src/presentation/routes/chat.route.ts` (New)
    - `backend/src/application/chat/ChatUseCase.test.ts` (New)
    - `backend/src/presentation/routes/chat.route.test.ts` (New)
    - `backend/src/presentation/app.ts` (Modified: to register the new route)

## Implementation Steps

### Step 0: Create branch
- **Action**: Create feature branch `feature/TASK-012-backend`

### Step 1: Implement ChatUseCase
- **File**: `backend/src/application/chat/ChatUseCase.ts`
- **Action**: Create the `ChatUseCase` class.
- **Implementation Details**:
    1. Define the input interface: `interface ChatRequest { userId?: string, conversationId?: string, message: string }`.
    2. Define the output interface: `interface ChatResponse { message: string, conversationId?: string }`.
    3. Constructor dependencies: `IClientRepository`, `IConversationRepository`.
    4. `execute(params: ChatRequest)`:
        - Determine if authenticated: `const isAuthenticated = !!params.userId`.
        - Initialize `systemPrompt`:
            - If `isAuthenticated`: Load `client` via `clientRepo.findById(params.userId!)`. Call `buildSystemPrompt(client)`.
            - Else: Call `buildSystemPrompt()`.
        - Initialize `effectiveConversationId`:
            - If `isAuthenticated`:
                - If `params.conversationId` is provided, use it.
                - Else: Find latest via `convRepo.findByUserId(params.userId!)`.
                - If still no conversation, create one via `convRepo.create(params.userId!)`.
                - Use the `id` from the resulting conversation.
            - Else: `undefined`.
        - Initialize `memory`:
            - Create `new FirestoreChatMemory({ conversationId: effectiveConversationId, userId: params.userId, repository: convRepo })`.
            - *Note: `FirestoreChatMemory` from TASK-009 is designed to handle null `userId` gracefully.*
        - Call `runAgent({ message: params.message, systemPrompt, memory })`.
        - Return `{ message: agentResult.message, conversationId: effectiveConversationId }`.

### Step 2: Implement Chat Route
- **File**: `backend/src/presentation/routes/chat.route.ts`
- **Action**: Create the Express route and controller.
- **Implementation Details**:
    1. Import `verifyToken` from `auth.middleware.ts`.
    2. Define `POST /` route.
    3. Apply `verifyToken({ required: false })` middleware.
    4. Controller logic:
        - Extract `message` and `conversationId` from `req.body`.
        - Extract `userId` from `req.user?.uid` (populated by middleware).
        - Validate `message` presence (return 400 if missing).
        - Call `ChatUseCase.execute({ userId, conversationId, message })`.
        - Return 200 with the result.
        - Catch and handle errors: return 500 with a standard error format.

### Step 3: Wire Route in App
- **File**: `backend/src/presentation/app.ts`
- **Action**: Register the chat route.
- **Details**: `app.use('/chat', chatRouter)`.

### Step 4: Implement Unit Tests for ChatUseCase
- **File**: `backend/src/application/chat/ChatUseCase.test.ts`
- **Scenarios**:
    - **Authenticated User (New Conv)**: Should find/create conversation, build personalized prompt, and run agent.
    - **Authenticated User (Existing Conv)**: Should use provided `conversationId`.
    - **Anonymous User**: Should use generic prompt and no/ephemeral memory.
    - **Client Not Found**: Should fallback to generic prompt even if `userId` provided (or handle as error).

### Step 5: Implement Integration Tests for Route
- **File**: `backend/src/presentation/routes/chat.route.test.ts`
- **Details**: Use `supertest` to hit the endpoint. Mock `runAgent` to avoid real LLM calls. Verify that the response contains the expected message and `conversationId`.

### Step 6: Update Technical Documentation
- **Action**: Update the `Spec Tracker` in `ARCHITECTURE.md` for TASK-012.
- **Action**: Update `ai-specs/tickets/TICKETS.md` to show the plan is ready.

## Implementation Order
1. `backend/src/application/chat/ChatUseCase.ts`
2. `backend/src/presentation/routes/chat.route.ts`
3. `backend/src/presentation/app.ts`
4. `backend/src/application/chat/ChatUseCase.test.ts`
5. `backend/src/presentation/routes/chat.route.test.ts`
6. `ARCHITECTURE.md`
7. `ai-specs/tickets/TICKETS.md`

## Testing Checklist
- [ ] Endpoint handles missing `message` in body (400).
- [ ] Endpoint handles optional `Authorization` header.
- [ ] `req.user.uid` is correctly passed to the use case.
- [ ] `ChatUseCase` correctly branches between anon and auth logic.
- [ ] `conversationId` is returned correctly in both modes.
- [ ] Agent results are correctly propagated to the response.
- [ ] Errors in the agent loop are handled and returned as 500.

## Error Response Format
- **400 Bad Request** (missing message):
  ```json
  { "success": false, "error": { "message": "Message is required", "code": "VALIDATION_ERROR" } }
  ```
- **500 Internal Server Error**:
  ```json
  { "success": false, "error": { "message": "Failed to process chat", "code": "INTERNAL_ERROR" } }
  ```

## Dependencies
- All components from TASK-005, TASK-007, TASK-009, TASK-010, TASK-011.

## Next Steps After Implementation
- Implement the Frontend Chat Interface (TASK-016) to consume this endpoint.
