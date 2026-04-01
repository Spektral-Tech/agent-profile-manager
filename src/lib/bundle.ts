import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BUNDLES_DIR } from "./config";
import { ensureDir } from "./fs";
import type { Profile } from "../models/profile";
import type { ToolDef } from "../models/tools";
import { warn } from "../ui/output";

// ─── Paths ────────────────────────────────────────────────────────────────────

export function bundlePath(profileName: string, appName: string): string {
  return join(BUNDLES_DIR, profileName, `${appName}.app`);
}

export function bundleExists(profileName: string, appName: string): boolean {
  return existsSync(bundlePath(profileName, appName));
}

// ─── Shell helpers ────────────────────────────────────────────────────────────

async function run(
  cmd: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn([cmd, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { code, stdout, stderr };
}

// ─── Icon tinting ─────────────────────────────────────────────────────────────

const TINT_SCRIPT = `
import AppKit

let args = CommandLine.arguments
guard args.count == 4 else {
    fputs("usage: tint <src.png> <dst.png> <#hex>\\n", stderr)
    exit(1)
}

var hex = args[3]
if hex.hasPrefix("#") { hex = String(hex.dropFirst()) }

guard hex.count == 6,
      let rv = UInt8(hex.prefix(2), radix: 16),
      let gv = UInt8(hex.dropFirst(2).prefix(2), radix: 16),
      let bv = UInt8(hex.dropFirst(4).prefix(2), radix: 16) else {
    fputs("invalid color: \\(args[3])\\n", stderr)
    exit(1)
}

let r = CGFloat(rv) / 255.0
let g = CGFloat(gv) / 255.0
let b = CGFloat(bv) / 255.0

guard let srcImage = NSImage(contentsOfFile: args[1]) else {
    fputs("cannot load: \\(args[1])\\n", stderr)
    exit(1)
}

let size = srcImage.size
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width),
    pixelsHigh: Int(size.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
)!
let ctx = NSGraphicsContext(bitmapImageRep: rep)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = ctx

srcImage.draw(in: NSRect(origin: .zero, size: size),
              from: .zero,
              operation: .copy,
              fraction: 1.0)

// sourceAtop: tint color clipped to original icon's alpha, preserving shape
ctx.cgContext.setBlendMode(.sourceAtop)
NSColor(red: r, green: g, blue: b, alpha: 0.65).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()

NSGraphicsContext.restoreGraphicsState()

guard let pngData = rep.representation(using: .png, properties: [:]) else {
    fputs("cannot encode PNG\\n", stderr)
    exit(1)
}

do {
    try pngData.write(to: URL(fileURLWithPath: args[2]))
} catch {
    fputs("cannot write \\(args[2]): \\(error)\\n", stderr)
    exit(1)
}
`;

async function runSwiftScript(scriptArgs: string[]): Promise<{ code: number; stderr: string }> {
  const tmpFile = join(tmpdir(), `agp-tint-${Date.now()}.swift`);
  await Bun.write(tmpFile, TINT_SCRIPT);
  try {
    const { code, stderr } = await run("swift", [tmpFile, ...scriptArgs]);
    return { code, stderr };
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

async function tintIconFile(icnsPath: string, hexColor: string): Promise<void> {
  const tmpDir = await mkdtemp(join(tmpdir(), "agp-iconset-"));
  const iconsetPath = join(tmpDir, "icon.iconset");

  try {
    const unpack = await run("iconutil", ["-c", "iconset", "-o", iconsetPath, icnsPath]);
    if (unpack.code !== 0) throw new Error(`iconutil unpack: ${unpack.stderr.trim()}`);

    const pngs = (await readdir(iconsetPath)).filter((f) => f.endsWith(".png"));
    for (const png of pngs) {
      const pngPath = join(iconsetPath, png);
      const { code, stderr } = await runSwiftScript([pngPath, pngPath, hexColor]);
      if (code !== 0) warn(`tint ${png}: ${stderr.trim()}`);
    }

    const repack = await run("iconutil", ["-c", "icns", "-o", icnsPath, iconsetPath]);
    if (repack.code !== 0) throw new Error(`iconutil repack: ${repack.stderr.trim()}`);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ─── Plist helpers ────────────────────────────────────────────────────────────

async function plistGet(plistPath: string, key: string): Promise<string> {
  const { code, stdout } = await run("plutil", [
    "-extract", key, "raw", "-o", "-", plistPath,
  ]);
  if (code !== 0) return "";
  return stdout.trim();
}

async function plistSet(plistPath: string, key: string, value: string): Promise<void> {
  const { code, stderr } = await run("plutil", [
    "-replace", key, "-string", value, plistPath,
  ]);
  if (code !== 0) throw new Error(`plutil -replace ${key}: ${stderr.trim()}`);
}

// ─── Public: generate bundle ──────────────────────────────────────────────────

export interface BundleOptions {
  force?: boolean;
}

export async function generateBundle(
  profile: Profile,
  def: ToolDef,
  srcAppPath: string,
  opts: BundleOptions = {},
): Promise<string> {
  const appName = def.appName!;
  const dest = bundlePath(profile.name, appName);
  const destDir = join(BUNDLES_DIR, profile.name);

  if (existsSync(dest)) {
    if (!opts.force) throw new Error(`Bundle already exists: ${dest}\nUse --force to overwrite.`);
    await rm(dest, { recursive: true, force: true });
  }

  await ensureDir(destDir);

  // 1. Copy
  const copy = await run("ditto", [srcAppPath, dest]);
  if (copy.code !== 0) throw new Error(`ditto: ${copy.stderr.trim()}`);

  const plist = join(dest, "Contents", "Info.plist");

  // 2. Patch bundle identity
  const bundleId = `com.agp.${profile.name}.${def.name}`;
  const displayName =
    profile.branding?.display_name ?? `${appName} · ${profile.name}`;

  await plistSet(plist, "CFBundleIdentifier", bundleId);
  await plistSet(plist, "CFBundleDisplayName", displayName);
  await plistSet(plist, "CFBundleName", displayName);

  // 3. Tint icon (if icon_color set and icon_mode is not "none")
  const { icon_color, icon_mode } = profile.branding ?? {};
  if (icon_color && icon_mode !== "none") {
    const iconFile = await plistGet(plist, "CFBundleIconFile");
    if (iconFile) {
      const icnsName = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
      const icnsPath = join(dest, "Contents", "Resources", icnsName);
      if (existsSync(icnsPath)) {
        await tintIconFile(icnsPath, icon_color);
      } else {
        warn(`Icon file not found: ${icnsPath} — skipping tint`);
      }
    }
  }

  // 4. Ad-hoc re-sign (modifications broke the original signature)
  const sign = await run("codesign", ["--deep", "--force", "--sign", "-", dest]);
  if (sign.code !== 0) warn(`codesign: ${sign.stderr.trim()}`);

  // 5. Remove quarantine xattr (we created this locally, not downloaded)
  await run("xattr", ["-dr", "com.apple.quarantine", dest]);

  return dest;
}
