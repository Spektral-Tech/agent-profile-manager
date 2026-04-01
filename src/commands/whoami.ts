import { AgpError } from "../ui/output";

export async function cmdWhoami(_args: string[]): Promise<void> {
  const profile = process.env.AGP_ACTIVE_PROFILE;
  if (!profile) {
    throw new AgpError(
      "Not inside an agp profile. Use 'agp shell <name>' or 'eval \"$(agp env <name>)\"'.",
    );
  }
  console.log(profile);
}
