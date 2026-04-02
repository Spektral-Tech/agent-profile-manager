import { interactiveShell } from "../lib/process";
import { dirExists, profileEnvVars, profilePath } from "../models/profile";
import { BOLD, CYAN, DIM, RESET } from "../ui/colors";
import { error, warn } from "../ui/output";

export async function cmdShell(args: string[]): Promise<void> {
  const name = args[0] ?? "";

  if (!name || name === "--help" || name === "-h") {
    (await import("./help")).usageShell();
    process.exit(1);
  }

  if (!(await dirExists(name))) {
    error(`Profile '${name}' not found.`);
  }

  const currentProfile = process.env.AGP_ACTIVE_PROFILE ?? "";
  if (currentProfile) {
    warn(
      `Already in profile '${currentProfile}'. Starting nested shell with profile '${name}'.`,
    );
  }

  const p = profilePath(name);
  const env = profileEnvVars(name);

  console.error(
    `\n${BOLD}${CYAN}  agp${RESET}${BOLD}  Entering profile '${name}'${RESET}`,
  );
  console.error(`${DIM}        CLAUDE_CONFIG_DIR=${p}/claude`);
  console.error(`        CODEX_HOME=${p}/codex`);
  console.error(`        GEMINI_CLI_HOME=${p}/gemini`);
  console.error(`        Exit with: exit or Ctrl-D${RESET}\n`);

  const exitCode = await interactiveShell(env);
  process.exit(exitCode);
}
