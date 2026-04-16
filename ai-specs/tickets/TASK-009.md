---
id: TASK-009
title: "Implement Firestore conversation memory + summary compression"
type: feature
status: todo
scope: backend
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ~
plan_frontend: ~
---

## Description

Implement the Firestore-backed conversation memory module for the LangChain agent. It loads prior turns from Firestore, constructs LLM context (summary + last 10 turns), and triggers summary compression when the conversation exceeds 20 turns.

## Acceptance Criteria

- [ ] Memory module in `infrastructure/agent/memory/firestoreMemory.ts`
- [ ] Loads conversation from Firestore by `conversationId`
- [ ] Builds LLM context: `[summary section if exists] + [last 10 turns]`
- [ ] After appending a new turn, triggers compression if `turns.length > 20`
- [ ] Compression calls LLM to summarize oldest turns, stores result in `summary`, removes summarized turns
- [ ] Anonymous sessions (no `userId`) skip Firestore — memory is in-request only
- [ ] Unit tests cover context building, compression trigger, and anon path

## Notes

Compression prompt: "Summarize this conversation history in 3-5 sentences, focusing on what the user needs, their vehicle, and any recommendations already given." See Chat History Compression section in ARCHITECTURE.md.
