/**
 * Generates Patwadi brand icons (1024 app icon, adaptive foreground, splash, favicon).
 * Run: node scripts/generate-brand-assets.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "assets");
const BRAND = "#FF3A22";

async function iconPng(size) {
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${BRAND}" rx="${Math.round(size * 0.18)}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}" fill="#FFFFFF">P</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function splashPng(width, height) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#FFFFFF"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="72" fill="${BRAND}">Patwadi</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Play Store feature graphic — 1024×500, wordmark left, tagline right. */
async function featureGraphicPng() {
  const width = 1024;
  const height = 500;
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${BRAND}"/>
    <text x="72" y="50%" dominant-baseline="middle" text-anchor="start"
      font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="96" fill="#FFFFFF">Patwadi</text>
    <text x="${width - 72}" y="50%" dominant-baseline="middle" text-anchor="end"
      font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="40" fill="#FFFFFF">Every parcel. Verified.</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

await mkdir(assetsDir, { recursive: true });

const icon = await iconPng(1024);
await writeFile(join(assetsDir, "icon.png"), icon);
await writeFile(join(assetsDir, "adaptive-icon.png"), await iconPng(1024));
await writeFile(join(assetsDir, "favicon.png"), await iconPng(48));
await writeFile(join(assetsDir, "splash-icon.png"), await splashPng(1284, 2778));
await writeFile(join(assetsDir, "feature-graphic.png"), await featureGraphicPng());

console.log("Generated assets in", assetsDir);
