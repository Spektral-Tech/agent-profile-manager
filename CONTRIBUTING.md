# Contributing

This document is the maintainer and contributor guide for AGP. It covers local development, validation, CI behavior, release flow, and npm publishing expectations.

## Tooling

The project currently uses:

- Bun for local development, test running, and build orchestration
- Node-compatible production artifacts for the published package
- Biome for formatting and linting
- Husky for local pre-commit and pre-push validation
- Changesets for semver release management
- GitHub Actions for CI and npm publishing

## Getting started

Install dependencies:

```bash
bun install
```

That will also install Husky hooks through the repository `prepare` script.

If hooks need to be reinstalled manually:

```bash
bun run prepare
```

Recommended baseline before changing code:

1. Install Bun and Node.js 20+ locally.
2. Run `bun install`.
3. Run `bun run verify` once to confirm the environment is healthy.
4. Create a branch and make changes in small reviewable commits.

## Project structure

```text
src/
├── main.ts
├── commands/
├── lib/
├── models/
└── ui/

tests/
├── unit/
└── integration/

scripts/
├── build.mjs
├── smoke-node.mjs
└── pack-check.mjs
```

High-level responsibilities:

- `src/commands/`: user-facing CLI behavior
- `src/lib/`: config persistence, fs helpers, process launching, YAML/TOML handling
- `src/models/`: profile and tool metadata
- `tests/unit/`: parser and model behavior
- `tests/integration/`: command-level behavior against temp profile directories
- `scripts/build.mjs`: creates the distributable Node build
- `scripts/smoke-node.mjs`: validates the built artifact
- `scripts/pack-check.mjs`: validates npm package contents

## Local development

Run the CLI from source:

```bash
bun run dev
```

Common scripts:

```bash
bun run check
bun run format
bun test
bun run build
bun run smoke:node
bun run pack:check
bun run verify
bun run changeset
```

What each script does:

- `check`: Biome lint and formatting verification
- `format`: applies Biome formatting
- `lint`: runs Biome lint rules without rewriting files
- `build`: generates the distributable JS artifact in `dist/`
- `smoke:node`: smoke-tests the built CLI under Node
- `pack:check`: verifies npm tarball contents and blocks forbidden files
- `verify`: full local release-quality validation pipeline
- `changeset`: records a semver release note

Typical contributor loop:

1. Run `bun run dev` while iterating on the CLI.
2. Run `bun test` for fast feedback while changing behavior.
3. Run `bun run check` before staging.
4. Run `bun run verify` before pushing.
5. Add a changeset when the PR affects shipped behavior or published artifacts.

## Git hooks

The repository uses Husky with two enforced hooks:

- `pre-commit`: runs Biome on staged files, updates the index, and runs `bun test`
- `pre-push`: runs `bun run verify`

The hooks are part of the expected contributor workflow, not optional project-local conveniences.

Because `pre-push` runs the full verification pipeline, pushes should be expected to take longer than commits.

## Testing expectations

Before opening a PR, contributors should run:

```bash
bun run verify
```

This covers:

- code style and linting
- unit and integration tests
- distributable build generation
- smoke validation of the built CLI
- npm packaging checks

The test suite is split into:

- unit tests for config parsing, profile behavior, tool registry, and migration logic
- integration tests for the public commands and migration flow

Changes that touch packaging, runtime entrypoints, config migration, or command output should keep or improve coverage in the relevant test layer.

## CI

CI is defined in [.github/workflows/ci.yml](./.github/workflows/ci.yml).

It runs on pull requests and pushes to `main`. The current CI contract is:

- dependency installation with Bun
- `bun run check`
- `bun test`
- `bun run build`
- `bun run smoke:node`
- `bun run pack:check`

The intent is that a local `bun run verify` should match the critical CI signal as closely as possible. If CI fails but local verification passes, treat that as a signal to reconcile environment assumptions rather than weakening the checks.

CI is also the enforcement point for package hygiene. If a change causes `.claude/`, `tests/`, `src/`, `install.sh`, or legacy launchers to appear in the npm tarball, `pack:check` should fail.

## Release flow

Release automation is defined in [.github/workflows/release.yml](./.github/workflows/release.yml).

The repository uses Changesets and semver:

- `patch`: bug fixes, packaging fixes, maintenance, and backward-compatible internal improvements
- `minor`: backward-compatible features
- `major`: breaking changes

### Standard release workflow

1. Make the code change.
2. Run `bun run verify`.
3. Add a changeset with `bun run changeset`.
4. Open and merge the PR.
5. After changesets land on `main`, the release workflow opens or updates the release PR.
6. Merging that release PR publishes the package to npm.

In practice, that means feature PRs should not manually edit `package.json` versions. Version bumps are produced by the Changesets release PR.

### Changeset guidance

Every contributor-facing or publish-affecting change should include a changeset unless it is explicitly being batched into a later release on purpose.

Examples that usually need a changeset:

- CLI behavior changes
- packaging changes
- install/runtime changes
- CI or release changes that affect delivered artifacts

Examples that usually do not need a changeset on their own:

- typo-only documentation fixes
- internal refactors with no user-visible effect
- test-only changes that do not alter shipped behavior

## Publishing

AGP is published as `@spektral/agent-profile-manager`.

The publish path is intended to use npm trusted publishing with GitHub Actions OIDC rather than a long-lived npm token.

That means:

- npm should trust the GitHub Actions workflow identity
- the release workflow can publish without storing a permanent publish token in the repository

If trusted publishing is temporarily unavailable, `NPM_TOKEN` may be used as a fallback for troubleshooting, but it is not the preferred steady-state setup.

The published command surface is intentionally small:

- package name: `@spektral/agent-profile-manager`
- public binary: `agp`
- canonical persisted config: `agp.yaml`

Legacy install helpers and the old bash launcher are intentionally out of scope for publication.

## Package contents

The npm package should only ship:

- `bin/`
- `dist/`
- `README.md`
- `LICENSE`

The publish payload must not include:

- `.claude/`
- `tests/`
- `src/`
- `install.sh`
- the legacy bash `agp` launcher

Use:

```bash
bun run pack:check
```

to validate that before publishing.

This repository uses the `files` whitelist in `package.json` as the primary publish boundary. If you add a new runtime file that must ship, update both the whitelist and the packaging checks in the same PR.

## Pull requests

Contributors should keep PRs scoped and include:

- a clear summary of what changed
- the reason for the change
- the validation that was run
- linked issues when relevant

If the change affects publishing, semver, packaging, or runtime behavior, call that out explicitly in the PR body.

For larger changes, include a short reviewer map describing where to look first, especially when the PR touches both runtime code and release tooling.
