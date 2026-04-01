import { AGP_VERSION, PROFILES_DIR } from "../lib/config";
import { BOLD, CYAN, DIM, RESET, WHITE } from "../ui/colors";

export function usageMain(): void {
  console.error(`
${BOLD}agp${RESET} ${DIM}v${AGP_VERSION}${RESET} — Agent Profile Manager

${BOLD}USAGE${RESET}
  agp <command> [arguments]

${BOLD}COMMANDS${RESET}
  ${CYAN}create${RESET} <name> [--desc "..."]   Create a new isolated profile
  ${CYAN}list${RESET}                           List all profiles
  ${CYAN}delete${RESET} <name> [-f]             Delete a profile
  ${CYAN}open${RESET}   <name> <tool> [args]    Open a tool under a profile
  ${CYAN}shell${RESET}  <name>                  Start a shell with profile env
  ${CYAN}env${RESET}    <name>                  Print export statements (for eval)
  ${CYAN}usage${RESET}  [name] [--detail]       Show usage by profile
  ${CYAN}whoami${RESET}                         Print the currently active profile
  ${CYAN}brand${RESET}  <name> [key [value]]    Get or set profile branding
  ${CYAN}bundle${RESET} <name> <tool> [--force] Generate a branded .app bundle
  ${CYAN}edit${RESET}   [name]                  Open agp.yaml in editor
  ${DIM}${CYAN}clean-old-config${RESET}${DIM}               Remove legacy profile.toml files (temporary)${RESET}

${BOLD}TOOLS${RESET} (for agp open)
  claude          Claude CLI
  claude-desktop  Claude Desktop app
  codex           Codex CLI
  codex-desktop   Codex Desktop app
  gemini          Gemini CLI
  gemini-desktop  Gemini Desktop app
  antigravity     Antigravity Desktop app (Google)

${BOLD}PROFILE STRUCTURE${RESET}
  ${PROFILES_DIR}/<name>/
  ├── profile.toml    metadata
  ├── claude/         Claude context (CLI + desktop)
  ├── codex/          Codex context (CLI + desktop)
  ├── gemini/         Gemini CLI context
  └── antigravity/    Antigravity context

${BOLD}EXAMPLES${RESET}
  agp create personal --desc "Personal AI workspace"
  agp create work --desc "Work account"
  agp list
  agp open personal claude
  agp open work claude-desktop
  agp shell personal
  eval "$(agp env personal)"

${BOLD}ENV${RESET}
  AGP_PROFILES_DIR   Override profiles base dir (default: ~/.agent-profiles)
  AGP_BUNDLES_DIR    Override generated app bundles dir (default: ~/Applications/AGP)
`);
}

export function usageCreate(): void {
  console.error(`${BOLD}agp create${RESET} <name> [--desc "description"]

Create a new isolated profile with separate directories for each AI tool provider.

${BOLD}OPTIONS${RESET}
  --desc, -d   Short description for the profile

${BOLD}EXAMPLES${RESET}
  agp create personal
  agp create work --desc "Acme Corp account"`);
}

export function usageOpen(): void {
  console.error(`${BOLD}agp open${RESET} <name> <tool> [tool-args...]

Open an AI tool under an isolated profile. Any extra arguments are forwarded
to the underlying CLI tool.

${BOLD}TOOLS${RESET}
  claude          CLAUDE_CONFIG_DIR=<profile>/claude  claude [args]
  claude-desktop  open -n "Claude" --user-data-dir=<profile>/claude
  codex           CODEX_HOME=<profile>/codex  codex [args]
  codex-desktop   open -n "Codex" --user-data-dir=<profile>/codex
  gemini          GEMINI_CLI_HOME=<profile>/gemini  gemini [args]
  gemini-desktop  open -n "Gemini" --user-data-dir=<profile>/gemini
  antigravity     open -n "Antigravity" --user-data-dir=<profile>/antigravity

${BOLD}EXAMPLES${RESET}
  agp open personal claude
  agp open work claude-desktop
  agp open personal gemini --model gemini-2.0-flash
  agp open work antigravity`);
}

export function usageDelete(): void {
  console.error(`${BOLD}agp delete${RESET} <name> [-f]

Delete a profile and all its data. Prompts for confirmation unless -f is given.

${BOLD}OPTIONS${RESET}
  -f, --force   Skip confirmation prompt

${BOLD}EXAMPLES${RESET}
  agp delete old-profile
  agp delete old-profile -f`);
}

export function usageShell(): void {
  console.error(`${BOLD}agp shell${RESET} <name>

Start a new interactive shell with the profile's environment variables pre-loaded.
All AI CLI tools launched from this shell will use the profile's isolated config.

Exit with: exit or Ctrl-D

${BOLD}EXAMPLES${RESET}
  agp shell personal
  agp shell work`);
}

export function usageEnv(): void {
  console.error(`${BOLD}agp env${RESET} <name>

Print shell export statements to stdout for the given profile.
Designed for use with eval to load a profile into the current shell session.

${BOLD}EXAMPLES${RESET}
  eval "$(agp env personal)"
  agp env work >> .envrc`);
}

export function usageWhoami(): void {
  console.error(`${BOLD}agp whoami${RESET}

Print the name of the currently active AGP profile.
Exits with a non-zero status if not inside a profile context.

${BOLD}EXAMPLES${RESET}
  agp whoami
  agp shell personal && agp whoami  # prints: personal`);
}

export function usageUsage(): void {
  console.error(`${BOLD}agp usage${RESET} [name] [options]

Show usage summary by profile. Displays Claude Code sessions and
completed interactions across all profiles.

${BOLD}OPTIONS${RESET}
  --detail, -d   Show detailed breakdown for each profile
  --help, -h     Show this help message

${BOLD}EXAMPLES${RESET}
  agp usage              # Show summary for all profiles
  agp usage personal     # Show details for 'personal' profile
  agp usage --detail     # Show detailed summary for all profiles`);
}

export function usageBundle(): void {
  console.error(`${BOLD}agp bundle${RESET} <profile> <tool> [--force]
${BOLD}agp bundle${RESET} <profile> --all [--force]

Generate a branded macOS .app bundle for a profile. The bundle is placed in
AGP_BUNDLES_DIR (default: ~/Applications/AGP/<profile>/) and can be pinned
to the Dock for one-click profile launching.

The derived bundle has a unique bundle identifier so macOS treats it as a
separate app in Cmd+Tab, Mission Control, and the Dock.

If the profile has ${CYAN}branding.icon_color${RESET} set, the app icon is tinted with
that color. If ${CYAN}branding.display_name${RESET} is set, it becomes the app name.

${BOLD}DESKTOP TOOLS${RESET}
  claude-desktop   codex-desktop   gemini-desktop   antigravity

${BOLD}OPTIONS${RESET}
  --all     Generate bundles for all installed desktop tools
  --force   Overwrite existing bundle

${BOLD}EXAMPLES${RESET}
  agp bundle work claude-desktop
  agp bundle work --all
  agp bundle personal claude-desktop --force`);
}

export function usageBrand(): void {
  console.error(`${BOLD}agp brand${RESET} <name> [<key> [<value>]] [--unset]

Manage branding for a profile. Interface follows git-config semantics:
read a key by omitting value, write it by providing value, remove with --unset.

${BOLD}VALID KEYS${RESET}
  icon_color    Hex accent color used for icon tinting (e.g. #0066CC)
  display_name  Display name for derived app bundles
  icon_mode     Icon transformation: tint | replace | none
  icon_source   Path to custom icon source file

${BOLD}OPTIONS${RESET}
  --unset   Remove the specified key

${BOLD}EXAMPLES${RESET}
  agp brand work                              # show all branding
  agp brand work icon_color                   # read a value
  agp brand work icon_color "#0066CC"         # set a value
  agp brand work display_name "Claude · Work"
  agp brand work icon_color --unset           # remove a value`);
}

export function usageEdit(): void {
  console.error(`${BOLD}agp edit${RESET} [name]

Open the agp.yaml configuration file in your default editor.
Uses $VISUAL, $EDITOR, or falls back to code, nano, or vi.

If a profile name is provided, a hint is shown to help locate it in the file.

${BOLD}EXAMPLES${RESET}
  agp edit
  agp edit work`);
}

export function usageCleanOldConfig(): void {
  console.error(`${BOLD}agp clean-old-config${RESET}

${DIM}Temporary command — to be removed in a future version of agp.${RESET}

Removes legacy profile.toml files from all profiles that have already been
migrated to agp.yaml. After running this, the bash agp script will no longer
be able to read or update those profiles.

Only run this command when you are ready to stop using the bash version of agp
and rely exclusively on the TypeScript CLI.

${BOLD}EXAMPLES${RESET}
  agp clean-old-config`);
}
