import { dirExists, profileEnvVars } from "../models/profile";

export async function cmdEnv(args: string[]): Promise<void> {
  const name = args[0] ?? "";

  if (!name || name === "--help" || name === "-h") {
    (await import("./help")).usageEnv();
    process.exit(1);
  }

  if (!(await dirExists(name))) {
    console.log(`# error: profile '${name}' not found`);
    process.exit(1);
  }

  const vars = profileEnvVars(name);

  console.log(`# agp profile: ${name}`);
  for (const [key, value] of Object.entries(vars)) {
    console.log(`export ${key}="${value}"`);
  }
}
