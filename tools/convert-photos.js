#!/usr/bin/env node
// Готовит кадры для сайта: <base>-640 и <base>-1280 в jpg и webp.
// Длинная сторона = 640 / 1280, пропорции сохраняются — так же, как у уже
// лежащих в assets/locations файлов.
//
//   node tools/convert-photos.js "<исходник>" <base> [<исходник> <base> ...]
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const sharp = require("sharp");

const OUT_DIR = path.join(__dirname, "..", "assets", "locations");

// sharp собран без HEVC-декодера, поэтому HEIC с айфона сначала разворачиваем
// системным sips (он есть на любой macOS), и уже JPEG отдаём в sharp.
function toDecodable(source) {
  if (!/\.(heic|heif)$/i.test(source)) return { file: source, temp: null };
  const temp = path.join(os.tmpdir(), `mr-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "best", source, "--out", temp], {
    stdio: "ignore",
  });
  return { file: temp, temp };
}

async function convert(sourcePath, base) {
  if (!fs.existsSync(sourcePath)) throw new Error(`нет файла: ${sourcePath}`);
  const decoded = toDecodable(sourcePath);
  const source = decoded.file;
  const made = [];
  for (const long of [640, 1280]) {
    const pipeline = sharp(source, { failOn: "none" })
      .rotate()                       // учитываем EXIF-поворот
      .resize({ width: long, height: long, fit: "inside", withoutEnlargement: true });
    const jpg = path.join(OUT_DIR, `${base}-${long}.jpg`);
    const webp = path.join(OUT_DIR, `${base}-${long}.webp`);
    await pipeline.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(jpg);
    await pipeline.clone().webp({ quality: 80 }).toFile(webp);
    const meta = await sharp(jpg).metadata();
    made.push({ file: path.basename(jpg), w: meta.width, h: meta.height, kb: Math.round(fs.statSync(jpg).size / 1024) });
    made.push({ file: path.basename(webp), kb: Math.round(fs.statSync(webp).size / 1024) });
  }
  if (decoded.temp) fs.rmSync(decoded.temp, { force: true });
  const big = made.find((m) => m.file.endsWith("-1280.jpg"));
  console.log(`${base}: ${big.w}×${big.h}, jpg ${big.kb} КБ`);
  return { base, width: big.w, height: big.h };
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length % 2) {
    console.error('использование: node tools/convert-photos.js "<исходник>" <base> [...]');
    process.exit(1);
  }
  const done = [];
  for (let i = 0; i < args.length; i += 2) done.push(await convert(args[i], args[i + 1]));
  console.log(JSON.stringify(done));
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
