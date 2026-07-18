import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "qr");
const logoPath = path.join(root, "public", "smartfurni-favicon-v4.png");
const targetUrl = "https://www.smartfurni.com.vn/go/bed-app";
const dark = "#111722";
const light = "#fffdf7";

await mkdir(outputDir, { recursive: true });
const logo = await readFile(logoPath);

const pngQr = await QRCode.toBuffer(targetUrl, {
  type: "png",
  errorCorrectionLevel: "H",
  margin: 4,
  width: 1600,
  color: { dark, light },
});
const logoSize = 184;
const plateSize = 226;
const plate = Buffer.from(`<svg width="${plateSize}" height="${plateSize}" xmlns="http://www.w3.org/2000/svg"><rect width="${plateSize}" height="${plateSize}" rx="34" fill="${light}"/></svg>`);
const resizedLogo = await sharp(logo).resize(logoSize, logoSize, { fit: "contain" }).png().toBuffer();
await sharp(pngQr)
  .composite([
    { input: plate, gravity: "center" },
    { input: resizedLogo, gravity: "center" },
  ])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(path.join(outputDir, "smartfurni-bed-app.png"));

const baseSvg = await QRCode.toString(targetUrl, {
  type: "svg",
  errorCorrectionLevel: "H",
  margin: 4,
  color: { dark, light },
});
const viewBoxMatch = baseSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
const size = Number(viewBoxMatch?.[1] || 45);
const svgPlateSize = size * 0.145;
const svgLogoSize = size * 0.112;
const svgOverlay = `<rect x="${(size - svgPlateSize) / 2}" y="${(size - svgPlateSize) / 2}" width="${svgPlateSize}" height="${svgPlateSize}" rx="${size * 0.018}" fill="${light}"/><image href="data:image/png;base64,${logo.toString("base64")}" x="${(size - svgLogoSize) / 2}" y="${(size - svgLogoSize) / 2}" width="${svgLogoSize}" height="${svgLogoSize}" preserveAspectRatio="xMidYMid meet"/>`;
const brandedSvg = baseSvg.replace("</svg>", `${svgOverlay}</svg>`);
await writeFile(path.join(outputDir, "smartfurni-bed-app.svg"), brandedSvg, "utf8");

console.log(`Generated SmartFurni QR assets for ${targetUrl}`);
