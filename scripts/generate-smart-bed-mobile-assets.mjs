import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "smartfurni-favicon-v4.png");
const iosSplashDir = path.join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");
const androidResDir = path.join(root, "android", "app", "src", "main", "res");

function background(width, height) {
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0B1320"/><stop offset="0.56" stop-color="#17191C"/><stop offset="1" stop-color="#211708"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`);
}

async function renderSplash(output, width, height) {
  const logoSize = Math.round(Math.min(width, height) * 0.28);
  const logo = await sharp(source).resize(logoSize, logoSize, { fit: "contain" }).png().toBuffer();
  await sharp(background(width, height))
    .composite([{ input: logo, left: Math.round((width - logoSize) / 2), top: Math.round((height - logoSize) / 2) }])
    .png()
    .toFile(output);
}

for (const filename of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await renderSplash(path.join(iosSplashDir, filename), 2732, 2732);
}

for (const directory of await readdir(androidResDir, { withFileTypes: true })) {
  if (!directory.isDirectory() || (!directory.name.startsWith("drawable-port") && !directory.name.startsWith("drawable-land") && directory.name !== "drawable")) continue;
  const output = path.join(androidResDir, directory.name, "splash.png");
  const image = sharp(output);
  const metadata = await image.metadata();
  if (metadata.width && metadata.height) await renderSplash(output, metadata.width, metadata.height);
}

console.log("Generated SmartFurni Bed splash assets for iOS and Android.");
