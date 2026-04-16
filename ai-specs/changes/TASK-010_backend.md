# Backend Implementation Plan: TASK-010 Implement System Prompt Builder

## Overview
Implement the `buildSystemPrompt` utility that constructs the agent's core instructions. This function dynamically injects user-specific context (vehicle details and experience level) when a profile is available, enabling the LLM to provide personalized, safety-first off-road advice.

## Architecture Context
- **Layer**: Infrastructure (Agent)
- **Files**:
    - `backend/src/infrastructure/agent/systemPrompt.ts` (New)
    - `backend/src/infrastructure/agent/systemPrompt.test.ts` (New)
    - `backend/src/domain/client/Client.ts` (Reference for user profile structure)
    - `ARCHITECTURE.md` (Source for the core template)

## Implementation Steps

### Step 0: Create branch
- **Action**: Create feature branch `feature/TASK-010-backend`

### Step 1: Implement System Prompt Builder
- **File**: `backend/src/infrastructure/agent/systemPrompt.ts`
- **Action**: Create the builder function.
- **Function Signature**:
    - `export function buildSystemPrompt(client?: Client): string`
- **Implementation Details**:
    1. Define the base template (following `ARCHITECTURE.md`):
       - Core persona: "You are an expert off-road driving assistant specializing in 4x4 vehicles, trail navigation, vehicle maintenance, and overlanding gear."
       - Safety-first guidelines.
       - Instructions for `tavily_search` usage.
       - Language instruction (mirror the user's language).
    2. Logic for `{vehicleSection}`:
       - If `client?.vehicle` exists: "The user is driving a [Year] [Make] [Model] [Trim]. Modifications: [Modifications list]. Tailor your technical advice and gear recommendations to this specific vehicle."
       - Else: "The user has not registered a vehicle. Ask about their vehicle naturally if it helps you provide better advice."
    3. Logic for `{experienceSection}`:
       - If `client?.preferences?.experience` exists: "The user identifies as a [Level] off-roader. Adjust the technical depth of your explanations accordingly."
       - Else: "" (omitted).
    4. Return the fully interpolated string.

### Step 2: Implement Unit Tests
- **File**: `backend/src/infrastructure/agent/systemPrompt.test.ts`
- **Action**: Create tests for various user profiles.
- **Scenarios**:
    - **Anonymous User**: Verify the prompt asks for the vehicle and omits experience.
    - **Full Profile**: Verify the vehicle year, make, model, and modifications are present.
    - **No Modifications**: Verify the modifications list is handled cleanly (e.g., "None reported" or omitted).
    - **Experience Level**: Verify that different experience levels (beginner/expert) are correctly injected.

### Step 3: Update Technical Documentation
- **Action**: Update the `Spec Tracker` in `ARCHITECTURE.md` for TASK-010.
- **Action**: Update `ai-specs/tickets/TICKETS.md` to show the plan is ready.

## Implementation Order
1. `backend/src/infrastructure/agent/systemPrompt.ts`
2. `backend/src/infrastructure/agent/systemPrompt.test.ts`
3. `ARCHITECTURE.md`
4. `ai-specs/tickets/TICKETS.md`

## Testing Checklist
- [ ] Prompt template matches `ARCHITECTURE.md` perfectly.
- [ ] Handles missing `client` object gracefully.
- [ ] Handles partial `vehicle` or `preferences` objects.
- [ ] Modifications array is formatted correctly (e.g., comma-separated).
- [ ] No hardcoded Spanish or other languages (instructions should be in English for the LLM).

## Dependencies
- `backend/src/domain/client/Client.ts`

## Next Steps After Implementation
- Use this builder in the `AgentExecutor` during `TASK-011`.
