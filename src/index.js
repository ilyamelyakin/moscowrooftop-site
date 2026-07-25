const LEAD_PATH = "/api/lead";
const ROOFS_PATH = "/api/roofs";
const MAX_BODY_BYTES = 12_000;
// Short slug aliases that may appear in external links; keep canonical URLs unique.
const PAGE_REDIRECTS = new Map([
  ["/ekskursii-po-krysham", "/ekskursii-po-krysham-moskvy/"],
  ["/fotosessiya-na-kryshe", "/fotosessiya-na-kryshe-moskva/"],
  ["/zakaty-na-kryshah", "/zakaty-na-kryshah-moskvy/"],
]);
const ALLOWED_ORIGINS = new Set([
  "https://moscowrooftop.ru",
  "https://www.moscowrooftop.ru",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
// Цены за 1 человека приходят из гугл-таблицы «Список крыш Москвы» (та же,
// что у Telegram-бота): колонки id,name,status,price_rub. Таблица открыта
// на чтение по ссылке, поэтому воркеру не нужны ключи Google API.
const PRICE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1VrEYHh_bFuKEf0Bme468Yh-gKNtoDDbXctqeOJt9-j4/export?format=csv&gid=0";
const PRICE_CACHE_URL = "https://moscowrooftop.ru/__cache/roof-sheet-v2";
const PRICE_CACHE_TTL_SECONDS = 300;
const PRICE_FETCH_TIMEOUT_MS = 4000;
// В таблице «Марксисткая» (без «с»), на сайте — «Марксистская».
const SHEET_NAME_ALIASES = new Map([["марксистская", "марксисткая"]]);
// Снапшот таблицы от 2026-07-25 — используется, только если Google недоступен.
const FALLBACK_ROOF_PRICES = new Map([
  ["фили 60 этажей", 3000],
  ["фили", 2500],
  ["киевская скатная", 2300],
  ["курская", 2300],
  ["марксисткая", 2500],
  ["новокузнецкая", 2500],
  ["римская", 2000],
  ["таганская", 3000],
  ["таганская скатная", 2500],
  ["шелепиха 9 этажей", 2000],
]);

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return cleanText(value, 500)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMoscowToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isValidContact(method, value) {
  if (method === "whatsapp") {
    return isValidPhone(value);
  }

  return /^@[a-zA-Z0-9_]{5,32}$/.test(value) || isValidPhone(value);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseLead(payload) {
  const lead = {
    date: cleanText(payload.date, 10),
    time: cleanText(payload.time, 5),
    people: Number(payload.people),
    name: cleanText(payload.name, 80),
    contactMethod: cleanText(payload.contactMethod, 12).toLowerCase(),
    contact: cleanText(payload.contact, 100),
    comment: cleanText(payload.comment, 500),
    roof: cleanText(payload.roof, 120),
    consent: payload.consent === true,
    website: cleanText(payload.website, 100),
    page: cleanText(payload.page, 160),
    referrer: cleanText(payload.referrer, 240),
    utm: {},
  };

  if (payload.utm && typeof payload.utm === "object" && !Array.isArray(payload.utm)) {
    UTM_KEYS.forEach((key) => {
      const value = cleanText(payload.utm[key], 100);
      if (value) {
        lead.utm[key] = value;
      }
    });
  }

  return lead;
}

function validateLead(lead) {
  if (!isValidDate(lead.date) || lead.date < getMoscowToday()) {
    return "Выберите сегодняшнюю или будущую дату.";
  }

  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(lead.time)) {
    return "Выберите удобное время.";
  }

  if (!Number.isInteger(lead.people) || lead.people < 1 || lead.people > 30) {
    return "Укажите количество человек от 1 до 30.";
  }

  if (lead.name.length < 2) {
    return "Укажите ваше имя.";
  }

  if (!new Set(["telegram", "whatsapp"]).has(lead.contactMethod)) {
    return "Выберите способ связи.";
  }

  if (!isValidContact(lead.contactMethod, lead.contact)) {
    return lead.contactMethod === "whatsapp"
      ? "Укажите корректный номер WhatsApp."
      : "Укажите @username в Telegram или номер телефона.";
  }

  if (!lead.consent) {
    return "Подтвердите согласие на обработку данных.";
  }

  return "";
}

function normalizeRoofName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

// Строка таблицы -> { price: number | null, on: boolean }.
// Крыша скрывается только при явном status=off, иначе считается доступной.
function parseRoofSheetCsv(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  const header = parseCsvLine(lines[0] || "").map((cell) => cell.trim().toLowerCase());
  const nameIndex = header.indexOf("name");
  const priceIndex = header.indexOf("price_rub");
  const statusIndex = header.indexOf("status");

  if (nameIndex === -1 || priceIndex === -1) {
    return {};
  }

  const roofs = {};

  lines.slice(1).forEach((line) => {
    const cells = parseCsvLine(line);
    const name = normalizeRoofName(cells[nameIndex]);
    if (!name) {
      return;
    }
    const price = Number.parseInt(String(cells[priceIndex] || "").replace(/[^\d]/g, ""), 10);
    const status = String(statusIndex === -1 ? "" : cells[statusIndex] || "")
      .trim()
      .toLowerCase();
    roofs[name] = {
      price: Number.isInteger(price) && price > 0 ? price : null,
      on: status !== "off",
    };
  });

  return roofs;
}

async function fetchRoofSheet() {
  const cache = caches.default;
  const cacheKey = new Request(PRICE_CACHE_URL);
  const cached = await cache.match(cacheKey);

  if (cached) {
    return new Map(Object.entries(await cached.json()));
  }

  // Promise.race поверх AbortController: даже если рантайм игнорирует
  // signal (так делает локальный miniflare), ждём Google не дольше таймаута.
  const controller = new AbortController();
  let timer;
  const fetchPromise = fetch(PRICE_SHEET_CSV_URL, {
    signal: controller.signal,
    headers: { Accept: "text/csv" },
  });
  fetchPromise.catch(() => {});
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Sheet fetch timed out"));
    }, PRICE_FETCH_TIMEOUT_MS);
  });
  let response;

  try {
    response = await Promise.race([fetchPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Sheet responded with ${response.status}`);
  }

  const roofs = parseRoofSheetCsv(await response.text());

  if (!Object.keys(roofs).length) {
    throw new Error("Sheet contained no roofs");
  }

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(roofs), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `max-age=${PRICE_CACHE_TTL_SECONDS}`,
      },
    })
  );

  return new Map(Object.entries(roofs));
}

// Возвращает цену за 1 человека или null; никогда не роняет обработку заявки.
async function getRoofPrice(roofName) {
  const normalized = normalizeRoofName(roofName);
  const lookupKey = SHEET_NAME_ALIASES.get(normalized) || normalized;

  if (!lookupKey) {
    return null;
  }

  try {
    const roofs = await fetchRoofSheet();
    return roofs.get(lookupKey)?.price ?? FALLBACK_ROOF_PRICES.get(lookupKey) ?? null;
  } catch {
    return FALLBACK_ROOF_PRICES.get(lookupKey) ?? null;
  }
}

// GET /api/roofs -> { ok: true, roofs: { "<имя>": true|false } } (true = показывать).
// При недоступной таблице отвечает 503 — клиент в этом случае ничего не скрывает.
async function handleRoofsRequest(request) {
  if (request.method !== "GET") {
    return jsonResponse(
      { ok: false, error: "Метод не поддерживается." },
      405,
      { Allow: "GET" }
    );
  }

  let sheet;

  try {
    sheet = await fetchRoofSheet();
  } catch {
    return jsonResponse({ ok: false }, 503);
  }

  const roofs = {};
  sheet.forEach((entry, name) => {
    roofs[name] = entry.on;
  });
  // Зеркалим алиасы, чтобы клиент искал по написанию с сайта.
  SHEET_NAME_ALIASES.forEach((sheetName, siteName) => {
    if (roofs[sheetName] !== undefined) {
      roofs[siteName] = roofs[sheetName];
    }
  });

  return jsonResponse({ ok: true, roofs }, 200, {
    "Cache-Control": `public, max-age=${PRICE_CACHE_TTL_SECONDS}`,
  });
}

function extractPhoneDigits(contact) {
  const digits = contact.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

function formatLeadMessage(lead, pricePerPerson) {
  const username = lead.contact.startsWith("@") ? lead.contact : "";
  const phoneDigits = username ? "" : extractPhoneDigits(lead.contact);
  const phoneLine = phoneDigits
    ? lead.contactMethod === "whatsapp"
      ? `${phoneDigits} (WhatsApp)`
      : phoneDigits
    : "—";
  const userLine = username ? `${lead.name} (${username})` : lead.name;
  const priceLine = pricePerPerson ? `${pricePerPerson} ₽` : "—";
  const totalLine = pricePerPerson ? `${pricePerPerson * lead.people} ₽` : "—";

  return [
    "📥 Новая заявка с сайта",
    "",
    `👤 Пользователь: ${escapeHtml(userLine)}`,
    `📍 Локация: ${escapeHtml(lead.roof || "—")}`,
    `💰 Цена за 1 чел.: ${priceLine}`,
    `📅 Дата: ${escapeHtml(formatDate(lead.date))}`,
    `⏰ Время: ${escapeHtml(lead.time)}`,
    `👥 Участников: ${lead.people}`,
    `🧾 Итого: ${totalLine}`,
    `📞 Телефон: ${escapeHtml(phoneLine)}`,
    `💬 Комментарий: ${escapeHtml(lead.comment || "—")}`,
  ].join("\n");
}

function isAllowedOrigin(request, url) {
  const origin = request.headers.get("Origin");

  if (!origin) {
    return false;
  }

  if (ALLOWED_ORIGINS.has(origin) || origin === url.origin) {
    return true;
  }

  return false;
}

async function handleLeadRequest(request, env, url) {
  if (request.method !== "POST") {
    return jsonResponse(
      { ok: false, error: "Метод не поддерживается." },
      405,
      { Allow: "POST" }
    );
  }

  if (!isAllowedOrigin(request, url)) {
    return jsonResponse({ ok: false, error: "Запрос отклонён." }, 403);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, error: "Слишком большой запрос." }, 413);
  }

  let payload;

  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: "Слишком большой запрос." }, 413);
    }
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, error: "Не удалось прочитать заявку." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ ok: false, error: "Некорректные данные заявки." }, 400);
  }

  const lead = parseLead(payload);

  // Quietly accept honeypot submissions so automated senders get no useful signal.
  if (lead.website) {
    return jsonResponse({ ok: true });
  }

  const validationError = validateLead(lead);
  if (validationError) {
    return jsonResponse({ ok: false, error: validationError }, 400);
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return jsonResponse(
      { ok: false, error: "Форма временно недоступна. Попробуйте написать нам в Telegram." },
      503
    );
  }

  const pricePerPerson = await getRoofPrice(lead.roof);
  let telegramResponse;

  try {
    telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: formatLeadMessage(lead, pricePerPerson),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
  } catch {
    return jsonResponse(
      { ok: false, error: "Не удалось отправить заявку. Попробуйте ещё раз." },
      502
    );
  }

  if (!telegramResponse.ok) {
    return jsonResponse(
      { ok: false, error: "Не удалось отправить заявку. Попробуйте ещё раз." },
      502
    );
  }

  return jsonResponse({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const cfVisitor = request.headers.get("cf-visitor") || "";
    // Requests proxied by Cloudflare always carry cf-visitor/x-forwarded-proto;
    // their absence means local wrangler dev, where forcing HTTPS would loop.
    const isLocalDev =
      (!cfVisitor && !forwardedProto) ||
      url.port !== "" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1";
    const isHttp =
      !isLocalDev &&
      (url.protocol === "http:" ||
        forwardedProto === "http" ||
        cfVisitor.includes('\"scheme\":\"http\"'));

    if (isHttp || url.hostname === "www.moscowrooftop.ru") {
      url.protocol = "https:";
      url.hostname = "moscowrooftop.ru";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.endsWith("/index.html")) {
      url.pathname = url.pathname.slice(0, -"index.html".length) || "/";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === LEAD_PATH) {
      return handleLeadRequest(request, env, url);
    }

    if (url.pathname === ROOFS_PATH) {
      return handleRoofsRequest(request);
    }

    if (url.pathname === "/bot" || url.pathname === "/bot/") {
      return Response.redirect("https://t.me/MoscowRoofTopBot?start=instagram", 302);
    }

    const normalizedPath =
      url.pathname.length > 1 && url.pathname.endsWith("/")
        ? url.pathname.slice(0, -1)
        : url.pathname;
    const redirectTarget = PAGE_REDIRECTS.get(normalizedPath);
    if (redirectTarget) {
      url.pathname = redirectTarget;
      return Response.redirect(url.toString(), 301);
    }

    const pathSegment = url.pathname.split("/").pop();
    if (pathSegment && !pathSegment.includes(".")) {
      url.pathname = `${url.pathname}/`;
      return Response.redirect(url.toString(), 301);
    }

    const assetUrl = new URL(request.url);
    const lastSegment = assetUrl.pathname.split("/").pop();

    if (assetUrl.pathname.endsWith("/")) {
      assetUrl.pathname = `${assetUrl.pathname}index.html`;
    } else if (lastSegment && !lastSegment.includes(".")) {
      assetUrl.pathname = `${assetUrl.pathname}/index.html`;
    }

    const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));

    if (url.hostname.endsWith(".workers.dev")) {
      const headers = new Headers(response.headers);
      headers.set("X-Robots-Tag", "noindex");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
