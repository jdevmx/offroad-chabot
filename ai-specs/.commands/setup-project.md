# Role

You are a project configuration specialist responsible for adapting this AI template repository to a specific project by replacing `{{VAR}}` markers with real values.

# Arguments

$ARGUMENTS

# Goal

Initialize all AI specs, agents, and commands for a specific project by replacing `{{MARKER}}` placeholders with actual project values. Sections are applied selectively based on `project.types` — only the relevant markers are replaced.

# Process

## Step 1 — Load configuration

Determine the source of project values in this order:

1. If `$ARGUMENTS` is a file path ending in `.yml`, `.yaml`, or `.json` → read and parse that file
2. If `$ARGUMENTS` contains inline YAML/JSON → parse directly
3. No arguments → read `ai-specs/project.yml` (canonical config)

Parse all keys. The `project.types` field is an **array** — a project can have multiple types simultaneously (e.g., `[backend-only, mcp-server, ai-agent]`).

## Step 2 — Validate

- Confirm `project.types` is set and contains at least one valid type
- For each type in the array, check that the required section is filled in (values must not still contain `{{`)
- Type → required section mapping:
  - `fullstack` → `backend` + `frontend` sections required
  - `backend-only` → `backend` section required
  - `frontend-only` → `frontend` section required
  - `mcp-server` → `mcp` section required
  - `ai-agent` → `agent` section required
  - `infrastructure` → `infrastructure` section required
- List any missing/unfilled values and stop if found — ask the user to fill in `openspec/config.yaml` first

## Step 3 — Build the replacement map

Collect all variable → value pairs from the sections that match the declared types. Variables for sections not in `project.types` are ignored (do not replace their markers — those markers simply won't appear in active files).

**Always-active variables (project-level):**

| Variable | Config key |
|----------|-----------|
| `{{PROJECT_NAME}}` | `project.name` |
| `{{PROJECT_DESCRIPTION}}` | `project.description` |
| `{{TICKET_SYSTEM}}` | `project.ticket_system` |
| `{{PROJECT_TYPE}}` | `project.types` (joined, e.g., `backend-only, mcp-server`) |
| `{{ADDITIONAL_STANDARDS}}` | Derived from active types (see below) |

`{{ADDITIONAL_STANDARDS}}` is computed from active types:
- If `mcp-server` is active → append `\n- [MCP Standards](./mcp-standards.mdc) - MCP tool/resource design, transport handling, schema definitions, and testing`
- If `ai-agent` is active → append `\n- [Agent Standards](./agent-standards.mdc) - agent loop design, tool schema definitions, error recovery, observability, and evaluation strategies`
- If `infrastructure` is active → append `\n- [Infrastructure Standards](./infrastructure-standards.mdc) - IaC folder structure, security, networking, state management, and Well-Architected practices`
- If `qa` is active → append `\n- [QA Standards](./qa-standards.mdc) - Test strategy, coverage requirements, QA agent behavior, and quality gates`
- If none of the above → replace with empty string (remove the placeholder line)

**Backend variables** (when `fullstack` or `backend-only` in types):

| Variable | Config key |
|----------|-----------|
| `{{BACKEND_RUNTIME}}` | `backend.runtime` |
| `{{BACKEND_LANGUAGE}}` | `backend.language` |
| `{{BACKEND_FRAMEWORK}}` | `backend.framework` |
| `{{BACKEND_ORM}}` | `backend.orm` |
| `{{BACKEND_DATABASE}}` | `backend.database` |
| `{{BACKEND_TEST_FRAMEWORK}}` | `backend.test_framework` |
| `{{BACKEND_TEST_COVERAGE}}` | `backend.test_coverage` |
| `{{BACKEND_ARCHITECTURE}}` | `backend.architecture` |
| `{{BACKEND_SRC_PATH}}` | `backend.src_path` |

**Frontend variables** (when `fullstack` or `frontend-only` in types):

| Variable | Config key |
|----------|-----------|
| `{{FRONTEND_FRAMEWORK}}` | `frontend.framework` |
| `{{FRONTEND_LANGUAGE}}` | `frontend.language` |
| `{{FRONTEND_BUILD_TOOL}}` | `frontend.build_tool` |
| `{{FRONTEND_ROUTER}}` | `frontend.router` |
| `{{FRONTEND_UI_LIBRARY}}` | `frontend.ui_library` |
| `{{FRONTEND_HTTP_CLIENT}}` | `frontend.http_client` |
| `{{FRONTEND_STATE_MANAGEMENT}}` | `frontend.state_management` |
| `{{FRONTEND_TEST_FRAMEWORK}}` | `frontend.test_framework` |
| `{{FRONTEND_SRC_PATH}}` | `frontend.src_path` |

**MCP Server variables** (when `mcp-server` in types):

| Variable | Config key |
|----------|-----------|
| `{{MCP_RUNTIME}}` | `mcp.runtime` |
| `{{MCP_LANGUAGE}}` | `mcp.language` |
| `{{MCP_TRANSPORT}}` | `mcp.transport` |
| `{{MCP_SDK}}` | `mcp.sdk` |
| `{{MCP_TOOLS}}` | `mcp.tools` |
| `{{MCP_RESOURCES}}` | `mcp.resources` |
| `{{MCP_TEST_FRAMEWORK}}` | `mcp.test_framework` |

**AI Agent variables** (when `ai-agent` in types):

| Variable | Config key |
|----------|-----------|
| `{{AGENT_FRAMEWORK}}` | `agent.framework` |
| `{{AGENT_LANGUAGE}}` | `agent.language` |
| `{{AGENT_MODEL}}` | `agent.model` |
| `{{AGENT_ORCHESTRATION}}` | `agent.orchestration` |
| `{{AGENT_MEMORY}}` | `agent.memory` |
| `{{AGENT_TOOLS}}` | `agent.tools` |
| `{{AGENT_TEST_FRAMEWORK}}` | `agent.test_framework` |

**Infrastructure variables** (when `infrastructure` in types):

| Variable | Config key |
|----------|-----------|
| `{{IAC_TOOL}}` | `infrastructure.iac_tool` |
| `{{CLOUD_PROVIDER}}` | `infrastructure.cloud_provider` |
| `{{IAC_STATE_BACKEND}}` | `infrastructure.state_backend` |
| `{{SECRETS_MANAGER}}` | `infrastructure.secrets_manager` |
| `{{CICD_PLATFORM}}` | `infrastructure.cicd_platform` |
| `{{CONTAINER_REGISTRY}}` | `infrastructure.container_registry` |

**QA variables** (when `qa` in types):

| Variable | Config key |
|----------|-----------|
| `{{QA_TEST_FRAMEWORK}}` | `qa.test_framework` |
| `{{QA_COVERAGE_THRESHOLD}}` | `qa.coverage_threshold` |
| `{{QA_SCOPE}}` | `qa.scope` |
| `{{QA_FOCUS_AREAS}}` | `qa.focus_areas` |
| `{{QA_SRC_PATH}}` | `qa.src_path` |
| `{{QA_TEST_COMMAND}}` | `qa.test_command` |
| `{{QA_AUTO_FIX_BUGS}}` | `qa.agent_behavior.auto_fix_bugs` |
| `{{QA_REPORT_FORMAT}}` | `qa.agent_behavior.report_format` |

## Step 4 — Replace markers in template files

For each file below, replace every `{{VAR}}` occurrence using the active replacement map. Skip variables that are not in the active map (belong to inactive types).

**Always updated:**

| File                                 | Notes                                                                                  |
|--------------------------------------|----------------------------------------------------------------------------------------|
| `README.md`                          | `{{PROJECT_NAME}}`, `{{PROJECT_DESCRIPTION}}`, `{{PROJECT_TYPE}}`, `{{TICKET_SYSTEM}}` |
| `ai-specs/specs/base-standards.mdc`  | `{{TICKET_SYSTEM}}`, `{{PROJECT_NAME}}`, `{{ADDITIONAL_STANDARDS}}`                    |

**Updated when backend is active:**

| File | Notes |
|------|-------|
| `ai-specs/specs/backend-standards.mdc` | All backend markers + `{{PROJECT_NAME}}` |
| `ai-specs/.agents/backend-developer.md` | All backend markers |
| `ai-specs/.commands/plan-backend-ticket.md` | Backend markers + `{{TICKET_SYSTEM}}` |
| `ai-specs/.commands/develop-backend.md` | `{{TICKET_SYSTEM}}` |

**Updated when frontend is active:**

| File | Notes |
|------|-------|
| `ai-specs/specs/frontend-standards.mdc` | All frontend markers + `{{PROJECT_NAME}}` |
| `ai-specs/.agents/frontend-developer.md` | All frontend markers |
| `ai-specs/.commands/plan-frontend-ticket.md` | Frontend markers + `{{TICKET_SYSTEM}}` |
| `ai-specs/.commands/develop-frontend.md` | `{{TICKET_SYSTEM}}` |

**Updated when mcp-server is active:**

| File | Notes |
|------|-------|
| `ai-specs/specs/mcp-standards.mdc` | All MCP markers + `{{PROJECT_NAME}}` (created if not exists) |
| `ai-specs/.agents/mcp-developer.md` | All MCP markers (created if not exists) |

**Updated when ai-agent is active:**

| File | Notes |
|------|-------|
| `ai-specs/specs/agent-standards.mdc` | All agent markers + `{{PROJECT_NAME}}` (created if not exists) |
| `ai-specs/.agents/ai-agent-developer.md` | All agent markers (created if not exists) |

**Updated when qa is active:**

| File | Notes |
|------|-------|
| `ai-specs/specs/qa-standards.mdc` | All QA markers + `{{PROJECT_NAME}}` |
| `ai-specs/.agents/qa-engineer.md` | All QA markers |

**Updated when infrastructure is active:**

| File | Notes |
|------|-------|
| `ai-specs/specs/infrastructure-standards.mdc` | All infrastructure markers + `{{PROJECT_NAME}}` |

**For mcp-server and ai-agent types**: if the corresponding spec/agent files do not yet exist, generate them from the patterns of `backend-standards.mdc` and `backend-developer.md`, adapted for the declared technology. Include:
- Technology stack section
- Architecture and design principles relevant to the type
- Testing standards
- Development workflow

## Step 5 — Generate type-specific agent and spec files (if missing)

If `mcp-server` or `ai-agent` is in types and the corresponding spec/agent files don't exist, create them now. Follow these guidelines:

### mcp-server
- Agent file: expert in MCP protocol, tool/resource design, transport handling, schema definitions
- Standards file: MCP tool naming conventions, error handling, schema design, transport setup, testing with MCP Inspector

### ai-agent
- Agent file: expert in `{{AGENT_FRAMEWORK}}`, prompt engineering, tool use, memory management, agent orchestration
- Standards file: agent loop design, tool schema definitions, error recovery, observability, evaluation/testing strategies

### infrastructure

- `ai-specs/specs/infrastructure-standards.mdc` already ships with the template — replace all `{{VAR}}` markers using the infrastructure replacement map
- No agent file is generated for infrastructure (the standards file is consumed directly by Claude Code and other AI tools during IaC tasks)

## Step 6 — Register new agents and commands as symlinks

For each new agent or command file created in step 5, create the corresponding symlink under `.claude/agents/` or `.claude/commands/` following the existing pattern.

**When `ticket_system` is `local`**, also create a symlink for the local ticket command:

```bash
ln -sf ../../ai-specs/.commands/create-ticket.md .claude/commands/create-ticket.md
```

And ensure `ai-specs/tickets/TICKETS.md` exists (it ships with the template — do not overwrite if already present).

## Step 7 — Update ai-specs/project.yml with resolved values

Replace all `{{VAR}}` defaults in `ai-specs/project.yml` with the actual values used (both the project/backend/frontend/... sections).

## Step 8 — Report

Print a summary:

```
✓ Project: <PROJECT_NAME>
✓ Types:   <type1>, <type2>, ...
✓ Ticket system: <TICKET_SYSTEM>

Sections configured:
  [backend]        <BACKEND_RUNTIME>/<BACKEND_LANGUAGE>/<BACKEND_FRAMEWORK> — <BACKEND_DATABASE> — <BACKEND_TEST_FRAMEWORK>
  [frontend]       <FRONTEND_FRAMEWORK>/<FRONTEND_LANGUAGE> — <FRONTEND_UI_LIBRARY> — <FRONTEND_TEST_FRAMEWORK>
  [mcp]            <MCP_LANGUAGE> / <MCP_SDK> / <MCP_TRANSPORT>
  [agent]          <AGENT_FRAMEWORK> / <AGENT_MODEL> / <AGENT_ORCHESTRATION>
  [infrastructure] <IAC_TOOL> / <CLOUD_PROVIDER> / <IAC_STATE_BACKEND>

Files updated: <N>
Files created: <N>
Symlinks created: <N>
```

Then ask the user to confirm their AI tools:

> `ai-specs/project.yml` currently lists these copilots: `<current copilots list>`.
> Supported tools: `claude`, `cursor`, `windsurf`, `kiro`, `copilot`, `gemini`.
> Would you like to keep this list, or add/remove any tools?

Wait for confirmation. Once confirmed, update the `copilots:` list in `ai-specs/project.yml` if the user made changes, then run `./ai-specs/init.sh` to register agents and commands for each declared tool.

Then list any remaining manual follow-up steps:
- Replace example `ai-specs/specs/data-model.md` with your actual data model (if applicable)
- Replace example `ai-specs/specs/api-spec.yml` with your actual OpenAPI spec (if applicable)
- Replace `ai-specs/specs/development_guide.md` with your actual setup instructions
- If `ticket_system` is `local`: use `/create-ticket` to create your first tickets in `ai-specs/tickets/`

# Rules

- Never modify files outside `ai-specs/`, `.claude/`, `.cursor/`, `.windsurf/`, `.kiro/`, `.github/`, and `README.md`
- Replace only `{{VAR}}` markers — do not alter surrounding content
- Skip replacement for variables that belong to inactive types
- If a file does not contain a given marker, skip it silently
- Do not commit changes — leave that to the user
- If `project.types` is empty or missing, stop and ask the user to set it in `ai-specs/project.yml`

## Multiple agent support

- After completing all steps, remind the user to declare their AI tools in `ai-specs/project.yml` under `copilots:` and run `./ai-specs/init.sh` to register agents and commands for each tool
- Supported values: `claude`, `cursor`, `windsurf`, `kiro`, `copilot`, `gemini`
- `init.sh` is idempotent — safe to re-run whenever `copilots:` changes

## Agent definitions

- You may suggest improvements to agent definitions (`ai-specs/.agents/*.md`) or standards files if you notice something that does not fit the declared stack — but never apply changes without explicit user approval
- Keep suggestions simple and concrete: one change at a time, explain the reason in one sentence
