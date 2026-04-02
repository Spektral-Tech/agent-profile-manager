import { describe, expect, test } from "bun:test";
import { parseYaml, serializeYaml } from "../../src/lib/yaml";
import type { AgpConfig } from "../../src/lib/yaml";

const sample: AgpConfig = {
  version: "1",
  profiles: [
    {
      name: "work",
      description: "Work account",
      created: "2026-01-01T00:00:00Z",
    },
    {
      name: "personal",
      description: "Personal workspace",
      created: "2026-01-02T00:00:00Z",
    },
  ],
};

describe("serializeYaml / parseYaml", () => {
  test("round-trip preserves all fields", () => {
    const result = parseYaml(serializeYaml(sample));
    expect(result.version).toBe("1");
    expect(result.profiles).toHaveLength(2);
    expect(result.profiles[0]).toEqual(sample.profiles[0]);
    expect(result.profiles[1]).toEqual(sample.profiles[1]);
  });

  test("empty profiles list serializes and parses correctly", () => {
    const cfg: AgpConfig = { version: "1", profiles: [] };
    const result = parseYaml(serializeYaml(cfg));
    expect(result.profiles).toHaveLength(0);
  });

  test("profile with empty description", () => {
    const cfg: AgpConfig = {
      version: "1",
      profiles: [
        { name: "test", description: "", created: "2026-01-01T00:00:00Z" },
      ],
    };
    const result = parseYaml(serializeYaml(cfg));
    expect(result.profiles[0].description).toBe("");
  });

  test("multiple profiles parse in order", () => {
    const result = parseYaml(serializeYaml(sample));
    expect(result.profiles[0].name).toBe("work");
    expect(result.profiles[1].name).toBe("personal");
  });

  test("description with colon is quoted in output", () => {
    const cfg: AgpConfig = {
      version: "1",
      profiles: [
        {
          name: "test",
          description: "key: value",
          created: "2026-01-01T00:00:00Z",
        },
      ],
    };
    const yaml = serializeYaml(cfg);
    expect(yaml).toContain('description: "key: value"');
    // and parses back correctly
    const result = parseYaml(yaml);
    expect(result.profiles[0].description).toBe("key: value");
  });

  test("quoted descriptions unescape embedded quotes when parsed", () => {
    const cfg: AgpConfig = {
      version: "1",
      profiles: [
        {
          name: "quoted",
          description: 'He said "hello"',
          created: "2026-01-01T00:00:00Z",
        },
      ],
    };

    const yaml = serializeYaml(cfg);
    expect(yaml).toContain('description: "He said \\"hello\\""');

    const result = parseYaml(yaml);
    expect(result.profiles[0].description).toBe('He said "hello"');
  });

  test("version field is preserved", () => {
    const result = parseYaml(serializeYaml({ version: "2", profiles: [] }));
    expect(result.version).toBe("2");
  });

  test("unknown lines are silently skipped", () => {
    const text = `version: "1"\nfuture_field: somevalue\nprofiles:\n  - name: foo\n    description: bar\n    created: "2026-01-01T00:00:00Z"\n    unknown_key: ignored\n`;
    const result = parseYaml(text);
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].name).toBe("foo");
  });
});
