import { describe, expect, test } from "bun:test";
import { withTempProfiles } from "../helpers/fixtures";

describe("agp env", () => {
  test("prints export statements to stdout", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "envtest"], {
        env,
      });

      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "env", "envtest"],
        { env },
      );
      expect(result.exitCode).toBe(0);

      const stdout = result.stdout.toString();
      expect(stdout).toContain("export CLAUDE_CONFIG_DIR=");
      expect(stdout).toContain("export CODEX_HOME=");
      expect(stdout).toContain("export GEMINI_CLI_HOME=");
      expect(stdout).toContain("export AGP_ACTIVE_PROFILE=");
      expect(stdout).toContain("export AGP_PROFILE_DIR=");
      expect(stdout).toContain("export AGENTIC_PROFILE=");
      expect(stdout).toContain("envtest");
    });
  });

  test("errors for non-existent profile", async () => {
    await withTempProfiles(async (dir) => {
      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "env", "nonexistent"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).not.toBe(0);
    });
  });
});
