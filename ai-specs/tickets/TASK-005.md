---
id: TASK-005
title: "Implement conversation repository (Firestore conversations collection)"
type: feature
status: todo
scope: backend
assignee: unassigned
created: 2026-04-16
branch: ~
plan_backend: ai-specs/changes/TASK-005_backend.md
plan_frontend: ~
---

## Description

Implement `FirestoreConversationRepository` that fulfills the `IConversationRepository` interface. This repository manages the `conversations` collection in Firestore, supporting CRUD operations for conversation documents including turns, summary, and timestamps.

## Acceptance Criteria

- [ ] `IConversationRepository` interface defined in `domain/conversation/`
- [ ] `Conversation` entity defined in `domain/conversation/Conversation.ts`
- [ ] `FirestoreConversationRepository` implemented in `infrastructure/repositories/`
- [ ] Supports: create, findById, findByUserId, appendTurn, updateSummary
- [ ] All methods are fully typed
- [ ] Unit tests cover all repository methods (≥ 80% coverage)

## Notes

Data model reference in ARCHITECTURE.md (`conversations` collection). Anonymous sessions are NOT persisted — only authenticated users have conversations stored.
