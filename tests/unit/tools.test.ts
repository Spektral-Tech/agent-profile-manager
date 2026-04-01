import { describe, expect, test } from "bun:test";
import { TOOL_DEFS } from "../../src/models/tools";
import { VALID_TOOLS } from "../../src/lib/config";

describe("TOOL_DEFS", () => {
  test("has a definition for every valid tool", () => {
    for (const tool of VALID_TOOLS) {
      expect(TOOL_DEFS[tool]).toBeDefined();
      expect(TOOL_DEFS[tool].name).toBe(tool);
    }
  });

  test("CLI tools have binary and envVar", () => {
    const cliTools = Object.values(TOOL_DEFS).filter((t) => t.kind === "cli");
    for (const tool of cliTools) {
      expect(tool.binary).toBeTruthy();
      expect(tool.envVar).toBeTruthy();
    }
  });

  test("desktop tools have appName", () => {
    const desktopTools = Object.values(TOOL_DEFS).filter((t) => t.kind === "desktop");
    for (const tool of desktopTools) {
      expect(tool.appName).toBeTruthy();
    }
  });

  test("all tools have a subdir", () => {
    for (const tool of Object.values(TOOL_DEFS)) {
      expect(tool.subdir).toBeTruthy();
    }
  });
});
