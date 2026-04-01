import { describe, expect, test } from "bun:test";

const { profileEnvVars, profilePath } = await import("../../src/models/profile");

describe("profilePath", () => {
  test("constructs path under PROFILES_DIR", () => {
    const p = profilePath("test");
    expect(p).toContain("test");
    expect(p).toContain(".agent-profiles");
  });
});

describe("profileEnvVars", () => {
  test("returns all 6 env vars", () => {
    const vars = profileEnvVars("myprofile");
    expect(Object.keys(vars)).toHaveLength(6);
    expect(vars.CLAUDE_CONFIG_DIR).toContain("myprofile");
    expect(vars.CLAUDE_CONFIG_DIR).toEndWith("/claude");
    expect(vars.CODEX_HOME).toEndWith("/codex");
    expect(vars.GEMINI_CLI_HOME).toEndWith("/gemini");
    expect(vars.AGP_ACTIVE_PROFILE).toBe("myprofile");
    expect(vars.AGP_PROFILE_DIR).toContain("myprofile");
    expect(vars.AGENTIC_PROFILE).toBe("myprofile");
  });
});
