import { stderr, stdin } from "node:process";
import { createInterface } from "node:readline/promises";
import { removeProfile } from "../lib/agpConfig";
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
    const rl = createInterface({
      input: stdin,
      output: stderr,
    });
    const answer = (
      await rl.question("        This is irreversible. Type 'yes' to confirm: ")
    ).trim();
    rl.close();

    if (answer !== "yes") {
      info("Aborted.");
      return;
    }
  }

  await removeDir(p);
  await removeProfile(name);
  success(`Deleted profile '${name}'.`);
}
