---
id: TASK-004
title: "Client repository (Firestore clients collection)"
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

Implement the `Client` domain entity, the `IClientRepository` interface, and the `FirestoreClientRepository` infrastructure implementation that reads and writes to the `clients/{userId}` Firestore collection.

This is the foundational data layer for user profiles, vehicle information, and PIN auth. All auth use cases (`RegisterUseCase`, `LoginUseCase`) depend on this repository.

## Acceptance Criteria

- [ ] `Client` entity defined in `backend/src/domain/client/Client.ts` with all fields from the data model (`uid`, `username`, `displayName`, `pinHash`, `vehicle`, `preferences`, `createdAt`, `updatedAt`)
- [ ] `IClientRepository` interface defined in `backend/src/domain/client/IClientRepository.ts` with methods: `findByUid`, `findByUsername`, `save`
- [ ] `FirestoreClientRepository` implemented in `backend/src/infrastructure/repositories/FirestoreClientRepository.ts`, using the Firebase Admin SDK singleton
- [ ] All fields are fully typed (no `any`)
- [ ] Unit tests written for `FirestoreClientRepository` with Firestore mocked at the SDK boundary
- [ ] Test coverage for: `findByUid` (found / not found), `findByUsername` (found / not found), `save` (create new document)

## Notes

- Vehicle data is stored as a nested object, not a sub-collection
- `modifications` is `string[]` and may be empty
- `preferences.experience` is a union type: `"beginner" | "intermediate" | "expert"`
- `pinHash` is written by the auth layer — the repository should not hash or validate it
- Reference: `ARCHITECTURE.md` → Data Model → `clients` collection
