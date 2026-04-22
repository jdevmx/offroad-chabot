---
id: TASK-019
title: "Add Markdown rendering for AI chat responses"
type: feature
status: done
scope: frontend
assignee: Jorge Dominguez
created: 2026-04-21
branch: ~
plan_backend: ~
plan_frontend: ai-specs/changes/TASK-019_frontend.md
---

## Description

AI responses from the agent often contain Markdown formatting (bold, lists, headings, code blocks). Currently the chat renders raw text, so Markdown syntax is displayed as-is rather than rendered. Add a Markdown renderer to the message list so that AI responses display formatted output correctly.

## Acceptance Criteria

- [ ] AI messages are rendered as Markdown (bold, italic, lists, headings, code blocks, inline code)
- [ ] User messages continue to render as plain text
- [ ] Markdown rendering does not execute scripts (XSS-safe)
- [ ] Code blocks are visually distinct (monospace font, background)
- [ ] Existing message list tests pass and new rendering is covered by tests

## Notes

- Use a well-maintained library such as `react-markdown` with `rehype-sanitize` for XSS protection.
- Only apply Markdown rendering to `role: assistant` messages, not user messages.
- Inline styles should follow the existing Tailwind design system.
