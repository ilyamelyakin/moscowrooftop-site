#!/usr/bin/env node
// Дополняет assets/locations недостающими вариантами кадров, не трогая старые.
//
// Зачем: в ленте каталога слот под фото — 358 CSS-px. На телефоне с DPR 2 это
// 716 device-px, и из пары «480w, 960w» браузер всегда берёт 960w, то есть
// файл -1280 (в среднем 114 КБ). Промежуточный размер 960 по длинной стороне
// даёт у вертикальных кадров ширину 720 — ровно под DPR 2, и весит вдвое меньше.
//
// Что создаётся (только если файла ещё нет):
//   <base>-960.webp   — основной размер ленты
//   <base>-960.avif   — он же в AVIF, ещё на четверть легче
//   <base>-640.avif   — для DPR 1 и узких экранов
//   <base>-1280.avif  — для лайтбокса и страницы крыши
//
// Источник — уже лежащий <base>-1280.jpg: оригиналы в «Локации/» сопоставлены
// с базами только через match-photos.js, и повторное сопоставление здесь ради
// уменьшения картинки не стоит риска перепутать кадры. Потеря от повторного
// сжатия при уменьшении в 0.75 не видна: размер нового файла определяет не
// исходный шум, а качество кодека.
//
//   node tools/backfill-variants.js [--dry] [--only <подстрока>]
const path = require("node:path");
const fs = require("node:fs");
const sharp = require("sharp");

const OUT_DIR = path.join(__dirname, "..", "assets", "locations");
const WEBP_QUALITY = 74;
const AVIF_QUALITY = 50;
// effort 4 — компромисс: 9 даёт выигрыш около 3 % ценой примерно вчетверо
// большего времени кодирования, а кадров здесь под шесть десятков.
const AVIF_EFFORT = 4;

// [длинная сторона, формат]. jpg не добавляем: он остаётся запасным вариантом
// для древних браузеров и берётся из уже существующих -640/-1280.
const WANTED = [
  [960, "webp"],
  [960, "avif"],
  [640, "avif"],
  [1280, "avif"],
];

function encode(pipeline, format) {
  if (format === "avif") return pipeline.avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT });
  return pipeline.webp({ quality: WEBP_QUALITY });
}

async function backfill({ dry, only }) {
  const bases = [
    ...new Set(
      fs
        .readdirSync(OUT_DIR)
        .filter((f) => f.endsWith("-1280.jpg"))
        .map((f) => f.replace(/-1280\.jpg$/, "")),
    ),
  ]
    .filter((base) => !only || base.includes(only))
    .sort();

  if (!bases.length) {
    console.error("не нашёл ни одного <base>-1280.jpg в assets/locations");
    return 1;
  }

  let created = 0;
  let skipped = 0;
  let bytes = 0;
  const widths = new Map();

  for (const base of bases) {
    const source = path.join(OUT_DIR, `${base}-1280.jpg`);
    for (const [long, format] of WANTED) {
      const target = path.join(OUT_DIR, `${base}-${long}.${format}`);
      if (fs.existsSync(target)) {
        skipped += 1;
        continue;
      }
      if (dry) {
        created += 1;
        continue;
      }
      // rotate() здесь не нужен: -1280.jpg уже развёрнут по EXIF при первой
      // конвертации, повторный разворот положил бы кадр набок.
      const pipeline = sharp(source, { failOn: "none" }).resize({
        width: long,
        height: long,
        fit: "inside",
        withoutEnlargement: true,
      });
      await encode(pipeline.clone(), format).toFile(target);
      const meta = await sharp(target).metadata();
      widths.set(`${long}.${format}`, meta.width);
      bytes += fs.statSync(target).size;
      created += 1;
    }
  }

  console.log(
    `${dry ? "[dry] " : ""}баз: ${bases.length}, создано: ${created}, уже было: ${skipped}` +
      (bytes ? `, добавлено ${(bytes / 1024 / 1024).toFixed(1)} МБ` : ""),
  );
  if (widths.size) {
    console.log("ширина последнего кадра по вариантам:", Object.fromEntries(widths));
  }
  return 0;
}

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
backfill({ dry: args.includes("--dry"), only })
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
