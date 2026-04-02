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

    const versionMatch = line.match(/^version:\s*["']?(.+?)["']?\s*$/);
    if (versionMatch) {
      config.version = versionMatch[1];
      continue;
    }

    if (/^profiles:\s*$/.test(line)) {
      continue;
    }

    const nameMatch = line.match(/^ {2}- name:\s+(.+)$/);
    if (nameMatch) {
      if (current) config.profiles.push(current as Profile);
      current = { name: nameMatch[1].trim(), description: "", created: "" };
      continue;
    }

    if (current) {
      const descriptionMatch = line.match(/^ {4}description:\s*(.*)$/);
      if (descriptionMatch) {
        let val = descriptionMatch[1].trim();
        // strip surrounding quotes if present
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        current.description = val;
        continue;
      }

      const createdMatch = line.match(/^ {4}created:\s*["']?(.+?)["']?\s*$/);
      if (createdMatch) {
        current.created = createdMatch[1].trim();
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
    const desc = needsQuoting(p.description)
      ? `"${p.description.replace(/"/g, '\\"')}"`
      : p.description;
    lines.push(`    description: ${desc}`);
    lines.push(`    created: "${p.created}"`);
  }

  return `${lines.join("\n")}\n`;
}
