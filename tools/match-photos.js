#!/usr/bin/env node
// Сопоставляет пронумерованные исходники из «Локации» с готовыми кадрами в
// assets/locations по содержимому: сравниваем уменьшенные до 48×48 RGB-копии
// и берём среднее отклонение. Один и тот же снимок после пережатия даёт
// отклонение в единицы, разные снимки — десятки.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "Локации");
const ASSETS = path.join(ROOT, "assets", "locations");
const PHOTO_RE = /\.(heic|heif|jpg|jpeg|png|dng)$/i;
const SIZE = 48;
const ACCEPT = 12;   // среднее отклонение, при котором считаем кадр тем же
const MARGIN = 1.6;  // и насколько он должен быть лучше второго кандидата

async function fingerprint(file) {
  let input = file;
  let temp = null;
  if (/\.(heic|heif|dng)$/i.test(file)) {
    temp = path.join(os.tmpdir(), `fp-${Math.random().toString(36).slice(2)}.jpg`);
    execFileSync("sips", ["-s", "format", "jpeg", file, "--out", temp], { stdio: "ignore" });
    input = temp;
  }
  const image = sharp(input).rotate();
  const meta = await image.metadata();
  // metadata() описывает ИСХОДНЫЙ файл: при ориентации 5-8 стороны меняются
  // местами только после поворота, иначе пропорции сравниваются неверно.
  const swap = (meta.orientation || 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;
  const data = await image.clone().resize(SIZE, SIZE, { fit: "fill" }).removeAlpha().raw().toBuffer();
  if (temp) fs.rmSync(temp, { force: true });
  return { data, ratio: width / height };
}

function diff(a, b) {
  if (Math.abs(a.ratio - b.ratio) > 0.08) return Infinity; // пропорции не совпали — точно не тот кадр
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 1) sum += Math.abs(a.data[i] - b.data[i]);
  return sum / a.data.length;
}

(async () => {
  const assets = [];
  for (const file of fs.readdirSync(ASSETS).filter((f) => f.endsWith("-640.jpg"))) {
    assets.push({ base: file.replace("-640.jpg", ""), fp: await fingerprint(path.join(ASSETS, file)) });
  }

  const result = {};
  const folders = fs
    .readdirSync(SRC_DIR)
    .filter((f) => fs.statSync(path.join(SRC_DIR, f)).isDirectory())
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  for (const folder of folders) {
    const files = fs
      .readdirSync(path.join(SRC_DIR, folder))
      .filter((f) => PHOTO_RE.test(f))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const list = [];
    for (const file of files) {
      const fp = await fingerprint(path.join(SRC_DIR, folder, file));
      const scored = assets
        .map((asset) => ({ base: asset.base, d: diff(fp, asset.fp) }))
        .sort((x, y) => x.d - y.d);
      const [best, second] = scored;
      const confident = best.d <= ACCEPT && (!second || second.d === Infinity || second.d > best.d * MARGIN);
      list.push({
        file,
        match: confident ? best.base : null,
        d: Number(best.d.toFixed(1)),
        next: second && second.d !== Infinity ? Number(second.d.toFixed(1)) : null,
      });
    }
    result[folder] = list;
  }
  console.log(JSON.stringify(result, null, 1));
})().catch((e) => { console.error(e.message || e); process.exit(1); });
