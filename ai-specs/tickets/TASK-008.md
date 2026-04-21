---
id: TASK-008
title: "Implement Tavily Search tool for the AI agent"
type: feature
status: done
scope: backend
assignee: Jorge Dominguez
created: 2026-04-16
branch: ~
plan_backend: ai-specs/changes/TASK-008_backend.md
plan_frontend: ~
---

## Description

Implement the `tavily_search` LangChain DynamicStructuredTool that wraps the Tavily Search API. The tool enables the agent to search for trail reports, gear reviews, technical specs, and current off-road regulations.

## Acceptance Criteria

- [ ] Tool defined in `infrastructure/agent/tools/tavilySearch.tool.ts`
- [ ] Uses `DynamicStructuredTool` from LangChain with a typed Zod schema for input
- [ ] Calls Tavily Search API with the provided query
- [ ] Returns formatted search results as a string for the agent to reason over
- [ ] `TAVILY_API_KEY` loaded from environment variables
- [ ] Unit tests mock the Tavily API and verify tool input/output contract

## Notes

Tavily API key must be added to `.env`. Tool is registered in the agent executor (TASK-011). See AI Agent section in ARCHITECTURE.md.
