import type { Profile } from "../models/profile";

export interface AgpConfig {
  version: string;
  profiles: Profile[];
}

export function parseYaml(text: string): AgpConfig {
  const config: AgpConfig = { version: "1", profiles: [] };
  let current: Partial<Profile> | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();

    let m: RegExpMatchArray | null;

    if ((m = line.match(/^version:\s*["']?(.+?)["']?\s*$/))) {
      config.version = m[1];
      continue;
    }

    if (/^profiles:\s*$/.test(line)) {
      continue;
    }

    if ((m = line.match(/^  - name:\s+(.+)$/))) {
      if (current) config.profiles.push(current as Profile);
      current = { name: m[1].trim(), description: "", created: "" };
      continue;
    }

    if (current) {
      if ((m = line.match(/^    description:\s*(.*)$/))) {
        let val = m[1].trim();
        // strip surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        current.description = val;
        continue;
      }

      if ((m = line.match(/^    created:\s*["']?(.+?)["']?\s*$/))) {
        current.created = m[1].trim();
        continue;
      }
    }
    // unknown lines silently skipped
  }

  if (current) config.profiles.push(current as Profile);
  return config;
}

function needsQuoting(s: string): boolean {
  return s !== s.trim() || /[:#"'\[\]{}&*!|>%@`]/.test(s);
}

export function serializeYaml(config: AgpConfig): string {
  const lines: string[] = [`version: "${config.version}"`, "profiles:"];

  for (const p of config.profiles) {
    lines.push(`  - name: ${p.name}`);
    const desc = needsQuoting(p.description) ? `"${p.description.replace(/"/g, '\\"')}"` : p.description;
    lines.push(`    description: ${desc}`);
    lines.push(`    created: "${p.created}"`);
  }

  return lines.join("\n") + "\n";
}
