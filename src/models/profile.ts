import { join } from "node:path";
import { PROFILES_DIR, PROFILE_SUBDIRS, RESERVED_NAMES } from "../lib/config";
import { readToml, writeToml } from "../lib/toml";
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
  return Bun.file(join(profilePath(name), "profile.toml")).exists();
}

export async function dirExists(name: string): Promise<boolean> {
  const { existsSync } = await import("node:fs");
  return existsSync(profilePath(name));
}

export async function readProfile(name: string): Promise<Profile> {
  const tomlPath = join(profilePath(name), "profile.toml");
  const data = await readToml(tomlPath);
  return {
    name: data.name ?? name,
    description: data.description ?? "",
    created: data.created ?? "",
  };
}

export async function writeProfile(
  dir: string,
  name: string,
  description: string,
): Promise<void> {
  const created = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await writeToml(dir, { name, description, created });
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
