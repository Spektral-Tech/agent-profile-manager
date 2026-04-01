import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { withTempProfiles } from "../helpers/fixtures";

describe("agp create", () => {
  test("creates profile with subdirectories", async () => {
    await withTempProfiles(async (dir) => {
      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "create", "test-profile", "--desc", "A test"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).toBe(0);
      expect(existsSync(join(dir, "test-profile", "profile.toml"))).toBe(true);
      expect(existsSync(join(dir, "test-profile", "claude"))).toBe(true);
      expect(existsSync(join(dir, "test-profile", "codex"))).toBe(true);
      expect(existsSync(join(dir, "test-profile", "gemini"))).toBe(true);
      expect(existsSync(join(dir, "test-profile", "antigravity"))).toBe(true);
    });
  });

  test("rejects duplicate profile", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "dupe"], { env });
      const result = Bun.spawnSync(["bun", "run", "src/main.ts", "create", "dupe"], { env });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("already exists");
    });
  });

  test("rejects invalid name", async () => {
    await withTempProfiles(async (dir) => {
      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "create", "bad name"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("Invalid profile name");
    });
  });

  test("rejects reserved name", async () => {
    await withTempProfiles(async (dir) => {
      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "create", "list"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("reserved");
    });
  });
});
