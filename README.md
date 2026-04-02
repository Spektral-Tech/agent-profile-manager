# agp — Agent Profile Manager

AGP is a macOS-focused CLI for running AI tools under isolated profiles. Each profile gets its own filesystem space, environment variables, and app data so you can keep personal, work, testing, and client accounts separated without constantly reconfiguring your machine.

AGP ships as an npm package and uses `agp.yaml` as its canonical config.

## What AGP does

AGP manages profile directories for:

- Claude CLI and Claude Desktop
- Codex CLI and Codex Desktop
- Gemini CLI and Gemini Desktop
- Antigravity Desktop

With AGP you can:

- create multiple named profiles
- launch CLIs with the right env vars automatically
- open desktop apps with isolated user-data directories
- enter a shell already bound to a profile
- inspect which profile is active
- track Claude Code usage per profile

## Installation

AGP is published to npm as [`@spektral/agent-profile-manager`](https://www.npmjs.com/package/@spektral/agent-profile-manager).

```bash
npm install --global @spektral/agent-profile-manager
```

This installs the public command:

```bash
agp --help
```

### Runtime choice

The published package is a regular JavaScript build.

- Default global execution uses Node through the installed `agp` command.
- If you prefer Bun, you can also run the package with `bun x @spektral/agent-profile-manager --help`.

### Requirements

- macOS for the desktop-app flows
- Node.js 20+ for the published npm package
- The underlying CLI or desktop app installed for any tool you want to open

Examples:

- `claude` must be installed before `agp open <profile> claude`
- `Codex.app` must exist in `/Applications` or `~/Applications` before `agp open <profile> codex-desktop`

## Quick Start

```bash
# Create profiles
agp create personal --desc "Personal AI workspace"
agp create work --desc "Work account"

# Inspect them
agp list

# Open CLIs under a profile
agp open personal claude
agp open work codex

# Open desktop apps under isolated data dirs
agp open personal claude-desktop
agp open work codex-desktop

# Start a shell preloaded with profile env vars
agp shell personal

# Export env vars into the current shell
eval "$(agp env work)"

# Inspect profile state
agp whoami
agp usage
agp usage personal
```

## Command Reference

### `agp create <name> [--desc "description"]`

Creates a new profile directory with provider subdirectories and registers it in `agp.yaml`.

Examples:

```bash
agp create personal
agp create work --desc "Acme Corp"
```

Validation rules:

- profile names allow letters, numbers, hyphens, and underscores
- reserved command names such as `list`, `create`, and `open` are rejected

### `agp list`

Lists all known profiles from `agp.yaml`, sorted alphabetically, with description and creation date.

### `agp open <name> <tool> [tool-args...]`

Runs a CLI or desktop app under the selected profile.

Supported tools:

- `claude`
- `claude-desktop`
- `codex`
- `codex-desktop`
- `gemini`
- `gemini-desktop`
- `antigravity`

CLI examples:

```bash
agp open personal claude
agp open work codex --help
agp open personal gemini --model gemini-2.0-flash
```

Desktop examples:

```bash
agp open personal claude-desktop
agp open work codex-desktop
agp open personal antigravity
```

Behavior notes:

- CLI tools inherit the current terminal and exit with the wrapped CLI exit code
- desktop apps are launched detached
- for first-time desktop logins, AGP prints a warning about browser handoff so auth stays isolated

### `agp shell <name>`

Starts an interactive shell with profile env vars already loaded.

```bash
agp shell personal
```

This is useful when you want several commands in the same profile context without repeatedly calling `agp open`.

### `agp env <name>`

Prints shell exports for the selected profile.

Examples:

```bash
eval "$(agp env personal)"
agp env work >> .envrc
```

### `agp whoami`

Prints the active AGP profile name.

- exits non-zero if no AGP profile is active
- output is plain text, making it safe for scripts

### `agp delete <name> [-f]`

Deletes the profile directory and removes its metadata entry from `agp.yaml`.

Examples:

```bash
agp delete old-profile
agp delete old-profile -f
```

### `agp usage [name] [--detail]`

Shows Claude Code session counts, completed interaction counts, and recent activity.

Examples:

```bash
agp usage
agp usage personal
agp usage --detail
```

## Configuration Model

AGP stores canonical metadata in:

```bash
~/.agent-profiles/agp.yaml
```

Example:

```yaml
version: "1"
profiles:
  - name: personal
    description: Personal AI workspace
    created: "2026-01-01T00:00:00Z"
  - name: work
    description: Work account
    created: "2026-01-02T00:00:00Z"
```

### Config fields

| Field | Type | Meaning |
|---|---|---|
| `version` | string | Config schema version |
| `profiles` | list | Registered profiles |
| `profiles[].name` | string | Unique profile identifier |
| `profiles[].description` | string | Human-readable label |
| `profiles[].created` | string | ISO-8601 creation timestamp |

### Filesystem layout

```text
~/.agent-profiles/
├── agp.yaml
├── personal/
│   ├── claude/
│   ├── codex/
│   ├── gemini/
│   └── antigravity/
└── work/
    ├── claude/
    ├── codex/
    ├── gemini/
    └── antigravity/
```

### Environment variables exported by AGP

When AGP opens a CLI, starts a shell, or prints exports, it sets:

- `CLAUDE_CONFIG_DIR`
- `CODEX_HOME`
- `GEMINI_CLI_HOME`
- `AGP_ACTIVE_PROFILE`
- `AGP_PROFILE_DIR`
- `AGENTIC_PROFILE`

### Custom profiles base directory

Override the default base dir with:

```bash
export AGP_PROFILES_DIR="/custom/path/to/profiles"
```

## Legacy Migration

Older AGP versions stored per-profile metadata in `profile.toml`.

Current behavior:

- AGP auto-detects legacy `profile.toml` files
- imports them into `agp.yaml`
- removes the TOML file after a successful import
- keeps `agp.yaml` as the only persisted source of truth

This migration is intentionally one-way. The project no longer keeps shell-script compatibility files around after import.

## Architecture

The codebase is intentionally small and modular:

```text
src/
├── main.ts                # command dispatch
├── commands/              # command handlers
├── lib/                   # config, fs, process, yaml, toml helpers
├── models/                # profiles and tool definitions
└── ui/                    # colors and output helpers
```

Key modules:

- `src/main.ts`: CLI entrypoint and command router
- `src/lib/agpConfig.ts`: loads, migrates, reads, and writes `agp.yaml`
- `src/lib/yaml.ts`: minimal parser/serializer for the AGP config schema
- `src/lib/process.ts`: process spawning and shell/app launch helpers
- `src/models/tools.ts`: central registry of supported tools and launch metadata
- `src/commands/*`: user-facing command implementations

## Contributing

Contributor workflow, local development, CI validation, release flow, and publishing rules live in [CONTRIBUTING.md](./CONTRIBUTING.md).
