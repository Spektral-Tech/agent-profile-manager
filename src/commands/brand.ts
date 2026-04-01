import { getProfile, updateProfile } from "../lib/agpConfig";
import { profileExists } from "../models/profile";
import { BRANDING_KEYS } from "../models/profile";
import type { ProfileBranding } from "../models/profile";
import { DIM, RESET } from "../ui/colors";
import { error, success } from "../ui/output";

export async function cmdBrand(args: string[]): Promise<void> {
  let profileName = "";
  let key = "";
  let value = "";
  let unset = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      (await import("./help")).usageBrand();
      return;
    }
    if (arg === "--unset") {
      unset = true;
    } else if (!profileName) {
      profileName = arg;
    } else if (!key) {
      key = arg;
    } else if (!value) {
      value = arg;
    }
  }

  if (!profileName) {
    (await import("./help")).usageBrand();
    process.exit(1);
  }

  if (!(await profileExists(profileName))) {
    error(`Profile '${profileName}' not found. Run 'agp list' to see available profiles.`);
  }

  // Show all branding props
  if (!key) {
    const profile = await getProfile(profileName);
    const b = profile?.branding ?? {};
    const entries = Object.entries(b).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      console.error(`${DIM}  No branding set for profile '${profileName}'.${RESET}`);
    } else {
      const keyW = Math.max(...entries.map(([k]) => k.length));
      for (const [k, v] of entries) {
        console.error(`  ${k.padEnd(keyW)}  ${v}`);
      }
    }
    return;
  }

  if (!BRANDING_KEYS.has(key)) {
    error(
      `Unknown branding key '${key}'. Valid keys: ${[...BRANDING_KEYS].join(", ")}`,
    );
  }

  // Read a single key
  if (!value && !unset) {
    const profile = await getProfile(profileName);
    const b = profile?.branding ?? {};
    const v = (b as Record<string, string | undefined>)[key];
    if (v === undefined) {
      process.exit(1);
    }
    console.log(v);
    return;
  }

  // Unset a key
  if (unset) {
    const profile = await getProfile(profileName);
    if (!profile) return;
    const branding: ProfileBranding = { ...(profile.branding ?? {}) };
    delete (branding as Record<string, unknown>)[key];
    await updateProfile(profileName, {
      branding: Object.keys(branding).length > 0 ? branding : undefined,
    });
    success(`Unset branding.${key} for profile '${profileName}'`);
    return;
  }

  // Set a key
  const profile = await getProfile(profileName);
  const branding: ProfileBranding = { ...(profile?.branding ?? {}), [key]: value };
  await updateProfile(profileName, { branding });
  success(`Set branding.${key} for profile '${profileName}'`);
}
