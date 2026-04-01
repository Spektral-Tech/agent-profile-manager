import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeToml, readToml } from "../../src/lib/toml";

describe("toml", () => {
  test("write and read round-trip", async () => {
    const dir = await mkdtemp(join(tmpdir(), "toml-test-"));
    try {
      const data = {
        name: "test-profile",
        description: "A test",
        created: "2026-01-01T00:00:00Z",
      };
      await writeToml(dir, data);

      const result = await readToml(join(dir, "profile.toml"));
      expect(result.name).toBe("test-profile");
      expect(result.description).toBe("A test");
      expect(result.created).toBe("2026-01-01T00:00:00Z");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("readToml returns empty object for missing file", async () => {
    const result = await readToml("/nonexistent/path/profile.toml");
    expect(result).toEqual({});
  });

  test("handles empty description", async () => {
    const dir = await mkdtemp(join(tmpdir(), "toml-test-"));
    try {
      await writeToml(dir, { name: "test", description: "", created: "2026-01-01T00:00:00Z" });
      const result = await readToml(join(dir, "profile.toml"));
      expect(result.name).toBe("test");
      expect(result.description).toBe("");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
