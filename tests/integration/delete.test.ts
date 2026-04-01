import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { withTempProfiles } from "../helpers/fixtures";

describe("agp delete", () => {
  test("deletes profile with force flag", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "to-delete"], { env });
      expect(existsSync(join(dir, "to-delete"))).toBe(true);

      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "delete", "to-delete", "-f"],
        { env },
      );
      expect(result.exitCode).toBe(0);
      expect(existsSync(join(dir, "to-delete"))).toBe(false);
    });
  });

  test("errors on non-existent profile", async () => {
    await withTempProfiles(async (dir) => {
      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "delete", "nonexistent", "-f"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("not found");
    });
  });
});
