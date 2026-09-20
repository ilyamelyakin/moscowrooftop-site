#!/usr/bin/env bash
# Заливает кадры из assets/locations в S3-совместимое хранилище — под Yandex
# Object Storage, но подойдёт любое (Selectel, VK, Timeweb): меняется только
# ENDPOINT и REGION.
#
# Зачем: ответы moscowrooftop.ru у части российских операторов обрываются на
# первых полутора килобайтах, и картинки до телефона не доходят. Лечится это
# не весом кадров, а другим адресом, с которого они раздаются.
#
# Ничего не ставит: подпись AWS SigV4 умеет системный curl начиная с 7.75.
#
#   export S3_KEY=... S3_SECRET=... S3_BUCKET=assets.moscowrooftop.ru
#   bash tools/upload-assets.sh --dry-run     # посмотреть, что поедет
#   bash tools/upload-assets.sh               # залить
#   bash tools/upload-assets.sh --verify      # проверить, что всё на месте
#
# Ключи берутся в консоли: Yandex Cloud -> сервисные аккаунты -> создать
# статический ключ доступа. Роль сервисному аккаунту нужна storage.uploader.
set -u -o pipefail

ENDPOINT="${S3_ENDPOINT:-https://storage.yandexcloud.net}"
REGION="${S3_REGION:-ru-central1}"
PREFIX="${S3_PREFIX:-locations}"
PARALLEL="${S3_PARALLEL:-8}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets/locations"

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
[ -d "$SRC" ] || { echo "нет папки $SRC" >&2; exit 1; }

ctype_for() {
  case "${1##*.}" in
    avif) echo "image/avif" ;;
    webp) echo "image/webp" ;;
    jpg|jpeg) echo "image/jpeg" ;;
    png) echo "image/png" ;;
    *) echo "application/octet-stream" ;;
  esac
}

# Год и immutable: имена файлов несут размер и формат, поэтому содержимое по
# одному имени не меняется никогда. Object Storage не применяет _headers и не
# сжимает на лету, так что заголовок ставится на объект при заливке.
CACHE="public, max-age=31536000, immutable"

files=()
while IFS= read -r f; do files+=("$f"); done < <(find "$SRC" -type f \( -name '*.avif' -o -name '*.webp' -o -name '*.jpg' \) | sort)

total=${#files[@]}
bytes=$(find "$SRC" -type f \( -name '*.avif' -o -name '*.webp' -o -name '*.jpg' \) -print0 | xargs -0 stat -f%z 2>/dev/null | awk '{s+=$1} END{printf "%.1f", s/1024/1024}')
echo "файлов: $total, объём: ${bytes} МБ"
echo "куда:   $ENDPOINT/$S3_BUCKET/$PREFIX/"

if [ "$MODE" = "dry" ]; then
  printf '  %s\n' "${files[@]:0:5}" | sed "s|$SRC/||"
  echo "  … и ещё $((total - 5))"
  echo "(--dry-run: ничего не залито)"
  exit 0
fi

put_one() {
  local f="$1" name ctype code
  name="$(basename "$f")"
  ctype="$(ctype_for "$name")"
  code=$(curl -sS -o /dev/null -w '%{http_code}' \
    --aws-sigv4 "aws:amz:$S3_REGION_ARG:s3" --user "$S3_KEY:$S3_SECRET" \
    -T "$f" \
    -H "Content-Type: $ctype" \
    -H "Cache-Control: $S3_CACHE_ARG" \
    --max-time 120 \
    "$S3_ENDPOINT_ARG/$S3_BUCKET/$S3_PREFIX_ARG/$name")
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    printf '.'
  else
    printf '\n  ! %s -> HTTP %s\n' "$name" "$code"
    return 1
  fi
}
export -f put_one ctype_for
export S3_KEY S3_SECRET S3_BUCKET
export S3_REGION_ARG="$REGION" S3_ENDPOINT_ARG="$ENDPOINT" S3_PREFIX_ARG="$PREFIX" S3_CACHE_ARG="$CACHE"

if [ "$MODE" = "verify" ]; then
  echo "проверяю наличие и заголовки…"
  missing=0
  for f in "${files[@]}"; do
    name="$(basename "$f")"
    read -r code ctype len < <(curl -sSI --max-time 20 "$ENDPOINT/$S3_BUCKET/$PREFIX/$name" \
      | awk 'BEGIN{IGNORECASE=1} /^HTTP/{c=$2} /^content-type:/{t=$2} /^content-length:/{l=$2} END{gsub(/\r/,"",t); gsub(/\r/,"",l); print c, t, l}')
    local_size=$(stat -f%z "$f")
    if [ "$code" != "200" ] || [ "$len" != "$local_size" ]; then
      echo "  ! $name: код=$code тип=$ctype размер=$len (на диске $local_size)"
      missing=$((missing + 1))
    fi
  done
  if [ "$missing" = "0" ]; then echo "все $total файлов на месте, размеры совпадают"; else echo "расхождений: $missing"; fi
  exit $([ "$missing" = "0" ] && echo 0 || echo 1)
fi

echo "заливаю в $PARALLEL потоков (точка — файл)…"
printf '%s\0' "${files[@]}" | xargs -0 -P "$PARALLEL" -I{} bash -c 'put_one "$@"' _ {}
status=$?
echo
if [ "$status" = "0" ]; then
  echo "готово. Теперь проверьте: bash tools/upload-assets.sh --verify"
  echo "и пересоберите каталог на новый адрес:"
  echo "  python3 tools/build-katalog.py --prices-json /tmp/roofs.json --assets-base https://$S3_BUCKET/$PREFIX/"
else
  echo "были ошибки, смотрите строки с «!» выше"
fi
exit $status
