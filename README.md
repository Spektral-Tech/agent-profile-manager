# agp — Agent Profile Manager

Manage isolated AI tool profiles on macOS with ease. Keep your Claude, Codex, Gemini, and Antigravity accounts separate and organized.

## Overview

`agp` is a lightweight shell utility that creates isolated profile directories for multiple AI tools. Each profile maintains separate configuration, authentication, and context for:

- **Claude** (CLI & Desktop)
- **Codex** (CLI & Desktop)
- **Gemini** (CLI & Desktop)
- **Antigravity** (Desktop)

Perfect for developers who work with multiple AI accounts (personal, work, testing) and want clean separation without interference.

## Installation

### One-liner (Recommended)

Download and run the interactive installer directly from GitHub:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Spektral-Tech/agent-profile-manager/main/install.sh)
```

The installer will ask you to choose between:
1. **Clone repository** — Get the full source code
2. **Download binary** — Quick pre-built installation

### Manual Installation

Clone the repository and run the installer:

```bash
git clone https://github.com/Spektral-Tech/agent-profile-manager.git
cd agent-profile-manager
./install.sh
```

### PATH Configuration

Make sure `~/.local/bin` is in your `$PATH`:

```bash
# Add to ~/.zshrc or ~/.bashrc if needed
export PATH="$HOME/.local/bin:$PATH"
```

Then reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

## Quick Start

```bash
# Create a new profile
agp create personal --desc "Personal AI workspace"
agp create work --desc "Work account"

# List all profiles
agp list

# Open Claude CLI under a profile
agp open personal claude

# Open Claude Desktop with isolated profile
agp open work claude-desktop

# Start an interactive shell with all env vars set
agp shell personal

# Print environment variables (for eval or .envrc)
agp env work

# View usage summary
agp usage
agp usage personal
```

## Commands

### `agp list`

List all profiles with descriptions and creation dates.

```bash
agp list
```

### `agp create <name> [--desc "description"]`

Create a new isolated profile with subdirectories for each tool.

```bash
agp create my-profile
agp create work-account --desc "Acme Corp"
```

### `agp open <name> <tool> [tool-args...]`

Open an AI tool using a specific profile. Extra arguments are forwarded to the CLI.

**Supported tools:**
- `claude` — Claude CLI
- `claude-desktop` — Claude Desktop app
- `codex` — Codex CLI
- `codex-desktop` — Codex Desktop app
- `gemini` — Gemini CLI
- `gemini-desktop` — Gemini Desktop app
- `antigravity` — Antigravity Desktop app

```bash
agp open personal claude
agp open work claude-desktop
agp open personal gemini --model gemini-2.0-flash
```

### `agp shell <name>`

Start a new interactive shell with the profile's environment variables pre-loaded. All AI tools launched from this shell will use the profile's isolated config.

```bash
agp shell personal
# Exit with: exit or Ctrl-D
```

### `agp env <name>`

Print shell export statements for use with `eval` or `.envrc` files.

```bash
eval "$(agp env work)"
agp env personal >> .envrc
```

### `agp delete <name> [-f]`

Delete a profile and all its data. Prompts for confirmation unless `-f` is used.

```bash
agp delete old-profile
agp delete old-profile -f  # Skip confirmation
```

### `agp usage [name] [--detail]`

Show usage summary and interaction statistics for profiles. Displays Claude Code sessions, completed interactions, and recent activity.

```bash
agp usage                  # Show summary for all profiles
agp usage personal         # Show details for 'personal' profile
agp usage --detail         # Show detailed breakdown of all profiles
```

**Metrics tracked:**
- **Profiles**: All agent profiles created
- **Sessions**: Number of Claude Code sessions per profile
- **Usage**: Total completed turns/interactions per profile
- **Last Activity**: Most recent session activity timestamp

## Profile Structure

Each profile is stored at `~/.agent-profiles/<name>/`:

```
~/.agent-profiles/personal/
├── profile.toml    # Metadata (name, description, creation date)
├── claude/         # Claude CLI config + Desktop app data
├── codex/          # Codex CLI config + Desktop app data
├── gemini/         # Gemini CLI config
└── antigravity/    # Antigravity app data
```

## Environment Variables

When you open a tool or shell with a profile, these variables are set:

- `CLAUDE_CONFIG_DIR` — Path to Claude profile directory
- `CODEX_HOME` — Path to Codex profile directory
- `GEMINI_CLI_HOME` — Path to Gemini profile directory
- `AGP_ACTIVE_PROFILE` — Current profile name
- `AGP_PROFILE_DIR` — Full path to profile directory
- `AGENTIC_PROFILE` — Alternative name for current profile

### Customization

Override the default profiles directory:

```bash
export AGP_PROFILES_DIR="/custom/path/to/profiles"
```

## Examples

### Switching between accounts

```bash
# Quick access to different Claude accounts
agp open personal claude
agp open work claude

# No context confusion between accounts
```

### Interactive shells

```bash
# Start a shell with personal profile context
agp shell personal

# Any claude or gemini commands use this profile
claude chat "Hello from personal profile"
gemini ask "What's 2+2?"

# Exit back to your default shell
exit
```

### Integrate with direnv

```bash
# In your project directory
agp env work >> .envrc
direnv allow
```

Now all tools in that directory automatically use the work profile.

### Desktop app isolation

```bash
# Open multiple instances of Claude with different profiles
agp open personal claude-desktop
agp open work claude-desktop

# Each window has separate auth, history, and settings
```

## Validation & Reserved Names

Profile names must contain only:
- Letters (a-z, A-Z)
- Numbers (0-9)
- Hyphens and underscores (-_)

These names are reserved: `list`, `create`, `delete`, `open`, `shell`, `env`, `install`, `help`

## Tips & Troubleshooting

### First-time login to desktop apps

When opening a desktop app for the first time, `agp` suggests:
1. Temporarily set your default browser to a secondary browser
2. Click Sign In in the app
3. Restore your original default browser

This prevents accidental profile switching at the browser level.

### Using multiple profiles in one shell

```bash
# Start a nested shell with a different profile
agp shell personal      # Now in personal profile
  agp shell work        # Start nested work profile
  exit                  # Back to personal
exit                    # Back to default
```

### Find your profiles

```bash
# List physical profile locations
ls -la ~/.agent-profiles/

# Or use agp
agp list
```

## Requirements

- **macOS** (10.13 or later)
- **Bash 4.0+**
- Relevant AI CLI tools or Desktop apps installed

## License

MIT License © 2026 Spektral Tech - Antonio Eduardo (SkyaTura)

See [LICENSE](LICENSE) for details.

## Support

For issues, feature requests, or contributions, please open an issue or PR.
