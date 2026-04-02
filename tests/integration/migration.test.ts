import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { withTempProfiles } from "../helpers/fixtures";

async function writeLegacyToml(
  dir: string,
  name: string,
  description: string,
  created: string,
): Promise<void> {
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
      const yaml = await readFile(join(dir, "agp.yaml"), "utf8");
      expect(yaml).toContain('version: "1"');
    });
  });

  test("single legacy profile.toml is auto-migrated", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(
        dir,
        "work",
        "Work account",
        "2025-06-01T00:00:00Z",
      );

      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();

      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe("work");
      expect(profiles[0].description).toBe("Work account");
      expect(profiles[0].created).toBe("2025-06-01T00:00:00Z");

      expect(existsSync(join(dir, "agp.yaml"))).toBe(true);
      const yaml = await readFile(join(dir, "agp.yaml"), "utf8");
      expect(yaml).toContain("work");
    });
  });

  test("profile.toml is removed after migration", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(
        dir,
        "work",
        "Work account",
        "2025-06-01T00:00:00Z",
      );

      const { listProfiles } = await import("../../src/lib/agpConfig");
      await listProfiles();

      expect(existsSync(join(dir, "work", "profile.toml"))).toBe(false);
    });
  });

  test("multiple legacy profile.toml files are all migrated and deleted", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(
        dir,
        "alpha",
        "Alpha profile",
        "2025-01-01T00:00:00Z",
      );
      await writeLegacyToml(
        dir,
        "beta",
        "Beta profile",
        "2025-02-01T00:00:00Z",
      );

      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();

      expect(profiles).toHaveLength(2);
      const names = profiles.map((p) => p.name);
      expect(names).toContain("alpha");
      expect(names).toContain("beta");

      expect(existsSync(join(dir, "alpha", "profile.toml"))).toBe(false);
      expect(existsSync(join(dir, "beta", "profile.toml"))).toBe(false);
    });
  });

  test("partial migration: existing agp.yaml + new profile.toml are merged", async () => {
    await withTempProfiles(async (dir) => {
      const { serializeYaml } = await import("../../src/lib/yaml");
      await writeFile(
        join(dir, "agp.yaml"),
        serializeYaml({
          version: "1",
          profiles: [
            {
              name: "existing",
              description: "Already migrated",
              created: "2025-01-01T00:00:00Z",
            },
          ],
        }),
        "utf8",
      );

      await writeLegacyToml(
        dir,
        "newone",
        "New legacy profile",
        "2025-03-01T00:00:00Z",
      );

      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();

      expect(profiles).toHaveLength(2);
      const names = profiles.map((p) => p.name);
      expect(names).toContain("existing");
      expect(names).toContain("newone");

      expect(existsSync(join(dir, "newone", "profile.toml"))).toBe(false);
    });
  });

  test("TOML name differing from dir name does not create duplicate entries", async () => {
    await withTempProfiles(async (dir) => {
      const { serializeYaml } = await import("../../src/lib/yaml");
      // agp.yaml already has "work" (migrated by its canonical name)
      await writeFile(
        join(dir, "agp.yaml"),
        serializeYaml({
          version: "1",
          profiles: [
            {
              name: "work",
              description: "Work",
              created: "2025-01-01T00:00:00Z",
            },
          ],
        }),
        "utf8",
      );
      // A directory named "work-legacy" contains a TOML whose name field is "work"
      await writeLegacyToml(dir, "work-legacy", "Work", "2025-01-01T00:00:00Z");
      // Override the name field inside the TOML to "work" (simulating a renamed dir)
      await writeFile(
        join(dir, "work-legacy", "profile.toml"),
        `name = "work"\ndescription = "Work"\ncreated = "2025-01-01T00:00:00Z"\n`,
        "utf8",
      );

      const { listProfiles, resetConfig } = await import(
        "../../src/lib/agpConfig"
      );
      await listProfiles();
      resetConfig();
      const profiles = await listProfiles();

      // "work" must appear exactly once
      expect(profiles.filter((p) => p.name === "work")).toHaveLength(1);
      expect(profiles).toHaveLength(1);
      expect(existsSync(join(dir, "work-legacy", "profile.toml"))).toBe(false);
    });
  });

  test("migration is idempotent: running list twice does not duplicate entries", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(
        dir,
        "solo",
        "Solo profile",
        "2025-01-01T00:00:00Z",
      );

      const { listProfiles, resetConfig } = await import(
        "../../src/lib/agpConfig"
      );
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

  test("legacy profile.toml does not survive once imported", async () => {
    await withTempProfiles(async (dir) => {
      await writeLegacyToml(
        dir,
        "stale",
        "Stale profile",
        "2025-01-01T00:00:00Z",
      );

      const { listProfiles } = await import("../../src/lib/agpConfig");
      await listProfiles();
      expect(existsSync(join(dir, "stale", "profile.toml"))).toBe(false);
    });
  });
});
