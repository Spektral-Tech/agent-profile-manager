import { AgpError } from "../ui/output";

export async function cmdWhoami(args: string[]): Promise<void> {
  if (args[0] === "--help" || args[0] === "-h") {
    (await import("./help")).usageWhoami();
    process.exit(0);
  }

  const profile = process.env.AGP_ACTIVE_PROFILE;
  if (!profile) {
    throw new AgpError(
      "Not inside an agp profile. Use 'agp shell <name>' or 'eval \"$(agp env <name>)\"'.",
    );
  }
  console.log(profile);
}
