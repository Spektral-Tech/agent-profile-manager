import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { withTempProfiles } from "../helpers/fixtures";

async function writeLegacyToml(dir: string, name: string, description: string, created: string): Promise<void> {
  await mkdir(join(dir, name), { recursive: true });
  await writeFile(
    join(dir, name, "profile.toml"),
    `name = "${name}"\ndescription = "${description}"\ncreated = "${created}"\n`,
  );
}

describe("legacy migration", () => {
  test("empty dir: agp list creates agp.yaml with empty profiles", async () => {
    await withTempProfiles(async (dir) => {
      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(0);
      expect(existsSync(join(dir, "agp.yaml"))).toBe(true);
      const yaml = await Bun.file(join(dir, "agp.yaml")).text();
      expect(yaml).toContain('version: "1"');
    });
  });

  test("single legacy profile.toml is auto-migrated", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(dir, "work", "Work account", "2025-06-01T00:00:00Z");

      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();

      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe("work");
      expect(profiles[0].description).toBe("Work account");
      expect(profiles[0].created).toBe("2025-06-01T00:00:00Z");

      expect(existsSync(join(dir, "agp.yaml"))).toBe(true);
      const yaml = await Bun.file(join(dir, "agp.yaml")).text();
      expect(yaml).toContain("work");
    });
  });

  test("profile.toml is NOT removed after migration (bash agp coexistence)", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(dir, "work", "Work account", "2025-06-01T00:00:00Z");

      const { listProfiles } = await import("../../src/lib/agpConfig");
      await listProfiles();

      // profile.toml must still exist so bash agp can keep reading/writing it
      expect(existsSync(join(dir, "work", "profile.toml"))).toBe(true);
    });
  });

  test("multiple legacy profile.toml files are all migrated, none deleted", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(dir, "alpha", "Alpha profile", "2025-01-01T00:00:00Z");
      await writeLegacyToml(dir, "beta", "Beta profile", "2025-02-01T00:00:00Z");

      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();

      expect(profiles).toHaveLength(2);
      const names = profiles.map((p) => p.name);
      expect(names).toContain("alpha");
      expect(names).toContain("beta");

      // both profile.toml files survive
      expect(existsSync(join(dir, "alpha", "profile.toml"))).toBe(true);
      expect(existsSync(join(dir, "beta", "profile.toml"))).toBe(true);
    });
  });

  test("partial migration: existing agp.yaml + new profile.toml are merged", async () => {
    await withTempProfiles(async (dir) => {
      const { serializeYaml } = await import("../../src/lib/yaml");
      await Bun.write(
        join(dir, "agp.yaml"),
        serializeYaml({
          version: "1",
          profiles: [{ name: "existing", description: "Already migrated", created: "2025-01-01T00:00:00Z" }],
        }),
      );

      await writeLegacyToml(dir, "newone", "New legacy profile", "2025-03-01T00:00:00Z");

      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();

      expect(profiles).toHaveLength(2);
      const names = profiles.map((p) => p.name);
      expect(names).toContain("existing");
      expect(names).toContain("newone");

      // newly migrated profile.toml must survive
      expect(existsSync(join(dir, "newone", "profile.toml"))).toBe(true);
    });
  });

  test("migration is idempotent: running list twice does not duplicate entries", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(dir, "solo", "Solo profile", "2025-01-01T00:00:00Z");

      const { listProfiles, resetConfig } = await import("../../src/lib/agpConfig");
      await listProfiles();

      resetConfig();
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe("solo");
    });
  });

  test("directory without profile.toml is not migrated as a profile entry", async () => {
    await withTempProfiles(async (dir) => {
      await mkdir(join(dir, "orphan"), { recursive: true });

      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(0);
    });
  });

  test("legacyTomlProfiles returns profiles with coexisting profile.toml", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(dir, "stale", "Stale profile", "2025-01-01T00:00:00Z");

      const { legacyTomlProfiles } = await import("../../src/lib/agpConfig");
      const stale = await legacyTomlProfiles();
      expect(stale).toContain("stale");
    });
  });
});

describe("clean-old-config command", () => {
  test("removes profile.toml from migrated profiles", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(dir, "old", "Old profile", "2025-01-01T00:00:00Z");

      // trigger migration first
      const { listProfiles } = await import("../../src/lib/agpConfig");
      await listProfiles();
      expect(existsSync(join(dir, "old", "profile.toml"))).toBe(true);

      // run clean-old-config
      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "clean-old-config"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).toBe(0);
      expect(existsSync(join(dir, "old", "profile.toml"))).toBe(false);
    });
  });

  test("reports nothing to clean when no profile.toml exists", async () => {
    await withTempProfiles(async (dir) => {
      // create profile via TS CLI (writes to agp.yaml only)
      Bun.spawnSync(
        ["bun", "run", "src/main.ts", "create", "fresh", "--desc", "No toml"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );

      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "clean-old-config"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).toBe(0);
      expect(result.stderr.toString()).toContain("Nothing to clean");
    });
  });
});
