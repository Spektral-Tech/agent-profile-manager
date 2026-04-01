import { configPath } from "../lib/agpConfig";
import { info } from "../ui/output";

export async function cmdEdit(args: string[]): Promise<void> {
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      (await import("./help")).usageEdit();
      return;
    }
  }

  const profileName = args.find((a) => !a.startsWith("-"));
  const file = configPath();

  if (profileName) {
    info(`Editing agp.yaml — search for '- name: ${profileName}'`);
  }

  const editor =
    process.env.VISUAL ||
    process.env.EDITOR ||
    (await detectEditor());

  const proc = Bun.spawn([editor, file], { stdio: ["inherit", "inherit", "inherit"] });
  const code = await proc.exited;
  process.exit(code);
}

async function detectEditor(): Promise<string> {
  for (const candidate of ["code", "nano", "vi"]) {
    const which = Bun.spawn(["which", candidate], { stdio: ["pipe", "pipe", "pipe"] });
    await which.exited;
    if (which.exitCode === 0) return candidate;
  }
  return "vi";
}
