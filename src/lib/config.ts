export const AGP_VERSION = "1.0.0";

export const PROFILES_DIR =
  process.env.AGP_PROFILES_DIR ?? `${process.env.HOME}/.agent-profiles`;

export const BUNDLES_DIR =
  process.env.AGP_BUNDLES_DIR ?? `${process.env.HOME}/Applications/AGP`;

export const VALID_TOOLS = [
  "claude",
  "claude-desktop",
  "codex",
  "codex-desktop",
  "gemini",
  "gemini-desktop",
  "antigravity",
] as const;

export type ToolName = (typeof VALID_TOOLS)[number];

export const PROFILE_SUBDIRS = ["claude", "codex", "gemini", "antigravity"] as const;

export const RESERVED_NAMES = new Set([
  "list",
  "create",
  "delete",
  "open",
  "shell",
  "env",
  "usage",
  "whoami",
  "brand",
  "edit",
  "install",
  "help",
]);
