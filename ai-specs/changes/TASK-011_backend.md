# Backend Implementation Plan: TASK-011 Implement LangChain Agent Executor

## Overview
Implement the core `AgentExecutor` that orchestrates the AI's reasoning and tool usage. This component wires together the Mistral LLM, the `tavily_search` tool, the system prompt, and the conversation memory to drive the ReAct (Reasoning + Acting) loop.

## Architecture Context
- **Layer**: Infrastructure (Agent)
- **Files**:
    - `backend/src/infrastructure/agent/agentExecutor.ts` (New)
    - `backend/src/infrastructure/agent/agentExecutor.test.ts` (New)
    - `backend/src/infrastructure/agent/tools/tavilySearch.tool.ts` (Reference)
    - `backend/src/infrastructure/agent/memory/firestoreMemory.ts` (Reference)
    - `backend/src/infrastructure/agent/systemPrompt.ts` (Reference)

## Implementation Steps

### Step 0: Create branch
- **Action**: Create feature branch `feature/TASK-011-backend`

### Step 1: Add Dependencies
- **Action**: Install LangChain Mistral integration.
- **Command**: `npm install @langchain/mistralai`
- **Notes**: Ensure `MISTRAL_API_KEY` is added to `backend/.env` (and `.env.example`).

### Step 2: Implement Agent Executor
- **File**: `backend/src/infrastructure/agent/agentExecutor.ts`
- **Action**: Create the `runAgent` function.
- **Function Signature**:
    - `export async function runAgent(params: { message: string, systemPrompt: string, memory: BaseChatMemory }): Promise<{ message: string, toolsUsed: string[] }>`
- **Implementation Details**:
    1. Initialize `ChatMistralAI` with `apiKey` and `modelName: "mistral-medium-latest"`.
    2. Load the `tavilySearchTool`.
    3. Create the agent using `createOpenAIFunctionsAgent` (or equivalent for Mistral if using function calling) or `createStructuredChatAgent`. *Recommendation: Use structured chat agent for better compatibility with non-OpenAI models if needed, but Mistral supports function calling.*
    4. Initialize `AgentExecutor` with the agent, tools, and the provided `memory`.
    5. Call `executor.invoke({ input: params.message, system_prompt: params.systemPrompt })`.
    6. Extract the final output message and the list of tools invoked from the intermediate steps.

### Step 3: Implement Integration Tests
- **File**: `backend/src/infrastructure/agent/agentExecutor.test.ts`
- **Action**: Verify the executor's orchestration.
- **Scenarios**:
    - **Direct Answer**: Verify that the executor returns a message without calling tools when possible.
    - **Tool Usage**: Verify that the executor calls `tavily_search` when the query requires external info.
    - **Memory Persistence**: Verify that the provided memory object's `saveContext` is called after the execution.
- **Mocking**: Mock `ChatMistralAI` and `tavilySearchTool` to control the reasoning loop and avoid external API costs.

### Step 4: Update Technical Documentation
- **Action**: Update the `Spec Tracker` in `ARCHITECTURE.md` for TASK-011.
- **Action**: Update `ai-specs/tickets/TICKETS.md` to show the plan is ready.

## Implementation Order
1. Install `@langchain/mistralai`
2. `backend/src/infrastructure/agent/agentExecutor.ts`
3. `backend/src/infrastructure/agent/agentExecutor.test.ts`
4. `ARCHITECTURE.md`
5. `ai-specs/tickets/TICKETS.md`

## Testing Checklist
- [ ] Mistral LLM is correctly configured with the specified model.
- [ ] Agent correctly interprets the `system_prompt` variable.
- [ ] Tools are correctly registered and available to the agent.
- [ ] `toolsUsed` array correctly captures the names of invoked tools.
- [ ] Executor handles LLM timeouts or tool errors gracefully.

## Dependencies
- `@langchain/mistralai`
- `@langchain/core`
- LangChain tools and memory from previous tasks.

## Next Steps After Implementation
- Integrate `runAgent` into the `ChatUseCase` or directly into the `POST /chat` controller in `TASK-012`.
