#!/usr/bin/env node
// Готовит кадры для сайта: <base>-640, <base>-960 и <base>-1280.
// Длинная сторона = 640 / 960 / 1280, пропорции сохраняются — так же, как у уже
// лежащих в assets/locations файлов.
//
// Размер 960 добавлен ради ленты каталога: слот под фото там 358 CSS-px, то есть
// 716 device-px при DPR 2, и из пары «480w, 960w» браузер всегда брал 960w —
// файл -1280. У вертикального кадра -960 ширина 720, ровно под DPR 2, и весит он
// вдвое меньше. AVIF снимает ещё около трети сверху.
//
// jpg остаётся только в 640 и 1280: это запасной формат для браузеров без webp,
// им хватает двух ступеней. Ленту и лайтбокс обслуживают webp и avif.
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
  for (const long of [640, 960, 1280]) {
    const pipeline = sharp(source, { failOn: "none" })
      .rotate()                       // учитываем EXIF-поворот
      .resize({ width: long, height: long, fit: "inside", withoutEnlargement: true });
    const webp = path.join(OUT_DIR, `${base}-${long}.webp`);
    // Качество webp для -960 ниже: этот файл видят все телефоны, и на
    // throttled-канале лишние 20 КБ дороже разницы, которую не видно.
    await pipeline.clone().webp({ quality: long === 960 ? 74 : 80 }).toFile(webp);
    made.push({ file: path.basename(webp), kb: Math.round(fs.statSync(webp).size / 1024) });
    // effort 4 — компромисс: 9 выигрывает около 3 % ценой вчетверо большего
    // времени кодирования.
    const avif = path.join(OUT_DIR, `${base}-${long}.avif`);
    await pipeline.clone().avif({ quality: 50, effort: 4 }).toFile(avif);
    made.push({ file: path.basename(avif), kb: Math.round(fs.statSync(avif).size / 1024) });
    if (long === 960) continue;       // запасной jpg нужен только в двух ступенях
    const jpg = path.join(OUT_DIR, `${base}-${long}.jpg`);
    await pipeline.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(jpg);
    const meta = await sharp(jpg).metadata();
    made.push({ file: path.basename(jpg), w: meta.width, h: meta.height, kb: Math.round(fs.statSync(jpg).size / 1024) });
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
