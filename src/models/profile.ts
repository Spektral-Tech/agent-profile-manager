import { join } from "node:path";
import { PROFILES_DIR, PROFILE_SUBDIRS, RESERVED_NAMES } from "../lib/config";
import { configProfileExists, getProfile, addProfile } from "../lib/agpConfig";
import { error } from "../ui/output";

export interface Profile {
  name: string;
  description: string;
  created: string;
}

export function validateName(name: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    error(
      `Invalid profile name '${name}'. Use only letters, numbers, hyphens and underscores.`,
    );
  }
  if (RESERVED_NAMES.has(name)) {
    error(`Profile name '${name}' is reserved. Choose a different name.`);
  }
}

export function profilePath(name: string): string {
  return join(PROFILES_DIR, name);
}

export async function profileExists(name: string): Promise<boolean> {
  return configProfileExists(name);
}

export async function dirExists(name: string): Promise<boolean> {
  const { existsSync } = await import("node:fs");
  return existsSync(profilePath(name));
}

export async function readProfile(name: string): Promise<Profile> {
  const p = await getProfile(name);
  return p ?? { name, description: "", created: "" };
}

export async function writeProfile(
  _dir: string,
  name: string,
  description: string,
): Promise<void> {
  const created = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await addProfile({ name, description, created });
}

export function profileEnvVars(
  name: string,
): Record<string, string> {
  const p = profilePath(name);
  return {
    CLAUDE_CONFIG_DIR: join(p, "claude"),
    CODEX_HOME: join(p, "codex"),
    GEMINI_CLI_HOME: join(p, "gemini"),
    AGP_ACTIVE_PROFILE: name,
    AGP_PROFILE_DIR: p,
    AGENTIC_PROFILE: name,
  };
}
