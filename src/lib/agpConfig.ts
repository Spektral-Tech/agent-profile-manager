import { join } from "node:path";
import { listProfileDirs, ensureDir } from "./fs";
import { readToml } from "./toml";
import { parseYaml, serializeYaml } from "./yaml";
import type { AgpConfig } from "./yaml";
import type { Profile } from "../models/profile";
import { info, warn } from "../ui/output";

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
  }

  const config: AgpConfig = { version: "1", profiles };
  await saveConfig(config);

  if (profiles.length > 0) {
    info(
      `Migrated ${profiles.length} legacy profile(s) to agp.yaml. ` +
        `Old profile.toml files kept for bash agp compatibility. ` +
        `Run 'agp clean-old-config' when you no longer need them.`,
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
    // name is already registered, skip to avoid duplicate entries.
    if (known.has(profileName)) continue;
    known.add(profileName);
    config.profiles.push({
      name: profileName,
      description: data.description ?? "",
      created: data.created ?? "",
    });
    info(
      `Migrated legacy profile '${name}' to agp.yaml. ` +
        `Old profile.toml kept for bash agp compatibility. ` +
        `Run 'agp clean-old-config' when you no longer need it.`,
    );
    changed = true;
  }

  return changed;
}

async function warnCoexisting(config: AgpConfig): Promise<void> {
  const stale: string[] = [];
  for (const profile of config.profiles) {
    const data = await readLegacyToml(profile.name);
    if (Object.keys(data).length > 0) {
      stale.push(profile.name);
    }
  }
  if (stale.length > 0) {
    warn(
      `Profile(s) [${stale.join(", ")}] already imported into agp.yaml but ` +
        `profile.toml still exists. Future changes to profile.toml will not be ` +
        `reflected in agp.yaml. Run 'agp clean-old-config' to remove old files.`,
    );
  }
}

export async function loadConfig(): Promise<AgpConfig> {
  if (_config) return _config;

  const yamlFile = Bun.file(configPath());

  if (await yamlFile.exists()) {
    const text = await yamlFile.text();
    const config = parseYaml(text);
    const changed = await mergeUnregistered(config);
    if (changed) await saveConfig(config);
    await warnCoexisting(config);
    _config = config;
    return config;
  }

  const config = await migrateLegacy();
  await warnCoexisting(config);
  _config = config;
  return config;
}

export async function saveConfig(config: AgpConfig): Promise<void> {
  await ensureDir(profilesDir());
  await Bun.write(configPath(), serializeYaml(config));
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

/** Returns names of profiles that have a legacy profile.toml alongside the YAML entry. */
export async function legacyTomlProfiles(): Promise<string[]> {
  const config = await loadConfig();
  const stale: string[] = [];
  for (const profile of config.profiles) {
    const data = await readLegacyToml(profile.name);
    if (Object.keys(data).length > 0) stale.push(profile.name);
  }
  return stale;
}
