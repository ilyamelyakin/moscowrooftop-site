# Moscow Rooftop

Статичный сайт для экскурсий по крышам Москвы. Главная цель сайта — привести человека в Telegram-бота для записи:

- Telegram: `https://t.me/MoscowRoofTopBot`
- Instagram: `https://www.instagram.com/moscowrooftop.ru/`
- TikTok: `https://www.tiktok.com/@ilya.melyakin`

Сайт работает без сборки и backend: достаточно открыть файлы локально или загрузить их на хостинг.

## 1. Где вставить ID Яндекс.Метрики

Откройте `script.js` и замените:

```js
const YM_COUNTER_ID = 'YOUR_YM_COUNTER_ID';
```

на настоящий ID счетчика, например:

```js
const YM_COUNTER_ID = '12345678';
```

В `index.html` в `<head>` есть отдельное место для стандартного кода Метрики:

```html
<!-- Yandex Metrika counter -->
<!-- Можно вставить стандартный код Яндекс.Метрики сюда. ID также задается в script.js: YM_COUNTER_ID. -->
<!-- /Yandex Metrika counter -->
```

Если ID заменен в `script.js`, сайт сам подключит Метрику. Стандартный код в `<head>` можно вставить дополнительно, если хотите использовать код из кабинета Яндекса один в один.

## 2. Где вставить Measurement ID Google Analytics 4

Откройте `script.js` и замените:

```js
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
```

на настоящий Measurement ID, например:

```js
const GA_MEASUREMENT_ID = 'G-ABC1234567';
```

В `index.html` в `<head>` есть место для стандартного Google tag:

```html
<!-- Google tag (GA4) -->
<!-- Можно вставить стандартный Google tag сюда. ID также задается в script.js: GA_MEASUREMENT_ID. -->
<!-- /Google tag (GA4) -->
```

Если ID заменен в `script.js`, сайт сам подключит GA4.

## 3. Какие события отправляются

Сайт отправляет события:

- `telegram_click`
- `instagram_click`
- `tiktok_click`
- `gallery_view`
- `faq_open`
- `phone_click`
- `scroll_50`
- `scroll_90`

UTM-метки `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` сохраняются в `sessionStorage` и автоматически добавляются к каждому событию.

## 4. Как создать цель `telegram_click` в Яндекс.Метрике

1. Откройте счетчик в Яндекс.Метрике.
2. Перейдите в раздел целей.
3. Создайте цель типа JavaScript-событие.
4. В поле идентификатора цели укажите `telegram_click`.
5. Сохраните цель и проверьте ее после клика по Telegram-кнопке на сайте.

## 5. Как пометить `telegram_click` как Key Event в GA4

1. Откройте Google Analytics 4.
2. Перейдите в Admin -> Events.
3. После первых тестовых кликов дождитесь появления события `telegram_click`.
4. Отметьте это событие как Key Event.

## 6. Как проверить события локально через Console

Запустите сайт локально:

```bash
python3 -m http.server 8000
```

Откройте:

```text
http://localhost:8000
```

Откройте DevTools -> Console и нажмите Telegram, Instagram, TikTok, раскройте FAQ или проскролльте страницу. В консоли должны появиться строки вида:

```text
[Analytics] telegram_click {location: "hero", destination: "telegram_bot"}
```

Можно вручную проверить событие:

```js
trackEvent('telegram_click', { location: 'test', destination: 'telegram_bot' });
```

## 7. Как проверить события после деплоя

1. Откройте `https://moscowrooftop.ru/?utm_source=instagram&utm_campaign=profile`.
2. Нажмите кнопку Telegram в первом экране.
3. Ссылка должна открыться как `https://t.me/MoscowRoofTopBot?start=site_hero_instagram`.
4. В Console должна появиться запись `[Analytics] telegram_click`.
5. В Яндекс.Метрике проверьте цель `telegram_click`.
6. В GA4 проверьте событие `telegram_click` в Realtime или DebugView.

## 8. Как работают Telegram deep links

Все ссылки на `MoscowRoofTopBot` автоматически получают короткий безопасный параметр `start`:

- первый экран: `site_hero`
- блок записи: `site_how_it_works`
- финальный CTA: `site_final`
- footer: `site_footer`
- header: `site_header`

Если пользователь пришел с UTM-источником, источник добавляется в `start`. Например:

```text
https://t.me/MoscowRoofTopBot?start=site_hero_instagram
```

Параметр `start` формируется только из латиницы, цифр и `_`, без пробелов, кириллицы и специальных символов.

## 9. Медиа и favicon

Все основные медиа лежат в `assets`:

- `assets/favicon.svg` — favicon placeholder.
- `assets/hero-fallback.jpg` — fallback-изображение для первого экрана и видео.
- `assets/hero-video.mp4` — видео в галерее.
- `assets/roof-1.jpg` ... `assets/roof-6.jpg` — фото для страниц и галереи.
- `assets/og-image.jpg` — картинка для Open Graph.

Изображения ниже первого экрана загружаются лениво через `loading="lazy"`.

## 10. Cloudflare Pages

Проект готовится как полностью статичный сайт: HTML, CSS, JS и файлы из `assets`.

Настройки при подключении репозитория в Cloudflare Pages:

- Framework preset: `None`
- Build command: оставить пустым
- Build output directory: `/`
- Production branch: `main`

Файлы `_headers` и `_redirects` лежат в корне проекта, то есть в build output directory. В `_redirects` хранится короткий переход `/bot` в Telegram. Доменные и HTTP-редиректы обрабатываются существующим Cloudflare Worker.

## Каталог крыш для Telegram-бота (`/katalog/`)

Витрина для тех, кто пришёл из бота: фотографии, цена за человека и актуальная
доступность. Открывается второй кнопкой меню «📸 Каталог» как Telegram Mini App.
**Все ссылки ведут в бота или внутрь каталога** — на сайт с его формой заявки
каталог не уводит.

Страницы:
- `/katalog/` — лента всех крыш, у каждой свайп-галерея и цена;
- `/katalog/<slug>/` — страница одной крыши: вся галерея целиком, без обрезки.

Обе **генерируются**, править их руками не нужно:

```bash
python3 tools/build-katalog.py                      # цены из живого /api/roofs
python3 tools/build-katalog.py --offline            # цены из снапшота src/index.js
python3 tools/build-katalog.py --prices-json f.json # цены из сохранённого ответа API
```

Что где лежит:
- `tools/katalog-data.json` — содержимое каталога: порядок крыш (повторяет
  нумерацию папок в `Локации/`), названия, описания, теги и список кадров с alt.
  Это источник правды: добавили фото — допишите сюда.
- `tools/katalog-template.html`, `tools/katalog-roof-template.html` — разметка;
  `tools/katalog-shared.css`, `tools/katalog-shared.js` — общие стили и скрипт.
- `tools/convert-photos.js` — готовит кадры из оригиналов:

```bash
node tools/convert-photos.js "Локации/1. Марксистская/IMG_8493.heic" marksistskaya-high-rise-02
```

Даёт `<base>-640` и `<base>-1280` в jpg и webp в `assets/locations/`. HEIC с
айфона сначала разворачивается системным `sips` — sharp собран без HEVC.

Статусы и цены на живой странице приходят из `/api/roofs` (та же гугл-таблица,
что у бота; правила «доступна/нет» в воркере совпадают с `is_available_status`
в боте). В HTML лежит снапшот цен на случай, если API не ответит.

Секция `/katalog/*` в `_headers` снимает `X-Frame-Options`: на web.telegram.org
Mini App живёт в iframe.

> **Перед деплоем** проверьте `.assetsignore`: `wrangler deploy` заливает всё из
> корня, кроме перечисленного там. Локальный `wrangler dev` создаёт `.wrangler/`
> с исходником воркера — эта папка должна оставаться в списке исключений.
