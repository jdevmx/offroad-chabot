#!/usr/bin/env bash
# ai-specs/init.sh
# Registers agent and command files for every AI tool declared in openspec/config.yaml.
# Removes support for tools not in the list.
# Default (when copilots is missing or empty): claude only.
#
# Usage: ./ai-specs/init.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Try openspec/config.yaml first (hybrid mode), fall back to ai-specs/project.yml
if [ -f "$ROOT/openspec/config.yaml" ]; then
    CONFIG="$ROOT/openspec/config.yaml"
elif [ -f "$ROOT/ai-specs/project.yml" ]; then
    CONFIG="$ROOT/ai-specs/project.yml"
else
    echo "Error: Neither openspec/config.yaml nor ai-specs/project.yml found." >&2
    exit 1
fi
AGENTS_SRC="$ROOT/ai-specs/.agents"
COMMANDS_SRC="$ROOT/ai-specs/.commands"
BASE_STANDARDS="ai-specs/specs/base-standards.mdc"

# ── Parse copilots from config.yaml ──────────────────────────────────────────

parse_copilots() {
    python3 - "$CONFIG" <<'PYEOF' 2>/dev/null
import sys

def parse_copilots_block(path):
    copilots = []
    in_block = False
    with open(path) as f:
        for line in f:
            stripped = line.strip()
            if stripped.startswith('copilots:'):
                in_block = True
                continue
            if in_block:
                if stripped.startswith('-'):
                    val = stripped.lstrip('-').strip().strip('"').strip("'").lower()
                    if val:
                        copilots.append(val)
                elif stripped and not stripped.startswith('#') and not line[:1] in (' ', '\t'):
                    break
    return copilots or ['claude']

copilots = parse_copilots_block(sys.argv[1])
print(' '.join(copilots))
PYEOF
}

if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required to run this script." >&2
    exit 1
fi

COPILOTS=$(parse_copilots)
echo "Configuring copilots: $COPILOTS"

has() { echo " $COPILOTS " | grep -q " $1 "; }

# ── Helpers ───────────────────────────────────────────────────────────────────

symlink_agents() {
    local target_dir="$1"
    local rel_prefix="$2"
    mkdir -p "$target_dir"
    for f in "$AGENTS_SRC"/*.md; do
        [ -e "$f" ] || continue
        name=$(basename "$f")
        ln -sf "${rel_prefix}.agents/${name}" "$target_dir/$name"
    done
}

symlink_commands() {
    local target_dir="$1"
    local rel_prefix="$2"
    mkdir -p "$target_dir"
    for f in "$COMMANDS_SRC"/*.md; do
        [ -e "$f" ] || continue
        name=$(basename "$f")
        ln -sf "${rel_prefix}.commands/${name}" "$target_dir/$name"
    done
}

root_symlink() {
    local name="$1"
    local target="$2"
    ln -sf "$target" "$ROOT/$name"
}

remove_root_symlink() {
    local name="$1"
    if [ -L "$ROOT/$name" ]; then
        rm "$ROOT/$name"
        echo "  removed $name"
    fi
}

# ── Claude ────────────────────────────────────────────────────────────────────

setup_claude() {
    symlink_agents   "$ROOT/.claude/agents"   "../../ai-specs/"
    symlink_commands "$ROOT/.claude/commands" "../../ai-specs/"
    # CLAUDE.md is shared with cursor — only create if not already present
    root_symlink "CLAUDE.md" "$BASE_STANDARDS"
    echo "✓ claude (.claude/agents, .claude/commands, CLAUDE.md)"
}

remove_claude() {
    for dir in "$ROOT/.claude/agents" "$ROOT/.claude/commands"; do
        if [ -d "$dir" ]; then
            find "$dir" -maxdepth 1 -type l | while read -r link; do
                dest=$(readlink "$link")
                [[ "$dest" == *"ai-specs/"* ]] && rm "$link"
            done
        fi
    done
    # Remove CLAUDE.md only if cursor is also not active
    if ! has "cursor"; then
        remove_root_symlink "CLAUDE.md"
    fi
    echo "✗ claude removed"
}

# ── Cursor ────────────────────────────────────────────────────────────────────

setup_cursor() {
    symlink_agents   "$ROOT/.cursor/rules" "../../ai-specs/"
    symlink_commands "$ROOT/.cursor/rules" "../../ai-specs/"
    root_symlink "CLAUDE.md" "$BASE_STANDARDS"
    echo "✓ cursor (.cursor/rules, CLAUDE.md)"
}

remove_cursor() {
    rm -rf "$ROOT/.cursor"
    # Remove CLAUDE.md only if claude is also not active
    if ! has "claude"; then
        remove_root_symlink "CLAUDE.md"
    fi
    echo "✗ cursor removed"
}

# ── Windsurf ──────────────────────────────────────────────────────────────────

setup_windsurf() {
    symlink_agents   "$ROOT/.windsurf/rules" "../../ai-specs/"
    symlink_commands "$ROOT/.windsurf/rules" "../../ai-specs/"
    root_symlink "AGENTS.md" "$BASE_STANDARDS"
    echo "✓ windsurf (.windsurf/rules, AGENTS.md)"
}

remove_windsurf() {
    rm -rf "$ROOT/.windsurf"
    remove_root_symlink "AGENTS.md"
    echo "✗ windsurf removed"
}

# ── GitHub Copilot ────────────────────────────────────────────────────────────

setup_copilot() {
    mkdir -p "$ROOT/.github"
    ln -sf "../$BASE_STANDARDS" "$ROOT/.github/copilot-instructions.md"
    root_symlink "codex.md" "$BASE_STANDARDS"
    echo "✓ copilot (.github/copilot-instructions.md, codex.md)"
}

remove_copilot() {
    [ -L "$ROOT/.github/copilot-instructions.md" ] && rm "$ROOT/.github/copilot-instructions.md" \
        && echo "  removed .github/copilot-instructions.md"
    remove_root_symlink "codex.md"
    echo "✗ copilot removed"
}

# ── Gemini ────────────────────────────────────────────────────────────────────

setup_gemini() {
    root_symlink "GEMINI.md" "$BASE_STANDARDS"
    echo "✓ gemini (GEMINI.md)"
}

remove_gemini() {
    remove_root_symlink "GEMINI.md"
    echo "✗ gemini removed"
}

# ── Kiro ──────────────────────────────────────────────────────────────────────
# Kiro steering files are designed to be self-contained and portable.
# When ai-specs/ exists, init.sh regenerates them with #[[file:]] references
# to pull in the full detailed standards. Without ai-specs/, the shipped
# defaults in .kiro/steering/ work standalone.

setup_kiro() {
    local kiro_dir="$ROOT/.kiro/steering"
    mkdir -p "$kiro_dir"

    # Base standards + documentation standards — always included
    cat > "$kiro_dir/base-standards.md" <<'STEERING_EOF'
---
description: Core development rules, documentation standards, and project context for all AI-assisted development.
inclusion: always
---

# Core Development Standards

#[[file:ai-specs/specs/base-standards.mdc]]

## Documentation Standards

#[[file:ai-specs/specs/documentation-standards.mdc]]

## Project Context

- Project configuration and tech stack: `ai-specs/project.yml`
- Implementation plans: `ai-specs/changes/`
- Local tickets: `ai-specs/tickets/` with kanban at `ai-specs/tickets/TICKETS.md`
- All domain standards: `ai-specs/specs/`
- OpenAPI spec: `ai-specs/specs/api-spec.yml`
- Data model: `ai-specs/specs/data-model.md`
STEERING_EOF

    # Backend standards
    if [ -f "$ROOT/ai-specs/specs/backend-standards.mdc" ]; then
        cat > "$kiro_dir/backend-standards.md" <<'STEERING_EOF'
---
description: Backend development standards — activated when working on backend source files.
inclusion: fileMatch
fileMatchPattern: "backend/**/*.{ts,js,prisma}"
---

# Backend Standards

#[[file:ai-specs/specs/backend-standards.mdc]]
STEERING_EOF
    fi

    # Frontend standards
    if [ -f "$ROOT/ai-specs/specs/frontend-standards.mdc" ]; then
        cat > "$kiro_dir/frontend-standards.md" <<'STEERING_EOF'
---
description: Frontend development standards — activated when working on frontend source files.
inclusion: fileMatch
fileMatchPattern: "frontend/**/*.{ts,tsx,js,jsx,css}"
---

# Frontend Standards

#[[file:ai-specs/specs/frontend-standards.mdc]]
STEERING_EOF
    fi

    # Infrastructure standards
    if [ -f "$ROOT/ai-specs/specs/infrastructure-standards.mdc" ]; then
        cat > "$kiro_dir/infrastructure-standards.md" <<'STEERING_EOF'
---
description: Infrastructure as Code standards — activated when working on infrastructure files.
inclusion: fileMatch
fileMatchPattern: "infrastructure/**/*.{tf,hcl,ts,py,tfvars}"
---

# Infrastructure Standards

#[[file:ai-specs/specs/infrastructure-standards.mdc]]
STEERING_EOF
    fi

    # Workflow guide — manual inclusion via #workflow-guide in chat
    cat > "$kiro_dir/workflow-guide.md" <<'STEERING_EOF'
---
description: Spec Driven Development workflow for this project. Reference when planning or implementing features.
inclusion: manual
---

# Spec Driven Development Workflow

This project uses `ai-specs/` for standards and planning artifacts. Kiro Specs formalize features through three phases.

## Phase 1: Requirements

1. Read `ai-specs/project.yml` for tech stack, ticket system, and workflow flags
2. Read the ticket from `ai-specs/tickets/TICKET-ID.md` (local) or the external system
3. Load relevant standards from `ai-specs/specs/`
4. Define user story, acceptance criteria, functional scope, and non-goals
5. Reference project specs in the Kiro Spec: `#[[file:ai-specs/specs/api-spec.yml]]`, `#[[file:ai-specs/specs/data-model.md]]`

## Phase 2: Design

1. Define architecture approach following the project's standards
2. List affected files, modules, and layers
3. Define API contracts, data model changes, or component structure
4. Save the implementation plan to `ai-specs/changes/TICKET-ID_backend.md` or `TICKET-ID_frontend.md`

## Phase 3: Tasks

1. Create feature branch from `main` — naming: `TICKET-ID-short-description`
2. One task per implementation step, following TDD (failing test → implement → pass)
3. Update technical documentation in `ai-specs/specs/` (data model, API spec, standards)
4. If `workflow.auto_commit: true` → stage and commit. If `workflow.auto_pr: true` → push and open PR
5. If `ticket_system: local` → update ticket status in `ai-specs/tickets/` and kanban board

## Chat-Based Workflows

For tasks that don't need a full Spec, ask directly in chat:

- "Create a ticket for: [description]" → follows `ai-specs/.commands/create-ticket.md`
- "Enrich ticket TICKET-ID" → follows `ai-specs/.commands/enrich-us.md`
- "Commit following project conventions" → follows `ai-specs/.commands/commit.md`
- "Update documentation for the changes made" → follows `ai-specs/.commands/update-docs.md`
- "Explore [topic]" → investigation only, no implementation
STEERING_EOF

    echo "✓ kiro (.kiro/steering — base + conditional backend/frontend/infra + workflow)"
}

remove_kiro() {
    if [ -d "$ROOT/.kiro/steering" ]; then
        # Only remove files generated by init.sh, preserve user-created steering files
        for f in base-standards.md backend-standards.md frontend-standards.md infrastructure-standards.md workflow-guide.md; do
            [ -f "$ROOT/.kiro/steering/$f" ] && rm "$ROOT/.kiro/steering/$f"
        done
        # Clean up legacy file from previous init.sh versions
        [ -f "$ROOT/.kiro/steering/documentation-standards.md" ] && rm "$ROOT/.kiro/steering/documentation-standards.md"
        # Remove .kiro dir only if steering is now empty
        rmdir "$ROOT/.kiro/steering" 2>/dev/null || true
        rmdir "$ROOT/.kiro" 2>/dev/null || true
    fi
    echo "✗ kiro removed"
}

# ── Run ───────────────────────────────────────────────────────────────────────

for tool in claude cursor windsurf copilot gemini kiro; do
    if has "$tool"; then
        "setup_$tool"
    else
        "remove_$tool"
    fi
done

echo ""
echo "Done. Re-run any time you change 'copilots:' in openspec/config.yaml."
