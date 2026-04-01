import { listProfiles } from "../lib/agpConfig";
import { BOLD, DIM, GREEN, RESET, WHITE, hexColor } from "../ui/colors";
import { info } from "../ui/output";

export async function cmdList(_args: string[]): Promise<void> {
  const profiles = await listProfiles();

  if (profiles.length === 0) {
    info("No profiles found. Create one with: agp create <name>");
    return;
  }

  profiles.sort((a, b) => a.name.localeCompare(b.name));

  const active = process.env.AGP_ACTIVE_PROFILE ?? "";
  const nameW = 16;
  const descW = 28;

  console.error(
    `\n${BOLD}${WHITE}${"NAME".padEnd(nameW)}  ${"DESCRIPTION".padEnd(descW)}  CREATED${RESET}`,
  );
  console.error(`${DIM}${"─".repeat(60)}${RESET}`);

  for (const profile of profiles) {
    const desc = profile.description || "";
    const created = profile.created ? profile.created.split("T")[0] : "?";
    const iconColor = profile.branding?.icon_color;
    const swatch = iconColor ? `${hexColor(iconColor)}●${RESET} ` : "  ";

    if (profile.name === active) {
      const marker = `${GREEN}*${RESET} `;
      console.error(
        `${GREEN}${marker}${swatch}${profile.name.padEnd(nameW - 4)}${RESET}  ${desc.padEnd(descW)}  ${DIM}${created}${RESET}`,
      );
    } else {
      console.error(
        `  ${swatch}${profile.name.padEnd(nameW - 4)}  ${desc.padEnd(descW)}  ${DIM}${created}${RESET}`,
      );
    }
  }

  console.error("");
}
