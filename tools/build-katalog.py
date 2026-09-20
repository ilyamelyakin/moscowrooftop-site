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

# Ступени длинной стороны, которые предлагаем браузеру.
#
# В ленте слот под фото — 358 CSS-px на телефоне и 360 на десктопе, то есть
# 716 device-px при DPR 2 и 1074 при DPR 3. Выбор был из «480w, 960w», и оба
# случая уводили в 960w — файл -1280, в среднем 114 КБ. Ступень 960 даёт у
# вертикального кадра ширину 720: на DPR 2 впритык, на DPR 3 остаётся 2x,
# которого на фотографии не отличить. Файл -1280 в ленту больше не отдаём.
FEED_LADDER = (640, 960)
# Ниже этой ширины ступень 960 перестаёт закрывать телефон: слот 358 CSS-px при
# DPR 2 просит 716 device-px. У кадра 4:5 ступень 960 даёт 720 и попадает точно,
# а у узкого 9:16 (720x1280) — всего 540, это уже видимая мягкость. Таким кадрам
# добавляем верхнюю ступень обратно. Порог 680, а не 716: у 928x1280 ступень 960
# даёт 696, и недобор в 3 % не стоит лишних 50 КБ.
FEED_MIN_WIDTH = 680
# На странице крыши слот шире (560 CSS-px на десктопе), там верхняя ступень
# нужна: при DPR 2 в неё уходит 1120 device-px.
ROOF_LADDER = (640, 960, 1280)
# Запасная лесенка для браузеров без webp и avif. Ровно те файлы, что лежали
# в assets/locations раньше: в 960 jpg не делаем, такие браузеры давно
# статистическая погрешность, и лесенка им нужна лишь номинально.
JPG_LADDER = (640, 1280)
# Форматы по убыванию выгоды. Порядок важен: браузер берёт первый подходящий.
MODERN_FORMATS = ("avif", "webp")


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


def unpack(data: dict) -> tuple[dict[str, int], dict[str, bool] | None]:
    prices = {normalize(k): int(v) for k, v in (data.get("prices") or {}).items() if v}
    roofs = data.get("roofs")
    statuses = {normalize(k): bool(v) for k, v in roofs.items()} if roofs else None
    return prices, statuses


def fetch_sheet(offline: bool, prices_json: str | None) -> tuple[dict[str, int], dict[str, bool] | None, str]:
    """Цены и статусы крыш на момент сборки.

    Статусы запекаются в HTML, чтобы бейджи «В расписании» были видны сразу, без
    ожидания /api/roofs: на медленном мобильном канале этот запрос мог не
    дойти вовсе, и тогда человек не видел статусов ни одной крыши. Живой ответ
    потом поправит расхождения, если они появились.

    statuses = None означает «не знаем» (офлайн-сборка): бейджи тогда рисует
    только клиент, как раньше.
    """
    if prices_json:
        data = json.loads(Path(prices_json).read_text(encoding="utf-8"))
        if data.get("prices"):
            prices, statuses = unpack(data)
            return prices, statuses, "json"
    if not offline:
        try:
            req = urllib.request.Request(API_URL, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.load(resp)
            if data.get("ok") and data.get("prices"):
                prices, statuses = unpack(data)
                return prices, statuses, "api"
        except Exception as exc:  # noqa: BLE001 — офлайн-сборка не должна падать
            print(f"  ! живой API недоступен ({exc}), беру снапшот из src/index.js", file=sys.stderr)
    worker = (ROOT / "src" / "index.js").read_text(encoding="utf-8")
    block = worker[worker.index("FALLBACK_ROOF_PRICES") : worker.index("]);", worker.index("FALLBACK_ROOF_PRICES"))]
    return {normalize(n): int(p) for n, p in re.findall(r'\["([^"]+)",\s*(\d+)\]', block)}, None, "fallback"


def srcset(base: str, width: int, ladder: tuple[int, ...], ext: str) -> str:
    """Дескрипторы w — реальная ширина файла на каждой ступени.

    Ширину считаем от -1280: convert-photos.js вписывает кадр в квадрат со
    стороной «ступень», поэтому короткая сторона уменьшается в той же
    пропорции. Для кадра 960x1280 ступень 960 даёт ширину 720, ступень 640 —
    480. Расхождение с sharp проверено на всех 58 кадрах.
    """
    return ", ".join(f"{base}-{step}.{ext} {round(width * step / 1280)}w" for step in ladder)


def feed_ladder_for(width: int) -> tuple[int, ...]:
    """Лесенка ленты с оглядкой на пропорции кадра (см. FEED_MIN_WIDTH)."""
    if round(width * FEED_LADDER[-1] / 1280) < FEED_MIN_WIDTH:
        return FEED_LADDER + (1280,)
    return FEED_LADDER


def picture(photo: dict, sizes: str, *, eager: bool, prefix: str, ladder: tuple[int, ...] | None = None) -> str:
    base = f"{prefix}{photo['base']}"
    w, h = photo["w"], photo["h"]
    if ladder is None:
        ladder = feed_ladder_for(w)
    # У отложенных кадров srcset лежит в data-*: подставляет IntersectionObserver,
    # потому что в горизонтальной ленте браузерный lazy срабатывает непредсказуемо.
    attr = "srcset" if eager else "data-srcset"
    sources = "".join(
        f'<source type="image/{fmt}" {attr}="{srcset(base, w, ladder, fmt)}" sizes="{sizes}" />'
        for fmt in MODERN_FORMATS
    )
    jpg = srcset(base, w, JPG_LADDER, "jpg")
    if eager:
        img = (
            f'<img src="{base}-640.jpg" srcset="{jpg}" sizes="{sizes}" '
            f'width="{w}" height="{h}" alt="{esc(photo["alt"])}" loading="eager" fetchpriority="high" />'
        )
    else:
        img = (
            f'<img data-src="{base}-640.jpg" data-srcset="{jpg}" sizes="{sizes}" '
            f'width="{w}" height="{h}" alt="{esc(photo["alt"])}" loading="lazy" decoding="async" />'
        )
    return f"<picture>{sources}{img}</picture>"


def render_card(roof: dict, price: int | None, first_card: bool, on: bool | None = None) -> str:
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
    # Бейдж и класс is-off — в разметке, а не в JS: иначе на медленном канале
    # человек до ответа /api/roofs не видел статусов вовсе, а когда ответ
    # приходил, карточки прыгали между лентами. Живой ответ теперь только
    # правит расхождения.
    if on is None:
        badge = '<span class="cat-badge" hidden></span>'
        card_class = "cat-card"
        off_note = '<p class="cat-off-note" hidden>'
    else:
        badge = (
            f'<span class="cat-badge{"" if on else " is-off"}">'
            f'{"В расписании" if on else "Пока недоступна"}</span>'
        )
        card_class = "cat-card" if on else "cat-card is-off"
        off_note = '<p class="cat-off-note" hidden>' if on else '<p class="cat-off-note">'
    return f"""        <article class="{card_class}" data-roof-id="{roof['id']}" data-roof-name="{esc(roof['sheetName'])}" data-slug="{roof['slug']}">
          <div class="cat-media">
            <div class="cat-rail" {rail_attrs}>{slides}</div>
            {badge}
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
            {off_note}Пока недоступна — спросите в боте про ближайшие даты</p>
          </div>
        </article>
"""


def render_roof_page(roof: dict, price: int | None, template: str, styles: str, script: str, on: bool | None = None) -> str:
    shots = "\n".join(
        '          <figure class="roof-shot">'
        + picture(photo, ROOF_SIZES, eager=(i == 0), prefix="../../assets/locations/", ladder=ROOF_LADDER)
        + "</figure>"
        for i, photo in enumerate(roof["photos"])
    )
    tags = "".join(f"<li>{esc(t)}</li>" for t in roof["tags"])
    # Как и в ленте: статус в разметке, а не после ответа /api/roofs.
    if on is None:
        badge = '<span class="cat-badge" hidden></span>'
        roof_class = ""
        off_hidden = " hidden"
    else:
        badge = (
            f'<span class="cat-badge{"" if on else " is-off"}">'
            f'{"В расписании" if on else "Пока недоступна"}</span>'
        )
        roof_class = "" if on else "is-off"
        off_hidden = " hidden" if on else ""
    return (
        template.replace("/*STYLES*/", styles)
        .replace("{{BADGE}}", badge)
        .replace("{{ROOF_CLASS}}", roof_class)
        .replace("{{OFF_NOTE_HIDDEN}}", off_hidden)
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
    prices, statuses, price_source = fetch_sheet(args.offline, args.prices_json)

    def price_for(name: str) -> int | None:
        key = normalize(name)
        return prices.get(key) or prices.get(aliases.get(key, ""))

    unknown: list[str] = []

    def status_for(name: str) -> bool | None:
        """None — статусов нет вовсе (офлайн-сборка), бейджи дорисует клиент."""
        if statuses is None:
            return None
        key = normalize(name)
        if key in statuses:
            return statuses[key]
        alias = aliases.get(key)
        if alias and alias in statuses:
            return statuses[alias]
        # Имени нет в таблице — та же трактовка, что у клиента: обещать крышу
        # нельзя. Но это почти всегда опечатка в названии, поэтому кричим.
        unknown.append(name)
        return False

    states = [(roof, status_for(roof["sheetName"])) for roof in roofs]
    live = [roof for roof, on in states if on is not False]
    off = [roof for roof, on in states if on is False]
    state_of = {roof["id"]: on for roof, on in states}

    styles = (TOOLS / "katalog-shared.css").read_text(encoding="utf-8")
    script = (TOOLS / "katalog-shared.js").read_text(encoding="utf-8")

    # --- лента ------------------------------------------------------------
    # Доступные и недоступные раскладываем по лентам уже здесь: раньше это
    # делал JS после ответа API, и карточки на глазах прыгали вниз.
    cards = "".join(
        render_card(roof, price_for(roof["sheetName"]), index == 0, state_of[roof["id"]])
        for index, roof in enumerate(live)
    )
    cards_off = "".join(
        render_card(roof, price_for(roof["sheetName"]), False, state_of[roof["id"]]) for roof in off
    )
    if statuses is None:
        status_text = ""
    elif not off:
        status_text = f"Все <b>{len(live)}</b> крыш в расписании"
    elif not live:
        status_text = "Сегодня все крыши заняты — напишите в бота, подберём дату"
    else:
        status_text = f"Сейчас в расписании <b>{len(live)}</b> из {len(roofs)} крыш"
    feed = (TOOLS / "katalog-template.html").read_text(encoding="utf-8")
    feed = (
        feed.replace("/*STYLES*/", styles)
        .replace("/*SCRIPT*/", script)
        .replace("<!--CARDS-->", cards)
        .replace("<!--CARDS_OFF-->", cards_off)
        .replace("{{STATUS_TEXT}}", status_text)
        .replace("{{OFF_HIDDEN}}", "" if off else " hidden")

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
        page = render_roof_page(
            roof, price_for(roof["sheetName"]), roof_template, styles, script, state_of[roof["id"]]
        )
        out = ROOT / "katalog" / roof["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page, encoding="utf-8")

    missing = [r["title"] for r in roofs if price_for(r["sheetName"]) is None]
    if missing:
        print(f"  ! без цены остались: {', '.join(missing)}", file=sys.stderr)
    if unknown:
        print(
            f"  ! нет в таблице (считаю недоступными): {', '.join(unknown)}"
            "\n    проверьте написание или SHEET_NAME_ALIASES в src/index.js",
            file=sys.stderr,
        )
    total_photos = sum(len(r["photos"]) for r in roofs)
    status_note = "нет (офлайн)" if statuses is None else f"{len(live)} в расписании, {len(off)} нет"
    print(
        f"✓ /katalog/ — {len(roofs)} крыш, {total_photos} кадров, цены: {price_source}, "
        f"статусы: {status_note}, {feed_path.stat().st_size / 1024:.1f} КБ"
    )
    print(f"✓ /katalog/<slug>/ — {len(roofs)} страниц крыш")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
