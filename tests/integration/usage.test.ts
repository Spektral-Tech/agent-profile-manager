import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { withTempProfiles } from "../helpers/fixtures";

describe("agp usage", () => {
  test("shows message when no profiles exist", async () => {
    await withTempProfiles(async (dir) => {
      const result = Bun.spawnSync(["bun", "run", "src/main.ts", "usage"], {
        env: { ...process.env, AGP_PROFILES_DIR: dir },
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr.toString()).toContain("No profiles found");
    });
  });

  test("shows usage summary with sessions", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "usage-test"], {
        env,
      });

      // Create mock session files
      const sessionDir = join(
        dir,
        "usage-test",
        "claude",
        "claude-code-sessions",
      );
      await mkdir(sessionDir, { recursive: true });
      await writeFile(
        join(sessionDir, "session1.json"),
        JSON.stringify({ completedTurns: 5, title: "Test Session 1" }),
        "utf8",
      );
      await writeFile(
        join(sessionDir, "session2.json"),
        JSON.stringify({ completedTurns: 3, title: "Test Session 2" }),
        "utf8",
      );

      const result = Bun.spawnSync(["bun", "run", "src/main.ts", "usage"], {
        env,
      });
      expect(result.exitCode).toBe(0);
      const output = result.stderr.toString();
      expect(output).toContain("usage-test");
      expect(output).toContain("2"); // 2 sessions
    });
  });

  test("shows detail for specific profile", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "detail-test"], {
        env,
      });

      const sessionDir = join(
        dir,
        "detail-test",
        "claude",
        "claude-code-sessions",
      );
      await mkdir(sessionDir, { recursive: true });
      await writeFile(
        join(sessionDir, "s1.json"),
        JSON.stringify({ completedTurns: 10, title: "My Session" }),
        "utf8",
      );

      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "usage", "detail-test"],
        { env },
      );
      expect(result.exitCode).toBe(0);
      const output = result.stderr.toString();
      expect(output).toContain("detail-test");
      expect(output).toContain("10");
      expect(output).toContain("My Session");
    });
  });
});
