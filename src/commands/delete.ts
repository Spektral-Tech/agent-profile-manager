import { removeDir } from "../lib/fs";
import { dirExists, profilePath } from "../models/profile";
import { BOLD, DIM, RESET, YELLOW } from "../ui/colors";
import { error, info, success } from "../ui/output";

export async function cmdDelete(args: string[]): Promise<void> {
  let name = "";
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-f" || arg === "--force") {
      force = true;
    } else if (arg === "--help" || arg === "-h") {
      (await import("./help")).usageDelete();
      return;
    } else if (arg.startsWith("-")) {
      error(`Unknown option: ${arg}`);
    } else {
      name = arg;
    }
  }

  if (!name) {
    (await import("./help")).usageDelete();
    process.exit(1);
  }

  if (!(await dirExists(name))) {
    error(`Profile '${name}' not found.`);
  }

  const p = profilePath(name);

  if (!force) {
    console.error(
      `${YELLOW}  warn${RESET}  Delete profile '${BOLD}${name}${RESET}' at ${DIM}${p}${RESET}?`,
    );
    process.stderr.write("        This is irreversible. Type 'yes' to confirm: ");

    const reader = Bun.stdin.stream().getReader();
    const { value } = await reader.read();
    reader.releaseLock();
    const answer = value ? new TextDecoder().decode(value).trim() : "";

    if (answer !== "yes") {
      info("Aborted.");
      return;
    }
  }

  await removeDir(p);
  success(`Deleted profile '${name}'.`);
}
