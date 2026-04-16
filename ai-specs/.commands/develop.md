# Develop

Please analyze and implement the ticket: $ARGUMENTS.

Parse `$ARGUMENTS` as: `<TICKET_ID> [FIGMA_URL]`

Follow these steps:

## 1. Load project configuration

Read `ai-specs/project.yml` and load `project.ticket_system`, `project.workflow.auto_commit`, and `project.workflow.auto_pr`.

## 2. Understand the ticket

Read `ai-specs/tickets/$TICKET_ID.md` and understand the problem, acceptance criteria, and any domain hints (labels, type field, description).

Also read the `## Spec Tracker` table in `ARCHITECTURE.md` and locate the row for `$TICKET_ID`. Use its `Title` and `Layer` as additional context for scoping the implementation.

## 3. Determine the implementation domain

Check which plan files exist:
- `ai-specs/changes/$TICKET_ID_backend.md` → backend work required
- `ai-specs/changes/$TICKET_ID_frontend.md` → frontend work required

If neither exists, infer from the ticket:
- Ticket mentions APIs, services, database, repositories, migrations, auth logic → **backend**
- Ticket mentions components, UI, pages, layouts, styles, Figma, design → **frontend**
- Ticket spans both → **full-stack** (run both phases)

## 4. Update ticket status

**If `ticket_system` is `local`**: update `ai-specs/tickets/$TICKET_ID.md`:
- Set `status` to `in_progress`
- Set `assignee` to the current git user (`git config user.name`)
- Set `branch` to the branch name you are about to create
- Move the entry in `ai-specs/tickets/TICKETS.md` from `## To Do` to `## In Progress`

## 5. Create the implementation branch

Checkout `main`, run `git pull origin main`, then create and checkout a new branch named `<TICKET_ID>-<short-description>` (e.g. `TASK-001-add-user-auth`).

## 6. Implement

Run only the phases that apply based on step 3.

### Backend phase

1. Read `ai-specs/changes/$TICKET_ID_backend.md` if it exists and work through pending steps in order.
2. Implement the necessary changes following `backend-standards.mdc`: domain entities, application services, repository interfaces, controllers, routes, migrations, etc.
3. Write and run tests. Ensure linting and type checking pass.

### Frontend phase

1. Read `ai-specs/changes/$TICKET_ID_frontend.md` if it exists and work through pending steps in order.
2. If a Figma URL was provided as `$2`, analyze the design.
3. Generate a short implementation plan: component tree (atoms → molecules → organisms → page) and file/folder structure.
4. Implement following `frontend-standards.mdc`: React components, styles (Tailwind / CSS Modules / Styled Components — match project conventions), reusable UI elements.
5. Check for existing UI library components (Shadcn, Radix, MUI, etc.) before writing new ones. Do not introduce new dependencies unless strictly necessary.
6. Ensure linting and type checking pass.

## 7. Commit

**If `workflow.auto_commit` is `true`**: stage only the files affected by the ticket and create a descriptive commit message. Otherwise inform the user that committing was skipped (`auto_commit: false`).

## 8. Pull request

**If `workflow.auto_pr` is `true`**: push the branch and create a PR linked to the ticket ID. Otherwise inform the user that the PR was skipped (`auto_pr: false`).

## 9. Close ticket

**If `ticket_system` is `local`**: update `ai-specs/tickets/$TICKET_ID.md`:
- Set `status` to `done`
- Move the entry in `ai-specs/tickets/TICKETS.md` from `## In Progress` to `## Done`

## 10. Update ARCHITECTURE.md Spec Tracker

Open `ARCHITECTURE.md` and find the `## Spec Tracker` table.

- Locate the row whose `ID` matches `$TICKET_ID`.
- Set the `Implemented` column to today's date (`YYYY-MM-DD`).
- Leave all other columns unchanged.

---

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.
