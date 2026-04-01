import { describe, expect, test } from "bun:test";
import { AgpError } from "../../src/ui/output";

// We need to test validateName, but it imports PROFILES_DIR at module level
// which reads process.env. So we import after potentially setting env.
const { validateName } = await import("../../src/models/profile");

describe("validateName", () => {
  test("accepts valid names", () => {
    expect(() => validateName("personal")).not.toThrow();
    expect(() => validateName("work-profile")).not.toThrow();
    expect(() => validateName("test_123")).not.toThrow();
    expect(() => validateName("A")).not.toThrow();
  });

  test("rejects names with invalid characters", () => {
    expect(() => validateName("my profile")).toThrow(AgpError);
    expect(() => validateName("test.profile")).toThrow(AgpError);
    expect(() => validateName("test/profile")).toThrow(AgpError);
    expect(() => validateName("")).toThrow(AgpError);
  });

  test("rejects reserved names", () => {
    expect(() => validateName("list")).toThrow(AgpError);
    expect(() => validateName("create")).toThrow(AgpError);
    expect(() => validateName("delete")).toThrow(AgpError);
    expect(() => validateName("open")).toThrow(AgpError);
    expect(() => validateName("shell")).toThrow(AgpError);
    expect(() => validateName("env")).toThrow(AgpError);
    expect(() => validateName("usage")).toThrow(AgpError);
    expect(() => validateName("install")).toThrow(AgpError);
    expect(() => validateName("help")).toThrow(AgpError);
  });

  test("error message includes the invalid name", () => {
    try {
      validateName("bad name");
    } catch (e) {
      expect((e as AgpError).message).toContain("bad name");
    }
  });
});
