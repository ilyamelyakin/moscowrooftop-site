#!/usr/bin/env bash
# Заливает каталог крыш (страницы и кадры) в S3-совместимое хранилище — под
# Yandex Object Storage, но подойдёт любое: меняются ENDPOINT и REGION.
#
# Зачем: ответы moscowrooftop.ru у части российских операторов обрываются на
# первых полутора килобайтах. Проверено с телефона владельца: наш файл на
# 15 КБ не открывается, файл на 86 КБ с yastatic.net открывается за доли
# секунды. Лечится это не весом кадров, а другим адресом раздачи.
#
# Структура папок сохраняется один в один, поэтому относительные ссылки
# ../assets/locations/… внутри страниц продолжают работать и никакой
# --assets-base не нужен:
#
#   katalog/index.html          -> <бакет>/katalog/index.html
#   katalog/<slug>/index.html   -> <бакет>/katalog/<slug>/index.html
#   assets/locations/*          -> <бакет>/assets/locations/*
#
# Ничего не ставит: подпись AWS SigV4 умеет системный curl начиная с 7.75.
#
#   export S3_KEY=... S3_SECRET=... S3_BUCKET=mini.moscowrooftop.ru
#   bash tools/upload-assets.sh --dry-run     # посмотреть, что поедет
#   bash tools/upload-assets.sh               # залить
#   bash tools/upload-assets.sh --verify      # сверить наличие и размеры
#
# Ключи: Yandex Cloud -> сервисные аккаунты -> роль storage.uploader ->
# создать статический ключ доступа.
#
# ВАЖНО: страницы для такого хостинга собираются с пустым --api-url, иначе
# каталог будет на каждом открытии ждать таймаут недостижимого /api/roofs:
#   python3 tools/build-katalog.py --prices-json /tmp/roofs.json --api-url ""
set -u -o pipefail

export S3_ENDPOINT_ARG="${S3_ENDPOINT:-https://storage.yandexcloud.net}"
export S3_REGION_ARG="${S3_REGION:-ru-central1}"
PARALLEL="${S3_PARALLEL:-8}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MODE="upload"
case "${1:-}" in
  --dry-run) MODE="dry" ;;
  --verify)  MODE="verify" ;;
  "")        ;;
  *) echo "неизвестный аргумент: $1" >&2; exit 2 ;;
esac

for v in S3_KEY S3_SECRET S3_BUCKET; do
  if [ -z "${!v:-}" ]; then
    echo "не задано $v. Нужно: export S3_KEY=... S3_SECRET=... S3_BUCKET=..." >&2
    exit 2
  fi
done
export S3_KEY S3_SECRET S3_BUCKET

# Список путей относительно корня репозитория.
paths=()
while IFS= read -r f; do paths+=("$f"); done < <(
  cd "$ROOT" || exit 1
  find assets/locations -type f \( -name '*.avif' -o -name '*.webp' -o -name '*.jpg' \) 2>/dev/null
  find katalog -type f -name '*.html' 2>/dev/null
)
total=${#paths[@]}
[ "$total" -gt 0 ] || { echo "нечего заливать: не нашёл ни кадров, ни страниц" >&2; exit 1; }

bytes=$(cd "$ROOT" && printf '%s\0' "${paths[@]}" | xargs -0 stat -f%z | awk '{s+=$1} END{printf "%.1f", s/1024/1024}')
pages=$(printf '%s\n' "${paths[@]}" | grep -c '\.html$')
echo "файлов: $total (страниц $pages, кадров $((total - pages))), объём: ${bytes} МБ"
echo "куда:   $S3_ENDPOINT_ARG/$S3_BUCKET/"

if [ "$MODE" = "dry" ]; then
  printf '%s\n' "${paths[@]}" | sort | head -4 | sed 's/^/  /'
  echo "  … и ещё $((total - 4))"
  echo "(--dry-run: ничего не залито)"
  exit 0
fi

# Кадры: год и immutable — имя файла несёт размер и формат, содержимое по
# одному имени не меняется никогда. Страницы: пять минут, как в _headers,
# чтобы правка статусов доезжала без ожидания.
# Object Storage не применяет _headers и не сжимает на лету, поэтому
# заголовки ставятся на объект при заливке.
put_one() {
  local rel="$1" ctype cache code
  case "${rel##*.}" in
    avif) ctype="image/avif";  cache="public, max-age=31536000, immutable" ;;
    webp) ctype="image/webp";  cache="public, max-age=31536000, immutable" ;;
    jpg)  ctype="image/jpeg";  cache="public, max-age=31536000, immutable" ;;
    html) ctype="text/html; charset=utf-8"; cache="public, max-age=300" ;;
    *)    ctype="application/octet-stream"; cache="public, max-age=300" ;;
  esac
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    --aws-sigv4 "aws:amz:$S3_REGION_ARG:s3" --user "$S3_KEY:$S3_SECRET" \
    -T "$REPO_ROOT/$rel" \
    -H "Content-Type: $ctype" \
    -H "Cache-Control: $cache" \
    --max-time 120 \
    "$S3_ENDPOINT_ARG/$S3_BUCKET/$rel")
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    printf '.'
  else
    printf '\n  ! %s -> HTTP %s\n' "$rel" "$code"
    return 1
  fi
}
export -f put_one
export REPO_ROOT="$ROOT"

if [ "$MODE" = "verify" ]; then
  echo "сверяю наличие, размеры и типы…"
  bad=0
  for rel in "${paths[@]}"; do
    head_out=$(curl -sSI --max-time 20 "$S3_ENDPOINT_ARG/$S3_BUCKET/$rel" 2>/dev/null)
    code=$(printf '%s' "$head_out" | awk '/^HTTP/{print $2; exit}')
    len=$(printf '%s' "$head_out" | awk 'BEGIN{IGNORECASE=1} /^content-length:/{gsub(/\r/,"",$2); print $2; exit}')
    want=$(stat -f%z "$ROOT/$rel")
    if [ "$code" != "200" ] || [ "$len" != "$want" ]; then
      echo "  ! $rel: код=${code:-—} размер=${len:-—} (на диске $want)"
      bad=$((bad + 1))
    fi
  done
  if [ "$bad" = "0" ]; then
    echo "все $total файлов на месте, размеры совпадают"
    exit 0
  fi
  echo "расхождений: $bad"
  exit 1
fi

echo "заливаю в $PARALLEL потоков (точка — файл)…"
printf '%s\0' "${paths[@]}" | xargs -0 -P "$PARALLEL" -I{} bash -c 'put_one "$@"' _ {}
status=$?
echo
if [ "$status" = "0" ]; then
  echo "готово. Дальше:"
  echo "  1) сверить:            bash tools/upload-assets.sh --verify"
  echo "  2) открыть с телефона: https://$S3_BUCKET/katalog/"
  echo "  3) переключить бота:   CATALOG_URL=https://$S3_BUCKET/katalog/ в .env и перезапуск"
else
  echo "были ошибки, смотрите строки с «!» выше"
fi
exit $status
