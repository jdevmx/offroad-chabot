# Backend Implementation Plan: TASK-008 Implement Tavily Search Tool

## Overview
Implement a custom LangChain tool named `tavily_search` using `DynamicStructuredTool`. This tool will wrap the Tavily Search API, allowing the AI agent to retrieve real-time trail reports, gear reviews, and technical specifications for off-road vehicles.

## Architecture Context
- **Layer**: Infrastructure (Agent Tools)
- **Files**:
    - `backend/src/infrastructure/agent/tools/tavilySearch.tool.ts` (New)
    - `backend/src/infrastructure/agent/tools/tavilySearch.tool.test.ts` (New)

## Implementation Steps

### Step 0: Create branch
- **Action**: Create feature branch `feature/TASK-008-backend`

### Step 1: Add Dependencies
- **Action**: Install required LangChain and validation packages.
- **Command**: `npm install @langchain/core @langchain/community zod`
- **Notes**: Ensure `TAVILY_API_KEY` is added to `backend/.env` (and `.env.example`).

### Step 2: Implement Tavily Search Tool
- **File**: `backend/src/infrastructure/agent/tools/tavilySearch.tool.ts`
- **Action**: Create the `tavilySearchTool` instance.
- **Implementation Details**:
    1. Import `DynamicStructuredTool` from `@langchain/core/tools`.
    2. Define a Zod schema for the input: `{ query: z.string().describe("The search query for off-road trails, gear, or technical specs") }`.
    3. Implement the `_call` function:
        - Read `process.env.TAVILY_API_KEY`.
        - Use the Tavily Search API (via `fetch` or `@langchain/community/tools/tavily_search`).
        - Format the results (e.g., concatenate titles and snippets) into a single string for the agent.
    4. Handle API errors gracefully (return a message like "Search currently unavailable" instead of throwing).

### Step 3: Implement Unit Tests
- **File**: `backend/src/infrastructure/agent/tools/tavilySearch.tool.test.ts`
- **Action**: Create tests to verify the tool's behavior.
- **Scenarios**:
    - Should correctly parse the Zod schema.
    - Should call the Tavily API with the correct query and API key.
    - Should return formatted results on success.
    - Should handle API failures (4xx/5xx) by returning an error message string.
- **Mocking**: Mock `fetch` or the Tavily client to avoid actual API calls during tests.

### Step 4: Update Technical Documentation
- **Action**: Update the `Spec Tracker` in `ARCHITECTURE.md` for TASK-008.
- **Action**: Update `ai-specs/tickets/TICKETS.md` to show the plan is ready.

## Implementation Order
1. Install dependencies
2. `backend/src/infrastructure/agent/tools/tavilySearch.tool.ts`
3. `backend/src/infrastructure/agent/tools/tavilySearch.tool.test.ts`
4. `ARCHITECTURE.md`
5. `ai-specs/tickets/TICKETS.md`

## Testing Checklist
- [ ] Tool correctly identifies its name as `tavily_search`.
- [ ] Zod schema provides clear descriptions for the LLM.
- [ ] Tool handles missing `TAVILY_API_KEY` by returning an informative string or throwing a clear error.
- [ ] Results are truncated or formatted to stay within reasonable token limits.
- [ ] API failures do not crash the agent loop.

## Dependencies
- `@langchain/core`
- `@langchain/community`
- `zod`

## Next Steps After Implementation
- Register the tool in the `AgentExecutor` during `TASK-011`.
