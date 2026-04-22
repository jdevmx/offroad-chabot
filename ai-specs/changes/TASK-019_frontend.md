# Frontend Implementation Plan: TASK-019 Add Markdown Rendering for AI Chat Responses

## Overview

Render Markdown in AI (`role: assistant`) message bubbles inside `MessageList`. User messages remain plain text. The renderer must be XSS-safe and follow the existing Tailwind design system.

Architecture principle: keep the change entirely inside `MessageList`. No new service layer or global state is needed — this is pure presentation logic.

---

## Architecture Context

- **Layer**: Presentation (component)
- **Files touched**:
  - `frontend/src/app/components/MessageList.tsx` — add conditional Markdown rendering
  - `frontend/src/app/components/MessageList.test.tsx` — extend with Markdown-specific cases
  - `frontend/package.json` / `frontend/package-lock.json` — add `react-markdown` + `rehype-sanitize`
- **State management**: none — stateless render change
- **Routing**: none

---

## Implementation Steps

### Step 0 — Verify working tree and branch

This project commits directly to `main` (prototype, no feature branches). Confirm `git status` is clean before making any changes.

---

### Step 1 — Install dependencies

**File**: `frontend/package.json`  
**Action**: Add production dependencies  

```
react-markdown      # Markdown → React element renderer
rehype-sanitize     # rehype plugin — strips dangerous HTML before render
```

Run:

```bash
cd frontend && npm install react-markdown rehype-sanitize
```

**Implementation notes**:
- `react-markdown` renders Markdown safely via a React component tree (no `dangerouslySetInnerHTML`).
- `rehype-sanitize` applies an allowlist of safe HTML elements, blocking scripts and event handlers.
- Both are widely maintained and have TypeScript types bundled or available via `@types`.

---

### Step 2 — Write failing tests first (TDD)

**File**: `frontend/src/app/components/MessageList.test.tsx`  
**Action**: Extend existing test suite with Markdown rendering cases before touching the component.

**New test cases to add** (under a new `describe('Markdown rendering')` block):

| Test | Assertion |
|---|---|
| Bold syntax in assistant message | `**bold**` renders `<strong>bold</strong>` (query by role/text, not raw `**`) |
| Italic syntax in assistant message | `*italic*` renders `<em>italic</em>` |
| Inline code in assistant message | `` `code` `` renders `<code>code</code>` |
| Code block in assistant message | ` ```\nblock\n``` ` renders a `<pre>` / `<code>` element |
| Unordered list in assistant message | `- item` renders `<li>item</li>` |
| User message with Markdown syntax | `**bold**` renders the literal string `**bold**`, not `<strong>` |
| XSS attempt in assistant message | `<script>alert(1)</script>` does NOT render a `<script>` element |

**Function signature** (no change to component props):
```ts
// existing
type MessageListProps = {
  messages: ChatMessage[];
  loading?: boolean;
};
```

**Implementation notes**:
- Tests should use `screen.getByRole` or `container.querySelector` to assert DOM elements produced by Markdown, not raw text matches on the Markdown syntax characters.
- The XSS test should query `container.querySelector('script')` and assert `null`.
- All existing tests must continue to pass without modification.

---

### Step 3 — Update `MessageList` component

**File**: `frontend/src/app/components/MessageList.tsx`  
**Action**: Conditionally render `<ReactMarkdown>` for assistant messages.

**Component signature** (unchanged):
```ts
export default function MessageList({ messages, loading = false }: MessageListProps): React.JSX.Element
```

**Implementation steps**:

1. Import `ReactMarkdown` from `react-markdown`.
2. Import `rehypeSanitize` from `rehype-sanitize`.
3. In the message bubble render, branch on `msg.role`:
   - `'assistant'` → wrap content in `<ReactMarkdown rehypePlugins={[rehypeSanitize]} components={markdownComponents}>`.
   - `'user'` → render `{msg.content}` as plain text (existing behavior, no change).
4. Define a `markdownComponents` object (outside the component, no re-creation on each render) that applies Tailwind classes to standard Markdown elements:

| Element | Tailwind classes |
|---|---|
| `p` | `mb-2 last:mb-0` |
| `strong` | `font-semibold` |
| `em` | `italic` |
| `code` (inline) | `font-mono bg-gray-200 rounded px-1 text-xs` |
| `pre` | `bg-gray-200 rounded p-2 overflow-x-auto my-2` |
| `code` (inside `pre`) | `font-mono text-xs` |
| `ul` | `list-disc pl-4 mb-2` |
| `ol` | `list-decimal pl-4 mb-2` |
| `li` | `mb-1` |
| `h1`–`h3` | `font-bold` with progressively smaller `text-*` sizes |

**Implementation notes**:
- The `markdownComponents` constant must be declared outside the function body to avoid identity changes on re-render (which would cause unnecessary child remounts).
- Keep the existing bubble wrapper (`max-w-[75%] rounded-lg px-4 py-2 text-sm`) unchanged for both roles.
- Do not add prose classes from Tailwind Typography plugin — the project does not use it and the explicit component map is enough.

---

### Step 4 — Update documentation

**File**: `ai-specs/specs/frontend-standards.mdc`  
**Action**: Add a brief note under the component conventions section documenting that `role: assistant` messages use `react-markdown` + `rehype-sanitize` and that user messages always render as plain text.

---

## Implementation Order

1. Step 0 — Confirm clean working tree on `main`
2. Step 1 — Install `react-markdown` and `rehype-sanitize`
3. Step 2 — Write failing tests (TDD)
4. Step 3 — Update `MessageList` component (make tests pass)
5. Step 4 — Update documentation

---

## Testing Checklist

- [ ] All pre-existing `MessageList` tests pass without modification
- [ ] `**bold**` in assistant message renders `<strong>` element
- [ ] `*italic*` in assistant message renders `<em>` element
- [ ] Inline code in assistant message renders `<code>` with monospace styling
- [ ] Fenced code block renders `<pre><code>` element
- [ ] Unordered list renders `<ul><li>` elements
- [ ] User message with Markdown syntax shows literal characters, not rendered HTML
- [ ] `<script>` tag in assistant content is not rendered in the DOM (XSS safety)
- [ ] Loading indicator still appears when `loading={true}`

---

## Error Handling Patterns

No API calls are involved. The only error scenario is malformed Markdown — `react-markdown` handles this gracefully by rendering what it can without throwing.

---

## UI/UX Considerations

- Code blocks must be visually distinct: monospace font + light gray background (`bg-gray-200`) to match the existing neutral palette.
- No horizontal overflow — `overflow-x-auto` on `<pre>` for long code lines.
- Assistant bubble background (`bg-gray-100`) is preserved; Markdown components use subtle contrast (`bg-gray-200`) for code.
- No changes to user bubble styling (`bg-gray-800 text-white`).

---

## Dependencies

- `react-markdown` — Markdown rendering as React component tree
- `rehype-sanitize` — XSS-safe HTML via allowlist sanitization

---

## Notes

- Only `role: assistant` messages receive Markdown rendering. This is a hard rule per the ticket acceptance criteria.
- No backend changes required.
- All code and tests must use English.

---

## Next Steps After Implementation

- Run `npm test` inside `frontend/` and confirm all tests green.
- Start the dev server and visually verify a response with bold text, a list, and a code block.
- Commit to `main`.

---

## Implementation Verification

- **Code quality**: No new lint errors; TypeScript strict mode passes.
- **Functionality**: All acceptance criteria in the ticket are covered by tests.
- **Testing**: New tests cover the Markdown rendering branch and the XSS guard.
- **Integration**: Existing `ChatArea`, `MessageInput`, and auth flow tests unaffected.
- **Documentation**: `frontend-standards.mdc` updated to reflect the Markdown rendering pattern.
