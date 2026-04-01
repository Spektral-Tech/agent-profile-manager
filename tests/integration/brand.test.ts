import { describe, expect, test } from "bun:test";
import { withTempProfiles } from "../helpers/fixtures";

describe("agp brand", () => {
  test("set and read back a branding key", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "work"], { env });

      const setResult = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "icon_color", "#0066CC"],
        { env },
      );
      expect(setResult.exitCode).toBe(0);
      expect(setResult.stderr.toString()).toContain("Set branding.icon_color");

      const getResult = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "icon_color"],
        { env },
      );
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout.toString().trim()).toBe("#0066CC");
    });
  });

  test("show all branding props", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "work"], { env });
      Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "icon_color", "#0066CC"],
        { env },
      );
      Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "display_name", "Claude · Work"],
        { env },
      );

      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work"],
        { env },
      );
      expect(result.exitCode).toBe(0);
      const out = result.stderr.toString();
      expect(out).toContain("icon_color");
      expect(out).toContain("#0066CC");
      expect(out).toContain("display_name");
    });
  });

  test("unset a branding key", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "work"], { env });
      Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "icon_color", "#0066CC"],
        { env },
      );

      const unsetResult = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "icon_color", "--unset"],
        { env },
      );
      expect(unsetResult.exitCode).toBe(0);
      expect(unsetResult.stderr.toString()).toContain("Unset branding.icon_color");

      const getResult = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "icon_color"],
        { env },
      );
      expect(getResult.exitCode).not.toBe(0);
    });
  });

  test("rejects unknown branding key", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "work"], { env });

      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "theme_color", "#FF0000"],
        { env },
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("Unknown branding key");
    });
  });

  test("branding is persisted in agp.yaml", async () => {
    await withTempProfiles(async (dir) => {
      const env = { ...process.env, AGP_PROFILES_DIR: dir };
      Bun.spawnSync(["bun", "run", "src/main.ts", "create", "work"], { env });
      Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "work", "icon_color", "#0066CC"],
        { env },
      );

      const yaml = await Bun.file(`${dir}/agp.yaml`).text();
      expect(yaml).toContain("branding:");
      expect(yaml).toContain("icon_color:");
      expect(yaml).toContain("#0066CC");
    });
  });

  test("fails on non-existent profile", async () => {
    await withTempProfiles(async (dir) => {
      const result = Bun.spawnSync(
        ["bun", "run", "src/main.ts", "brand", "ghost", "icon_color", "#FF0000"],
        { env: { ...process.env, AGP_PROFILES_DIR: dir } },
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("not found");
    });
  });
});
