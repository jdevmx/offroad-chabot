---
id: TASK-011
title: "Implement LangChain agent executor (Mistral + Tavily)"
type: feature
status: todo
scope: backend
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ai-specs/changes/TASK-011_backend.md
plan_frontend: ~
---

## Description

Implement the LangChain agent executor that wires together the Mistral LLM, the Tavily Search tool, the system prompt builder, and the Firestore memory module. The executor drives the ReAct loop and returns the final agent response.

## Acceptance Criteria

- [ ] Agent executor defined in `infrastructure/agent/agentExecutor.ts`
- [ ] Uses Mistral (`mistral-medium-latest`) via LangChain's ChatMistralAI
- [ ] Registers the `tavily_search` tool (TASK-008)
- [ ] Accepts system prompt string (from TASK-010) and conversation history (from TASK-009)
- [ ] Returns `{ message: string, toolsUsed: string[] }`
- [ ] `MISTRAL_API_KEY` loaded from environment variables
- [ ] Integration test invokes the executor with a mocked LLM response

## Notes

Depends on TASK-008, TASK-009, TASK-010. This is the core of the AI agent. See AI Agent section in ARCHITECTURE.md for the agent loop diagram.
