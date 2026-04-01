import { describe, expect, test } from "bun:test";
import { withTempProfiles } from "../helpers/fixtures";

describe("agp list", () => {
  test("shows message when no profiles exist", async () => {
    await withTempProfiles(async (dir) => {
      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "list"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).toBe(0);
      expect(result.stderr.toString()).toContain("No profiles found");
    });
  });

  test("lists created profiles", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "alpha", "--desc", "First"], { env });
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "beta"], { env });

      const result = Bun.spawnSync(["bun", "run", "src/main.ts", "list"], { env });
      expect(result.exitCode).toBe(0);
      const output = result.stderr.toString();
      expect(output).toContain("alpha");
      expect(output).toContain("beta");
      expect(output).toContain("First");
    });
  });
});
