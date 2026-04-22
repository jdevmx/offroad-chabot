---
id: TASK-017
title: "Implement user profile view (vehicle display + edit modifications)"
type: feature
status: done
scope: frontend
assignee: Jorge Dominguez
created: 2026-04-16
branch: ~
plan_backend: ai-specs/changes/TASK-017_backend.md
plan_frontend: ai-specs/changes/TASK-017_frontend.md
---

## Description

Implement a user profile view that displays the authenticated user's vehicle details and allows them to edit the `modifications` list inline. Changes are persisted to the backend.

## Acceptance Criteria

- [ ] Profile view accessible from the Left Panel when logged in
- [ ] Displays: make, model, year, trim, and current modifications list
- [ ] Modifications field is editable (add/remove tags or comma-separated list)
- [ ] Save button persists changes via a backend endpoint (or Firestore direct write)
- [ ] Shows success/error feedback after save
- [ ] Unit tests cover display and edit interactions

## Notes

This is a stretch feature — implement only after TASK-015 and TASK-016 are done. The edit endpoint on the backend may need to be added as part of this ticket if not covered by TASK-006.
