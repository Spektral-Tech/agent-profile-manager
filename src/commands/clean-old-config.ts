/**
 * @deprecated Temporary command — to be removed in a future version of agp
 * once the transition from profile.toml to agp.yaml is complete.
 *
 * Removes legacy profile.toml files from all profiles that have already been
 * migrated to agp.yaml. After running this command, the bash agp script will
 * no longer be able to read or update those profiles.
 */
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { legacyTomlProfiles } from "../lib/agpConfig";
import { profilePath } from "../models/profile";
import { dim, info, success, warn } from "../ui/output";

export async function cmdCleanOldConfig(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    (await import("./help")).usageCleanOldConfig();
    return;
  }

  warn(
    "This is a temporary command that will be removed in a future version of agp. " +
      "After running it, legacy profile.toml files will be deleted and the bash agp " +
      "script will no longer be able to manage those profiles.",
  );

  const stale = await legacyTomlProfiles();

  if (stale.length === 0) {
    info("No legacy profile.toml files found. Nothing to clean.");
    return;
  }

  dim(`  Found legacy profile.toml in: ${stale.join(", ")}`);

  let removed = 0;
  for (const name of stale) {
    const tomlPath = join(profilePath(name), "profile.toml");
    try {
      await unlink(tomlPath);
      success(`Removed ${tomlPath}`);
      removed++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      warn(`Could not remove ${tomlPath}: ${msg}`);
    }
  }

  if (removed > 0) {
    info(
      `Removed ${removed} legacy profile.toml file(s). ` +
        `These profiles are now managed exclusively by agp.yaml.`,
    );
  }
}
