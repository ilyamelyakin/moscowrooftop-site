const LEAD_PATH = "/api/lead";
const MAX_BODY_BYTES = 12_000;
const ALLOWED_ORIGINS = new Set([
  "https://moscowrooftop.ru",
  "https://www.moscowrooftop.ru",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

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

function getReferrerHost(referrer) {
  if (!referrer) {
    return "Прямой переход";
  }

  try {
    return new URL(referrer).hostname || "Прямой переход";
  } catch {
    return "Не определён";
  }
}

function formatLeadMessage(lead) {
  const method = lead.contactMethod === "whatsapp" ? "WhatsApp" : "Telegram";
  const source = lead.utm.utm_source || getReferrerHost(lead.referrer);
  const sourceDetails = [
    lead.utm.utm_medium && `канал: ${lead.utm.utm_medium}`,
    lead.utm.utm_campaign && `кампания: ${lead.utm.utm_campaign}`,
  ].filter(Boolean);
  const sourceLine = sourceDetails.length
    ? `${source} (${sourceDetails.join(", ")})`
    : source;

  return [
    "<b>Новая заявка с сайта</b>",
    "",
    `<b>Дата:</b> ${escapeHtml(formatDate(lead.date))}`,
    `<b>Время:</b> ${escapeHtml(lead.time)}`,
    `<b>Количество человек:</b> ${lead.people}`,
    `<b>Имя:</b> ${escapeHtml(lead.name)}`,
    `<b>Ответить в:</b> ${method}`,
    `<b>Контакт:</b> ${escapeHtml(lead.contact)}`,
    "",
    `<b>Источник:</b> ${escapeHtml(sourceLine)}`,
    `<b>Страница:</b> ${escapeHtml(lead.page || "/")}`,
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

  let telegramResponse;

  try {
    telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: formatLeadMessage(lead),
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
    const isHttp =
      url.protocol === "http:" ||
      forwardedProto === "http" ||
      cfVisitor.includes('\"scheme\":\"http\"');

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

    if (url.pathname === "/bot" || url.pathname === "/bot/") {
      return Response.redirect("https://t.me/MoscowRoofTopBot?start=instagram", 302);
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
