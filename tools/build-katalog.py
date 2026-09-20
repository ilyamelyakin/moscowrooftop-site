#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Собирает каталог крыш для Telegram-бота:

  /katalog/           — лента всех крыш (фото, цена, статус)
  /katalog/<slug>/    — страница одной крыши: вся галерея целиком

Содержимое берётся из tools/katalog-data.json (порядок крыш там же — он
повторяет нумерацию папок в «Локации»). Статусы и цены на живой странице
приходят из /api/roofs; в HTML лежит снапшот цен на случай сбоя API.

Все ссылки ведут в бота или внутрь каталога: человек пришёл из Telegram
и должен вернуться в Telegram, а не оставлять заявку на сайте.

Запуск:  python3 tools/build-katalog.py [--offline] [--prices-json файл]
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"
BOT_URL = "https://t.me/MoscowRoofTopBot"
API_URL = "https://moscowrooftop.ru/api/roofs"
YANDEX_DISK_URL = "https://yadi.sk/d/vDKSXelDIYtb7Q"
GOOGLE_DRIVE_URL = "https://drive.google.com/drive/folders/1hlpTbwkgFhdHnriPe5qU8UqypKMcf7DY?usp=drive_link"
FEED_SLIDES = 6          # больше кадров в ленте не держим: вес и смысл страницы крыши
FEED_SIZES = "(max-width: 640px) calc(100vw - 32px), (max-width: 980px) calc((100vw - 64px) / 2), 360px"
ROOF_SIZES = "(max-width: 980px) calc(100vw - 32px), 560px"


def normalize(name: str) -> str:
    return re.sub(r"\s+", " ", str(name or "").replace("ё", "е").strip().lower())


def esc(text: str) -> str:
    return html.escape(str(text), quote=True)


def price_text(value: int | None) -> str:
    if not value:
        return "Цена по запросу"
    return f"{value:,}".replace(",", " ") + " ₽"


def payload_for(slug: str) -> str:
    # Telegram разрешает в start-параметре только [A-Za-z0-9_-]
    return slug.replace("-", "_")


def read_aliases() -> dict[str, str]:
    """SHEET_NAME_ALIASES из воркера: написание сайта -> написание таблицы."""
    worker = (ROOT / "src" / "index.js").read_text(encoding="utf-8")
    block = worker[worker.index("SHEET_NAME_ALIASES") : worker.index("]);", worker.index("SHEET_NAME_ALIASES"))]
    return {normalize(a): normalize(b) for a, b in re.findall(r'\["([^"]+)",\s*"([^"]+)"\]', block)}


def fetch_prices(offline: bool, prices_json: str | None) -> tuple[dict[str, int], str]:
    if prices_json:
        data = json.loads(Path(prices_json).read_text(encoding="utf-8"))
        if data.get("prices"):
            return {normalize(k): int(v) for k, v in data["prices"].items() if v}, "json"
    if not offline:
        try:
            req = urllib.request.Request(API_URL, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.load(resp)
            if data.get("ok") and data.get("prices"):
                return {normalize(k): int(v) for k, v in data["prices"].items() if v}, "api"
        except Exception as exc:  # noqa: BLE001 — офлайн-сборка не должна падать
            print(f"  ! живой API недоступен ({exc}), беру снапшот из src/index.js", file=sys.stderr)
    worker = (ROOT / "src" / "index.js").read_text(encoding="utf-8")
    block = worker[worker.index("FALLBACK_ROOF_PRICES") : worker.index("]);", worker.index("FALLBACK_ROOF_PRICES"))]
    return {normalize(n): int(p) for n, p in re.findall(r'\["([^"]+)",\s*(\d+)\]', block)}, "fallback"


def picture(photo: dict, sizes: str, *, eager: bool, prefix: str) -> str:
    base = f"{prefix}{photo['base']}"
    w, h = photo["w"], photo["h"]
    # Дескрипторы srcset — как в index.html: половина и полная ширина файла.
    w0, w1 = round(w / 2), w
    if eager:
        source = f'<source type="image/webp" srcset="{base}-640.webp {w0}w, {base}-1280.webp {w1}w" sizes="{sizes}" />'
        img = (
            f'<img src="{base}-640.jpg" srcset="{base}-640.jpg {w0}w, {base}-1280.jpg {w1}w" sizes="{sizes}" '
            f'width="{w}" height="{h}" alt="{esc(photo["alt"])}" loading="eager" fetchpriority="high" />'
        )
    else:
        # Подставляет IntersectionObserver: в горизонтальной ленте браузерный
        # lazy срабатывает непредсказуемо.
        source = f'<source type="image/webp" data-srcset="{base}-640.webp {w0}w, {base}-1280.webp {w1}w" sizes="{sizes}" />'
        img = (
            f'<img data-src="{base}-640.jpg" data-srcset="{base}-640.jpg {w0}w, {base}-1280.jpg {w1}w" sizes="{sizes}" '
            f'width="{w}" height="{h}" alt="{esc(photo["alt"])}" loading="lazy" decoding="async" />'
        )
    return f"<picture>{source}{img}</picture>"


def render_card(roof: dict, price: int | None, first_card: bool) -> str:
    photos = roof["photos"]
    shown = photos[:FEED_SLIDES]
    total = len(photos)
    slides = "".join(
        f'<div class="cat-slide" role="group" aria-label="Фото {i + 1} из {total}">'
        + picture(photo, FEED_SIZES, eager=(i == 0 and first_card), prefix="../assets/locations/")
        + "</div>"
        for i, photo in enumerate(shown)
    )
    if total > FEED_SLIDES:
        rest = total - FEED_SLIDES
        word = "кадр" if rest % 10 == 1 and rest % 100 != 11 else ("кадра" if 2 <= rest % 10 <= 4 and not 12 <= rest % 100 <= 14 else "кадров")
        slides += (
            f'<a class="cat-slide cat-slide-more" href="{roof["slug"]}/">'
            f"<span>Ещё {rest} {word}<br /><b>Смотреть все →</b></span></a>"
        )
    single = total == 1
    rail_attrs = (
        f'role="group" aria-roledescription="галерея" aria-label="Фотографии: {esc(roof["title"])}" tabindex="0"'
        if not single
        else f'role="group" aria-label="Фотография: {esc(roof["title"])}"'
    )
    counter = "" if single else f'<span class="cat-counter" data-total="{total}" aria-hidden="true">1 / {total}</span>'
    dots = ""
    if 2 <= len(shown) <= 5 and total <= FEED_SLIDES:
        dots = '<div class="cat-dots" aria-hidden="true">' + "".join(
            f'<span class="cat-dot{" is-active" if i == 0 else ""}"></span>' for i in range(len(shown))
        ) + "</div>"
    arrows = (
        ""
        if single
        else '<button class="cat-arrow cat-arrow-prev" type="button" aria-label="Предыдущее фото" tabindex="-1">‹</button>'
        '<button class="cat-arrow cat-arrow-next" type="button" aria-label="Следующее фото" tabindex="-1">›</button>'
    )
    tags = "".join(f"<li>{esc(t)}</li>" for t in roof["tags"])
    return f"""        <article class="cat-card" data-roof-id="{roof['id']}" data-roof-name="{esc(roof['sheetName'])}" data-slug="{roof['slug']}">
          <div class="cat-media">
            <div class="cat-rail" {rail_attrs}>{slides}</div>
            <span class="cat-badge" hidden></span>
            {counter}
            {dots}
            {arrows}
          </div>
          <div class="cat-body">
            <div class="cat-top">
              <h3>{esc(roof['title'])}</h3>
              <p class="cat-price-wrap"><strong class="cat-price" data-roof-price>{price_text(price)}</strong><span class="cat-unit">за человека</span></p>
            </div>
            <p class="cat-desc">{esc(roof['desc'])}</p>
            <ul class="cat-tags">{tags}</ul>
            <div class="cat-actions">
              <a class="cat-book" href="{BOT_URL}?start=book_{payload_for(roof['slug'])}">Записаться в боте</a>
              <a class="cat-secondary" href="{roof['slug']}/">Все фото</a>
            </div>
            <p class="cat-off-note" hidden>Пока недоступна — спросите в боте про ближайшие даты</p>
          </div>
        </article>
"""


def render_roof_page(roof: dict, price: int | None, template: str, styles: str, script: str) -> str:
    shots = "\n".join(
        '          <figure class="roof-shot">'
        + picture(photo, ROOF_SIZES, eager=(i == 0), prefix="../../assets/locations/")
        + "</figure>"
        for i, photo in enumerate(roof["photos"])
    )
    tags = "".join(f"<li>{esc(t)}</li>" for t in roof["tags"])
    return (
        template.replace("/*STYLES*/", styles)
        .replace("/*SCRIPT*/", script)
        .replace("{{SHOTS}}", shots)
        .replace("{{TAGS}}", tags)
        .replace("{{TITLE}}", esc(roof["title"]))
        .replace("{{ROOF_NAME}}", esc(roof["sheetName"]))
        .replace("{{SLUG}}", roof["slug"])
        .replace("{{PAYLOAD}}", payload_for(roof["slug"]))
        .replace("{{PRICE}}", price_text(price))
        .replace("{{DESC_PLAIN}}", esc(roof["desc"]))
        .replace("{{DESC}}", esc(roof["desc"]))
        .replace("{{FIRST_SHOT}}", f"../../assets/locations/{roof['photos'][0]['base']}")
        .replace("{{BOT_URL}}", BOT_URL)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="не ходить в живой API за ценами")
    parser.add_argument("--prices-json", help="файл с ответом /api/roofs")
    args = parser.parse_args()

    data = json.loads((TOOLS / "katalog-data.json").read_text(encoding="utf-8"))
    roofs = data["roofs"]
    aliases = read_aliases()
    prices, price_source = fetch_prices(args.offline, args.prices_json)

    def price_for(name: str) -> int | None:
        key = normalize(name)
        return prices.get(key) or prices.get(aliases.get(key, ""))

    styles = (TOOLS / "katalog-shared.css").read_text(encoding="utf-8")
    script = (TOOLS / "katalog-shared.js").read_text(encoding="utf-8")

    # --- лента ------------------------------------------------------------
    cards = "".join(render_card(roof, price_for(roof["sheetName"]), index == 0) for index, roof in enumerate(roofs))
    feed = (TOOLS / "katalog-template.html").read_text(encoding="utf-8")
    feed = (
        feed.replace("/*STYLES*/", styles)
        .replace("/*SCRIPT*/", script)
        .replace("<!--CARDS-->", cards)
        .replace("<!--ALIASES_JSON-->", json.dumps(aliases, ensure_ascii=False, separators=(",", ":")))
        .replace("{{BOT_URL}}", BOT_URL)
        .replace("{{YANDEX_DISK_URL}}", YANDEX_DISK_URL)
        .replace("{{GOOGLE_DRIVE_URL}}", GOOGLE_DRIVE_URL)
        .replace("{{FIRST_COVER}}", f"../assets/locations/{roofs[0]['photos'][0]['base']}")
        .replace("{{ROOF_COUNT}}", str(len(roofs)))
    )
    # Данные галерей нужны только лайтбоксу на десктопе.
    feed = feed.replace(
        "<!--GALLERY_JSON-->",
        json.dumps(
            {
                roof["id"]: {
                    "name": roof["title"],
                    "images": [{"b": f"../assets/locations/{p['base']}", "a": p["alt"]} for p in roof["photos"]],
                }
                for roof in roofs
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
    )
    feed_path = ROOT / "katalog" / "index.html"
    feed_path.parent.mkdir(exist_ok=True)
    feed_path.write_text(feed, encoding="utf-8")

    # --- страницы крыш ----------------------------------------------------
    roof_template = (TOOLS / "katalog-roof-template.html").read_text(encoding="utf-8")
    for roof in roofs:
        page = render_roof_page(roof, price_for(roof["sheetName"]), roof_template, styles, script)
        out = ROOT / "katalog" / roof["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page, encoding="utf-8")

    missing = [r["title"] for r in roofs if price_for(r["sheetName"]) is None]
    if missing:
        print(f"  ! без цены остались: {', '.join(missing)}", file=sys.stderr)
    total_photos = sum(len(r["photos"]) for r in roofs)
    print(f"✓ /katalog/ — {len(roofs)} крыш, {total_photos} кадров, цены: {price_source}, {feed_path.stat().st_size / 1024:.1f} КБ")
    print(f"✓ /katalog/<slug>/ — {len(roofs)} страниц крыш")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
