# AI Specifications & Development Rules

This template provides coding standards, AI agents, and implementation automation that cover the full feature lifecycle — from idea to merged PR — with AI driving every step.

Fill in `ai-specs/project.yml`, run `/setup-project`, and you're ready to develop.

## 📁 Repository Structure

```text
.
├── ai-specs/                    # Main directory with all rules and configurations
│   ├── project.yml              # Single source of truth — project config
│   ├── specs/                   # Development standards and specifications
│   │   ├── base-standards.mdc   # Core development rules
│   │   ├── backend-standards.mdc
│   │   ├── frontend-standards.mdc
│   │   ├── infrastructure-standards.mdc
│   │   ├── documentation-standards.mdc
│   │   └── workflow-guide.md    # How to use this template
│   ├── .commands/               # Reusable command prompts
│   │   ├── setup-project.md     # Initialize project from project.yml
│   │   ├── create-ticket.md     # Create local tickets (when ticket_system = local)
│   │   ├── enrich-us.md         # Enrich a user story with detail
│   │   ├── plan-ticket.md       # Generate implementation plan (backend, frontend, or both)
│   │   ├── develop.md           # Implement a ticket: branch, TDD, commit, PR, kanban
│   │   ├── commit.md
│   │   ├── update-docs.md
│   │   └── explore.md
│   ├── .agents/                 # Agent role definitions
│   │   ├── backend-developer.md
│   │   ├── frontend-developer.md
│   │   └── product-strategy-analyst.md
│   └── tickets/                 # Local kanban board (used when ticket_system = local)
│       └── TICKETS.md           # Kanban board — managed by /create-ticket
│
└── CLAUDE.md                    # Claude-specific configuration (symlink → base-standards.mdc)
```

## 🤖 Multi-Copilot Support

All AI tools read from the same source of truth (`ai-specs/specs/base-standards.mdc`) via symlinks and rules directories. Declare which tools you use in `ai-specs/project.yml` and run `./ai-specs/init.sh` — it wires everything up and removes support for tools not in the list.

| Tool           | Config file                                   | Rules dir                              |
|----------------|-----------------------------------------------|----------------------------------------|
| Claude Code    | `CLAUDE.md`                                   | `.claude/agents/`, `.claude/commands/` |
| Cursor         | `CLAUDE.md`                                   | `.cursor/rules/`                       |
| Windsurf       | `AGENTS.md`                                   | `.windsurf/rules/`                     |
| Kiro           | —                                             | `.kiro/steering/` (via `init.sh`)      |
| GitHub Copilot | `codex.md`, `.github/copilot-instructions.md` | —                                      |
| Google Gemini  | `GEMINI.md`                                   | —                                      |

✅ **Single Source of Truth** — core rules live in one place
✅ **Multi-tool** — declare multiple copilots, all stay in sync
✅ **Clean removal** — tools removed from the list get their files cleaned up

## 🚀 Quick Start

### Step 1: Import Into Your Project

```bash
cp -r ai-specs-template/* your-project/
```

### Step 2: Fill in `ai-specs/project.yml`

Declare your project details and the AI tools you use:

```yaml
project:
  name: "MyApp"
  description: "My project description"
  ticket_system: "Jira"   # or "Linear", "GitHub Issues", "local"
  types:
    - backend-only          # or: fullstack, frontend-only, mcp-server, ai-agent
  copilots:
    - claude                # default — remove if not using Claude Code
    - cursor                # add any combination: cursor, windsurf, kiro, copilot, gemini

backend:
  runtime: "Node.js"
  language: "TypeScript"
  framework: "Express"
  # ... fill in all fields for your declared types
```

### Step 3: Run init

```bash
./ai-specs/init.sh
```

This creates symlinks and rules directories for every declared copilot, and removes any that are no longer listed.

### Step 4: Configure your project

Run `/setup-project` (or `@setup-project` in Cursor/Windsurf) to replace all `{{MARKER}}` placeholders across the spec files with your actual stack values.

> **Copilot or Gemini?** Those tools don't support custom commands. Paste the contents of `ai-specs/.commands/setup-project.md` directly into the chat.

## 💡 Workflow

```text
/create-ticket Add user authentication   ← skip if using Jira, Linear, etc.
/enrich-us TASK-001                      ← adds acceptance criteria, edge cases, test scenarios
/plan-ticket TASK-001                    ← generates step-by-step plan (backend, frontend, or both)
/develop TASK-001                        ← branch, TDD, commit, PR, kanban update
/update-docs                             ← sync API spec, data model, documentation
```

| Step | Command | What happens |
| --- | --- | --- |
| Create | `/create-ticket <title>` | Create a local ticket in `ai-specs/tickets/` (skip if using an external system) |
| Enrich | `/enrich-us <TICKET_ID>` | Reads the ticket → adds acceptance criteria, technical details, test requirements |
| Plan | `/plan-ticket <TICKET_ID>` | Infers domain (backend/frontend/full-stack) and generates plan(s) in `ai-specs/changes/` |
| Implement | `/develop <TICKET_ID> [FIGMA_URL]` | Creates branch, reads plan, implements with TDD, commits, opens PR, updates kanban |
| Sync docs | `/update-docs` | Updates API spec, data model, and any affected documentation |

Both `/plan-ticket` and `/develop` automatically detect the domain from the ticket content and available plan files — no need to choose a backend or frontend variant.

### Variant: requirements are unclear

```text
/explore         ← think through the problem, clarify requirements
/create-ticket ...
/enrich-us ...
/plan-ticket ...
/develop ...
```

### Variant: ticket exists in external system

```text
/enrich-us TASK-001
/plan-ticket TASK-001
/develop TASK-001
```

## 📖 Core Development Rules

All development follows principles defined in `ai-specs/specs/base-standards.mdc`:

### Key Principles

1. **Small Tasks, One at a Time**: Baby steps, never skip ahead
2. **Test-Driven Development (TDD)**: Write failing tests first
3. **Type Safety**: Fully typed code (TypeScript)
4. **Clear Naming**: Descriptive variables and functions
5. **English Only**: All code, comments, documentation, and messages in English
6. **90%+ Test Coverage**: Comprehensive testing across all layers
7. **Incremental Changes**: Focused, reviewable modifications
8. **Keep It Simple**: No speculative abstractions or over-engineering

### Specific Standards

- **Backend Standards**: `ai-specs/specs/backend-standards.mdc`
- **Frontend Standards**: `ai-specs/specs/frontend-standards.mdc`
- **Documentation Standards**: `ai-specs/specs/documentation-standards.mdc`
- **Infrastructure Standards**: `ai-specs/specs/infrastructure-standards.mdc`

## 🎯 Benefits

### For Developers

- ✅ **Consistent Code Quality**: AI follows the same standards every time
- ✅ **Comprehensive Testing**: Automatic 90%+ coverage across all layers
- ✅ **Complete Documentation**: API specs updated automatically
- ✅ **Faster Onboarding**: New team members reference the same rules
- ✅ **Reduced Review Time**: Code follows established patterns

### For Teams

- ✅ **Copilot Flexibility**: Team members can use their preferred AI tool
- ✅ **Knowledge Preservation**: Standards documented, not in people's heads
- ✅ **Quality Consistency**: Same standards regardless of who (or what) writes code
- ✅ **Easier Code Reviews**: Clear expectations and patterns
- ✅ **Scalable Practices**: Standards scale with the team

## 🔧 Customization

### Adapting to Your Project

1. **Fill in `ai-specs/project.yml`** with your project details and run `/setup-project` to apply them across all spec files
2. **Update technical context**: Modify the files in `ai-specs/specs/` to match your stack
3. **Adapt agents in `ai-specs/.agents/`**: Adjust agent definitions to your project's roles and workflows
4. **Extend Commands**: Define battle-tested prompts as commands in `ai-specs/.commands/`
5. **Link Resources**: Reference your project's specific documentation or tasks using MCPs
6. **Keep the symlink structure**: Remember to create relative symlinks from `.claude/agents/` and `.claude/commands/` to newly created agents or commands

### Maintaining Standards

- **Single Source of Truth**: Always update `base-standards.mdc` first
- **Version Control**: Track changes to standards like code
- **Team Review**: Standards changes should be reviewed like pull requests
- **Documentation**: Keep examples current with actual implementation

## 🤝 Contributing

When contributing to the standards:

1. Update `base-standards.mdc` (single source of truth)
2. Test with multiple AI copilots to ensure compatibility
3. Document breaking changes clearly
4. Follow the same standards you're defining!

## 📄 License

Copyright (c) 2025 LIDR.co
Modifications Copyright (c) 2026 MandarinaSoft
Licensed under the MIT License

**English:**

The content of this repository is part of the AI4Devs program by LIDR.co. If you want to learn to code with AI like the pros and get more templates and resources like these, you can find all the information on the official website: [lidr.co/ia-devs](https://lidr.co/ia-devs)

**Español:**

El contenido de este repositorio es parte del programa AI4Devs de LIDR.co. Si quieres aprender a programar con IA como los pros, y obtener más plantillas y recursos como estos, puedes encontrar toda la información en la página oficial: [lidr.co/ia-devs](https://lidr.co/ia-devs)

---

Made with 🤖 by the LIDR community

For questions, issues, or suggestions, visit [LIDR.co](https://lidr.co/ia-devs)
