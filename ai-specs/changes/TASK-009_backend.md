# Backend Implementation Plan: TASK-009 Firestore Conversation Memory + Summary Compression

## Overview
Implement a specialized LangChain memory component that persists to Firestore and handles automatic history compression. This ensures the agent maintains context over long conversations while keeping the LLM prompt size optimized and predictable.

## Architecture Context
- **Layer**: Infrastructure (Agent Memory)
- **Files**:
    - `backend/src/infrastructure/agent/memory/firestoreMemory.ts` (New)
    - `backend/src/infrastructure/agent/memory/firestoreMemory.test.ts` (New)
    - `backend/src/domain/conversation/IConversationRepository.ts` (Reference for data access)
    - `ARCHITECTURE.md` (Source of truth for compression logic)

## Implementation Steps

### Step 0: Create branch
- **Action**: Create feature branch `feature/TASK-009-backend`

### Step 1: Implement Firestore Memory Module
- **File**: `backend/src/infrastructure/agent/memory/firestoreMemory.ts`
- **Action**: Create the memory class.
- **Implementation Details**:
    1. Define `FirestoreChatMemory` class extending `BaseChatMemory`.
    2. Constructor should accept `conversationId`, `userId` (optional), and `conversationRepository`.
    3. `loadMemoryVariables()`:
        - If `userId` is null, return empty history (anon mode).
        - Fetch conversation from repository.
        - Construct history string/messages: `Summary: [summary]` (if exists) + `Turns: [last 10 turns]`.
    4. `saveContext()`:
        - If `userId` is null, do nothing (anon).
        - Append new turn to the `turns` array in Firestore.
        - Check `turns.length > 20`.
        - If true, trigger `compressHistory()`.
    5. `compressHistory()` (Private):
        - Take all turns except the last 10.
        - Call LLM (Mistral) with the compression prompt: *"Summarize this conversation history in 3-5 sentences, focusing on what the user needs, their vehicle, and any recommendations already given."*
        - Append new summary to existing summary (if any) or generate fresh.
        - Update Firestore: Set `summary` to the new value and slice the `turns` array to keep only the last 10.

### Step 2: Implement Unit Tests
- **File**: `backend/src/infrastructure/agent/memory/firestoreMemory.test.ts`
- **Action**: Verify loading and compression logic.
- **Scenarios**:
    - **Load History**: Correctly combines summary and turns from repository.
    - **Compression Trigger**: Should NOT trigger at 19 turns, SHOULD trigger at 21.
    - **Compression Logic**: Verify LLM is called with correct prompt and repository `update` is called with sliced turns.
    - **Anonymous Mode**: Verify no repository calls are made when `userId` is null.

### Step 3: Update Technical Documentation
- **Action**: Update the `Spec Tracker` in `ARCHITECTURE.md` for TASK-009.
- **Action**: Update `ai-specs/tickets/TICKETS.md` to show the plan is ready.

## Implementation Order
1. `backend/src/infrastructure/agent/memory/firestoreMemory.ts`
2. `backend/src/infrastructure/agent/memory/firestoreMemory.test.ts`
3. `ARCHITECTURE.md`
4. `ai-specs/tickets/TICKETS.md`

## Testing Checklist
- [ ] Correctly identifies when to skip persistence for anonymous users.
- [ ] Compression prompt matches the specification in `ARCHITECTURE.md`.
- [ ] LLM for compression is properly mocked in tests.
- [ ] History is loaded in the correct chronological order.
- [ ] Memory variables match the format expected by the LangChain prompt template.

## Dependencies
- `@langchain/core`
- `firebase-admin`

## Next Steps After Implementation
- Use this memory module in the `AgentExecutor` during `TASK-011`.
