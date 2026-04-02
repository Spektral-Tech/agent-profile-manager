# agp — Agent Profile Manager

Manage isolated AI tool profiles on macOS with npm-first distribution, semver releases, and local quality gates.

## Installation

AGP is published to npm as [`@spektral/agent-profile-manager`](https://www.npmjs.com/package/@spektral/agent-profile-manager).

```bash
npm install --global @spektral/agent-profile-manager
```

This installs the public CLI command:

```bash
agp --help
```

### Runtime choice

The published package ships a standard JavaScript build.

- Default global execution uses Node through the installed `agp` command.
- If you prefer Bun, you can also run the package with `bun x @spektral/agent-profile-manager --help`.

## Quick Start

```bash
agp create personal --desc "Personal AI workspace"
agp create work --desc "Work account"

agp list
agp open personal claude
agp open work claude-desktop
agp shell personal
agp env work
agp usage
agp whoami
```

## Commands

### `agp create <name> [--desc "description"]`

Create a new isolated profile with dedicated directories for each tool.

### `agp list`

List all profiles stored in `agp.yaml`.

### `agp open <name> <tool> [tool-args...]`

Open an AI tool under a specific profile.

Supported tools:

- `claude`
- `claude-desktop`
- `codex`
- `codex-desktop`
- `gemini`
- `gemini-desktop`
- `antigravity`

### `agp shell <name>`

Start a shell with the selected profile environment preloaded.

### `agp env <name>`

Print shell exports for `eval` or `.envrc`.

### `agp whoami`

Print the active AGP profile name.

### `agp delete <name> [-f]`

Delete a profile and its data.

### `agp usage [name] [--detail]`

Show Claude Code usage summaries per profile.

## Configuration

AGP stores profile metadata in `~/.agent-profiles/agp.yaml`.

```yaml
version: "1"
profiles:
  - name: personal
    description: Personal AI workspace
    created: "2026-01-01T00:00:00Z"
```

Each profile directory lives under `~/.agent-profiles/<name>/` and contains provider-specific subdirectories such as `claude/`, `codex/`, `gemini/`, and `antigravity/`.

### Legacy migration

Older AGP installs may still have `profile.toml` files. The CLI migrates them into `agp.yaml` automatically and removes the TOML file after a successful import. `agp.yaml` is the only persisted source of truth after migration.

## Development

### Tooling

- Bun is used for local development, tests, and build orchestration.
- Biome provides formatting and linting.
- Husky runs local validation before commits and pushes.
- Changesets controls semver releases.

### Common scripts

```bash
bun install
bun run check
bun test
bun run build
bun run verify
bun run changeset
```

### Local hooks

The repository uses Husky with:

- `pre-commit`: Biome on staged files plus `bun test`
- `pre-push`: full `bun run verify`

If hooks are not installed yet:

```bash
bun run prepare
```

## Release flow

This repository uses Changesets for semver.

- Add a release note with `bun run changeset`
- Merge the changeset into `main`
- GitHub Actions opens or updates the release PR
- Merging the release PR publishes to npm

Version selection:

- `patch`: bug fixes and small internal improvements
- `minor`: backward-compatible features
- `major`: breaking changes

## Publishing security

The release workflow is set up for npm trusted publishing with GitHub Actions OIDC, which npm recommends over long-lived publish tokens. Configure the trusted publisher in npm for `.github/workflows/release.yml`.

If trusted publishing cannot be enabled immediately, an `NPM_TOKEN` may still be used as a temporary fallback for manual troubleshooting, but it is not the primary release path.

## Package hygiene

The npm package intentionally excludes:

- `.claude/`
- `tests/`
- `src/`
- `install.sh`
- the legacy bash `agp` script

Use `bun run pack:check` to verify the publish payload locally.
