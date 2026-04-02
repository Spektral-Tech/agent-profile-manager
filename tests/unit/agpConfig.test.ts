import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "agp-cfg-test-"));
  const original = process.env.AGP_PROFILES_DIR;
  try {
    process.env.AGP_PROFILES_DIR = dir;
    const { resetConfig } = await import("../../src/lib/agpConfig");
    resetConfig();
    await fn(dir);
  } finally {
    process.env.AGP_PROFILES_DIR = original;
    const { resetConfig } = await import("../../src/lib/agpConfig");
    resetConfig();
    await rm(dir, { recursive: true, force: true });
  }
}

describe("agpConfig", () => {
  test("listProfiles on empty dir returns [] and creates agp.yaml", async () => {
    await withTempDir(async (dir) => {
      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(0);
      expect(existsSync(join(dir, "agp.yaml"))).toBe(true);
    });
  });

  test("addProfile then listProfiles returns the profile", async () => {
    await withTempDir(async (_dir) => {
      const { addProfile, listProfiles } = await import(
        "../../src/lib/agpConfig"
      );
      await addProfile({
        name: "test",
        description: "Test profile",
        created: "2026-01-01T00:00:00Z",
      });
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe("test");
      expect(profiles[0].description).toBe("Test profile");
    });
  });

  test("configProfileExists returns false for missing, true after add", async () => {
    await withTempDir(async (_dir) => {
      const { configProfileExists, addProfile } = await import(
        "../../src/lib/agpConfig"
      );
      expect(await configProfileExists("ghost")).toBe(false);
      await addProfile({
        name: "ghost",
        description: "",
        created: "2026-01-01T00:00:00Z",
      });
      expect(await configProfileExists("ghost")).toBe(true);
    });
  });

  test("removeProfile removes from list and persists", async () => {
    await withTempDir(async (dir) => {
      const { addProfile, removeProfile, listProfiles } = await import(
        "../../src/lib/agpConfig"
      );
      await addProfile({
        name: "alpha",
        description: "",
        created: "2026-01-01T00:00:00Z",
      });
      await addProfile({
        name: "beta",
        description: "",
        created: "2026-01-01T00:00:00Z",
      });
      await removeProfile("alpha");

      const profiles = await listProfiles();
      expect(profiles.map((p) => p.name)).not.toContain("alpha");
      expect(profiles.map((p) => p.name)).toContain("beta");

      // verify persisted on disk
      const yaml = await readFile(join(dir, "agp.yaml"), "utf8");
      expect(yaml).not.toContain("alpha");
      expect(yaml).toContain("beta");
    });
  });

  test("migrates legacy profile.toml on first load", async () => {
    await withTempDir(async (dir) => {
      // simulate a legacy profile created by the bash agp script
      await mkdir(join(dir, "legacy"), { recursive: true });
      await writeFile(
        join(dir, "legacy", "profile.toml"),
        `name = "legacy"\ndescription = "Old profile"\ncreated = "2025-06-01T00:00:00Z"\n`,
      );

      const { listProfiles } = await import("../../src/lib/agpConfig");
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe("legacy");
      expect(profiles[0].description).toBe("Old profile");

      // agp.yaml should have been created
      expect(existsSync(join(dir, "agp.yaml"))).toBe(true);
      expect(existsSync(join(dir, "legacy", "profile.toml"))).toBe(false);
    });
  });

  test("getProfile returns undefined for unknown profile", async () => {
    await withTempDir(async (_dir) => {
      const { getProfile } = await import("../../src/lib/agpConfig");
      expect(await getProfile("nobody")).toBeUndefined();
    });
  });
});
