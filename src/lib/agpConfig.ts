import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Profile } from "../models/profile";
import { info } from "../ui/output";
import { ensureDir, listProfileDirs } from "./fs";
import { readToml } from "./toml";
import { parseYaml, serializeYaml } from "./yaml";
import type { AgpConfig } from "./yaml";

export type { AgpConfig };

const CONFIG_FILE = "agp.yaml";

function profilesDir(): string {
  return process.env.AGP_PROFILES_DIR ?? `${process.env.HOME}/.agent-profiles`;
}

function configPath(): string {
  return join(profilesDir(), CONFIG_FILE);
}

let _config: AgpConfig | null = null;

export function resetConfig(): void {
  _config = null;
}

async function readLegacyToml(name: string): Promise<Record<string, string>> {
  return readToml(join(profilesDir(), name, "profile.toml"));
}

async function removeLegacyToml(name: string): Promise<void> {
  await rm(join(profilesDir(), name, "profile.toml"), { force: true });
}

async function migrateLegacy(): Promise<AgpConfig> {
  const dirs = await listProfileDirs(profilesDir());
  const profiles: Profile[] = [];

  for (const name of dirs) {
    const data = await readLegacyToml(name);
    if (Object.keys(data).length === 0) continue;
    profiles.push({
      name: data.name ?? name,
      description: data.description ?? "",
      created: data.created ?? "",
    });
    await removeLegacyToml(name);
  }

  const config: AgpConfig = { version: "1", profiles };
  await saveConfig(config);

  if (profiles.length > 0) {
    info(
      `Migrated ${profiles.length} legacy profile(s) to agp.yaml. Legacy profile.toml files were removed after import.`,
    );
  }

  return config;
}

async function mergeUnregistered(config: AgpConfig): Promise<boolean> {
  const dirs = await listProfileDirs(profilesDir());
  const known = new Set(config.profiles.map((p) => p.name));
  let changed = false;

  for (const name of dirs) {
    if (known.has(name)) continue;
    const data = await readLegacyToml(name);
    if (Object.keys(data).length === 0) continue;
    const profileName = data.name ?? name;
    // Guard against TOML name differing from directory name: if the resolved
    // name is already registered, remove the stale TOML and skip to avoid duplicates.
    if (known.has(profileName)) {
      await removeLegacyToml(name);
      continue;
    }
    known.add(profileName);
    config.profiles.push({
      name: profileName,
      description: data.description ?? "",
      created: data.created ?? "",
    });
    await removeLegacyToml(name);
    info(
      `Migrated legacy profile '${name}' to agp.yaml. Legacy profile.toml was removed after import.`,
    );
    changed = true;
  }

  return changed;
}

export async function loadConfig(): Promise<AgpConfig> {
  if (_config) return _config;

  if (existsSync(configPath())) {
    const text = await readFile(configPath(), "utf8");
    const config = parseYaml(text);
    const changed = await mergeUnregistered(config);
    if (changed) await saveConfig(config);
    _config = config;
    return config;
  }

  const config = await migrateLegacy();
  _config = config;
  return config;
}

export async function saveConfig(config: AgpConfig): Promise<void> {
  await ensureDir(profilesDir());
  await writeFile(configPath(), serializeYaml(config), "utf8");
}

export async function listProfiles(): Promise<Profile[]> {
  const config = await loadConfig();
  return [...config.profiles];
}

export async function getProfile(name: string): Promise<Profile | undefined> {
  const config = await loadConfig();
  return config.profiles.find((p) => p.name === name);
}

export async function configProfileExists(name: string): Promise<boolean> {
  const config = await loadConfig();
  return config.profiles.some((p) => p.name === name);
}

export async function addProfile(profile: Profile): Promise<void> {
  const config = await loadConfig();
  config.profiles.push(profile);
  await saveConfig(config);
}

export async function removeProfile(name: string): Promise<void> {
  const config = await loadConfig();
  config.profiles = config.profiles.filter((p) => p.name !== name);
  await saveConfig(config);
}
