import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ToolName } from "../lib/config";
import { commandExists } from "../lib/process";

export interface ToolDef {
  name: ToolName;
  kind: "cli" | "desktop";
  binary?: string;
  appName?: string;
  envVar?: string;
  subdir: string;
}

export const TOOL_DEFS: Record<ToolName, ToolDef> = {
  claude: {
    name: "claude",
    kind: "cli",
    binary: "claude",
    envVar: "CLAUDE_CONFIG_DIR",
    subdir: "claude",
  },
  "claude-desktop": {
    name: "claude-desktop",
    kind: "desktop",
    appName: "Claude",
    subdir: "claude",
  },
  codex: {
    name: "codex",
    kind: "cli",
    binary: "codex",
    envVar: "CODEX_HOME",
    subdir: "codex",
  },
  "codex-desktop": {
    name: "codex-desktop",
    kind: "desktop",
    appName: "Codex",
    envVar: "CODEX_HOME",
    subdir: "codex",
  },
  gemini: {
    name: "gemini",
    kind: "cli",
    binary: "gemini",
    envVar: "GEMINI_CLI_HOME",
    subdir: "gemini",
  },
  "gemini-desktop": {
    name: "gemini-desktop",
    kind: "desktop",
    appName: "Gemini",
    subdir: "gemini",
  },
  antigravity: {
    name: "antigravity",
    kind: "desktop",
    appName: "Antigravity",
    subdir: "antigravity",
  },
};

export function findAppPath(appName: string): string | null {
  const name = appName.replace(/\.app$/, "");
  const appDir = `${name}.app`;
  const systemPath = join("/Applications", appDir);
  const userPath = join(process.env.HOME ?? "", "Applications", appDir);
  if (existsSync(systemPath)) return systemPath;
  if (existsSync(userPath)) return userPath;
  return null;
}

export function appInstalled(appName: string): boolean {
  return findAppPath(appName) !== null;
}

export async function cliInstalled(binary: string): Promise<boolean> {
  return commandExists(binary);
}
