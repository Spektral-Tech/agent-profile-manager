import { join } from "node:path";

export async function writeToml(
  dir: string,
  data: Record<string, string>,
): Promise<void> {
  const lines = Object.entries(data).map(
    ([key, value]) => `${key} = "${value}"`,
  );
  await Bun.write(join(dir, "profile.toml"), lines.join("\n") + "\n");
}

export async function readToml(
  path: string,
): Promise<Record<string, string>> {
  const file = Bun.file(path);
  if (!(await file.exists())) return {};
  const text = await file.text();
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^(\w+)\s*=\s*"(.*)"$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}
