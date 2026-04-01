import { PROFILES_DIR } from "../lib/config";
import { listProfileDirs } from "../lib/fs";
import { readProfile } from "../models/profile";
import { BOLD, CYAN, DIM, GREEN, RESET, WHITE } from "../ui/colors";
import { info } from "../ui/output";

export async function cmdList(_args: string[]): Promise<void> {
  const names = await listProfileDirs(PROFILES_DIR);

  if (names.length === 0) {
    info("No profiles found. Create one with: agp create <name>");
    return;
  }

  const active = process.env.AGP_ACTIVE_PROFILE ?? "";
  const nameW = 16;
  const descW = 28;

  console.error(
    `\n${BOLD}${WHITE}${"NAME".padEnd(nameW)}  ${"DESCRIPTION".padEnd(descW)}  CREATED${RESET}`,
  );
  console.error(`${DIM}${"─".repeat(60)}${RESET}`);

  for (const name of names) {
    const profile = await readProfile(name);
    const desc = profile.description || "";
    const created = profile.created ? profile.created.split("T")[0] : "?";

    if (name === active) {
      const marker = `${GREEN}*${RESET} `;
      console.error(
        `${GREEN}${marker}${name.padEnd(nameW - 2)}${RESET}  ${desc.padEnd(descW)}  ${DIM}${created}${RESET}`,
      );
    } else {
      console.error(
        `  ${name.padEnd(nameW - 2)}  ${desc.padEnd(descW)}  ${DIM}${created}${RESET}`,
      );
    }
  }

  console.error("");
}
