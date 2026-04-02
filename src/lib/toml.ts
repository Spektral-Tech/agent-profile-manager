import { constants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function writeToml(
  dir: string,
  data: Record<string, string>,
): Promise<void> {
  const lines = Object.entries(data).map(
    ([key, value]) => `${key} = "${value}"`,
  );
  await writeFile(join(dir, "profile.toml"), `${lines.join("\n")}\n`, "utf8");
}

export async function readToml(path: string): Promise<Record<string, string>> {
  try {
    await access(path, constants.F_OK);
  } catch {
    return {};
  }
  const text = await readFile(path, "utf8");
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^(\w+)\s*=\s*"(.*)"$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}
