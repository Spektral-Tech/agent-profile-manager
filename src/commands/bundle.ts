import { TOOL_DEFS, findAppPath } from "../models/tools";
import { profileExists } from "../models/profile";
import { getProfile } from "../lib/agpConfig";
import { generateBundle, bundlePath, bundleExists } from "../lib/bundle";
import { BUNDLES_DIR, VALID_TOOLS, type ToolName } from "../lib/config";
import { DIM, RESET } from "../ui/colors";
import { error, info, success, warn } from "../ui/output";

const DESKTOP_TOOLS = VALID_TOOLS.filter(
  (t) => TOOL_DEFS[t].kind === "desktop",
);

export async function cmdBundle(args: string[]): Promise<void> {
  let profileName = "";
  let toolArg = "";
  let all = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      (await import("./help")).usageBundle();
      return;
    }
    if (arg === "--all") { all = true; continue; }
    if (arg === "--force" || arg === "-f") { force = true; continue; }
    if (!profileName) { profileName = arg; continue; }
    toolArg = arg;
  }

  if (!profileName) {
    (await import("./help")).usageBundle();
    process.exit(1);
  }

  if (!(await profileExists(profileName))) {
    error(`Profile '${profileName}' not found. Run 'agp list' to see available profiles.`);
  }

  const profile = (await getProfile(profileName))!;

  const tools: ToolName[] = all
    ? (DESKTOP_TOOLS as ToolName[])
    : toolArg
    ? [toolArg as ToolName]
    : [];

  if (tools.length === 0) {
    (await import("./help")).usageBundle();
    process.exit(1);
  }

  // Validate tools
  for (const t of tools) {
    if (!VALID_TOOLS.includes(t)) {
      error(`Unknown tool '${t}'. Desktop tools: ${DESKTOP_TOOLS.join(", ")}`);
    }
    if (TOOL_DEFS[t].kind !== "desktop") {
      error(`'${t}' is a CLI tool. Bundles are only for desktop tools: ${DESKTOP_TOOLS.join(", ")}`);
    }
  }

  let generated = 0;
  for (const toolName of tools) {
    const def = TOOL_DEFS[toolName];
    const appName = def.appName!;
    const srcPath = findAppPath(appName);

    if (!srcPath) {
      warn(`${appName} not found in /Applications or ~/Applications — skipping`);
      continue;
    }

    info(`Bundling ${appName} for profile '${profileName}'...`);

    try {
      const dest = await generateBundle(profile, def, srcPath, { force });
      success(`Created: ${dest}`);
      generated++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      error(msg);
    }
  }

  if (generated > 0) {
    const dir = `${BUNDLES_DIR}/${profileName}`;
    console.error(`\n${DIM}  Dock: drag apps from ${dir} to your Dock${RESET}`);
    console.error(
      `${DIM}  Open:  agp open ${profileName} ${tools[0] ?? "claude-desktop"}${RESET}\n`,
    );
  }
}
