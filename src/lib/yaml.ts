import type { Profile, ProfileBranding } from "../models/profile";

export interface AgpConfig {
  version: string;
  profiles: Profile[];
}

export function parseYaml(text: string): AgpConfig {
  const config: AgpConfig = { version: "1", profiles: [] };
  let current: Partial<Profile> | null = null;
  let inBranding = false;

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
      inBranding = false;
      continue;
    }

    if (current) {
      // Branding block start
      if (/^    branding:\s*$/.test(line)) {
        inBranding = true;
        current.branding = {};
        continue;
      }

      // If we're inside the branding block (6-space indent)
      if (inBranding && (m = line.match(/^      (\w+):\s*(.*)$/))) {
        const key = m[1];
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        (current.branding as Record<string, string>)[key] = val;
        continue;
      }

      // Any 4-space-indented field ends the branding block
      if (/^    \w/.test(line)) {
        inBranding = false;
      }

      if ((m = line.match(/^    description:\s*(.*)$/))) {
        let val = m[1].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
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

function quoteValue(s: string): string {
  return needsQuoting(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

export function serializeYaml(config: AgpConfig): string {
  const lines: string[] = [`version: "${config.version}"`, "profiles:"];

  for (const p of config.profiles) {
    lines.push(`  - name: ${p.name}`);
    lines.push(`    description: ${quoteValue(p.description)}`);
    lines.push(`    created: "${p.created}"`);

    if (p.branding && Object.keys(p.branding).length > 0) {
      lines.push("    branding:");
      const b = p.branding as Record<string, string | undefined>;
      for (const key of ["icon_color", "display_name", "icon_mode", "icon_source"] as const) {
        if (b[key] !== undefined) {
          lines.push(`      ${key}: ${quoteValue(b[key] as string)}`);
        }
      }
    }
  }

  return lines.join("\n") + "\n";
}
