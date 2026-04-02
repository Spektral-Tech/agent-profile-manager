import { existsSync } from "node:fs";
import { join } from "node:path";
import { VALID_TOOLS, type ToolName } from "../lib/config";
import { execCli, launchCodexDesktop, openDesktopApp, openBundleApp } from "../lib/process";
import { bundleExists, bundlePath } from "../lib/bundle";
import { dirExists, profilePath } from "../models/profile";
import { appInstalled, cliInstalled, findAppPath, TOOL_DEFS } from "../models/tools";
import { BOLD, DIM, RESET, YELLOW } from "../ui/colors";
import { error, info, warn } from "../ui/output";

function warnFirstLogin(providerDir: string): void {
  const hasCookies =
    existsSync(join(providerDir, "Cookies")) ||
    existsSync(join(providerDir, "Default", "Cookies"));

  if (!hasCookies) {
    console.error(
      `\n${YELLOW}${BOLD}  First login detected for this profile${RESET}`,
    );
    console.error(`${YELLOW}  Before clicking Sign In:${RESET}`);
    console.error(
      `${DIM}  1. Temporarily set your default browser to a secondary browser`,
    );
    console.error(
      `     (System Settings → Desktop & Dock → Default web browser)`,
    );
    console.error(
      `  2. Click Sign In — authenticate in that secondary browser`,
    );
    console.error(`  3. Restore your original default browser\n${RESET}`);
  }
}

export async function cmdOpen(args: string[]): Promise<void> {
  const name = args[0] ?? "";
  const tool = args[1] ?? "";

  if (!name || !tool || name === "--help" || name === "-h") {
    (await import("./help")).usageOpen();
    if (name === "--help" || name === "-h") return;
    process.exit(1);
  }

  if (!(await dirExists(name))) {
    error(`Profile '${name}' not found. Run 'agp list' to see available profiles.`);
  }

  if (!VALID_TOOLS.includes(tool as ToolName)) {
    error(`Unknown tool '${tool}'. Valid tools: ${VALID_TOOLS.join(", ")}`);
  }

  const def = TOOL_DEFS[tool as ToolName];
  const p = profilePath(name);
  const profileDir = join(p, def.subdir);
  const extraArgs = args.slice(2);

  if (def.kind === "cli") {
    if (!cliInstalled(def.binary!)) {
      const hints: Record<string, string> = {
        claude: "Install from https://claude.ai/download",
        codex: "Install with: npm install -g @openai/codex",
        gemini: "Install with: npm install -g @google/gemini-cli",
      };
      error(`'${def.binary}' CLI not found. ${hints[def.binary!] ?? ""}`);
    }
    info(`Opening ${def.binary} CLI under profile '${name}'`);
    await execCli(def.binary!, extraArgs, { [def.envVar!]: profileDir });
  }

  // Desktop tools
  if (tool === "codex-desktop") {
    if (bundleExists(name, "Codex")) {
      const bPath = bundlePath(name, "Codex");
      warnFirstLogin(profileDir);
      info(`Opening bundled Codex for profile '${name}'`);
      openBundleApp(bPath);
      return;
    }
    if (!appInstalled("Codex")) {
      error("Codex not found in /Applications or ~/Applications.");
    }
    const appPath = findAppPath("Codex")!;
    const codexBin = join(appPath, "Contents", "MacOS", "Codex");
    warnFirstLogin(profileDir);
    info(`Opening Codex with profile '${name}'`);
    launchCodexDesktop(codexBin, profileDir);
    return;
  }

  if (tool === "gemini-desktop") {
    if (bundleExists(name, "Gemini")) {
      const bPath = bundlePath(name, "Gemini");
      warnFirstLogin(profileDir);
      info(`Opening bundled Gemini for profile '${name}'`);
      openBundleApp(bPath);
      return;
    }
    if (appInstalled("Gemini")) {
      warnFirstLogin(profileDir);
      info(`Opening Gemini with profile at ${profileDir}`);
      openDesktopApp("Gemini", profileDir);
    } else {
      warn(`Gemini Desktop app not found. Try 'agp open ${name} antigravity' instead.`);
    }
    return;
  }

  // Generic desktop: claude-desktop, antigravity
  if (def.kind === "desktop") {
    if (bundleExists(name, def.appName!)) {
      const bPath = bundlePath(name, def.appName!);
      warnFirstLogin(profileDir);
      info(`Opening bundled ${def.appName} for profile '${name}'`);
      openBundleApp(bPath);
      return;
    }
    if (!appInstalled(def.appName!)) {
      error(`${def.appName} not found in /Applications or ~/Applications.`);
    }
    warnFirstLogin(profileDir);
    info(`Opening ${def.appName} with profile at ${profileDir}`);
    openDesktopApp(def.appName!, profileDir);
  }
}
