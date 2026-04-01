import { join } from "node:path";
import { PROFILE_SUBDIRS } from "../lib/config";
import { ensureDir } from "../lib/fs";
import { profilePath, profileExists, validateName, writeProfile, dirExists } from "../models/profile";
import { dim, error, success } from "../ui/output";

export async function cmdCreate(args: string[]): Promise<void> {
  let name = "";
  let desc = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      (await import("./help")).usageCreate();
      return;
    }
    if (arg === "--desc" || arg === "-d") {
      desc = args[++i] ?? "";
    } else if (arg.startsWith("-")) {
      error(`Unknown option: ${arg}`);
    } else {
      name = arg;
    }
  }

  if (!name) {
    (await import("./help")).usageCreate();
    process.exit(1);
  }

  validateName(name);

  if (await dirExists(name)) {
    error(`Profile '${name}' already exists. Run 'agp list' to see all profiles.`);
  }

  const p = profilePath(name);

  for (const subdir of PROFILE_SUBDIRS) {
    await ensureDir(join(p, subdir));
  }

  await writeProfile(p, name, desc);

  success(`Created profile '${name}' at ${p}`);
  dim(`  Next: agp open ${name} claude`);
}
