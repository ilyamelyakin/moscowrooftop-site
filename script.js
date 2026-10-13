const YM_COUNTER_ID = '110631938';
const GA_MEASUREMENT_ID = 'G-98JBGFFDDG';

const TELEGRAM_BOT_URL = 'https://t.me/MoscowRoofTopBot';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_STORAGE_KEY = 'moscow_rooftop_utm';
const PLACEHOLDER_YM_ID = 'YOUR_YM_COUNTER_ID';
const PLACEHOLDER_GA_ID = 'G-XXXXXXXXXX';
const ANALYTICS_HOSTS = new Set(['moscowrooftop.ru', 'www.moscowrooftop.ru']);
const ROOF_SELECTION_KEY = 'moscow_rooftop_selected_roof';
// Image entries may carry `w: [width640, width1280]` when the real pixel
// widths differ from the default portrait 480/960 pair.
const ROOF_GALLERIES = {
  'fili-city': {
    name: 'Фили 60 этажей',
    images: [
      { base: 'assets/locations/fili-moscow-city-05', alt: 'Панорама Москва-Сити и Москва-реки с большой высоты вечером' },
      { base: 'assets/locations/fili-moscow-city-04', alt: 'Панорама делового центра Москвы после заката' },
      { base: 'assets/locations/fili-moscow-city-03', alt: 'Вечерний вид на небоскрёбы Москва-Сити' },
      { base: 'assets/locations/fili-moscow-city-02', alt: 'Подсвеченные башни Москва-Сити и изгиб Москва-реки' },
      { base: 'assets/locations/fili-moscow-city-01', alt: 'Башни Москва-Сити и вечерний город за ограждением высокой площадки' },
    ],
  },
  'fili-rooftop': {
    name: 'Фили',
    images: [
      { base: 'assets/locations/fili-rooftop-04', alt: 'Башни Москва-Сити в розовом закатном свете, внизу крыша и набережная' },
      { base: 'assets/locations/fili-rooftop-05', alt: 'Закатное солнце за тёмной башней и силуэты городских кварталов' },
      { base: 'assets/locations/fili-rooftop-06', alt: 'Вечерняя панорама: золотые купола храма и высотки на горизонте' },
      { base: 'assets/locations/fili-rooftop-03', alt: 'Молодой человек на крыше на фоне панорамы Москва-Сити' },
      { base: 'assets/locations/fili-rooftop-02', alt: 'Девушка на крыше на фоне башен Москва-Сити в закатном свете', w: [640, 1280] },
      { base: 'assets/locations/fili-rooftop-01', alt: 'Вид с крыши на башни Москва-Сити, реку и жилые кварталы вечером' },
    ],
  },
  'kievskaya-skatnaya': {
    name: 'Киевская Скатная',
    images: [
      { base: 'assets/locations/kievskaya-skatnaya-01', alt: 'Гостиница «Украина» на фоне алого закатного неба', w: [360, 720] },
      { base: 'assets/locations/kievskaya-skatnaya-03', alt: 'Девушка на скатной крыше на фоне гостиницы «Украина» вечером' },
      { base: 'assets/locations/kievskaya-skatnaya-04', alt: 'Вид со скатной крыши на башни Москва-Сити на закате' },
      { base: 'assets/locations/kievskaya-skatnaya-02', alt: 'Фотосессия на скатной крыше у подсвеченной башни Киевского вокзала' },
    ],
  },
  'kurskaya-sunset': {
    name: 'Курская',
    images: [
      { base: 'assets/locations/kurskaya-center-view-03', alt: 'Оранжевый закат над высотками и крышами центра Москвы' },
      { base: 'assets/locations/kurskaya-center-view-02', alt: 'Подсвеченная сталинская высотка в вечернем городе' },
      { base: 'assets/locations/kurskaya-center-view-01', alt: 'Вечерняя панорама исторического центра Москвы' },
      { base: 'assets/locations/kurskaya-center-view-04', alt: 'Купола, городские крыши и Москва-Сити вдалеке' },
    ],
  },
  'marksistskaya-high-rise': {
    name: 'Марксистская',
    images: [
      { base: 'assets/locations/marksistskaya-high-rise-04', alt: 'Силуэт высотки на Котельнической набережной против закатного солнца' },
      { base: 'assets/locations/marksistskaya-high-rise-03', alt: 'Башня со шпилем и строительный кран на фоне вечернего неба' },
      { base: 'assets/locations/marksistskaya-high-rise-02', alt: 'Купол храма и сталинская высотка в золотой дымке над крышами центра' },
      { base: 'assets/locations/marksistskaya-high-rise-08', alt: 'Останкинская телебашня и городские крыши в розовых сумерках' },
      { base: 'assets/locations/marksistskaya-high-rise-01', alt: 'Сталинская высотка и вечерний город под красным небом' },
      { base: 'assets/locations/marksistskaya-high-rise-09', alt: 'Башни Москва-Сити в дымке и золотой купол храма над жилыми домами' },
      { base: 'assets/locations/marksistskaya-high-rise-07', alt: 'Высотка на Котельнической набережной под розово-оранжевым небом' },
      { base: 'assets/locations/marksistskaya-high-rise-06', alt: 'Фотосессия на крыше у парапета, внизу купола и кварталы центра' },
      { base: 'assets/locations/marksistskaya-high-rise-05', alt: 'Девушка на крыше в закатном свете, за спиной сталинская высотка' },
    ],
  },
  'novokuznetskaya': {
    name: 'Новокузнецкая',
    images: [
      { base: 'assets/locations/novokuznetskaya-02', alt: 'Подсвеченная высотка на Котельнической набережной над Москва-рекой вечером' },
      { base: 'assets/locations/novokuznetskaya-01', alt: 'Высотка на Котельнической набережной и теплоход на Москва-реке днём' },
    ],
  },
  'rimskaya-skyline': {
    name: 'Римская',
    images: [
      { base: 'assets/locations/rimskaya-city-sunset-01', alt: 'Сталинская высотка на фоне Москва-Сити в золотом свете' },
      { base: 'assets/locations/rimskaya-city-sunset-07', alt: 'Фотосессия на крыше на фоне закатной панорамы Москвы' },
      { base: 'assets/locations/rimskaya-city-sunset-03', alt: 'Закатное солнце над городом, высотка и купола в дымке', w: [360, 720] },
      { base: 'assets/locations/rimskaya-city-sunset-04', alt: 'Сталинская высотка и подсвеченная церковь в закатной дымке' },
      { base: 'assets/locations/rimskaya-city-sunset-05', alt: 'Крыши домов и облачное вечернее небо над городом' },
      { base: 'assets/locations/rimskaya-city-sunset-06', alt: 'Дневной вид с крыши: храмы, трамвай и сталинская высотка вдали' },
    ],
  },
  'smolenskaya': {
    name: 'Смоленская',
    images: [
      { base: 'assets/locations/smolenskaya-04', alt: 'Москва-река с прогулочным теплоходом и мостом, за рекой башни Москва-Сити и гостиница «Украина»' },
      { base: 'assets/locations/smolenskaya-05', alt: 'Высотка МИД со шпилем в закатном свете под облачным небом' },
      { base: 'assets/locations/smolenskaya-06', alt: 'Оранжевый закат за башнями Москва-Сити над крышами жилых кварталов' },
      { base: 'assets/locations/smolenskaya-07', alt: 'Закат над Москвой-рекой: мост, набережная и силуэт сталинской высотки на горизонте' },
      { base: 'assets/locations/smolenskaya-08', alt: 'Вид с кровли на гостиницу «Украина», Москву-реку и башни Сити вечером' },
      { base: 'assets/locations/smolenskaya-09', alt: 'Бородинский мост с вечерним потоком машин, Киевский вокзал и красно-белые трубы на фоне заката' },
      { base: 'assets/locations/smolenskaya-01', alt: 'Ночная Москва-река с подсвеченным арочным мостом, гостиница «Украина» и башни Сити' },
      { base: 'assets/locations/smolenskaya-02', alt: 'Вечерняя панорама набережной: подсвеченная гостиница «Украина» и Москва-Сити' },
    ],
  },
  'taganskaya-golden-hour': {
    name: 'Таганская',
    images: [
      { base: 'assets/locations/taganskaya-golden-hour-03', alt: 'Солнце и силуэты центра Москвы в золотом вечернем свете' },
      { base: 'assets/locations/taganskaya-golden-hour-07', alt: 'Высотка на Котельнической набережной в вечерней подсветке' },
      { base: 'assets/locations/taganskaya-golden-hour-02', alt: 'Городские здания и высотка в лучах золотого часа' },
      { base: 'assets/locations/taganskaya-golden-hour-09', alt: 'Москва-река, мост и вечерние огни города с высоты' },
      { base: 'assets/locations/taganskaya-golden-hour-10', alt: 'Закат над городом с силуэтами Москва-Сити на горизонте' },
      { base: 'assets/locations/taganskaya-golden-hour-01', alt: 'Панорама центра Москвы в тёплом вечернем свете' },
      { base: 'assets/locations/taganskaya-golden-hour-08', alt: 'Стеклянный купол Дома музыки и вечерние небоскрёбы' },
      { base: 'assets/locations/taganskaya-golden-hour-04', alt: 'Вечерняя панорама города с силуэтом сталинской высотки на горизонте' },
      { base: 'assets/locations/taganskaya-golden-hour-06', alt: 'Вид с крыши на Кремль и собор Василия Блаженного в закатном небе' },
      { base: 'assets/locations/taganskaya-golden-hour-05', alt: 'Крыша, Москва-река и высотка на Котельнической на закате' },
    ],
  },
  'taganskaya-skatnaya': {
    name: 'Таганская Скатная',
    images: [
      { base: 'assets/locations/taganskaya-skatnaya-01', alt: 'Скатная крыша и высотка на Котельнической набережной на закате' },
      { base: 'assets/locations/taganskaya-skatnaya-05', alt: 'Вечерний вид на высотку у Краснохолмского моста и Москва-реку' },
      { base: 'assets/locations/taganskaya-skatnaya-06', alt: 'Подсвеченные дома на набережной и Москва-Сити на горизонте' },
      { base: 'assets/locations/taganskaya-skatnaya-07', alt: 'Мост через Москва-реку и вечерние огни города с крыши' },
      { base: 'assets/locations/taganskaya-skatnaya-04', alt: 'Москва-река, набережные и вечерняя панорама центра с крыши' },
    ],
  },
  'shelepikha-9': {
    name: 'Шелепиха 9 этажей',
    images: [
      { base: 'assets/locations/shelepikha-9-01', alt: 'Ночные башни Москва-Сити в огнях и силуэт человека на крыше', w: [464, 928] },
    ],
  },
};


function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Мгновенно, несмотря на html { scroll-behavior: smooth }.
function jumpScroll(scroll) {
  const root = document.documentElement;
  root.style.scrollBehavior = 'auto';
  scroll();
  root.style.scrollBehavior = '';
}

// Дальше полутора экранов — прыжок почти к цели, остаток плавно.
function glideTo(target) {
  const root = document.documentElement;
  const margin = parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
  const maxY = Math.max(0, root.scrollHeight - window.innerHeight);
  const targetY = Math.min(maxY, Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin));
  const distance = targetY - window.scrollY;

  if (prefersReducedMotion()) {
    jumpScroll(() => window.scrollTo(0, targetY));
    return;
  }

  if (Math.abs(distance) > window.innerHeight * 1.5) {
    jumpScroll(() => window.scrollTo(0, targetY - Math.sign(distance) * window.innerHeight * 0.6));
  }

  window.scrollTo({ top: targetY, behavior: 'smooth' });
}

// callback — когда прокрутка встала (6 кадров без движения), но не позже 2.5 с.
function whenScrollSettles(callback) {
  const startedAt = performance.now();
  let lastY = window.scrollY;
  let stillFrames = 0;
  let frame = 0;

  const tick = (now) => {
    frame += 1;
    if (window.scrollY === lastY) {
      stillFrames += 1;
    } else {
      stillFrames = 0;
      lastY = window.scrollY;
    }

    if ((frame > 3 && stillFrames >= 6) || now - startedAt > 2500) {
      callback();
      return;
    }

    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
}

// Якоря — через glideTo. Фокус на раздел, не на поле: иначе ложный lead_form_start.
function bindAnchorLinks() {
  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.target.closest('a[href^="#"]');
    const hash = link?.getAttribute('href') || '';
    if (hash.length < 2) {
      return;
    }

    let target = null;
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (error) {
      return;
    }
    if (!target) {
      return;
    }

    event.preventDefault();
    if (window.location.hash === hash) {
      window.history.replaceState(null, '', hash);
    } else {
      window.history.pushState(null, '', hash);
    }

    glideTo(target);
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  });
}

// Так же нормализует имена воркер (/api/roofs) — написания должны совпадать.
function normalizeRoofName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

// Автоматические браузеры (Playwright, Selenium — проверки сайта) в счётчики не пускаем:
// 10–12.10.2026 они дали в GA4 «всплеск» прямых заходов с 8% вовлечённости.
function isAnalyticsHost() {
  return ANALYTICS_HOSTS.has(window.location.hostname) && !navigator.webdriver;
}

function isRealYMId() {
  return Boolean(YM_COUNTER_ID && YM_COUNTER_ID !== PLACEHOLDER_YM_ID);
}

function isRealGAId() {
  return Boolean(GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== PLACEHOLDER_GA_ID);
}

function initYandexMetrika() {
  if (!isAnalyticsHost() || !isRealYMId() || typeof ym === 'function') {
    return;
  }

  (function (m, e, t, r, i, k, a) {
    m[i] =
      m[i] ||
      function () {
        (m[i].a = m[i].a || []).push(arguments);
      };
    m[i].l = 1 * new Date();
    k = e.createElement(t);
    a = e.getElementsByTagName(t)[0];
    k.async = 1;
    k.src = r;
    a.parentNode.insertBefore(k, a);
  })(
    window,
    document,
    'script',
    `https://mc.yandex.ru/metrika/tag.js?id=${encodeURIComponent(YM_COUNTER_ID)}`,
    'ym'
  );

  ym(YM_COUNTER_ID, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
  });
}

function initGoogleAnalytics() {
  if (!isAnalyticsHost() || !isRealGAId() || typeof gtag === 'function') {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}

function trackYMGoal(goalName, params = {}) {
  if (isAnalyticsHost() && typeof ym === 'function' && YM_COUNTER_ID !== PLACEHOLDER_YM_ID) {
    ym(YM_COUNTER_ID, 'reachGoal', goalName, params);
  }
}

function trackGAEvent(eventName, params = {}) {
  if (
    isAnalyticsHost() &&
    typeof gtag === 'function' &&
    GA_MEASUREMENT_ID !== PLACEHOLDER_GA_ID
  ) {
    gtag('event', eventName, params);
  }
}

function saveUTMParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const utmParams = {};

  UTM_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      utmParams[key] = value;
    }
  });

  if (!Object.keys(utmParams).length) {
    return;
  }

  try {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmParams));
  } catch (error) {
    console.warn('[Analytics] UTM storage is unavailable', error);
  }
}

function getStoredUTMParams() {
  try {
    const rawValue = sessionStorage.getItem(UTM_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : {};
  } catch (error) {
    console.warn('[Analytics] UTM params are unavailable', error);
    return {};
  }
}

function trackEvent(eventName, params = {}) {
  const eventParams = {
    ...getStoredUTMParams(),
    ...params,
  };

  trackYMGoal(eventName, eventParams);
  trackGAEvent(eventName, eventParams);

  // Отладочный лог только вне продакшена, чтобы не шуметь в консоли сайта.
  if (!isAnalyticsHost()) {
    console.log('[Analytics]', eventName, eventParams);
  }
}

function normalizeStartSegment(value, maxLength = 30) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength)
    .replace(/^_+|_+$/g, '');
}

function getUTMSourceSlug() {
  const utmSource = String(getStoredUTMParams().utm_source || '').toLowerCase();

  if (!utmSource) {
    return '';
  }

  if (utmSource.includes('instagram') || utmSource.includes('insta') || utmSource === 'ig') {
    return 'instagram';
  }

  if (utmSource.includes('tiktok') || utmSource === 'tt') {
    return 'tiktok';
  }

  return normalizeStartSegment(utmSource, 20);
}

function buildTelegramDeepLink(location = 'page') {
  const locationSlug = normalizeStartSegment(location.replace(/^site_/, '')) || 'page';
  const sourceSlug = getUTMSourceSlug();
  const startParam = ['site', locationSlug, sourceSlug]
    .filter(Boolean)
    .join('_')
    .slice(0, 64)
    .replace(/_+$/g, '');

  const url = new URL(TELEGRAM_BOT_URL);
  url.searchParams.set('start', startParam);
  return url.toString();
}

function getLinkLocation(link) {
  if (link.dataset.location) {
    return link.dataset.location;
  }

  if (link.closest('.site-header')) {
    return 'header';
  }

  if (link.closest('.hero, .page-hero')) {
    return 'hero';
  }

  if (link.closest('#gallery, .gallery-section')) {
    return 'gallery';
  }

  if (link.closest('#booking, .booking')) {
    return 'how_it_works';
  }

  if (link.closest('.final-cta')) {
    return 'final';
  }

  if (link.closest('.site-footer')) {
    return 'footer';
  }

  if (link.closest('.side-panel')) {
    return 'side_panel';
  }

  if (link.closest('.page-faq, .faq')) {
    return 'faq';
  }

  if (link.closest('.content-panel')) {
    return 'content';
  }

  return 'page';
}

function getLinkGoal(link) {
  if (link.dataset.goal) {
    return link.dataset.goal;
  }

  const href = link.getAttribute('href') || '';

  if (href.startsWith('tel:')) {
    return 'phone_click';
  }

  if (href.includes('instagram.com')) {
    return 'instagram_click';
  }

  if (href.includes('tiktok.com')) {
    return 'tiktok_click';
  }

  if (href.includes('t.me/MoscowRoofTopBot')) {
    return 'telegram_click';
  }

  return '';
}

function getDestination(goalName) {
  const destinations = {
    telegram_click: 'telegram_bot',
    instagram_click: 'instagram',
    tiktok_click: 'tiktok',
    phone_click: 'phone',
    lead_form_open: 'lead_form',
  };

  return destinations[goalName] || '';
}

function updateTelegramLinks() {
  document.querySelectorAll('a[href*="t.me/MoscowRoofTopBot"]').forEach((link) => {
    const location = getLinkLocation(link);
    link.href = buildTelegramDeepLink(location);
    link.dataset.goal = link.dataset.goal || 'telegram_click';
  });
}

function bindTrackedLinks() {
  document
    .querySelectorAll('.track-link, a[href^="tel:"]')
    .forEach((link) => {
      link.addEventListener('click', () => {
        const goalName = getLinkGoal(link);

        if (!goalName) {
          return;
        }

        const destination = getDestination(goalName);
        const params = {
          location: getLinkLocation(link),
        };

        if (destination) {
          params.destination = destination;
        }

        trackEvent(goalName, params);
      });
    });
}

function bindGalleryView() {
  const gallery = document.querySelector('#gallery, .gallery-section');

  if (!gallery) {
    return;
  }

  let isTracked = false;

  const sendGalleryView = () => {
    if (isTracked) {
      return;
    }

    isTracked = true;
    trackEvent('gallery_view', { section: 'gallery' });
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            sendGalleryView();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(gallery);
    return;
  }

  const checkGalleryPosition = () => {
    const rect = gallery.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.75 && rect.bottom >= 0) {
      sendGalleryView();
      window.removeEventListener('scroll', checkGalleryPosition);
    }
  };

  window.addEventListener('scroll', checkGalleryPosition, { passive: true });
  checkGalleryPosition();
}

// Линия прочитанного в шапке там, где CSS не умеет scroll-timeline (Firefox, старый Safari).
function bindReadProgress() {
  const header = document.querySelector('.site-header');
  if (!header || (window.CSS?.supports && CSS.supports('animation-timeline: scroll()'))) {
    return;
  }

  let queued = false;
  const update = () => {
    queued = false;
    const root = document.documentElement;
    const max = root.scrollHeight - window.innerHeight;
    header.style.setProperty('--read', max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)).toFixed(4) : '0');
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  update();
}

// Беззвучные фоновые ролики не грузим при экономии трафика, медленной сети и «уменьшить движение».
function allowsAmbientVideo() {
  const connection = navigator.connection;
  const slowNetwork = connection?.saveData || /(^|-)(2g|3g)$/.test(connection?.effectiveType || '');
  return !slowNetwork && !prefersReducedMotion() && 'IntersectionObserver' in window;
}

// Шапка главной: ролик поверх заставки (заставка — его первый кадр, подмена незаметна).
// Экран «стоя» — вертикальный ролик, «лёжа» — горизонтальный. Грузится после load, чтобы не
// отнимать канал у заставки (LCP), и стоит на паузе, пока шапку не видно.
function bindHeroVideo() {
  const holder = document.querySelector('[data-hero-video-landscape]');
  const log = heroDebugLog;

  if (log) {
    const connection = navigator.connection;
    const probe = document.createElement('video');
    log(navigator.userAgent);
    log(connection
      ? `сеть: ${connection.effectiveType}, rtt ${connection.rtt} мс, ${connection.downlink} Мбит/с, экономия трафика: ${connection.saveData}`
      : 'сеть: браузер не сообщает');
    log(`меньше движения: ${prefersReducedMotion()}, стоя: ${window.matchMedia('(orientation: portrait)').matches}, ширина шапки: ${holder?.clientWidth}`);
    log(`AV1: «${probe.canPlayType('video/mp4; codecs="av01.0.05M.08"')}», H.264: «${probe.canPlayType('video/mp4; codecs="avc1.640028"')}»`);
  }

  if (!holder || !allowsAmbientVideo()) {
    log?.('ролик не ставим: экономия трафика, медленная сеть или «меньше движения»');
    return;
  }

  const portrait = window.matchMedia('(orientation: portrait)');
  let video = null;
  let visible = false;

  const drop = () => {
    if (video) {
      log?.('ролик убран — осталась заставка');
    }
    holder.classList.remove('is-live');
    video?.remove();
    video = null;
  };

  const mount = () => {
    drop();
    // Телефону стоя хватает 720 (низ шапки под затемнением), планшету стоя — 1080;
    // горизонтальный 1920 — для широких и плотных экранов.
    const width = holder.clientWidth;
    const [base, size] = portrait.matches
      ? [holder.dataset.heroVideoPortrait, width > 540 ? 1080 : 720]
      : [holder.dataset.heroVideoLandscape, width * (window.devicePixelRatio || 1) > 1400 ? 1920 : 1280];
    const current = document.createElement('video');
    current.className = 'hero-video';
    current.muted = true;
    current.defaultMuted = true;
    current.loop = true;
    current.playsInline = true;
    current.setAttribute('playsinline', '');
    current.setAttribute('disablepictureinpicture', '');
    current.preload = 'auto';
    [
      [`${base}-${size}.mp4`, `video/mp4; codecs="av01.0.${size >= 1080 ? '08' : '05'}M.08"`],
      [`${base}-${size}-h264.mp4`, 'video/mp4; codecs="avc1.640028"'],
    ].forEach(([src, type]) => {
      const source = document.createElement('source');
      source.src = src;
      source.type = type;
      current.append(source);
    });
    // Ошибка последнего источника — значит, не сыграл ни один: остаётся заставка.
    current.lastElementChild.addEventListener('error', () => video === current && drop());
    current.addEventListener('playing', () => holder.classList.add('is-live'), { once: true });
    if (log) {
      log(`ставлю ролик ${base.split('/').pop()}-${size}`);
      current.querySelectorAll('source').forEach((source) => {
        source.addEventListener('error', () => log(`не подошёл: ${source.src.split('/').pop()}`));
      });
      ['loadstart', 'loadedmetadata', 'canplay', 'playing', 'waiting', 'stalled', 'pause', 'error'].forEach((type) => {
        current.addEventListener(type, () => {
          const file = current.currentSrc.split('/').pop() || '—';
          const error = current.error ? `, ошибка ${current.error.code} ${current.error.message || ''}` : '';
          log(`${type}: ${file}, готовность ${current.readyState}, сеть ${current.networkState}${error}`);
        });
      });
    }
    holder.append(current);
    video = current;
  };

  const play = () => {
    if (!video || !visible || document.hidden) {
      return;
    }
    const current = video;
    current.play()?.catch((error) => {
      log?.(`play() отклонён: ${error?.name} ${error?.message || ''}`);
      // AbortError — успели поставить на паузу до старта. Остальное (например, автозапуск
      // запрещён режимом энергосбережения iOS) — оставляем заставку.
      if (error?.name !== 'AbortError' && video === current) {
        drop();
      }
    });
  };

  const start = () => {
    mount();
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      log?.(`шапка ${visible ? 'на экране' : 'за экраном'}`);
      if (visible) {
        play();
      } else {
        video?.pause();
      }
    }).observe(holder);
    document.addEventListener('visibilitychange', () => (document.hidden ? video?.pause() : play()));
    portrait.addEventListener?.('change', () => {
      mount();
      play();
    });
  };

  // При «появлении» сайта (html.intro) ролик ставим, когда закончатся сами анимации mr-intro-*:
  // монтаж <video> посреди них отнимал кадры. Ждём анимации, а не часы — они стартуют с первой
  // отрисовки, а на мобильной сети она бывает и через секунду; в фоновой вкладке ждут показа.
  // Отменённая анимация отклоняет finished — catch, чтобы ролик всё равно поставился.
  // Заставка — первый кадр ролика, разницы не видно.
  const begin = () => {
    log?.('страница загрузилась (load)');
    const entrance = document.documentElement.classList.contains('intro') && document.getAnimations
      ? document.getAnimations().filter((animation) => animation.animationName?.startsWith('mr-intro') && animation.playState !== 'finished')
      : [];
    if (entrance.length) {
      log?.(`жду конца появления сайта: анимаций ${entrance.length}`);
      Promise.all(entrance.map((animation) => animation.finished.catch(() => {}))).then(start);
    } else {
      start();
    }
  };

  if (document.readyState === 'complete') {
    begin();
  } else {
    log?.('жду полной загрузки страницы (load)…');
    window.addEventListener('load', begin, { once: true });
    if (log) {
      window.setTimeout(() => document.readyState !== 'complete' && log('load всё ещё не наступил: что-то долго грузится'), 8000);
    }
  }
}

// Журнал на экране для проверки ролика шапки на телефоне: открыть /?debug-video.
// Временный — убрать, когда причина найдена. Ловит и ошибки скриптов: если что-то падает
// раньше bindHeroVideo, ролик просто не ставится.
const heroDebugLog = /[?&]debug-video(?:[&=]|$)/.test(window.location.search) ? createDebugLog() : null;

function createDebugLog() {
  const box = document.createElement('pre');
  box.style.cssText =
    'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;max-height:50vh;overflow:auto;margin:0;' +
    'padding:10px;border-radius:8px;background:rgba(0,0,0,.88);color:#b6f7b0;font:11px/1.45 ui-monospace,monospace;' +
    'white-space:pre-wrap;word-break:break-word';
  (document.body || document.documentElement).append(box);
  const log = (message) => {
    box.textContent += `${(performance.now() / 1000).toFixed(1)} с  ${message}\n`;
    box.scrollTop = box.scrollHeight;
  };
  window.addEventListener('error', (event) => log(`ошибка скрипта: ${event.message} (${event.filename?.split('/').pop()}:${event.lineno})`));
  window.addEventListener('unhandledrejection', (event) => log(`ошибка скрипта: ${event.reason?.message || event.reason}`));
  return log;
}

// «Живая» плитка галереи: короткая беззвучная петля поверх фото. Играет, только пока плитка на экране.
function bindLiveTiles() {
  const tiles = document.querySelectorAll('[data-live-video]');

  if (!tiles.length || !allowsAmbientVideo()) {
    return;
  }

  let observer = null;

  const createVideo = (tile) => {
    const base = tile.dataset.liveVideo;
    const rect = tile.getBoundingClientRect();
    const scale = Math.max(rect.width / 480, rect.height / 640) * (window.devicePixelRatio || 1);
    const size = scale > 1.15 ? 720 : 480;
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('disablepictureinpicture', '');
    video.preload = 'auto';
    [
      [`${base}-${size}.mp4`, tile.dataset.liveAv1 || 'video/mp4; codecs="av01.0.05M.08"'],
      [`${base}-${size}-h264.mp4`, 'video/mp4; codecs="avc1.640028"'],
    ].forEach(([src, type]) => {
      const source = document.createElement('source');
      source.src = src;
      source.type = type;
      video.append(source);
    });
    // Ошибка последнего источника — значит, не сыграл ни один: остаётся фото.
    video.lastElementChild.addEventListener('error', () => {
      video.remove();
      observer.unobserve(tile);
    });
    video.addEventListener('playing', () => tile.classList.add('is-live'), { once: true });
    tile.append(video);
    return video;
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const tile = entry.target;
      let video = tile.querySelector('video');
      if (entry.intersectionRatio >= 0.5) {
        video = video || createVideo(tile);
        video.play()?.catch((error) => {
          // AbortError — плитку проскролили до старта (сработал pause): попробуем снова.
          if (error?.name === 'AbortError') {
            return;
          }
          tile.classList.remove('is-live');
          video.remove();
          observer.unobserve(tile);
        });
      } else if (video && entry.intersectionRatio < 0.1) {
        video.pause();
      }
    });
  }, { threshold: [0, 0.1, 0.5] });

  tiles.forEach((tile) => observer.observe(tile));
}

// Ролик на странице крыши: подпись «Видео 0:07» прячется, когда ролик запустили.
function bindRoofVideos() {
  const videos = document.querySelectorAll('.gallery-video video');
  const showPoster = (video) => {
    if (video.dataset.poster && !video.poster) {
      video.poster = video.dataset.poster;
    }
  };
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            showPoster(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '600px 0px' })
    : null;

  videos.forEach((video) => {
    video.addEventListener('play', () => video.parentElement.classList.add('is-playing'));
    if (observer) {
      observer.observe(video);
    } else {
      showPoster(video);
    }
  });
}

function bindRoofCatalog() {
  const catalog = document.getElementById('catalog');
  const form = document.getElementById('lead-form');
  const roofInput = form?.elements.roof;

  if (!catalog || !form || !roofInput) {
    return;
  }

  const cards = [...catalog.querySelectorAll('.roof-card[data-roof-id]')];
  const booking = document.getElementById('booking');

  // Список крыш в форме собирается из карточек каталога — один источник имён.
  cards.forEach((card) => {
    const option = document.createElement('option');
    option.value = card.dataset.roofName || '';
    option.textContent = card.dataset.roofName || '';
    option.dataset.roofId = card.dataset.roofId || '';
    roofInput.append(option);
  });
  let selectedRoofId = '';
  let hasTrackedCatalogView = false;

  const getCard = (roofId) => cards.find((card) => card.dataset.roofId === roofId);

  const saveSelection = (roofId) => {
    try {
      sessionStorage.setItem(ROOF_SELECTION_KEY, roofId);
    } catch (error) {
      console.warn('[Catalog] Roof selection storage is unavailable', error);
    }
  };

  const restoreSelection = () => {
    try {
      return sessionStorage.getItem(ROOF_SELECTION_KEY) || '';
    } catch (error) {
      console.warn('[Catalog] Roof selection storage is unavailable', error);
      return '';
    }
  };

  const applySelection = (roofId, { persist = true, scroll = false } = {}) => {
    const card = getCard(roofId);

    if (!card) {
      return;
    }

    selectedRoofId = roofId;
    roofInput.value = card.dataset.roofName || ROOF_GALLERIES[roofId]?.name || roofId;
    roofInput.dataset.roofId = roofId;

    cards.forEach((item) => {
      const isSelected = item === card;
      item.classList.toggle('is-selected', isSelected);
      item.querySelector('.roof-select-button')?.setAttribute('aria-pressed', String(isSelected));
    });

    if (persist) {
      saveSelection(roofId);
    }

    if (scroll && booking) {
      // Докручиваем до самой формы, если иначе поле с выбранной крышей окажется под краем
      // экрана: всегда на телефоне, на ноутбуках с невысоким экраном (1366x657 и ниже).
      const shell = booking.querySelector('.lead-form-shell') || booking;
      const bookingMargin = parseFloat(window.getComputedStyle(booking).scrollMarginTop) || 0;
      const fieldBottom = roofInput.getBoundingClientRect().bottom - booking.getBoundingClientRect().top + bookingMargin;
      const target = window.matchMedia('(max-width: 980px)').matches || fieldBottom > window.innerHeight - 16
        ? shell
        : booking;
      glideTo(target);
      // Доехали — поле «Крыша» один раз вспыхивает.
      whenScrollSettles(() => {
        roofInput.classList.remove('is-confirmed');
        void roofInput.offsetWidth;
        roofInput.classList.add('is-confirmed');
      });
    }
  };

  ['focus', 'change'].forEach((type) => {
    roofInput.addEventListener(type, () => roofInput.classList.remove('is-confirmed'));
  });

  // AVIF/WebP есть в трёх размерах (640, 960, 1280), JPEG — в двух.
  const getSrcset = (image, ext) => {
    const [width640, width1280] = image.w || [480, 960];
    const middle = ext === 'jpg' ? '' : `${image.base}-960.${ext} ${Math.round(width640 * 1.5)}w, `;
    return `${image.base}-640.${ext} ${width640}w, ${middle}${image.base}-1280.${ext} ${width1280}w`;
  };

  const CARD_SIZES = '(max-width: 640px) calc(100vw - 40px), (max-width: 980px) 50vw, 380px';

  const createSlide = (image) => {
    const picture = document.createElement('picture');
    picture.className = 'roof-slide';
    [['avif', 'image/avif'], ['webp', 'image/webp']].forEach(([ext, type]) => {
      const source = document.createElement('source');
      source.type = type;
      source.sizes = CARD_SIZES;
      source.srcset = getSrcset(image, ext);
      picture.append(source);
    });
    const img = document.createElement('img');
    const [width640] = image.w || [480, 960];
    img.width = width640;
    img.height = 640;
    img.decoding = 'async';
    img.alt = image.alt;
    img.sizes = CARD_SIZES;
    img.srcset = getSrcset(image, 'jpg');
    img.src = `${image.base}-640.jpg`;
    picture.append(img);
    return picture;
  };

  // Фото в карточке: мышью — ведите по фото (место курсора = номер кадра), пальцем —
  // листайте. Кадры догружаются по намерению: мышью — сразу все, пальцем — на два вперёд.
  const initCardGallery = (card) => {
    const media = card.querySelector('.roof-card-media');
    const track = media?.querySelector('.roof-slides');
    const dots = media?.querySelector('.roof-dots');
    const roofId = card.dataset.roofId || '';
    const images = ROOF_GALLERIES[roofId]?.images || [];

    if (!track || !dots || images.length < 2) {
      return;
    }

    track.tabIndex = -1;
    dots.replaceChildren(...images.map(() => document.createElement('i')));
    dots.firstElementChild.classList.add('is-active');
    let current = 0;
    let hasTrackedOpen = false;
    // Мышью «просмотр» — человек задержался на карточке и увидел хотя бы три кадра,
    // а не пролетел курсором мимо.
    const seenByMouse = new Set([0]);
    let enteredAt = 0;

    const ensureSlides = (upTo) => {
      const last = Math.min(upTo, images.length - 1);
      for (let index = track.children.length; index <= last; index += 1) {
        track.append(createSlide(images[index]));
      }
    };

    const trackOpen = () => {
      if (!hasTrackedOpen) {
        hasTrackedOpen = true;
        trackEvent('roof_card_open', { roof_id: roofId, location: 'catalog' });
      }
    };

    const setCurrent = (index) => {
      if (index === current) {
        return;
      }
      dots.children[current]?.classList.remove('is-active');
      dots.children[index]?.classList.add('is-active');
      current = index;
    };

    // pointerenter приходит и когда страница прокручивается под неподвижной мышью — кадры
    // грузим только при настоящем движении курсора.
    media.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') {
        enteredAt = performance.now();
      }
    });
    media.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || !(event.movementX || event.movementY)) {
        return;
      }
      ensureSlides(images.length - 1);
      const rect = track.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const index = Math.min(images.length - 1, Math.max(0, Math.floor(ratio * images.length)));
      if (index !== current) {
        ensureSlides(images.length - 1);
        track.scrollLeft = index * track.clientWidth;
        setCurrent(index);
        seenByMouse.add(index);
        if (seenByMouse.size >= 3 && performance.now() - enteredAt > 700) {
          trackOpen();
        }
      }
    });
    media.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') {
        track.scrollLeft = 0;
        setCurrent(0);
      }
    });
    media.addEventListener('focus', () => ensureSlides(1));
    // Касание само по себе — ещё не листание: при вертикальной прокрутке страницы палец тоже
    // попадает на фото. Кадры догружаем, когда жест пошёл вбок.
    let touched = false;
    let touchX = 0;
    let touchY = 0;
    track.addEventListener('touchstart', (event) => {
      touchX = event.touches[0].clientX;
      touchY = event.touches[0].clientY;
    }, { passive: true });
    track.addEventListener('touchmove', (event) => {
      if (touched) {
        return;
      }
      const dx = Math.abs(event.touches[0].clientX - touchX);
      const dy = Math.abs(event.touches[0].clientY - touchY);
      if (dx > 8 && dx > dy) {
        touched = true;
        ensureSlides(current + 2);
      }
    }, { passive: true });
    track.addEventListener('scroll', () => {
      const index = Math.min(images.length - 1, Math.round(track.scrollLeft / track.clientWidth));
      ensureSlides(index + 2);
      setCurrent(index);
      if (touched && index > 0) {
        trackOpen();
      }
    }, { passive: true });
  };

  cards.forEach(initCardGallery);

  catalog.querySelectorAll('.roof-select-button').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const roofId = button.dataset.roofId || '';
      applySelection(roofId, { scroll: true });
      trackEvent('roof_booking_click', { roof_id: roofId, location: 'catalog' });
    });
  });

  // Выбор крыши прямо в форме подсвечивает карточку и запоминается.
  roofInput.addEventListener('change', () => {
    const option = roofInput.selectedOptions[0];
    const roofId = option?.dataset.roofId || '';

    if (getCard(roofId)) {
      applySelection(roofId);
      trackEvent('roof_booking_click', { roof_id: roofId, location: 'form_select' });
    }
  });

  form.addEventListener('reset', () => {
    window.requestAnimationFrame(() => {
      if (selectedRoofId) {
        applySelection(selectedRoofId, { persist: false });
      }
    });
  });

  const trackCatalogView = () => {
    if (hasTrackedCatalogView) {
      return;
    }

    hasTrackedCatalogView = true;
    trackEvent('roof_catalog_view', { section: 'catalog' });
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackCatalogView();
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(catalog);
  } else {
    trackCatalogView();
  }

  // Ссылка со страницы крыши вида /?roof=<id> сразу подставляет её в форму.
  const requestedRoofId = new URLSearchParams(window.location.search).get('roof') || '';
  const restoredRoofId = restoreSelection();

  if (getCard(requestedRoofId)) {
    applySelection(requestedRoofId);
  } else if (getCard(restoredRoofId)) {
    applySelection(restoredRoofId, { persist: false });
  }

  const clearSelection = () => {
    selectedRoofId = '';
    roofInput.value = '';
    roofInput.dataset.roofId = '';
    cards.forEach((item) => {
      item.classList.remove('is-selected');
      item.querySelector('.roof-select-button')?.setAttribute('aria-pressed', 'false');
    });
    try {
      sessionStorage.removeItem(ROOF_SELECTION_KEY);
    } catch (error) {
      console.warn('[Catalog] Roof selection storage is unavailable', error);
    }
  };

  // Счётчик в блоке условий не должен обещать больше крыш, чем реально показано.
  const updateRoofCount = () => {
    const counter = document.getElementById('trust-roof-count');
    if (!counter) {
      return;
    }

    const count = cards.filter((card) => !card.hidden).length;
    const noun = count % 10 === 1 && count % 100 !== 11 ? 'крыша' : 'крыш';
    counter.textContent = `${count} ${noun}`;
  };

  // Крыши со status=off в гугл-таблице скрываются из каталога.
  // Если статус получить не удалось, каталог остаётся полным.
  const hideUnavailableRoofs = async () => {
    try {
      const response = await fetch('/api/roofs', { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      if (!data || data.ok !== true || typeof data.roofs !== 'object' || data.roofs === null) {
        return;
      }
      cards.forEach((card) => {
        if (data.roofs[normalizeRoofName(card.dataset.roofName)] === false) {
          card.hidden = true;
          [...roofInput.options]
            .find((option) => option.dataset.roofId === card.dataset.roofId)
            ?.remove();
          if (card.dataset.roofId === selectedRoofId) {
            clearSelection();
          }
        }
      });
    } catch (error) {
      console.warn('[Catalog] Roof availability is unavailable', error);
    } finally {
      updateRoofCount();
    }
  };

  // Число в HTML держим как есть до ответа таблицы: пересчёт до него показывал все карточки
  // и цифра мигала (8 → 11 → 8). Если таблица недоступна, finally посчитает полный каталог.
  hideUnavailableRoofs();
}

function bindMobileNav() {
  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('.nav-toggle');
  const nav = header?.querySelector('.header-nav');

  if (!header || !toggle || !nav) {
    return;
  }

  const setOpen = (isOpen) => {
    header.classList.toggle('is-nav-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню разделов' : 'Открыть меню разделов');
  };

  toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-nav-open')));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      setOpen(false);
    }
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });
}

// Страница отдельной крыши: цена и доступность берутся из той же таблицы,
// что и каталог, чтобы в HTML не было устаревших цифр.
async function bindRoofPage() {
  const page = document.querySelector('[data-roof-page]');

  if (!page) {
    return;
  }

  const roofName = normalizeRoofName(page.dataset.roofName);

  try {
    const response = await fetch('/api/roofs', { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (!data || data.ok !== true) {
      return;
    }

    const price = data.prices?.[roofName];
    if (Number.isFinite(price)) {
      page.querySelectorAll('[data-roof-price]').forEach((node) => {
        node.textContent = `${price} \u20bd`;
      });
    }

    if (data.roofs?.[roofName] === false) {
      page.querySelector('.roof-unavailable')?.removeAttribute('hidden');
    }
  } catch (error) {
    console.warn('[Roof page] Roof data is unavailable', error);
  }
}

function bindScrollDepth() {
  const trackedDepth = {
    50: false,
    90: false,
  };

  const getDepth = () => {
    const documentElement = document.documentElement;
    const scrollTop = window.scrollY || documentElement.scrollTop || 0;
    const scrollHeight = Math.max(documentElement.scrollHeight, document.body.scrollHeight);

    if (scrollHeight <= window.innerHeight) {
      return 100;
    }

    return ((scrollTop + window.innerHeight) / scrollHeight) * 100;
  };

  const checkScrollDepth = () => {
    const depth = getDepth();

    if (!trackedDepth[50] && depth >= 50) {
      trackedDepth[50] = true;
      trackEvent('scroll_50');
    }

    if (!trackedDepth[90] && depth >= 90) {
      trackedDepth[90] = true;
      trackEvent('scroll_90');
      window.removeEventListener('scroll', checkScrollDepth);
    }
  };

  window.addEventListener('scroll', checkScrollDepth, { passive: true });
  checkScrollDepth();
}

function getMoscowDateValue() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function isValidContact(method, value) {
  const normalized = value.trim();
  const phoneDigits = normalized.replace(/\D/g, '');

  if (method === 'whatsapp') {
    return phoneDigits.length >= 10 && phoneDigits.length <= 15;
  }

  if (normalized.startsWith('@')) {
    return /^@[a-zA-Z0-9_]{5,32}$/.test(normalized);
  }

  return phoneDigits.length >= 10 && phoneDigits.length <= 15;
}

function bindLeadForm() {
  const form = document.getElementById('lead-form');

  if (!form) {
    return;
  }

  const dateInput = form.elements.date;
  const peopleInput = form.elements.people;
  const contactInput = form.elements.contact;
  const roofInput = form.elements.roof;
  const contactLabel = document.getElementById('contact-label');
  const status = document.getElementById('lead-status');
  const submitButton = form.querySelector('.lead-submit');
  const submitLabel = submitButton?.querySelector('.submit-label');
  const submitLoading = submitButton?.querySelector('.submit-loading');
  const successPanel = document.getElementById('lead-success');
  const newLeadButton = document.getElementById('new-lead-button');
  const fieldErrors = {
    roof: document.getElementById('lead-roof-error'),
    date: document.getElementById('lead-date-error'),
    time: document.getElementById('lead-time-error'),
    people: document.getElementById('lead-people-error'),
    name: document.getElementById('lead-name-error'),
    contact: document.getElementById('lead-contact-error'),
    consent: document.getElementById('lead-consent-error'),
  };
  let hasTrackedStart = false;

  dateInput.min = getMoscowDateValue();

  const getContactMethod = () =>
    form.querySelector('input[name="contactMethod"]:checked')?.value || 'telegram';

  const updateContactField = () => {
    const method = getContactMethod();
    const isWhatsApp = method === 'whatsapp';

    contactLabel.textContent = isWhatsApp ? 'Номер WhatsApp' : 'Аккаунт в Telegram или телефон';
    contactInput.placeholder = isWhatsApp ? '+7 999 000-00-00' : '@username или +7 999 000-00-00';
    contactInput.autocomplete = isWhatsApp ? 'tel' : 'username';
    contactInput.inputMode = isWhatsApp ? 'tel' : 'text';
    contactInput.removeAttribute('aria-invalid');
    fieldErrors.contact.textContent = '';
  };

  const setError = (input, message) => {
    status.textContent = '';
    const fieldError = fieldErrors[input?.name];
    if (fieldError) {
      fieldError.textContent = message;
    } else {
      status.textContent = message;
    }
    input?.setAttribute('aria-invalid', 'true');
    input?.focus();
  };

  const clearFieldError = (input) => {
    if (!input) {
      return;
    }

    input.removeAttribute('aria-invalid');
    const fieldError = fieldErrors[input.name];
    if (fieldError) {
      fieldError.textContent = '';
    }
  };

  const clearErrors = () => {
    status.textContent = '';
    form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
      input.removeAttribute('aria-invalid');
    });
    Object.values(fieldErrors).forEach((fieldError) => {
      fieldError.textContent = '';
    });
  };

  const setSubmitting = (isSubmitting) => {
    if (!submitButton) {
      return;
    }

    submitButton.disabled = isSubmitting;
    submitLabel.hidden = isSubmitting;
    submitLoading.hidden = !isSubmitting;
  };

  form.addEventListener('focusin', () => {
    if (hasTrackedStart) {
      return;
    }

    hasTrackedStart = true;
    trackEvent('lead_form_start', { location: 'booking' });
  });

  form.querySelectorAll('input[name="contactMethod"]').forEach((input) => {
    input.addEventListener('change', updateContactField);
  });

  form.querySelectorAll('.stepper-button').forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.step || 0);
      const current = Number(peopleInput.value || 1);
      const next = Math.min(30, Math.max(1, current + step));

      peopleInput.value = String(next);
      peopleInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  form.addEventListener('input', (event) => {
    clearFieldError(event.target);
    status.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const formData = new FormData(form);
    const lead = {
      date: String(formData.get('date') || ''),
      time: String(formData.get('time') || ''),
      people: Number(formData.get('people')),
      name: String(formData.get('name') || '').trim(),
      contactMethod: String(formData.get('contactMethod') || ''),
      contact: String(formData.get('contact') || '').trim(),
      comment: String(formData.get('comment') || '').trim(),
      roof: String(formData.get('roof') || '').trim(),
      consent: formData.get('consent') === 'on',
      website: String(formData.get('website') || ''),
      page: window.location.pathname,
      referrer: document.referrer,
      utm: getStoredUTMParams(),
    };

    if (!lead.roof) {
      setError(form.elements.roof, 'Выберите крышу из каталога.');
      return;
    }

    if (!lead.date || lead.date < dateInput.min) {
      setError(dateInput, 'Выберите сегодняшнюю или будущую дату.');
      return;
    }

    if (!lead.time) {
      setError(form.elements.time, 'Выберите удобное время.');
      return;
    }

    if (!Number.isInteger(lead.people) || lead.people < 1 || lead.people > 30) {
      setError(peopleInput, 'Укажите количество человек от 1 до 30.');
      return;
    }

    if (lead.name.length < 2) {
      setError(form.elements.name, 'Укажите ваше имя.');
      return;
    }

    if (!isValidContact(lead.contactMethod, lead.contact)) {
      const message = lead.contactMethod === 'whatsapp'
        ? 'Укажите корректный номер WhatsApp.'
        : 'Укажите @username в Telegram или номер телефона.';
      setError(contactInput, message);
      return;
    }

    if (!lead.consent) {
      setError(form.elements.consent, 'Подтвердите согласие на обработку данных.');
      return;
    }

    const analyticsParams = {
      contact_method: lead.contactMethod,
      party_size: lead.people,
      location: 'booking',
      roof_id: roofInput?.dataset.roofId || 'not_selected',
    };

    trackEvent('lead_form_submit', analyticsParams);
    setSubmitting(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lead),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Не удалось отправить заявку. Попробуйте ещё раз.');
      }

      trackEvent('lead_form_success', analyticsParams);
      form.hidden = true;
      successPanel.hidden = false;
      // Форма исчезла и страница укоротилась — иначе на телефоне панель оказывалась выше экрана.
      jumpScroll(() => successPanel.scrollIntoView({ block: 'center' }));
      successPanel.focus({ preventScroll: true });
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'Сервер отвечает слишком долго. Попробуйте ещё раз.'
        : error.message || 'Не удалось отправить заявку. Попробуйте ещё раз.';

      status.textContent = message;
      trackEvent('lead_form_error', {
        ...analyticsParams,
        error_type: error.name === 'AbortError' ? 'timeout' : 'request_failed',
      });
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  });

  newLeadButton?.addEventListener('click', () => {
    form.reset();
    peopleInput.value = '2';
    dateInput.min = getMoscowDateValue();
    updateContactField();
    clearErrors();
    successPanel.hidden = true;
    form.hidden = false;
    hasTrackedStart = false;
    dateInput.focus();
  });

  updateContactField();
}

function bindFAQ() {
  const trackedQuestions = new Set();

  // Закрываем соседний ответ до раскрытия и компенсируем сдвиг, чтобы вопрос не «прыгал».
  document.querySelectorAll('.faq summary').forEach((summary) => {
    summary.addEventListener('click', () => {
      const details = summary.parentElement;
      if (details.open) {
        return;
      }
      const before = summary.getBoundingClientRect().top;
      document.querySelectorAll('.faq details[open]').forEach((item) => {
        if (item !== details) {
          item.removeAttribute('open');
        }
      });
      const shift = summary.getBoundingClientRect().top - before;
      if (shift) {
        // Мгновенно: с html { scroll-behavior: smooth } вопрос сначала отскакивал, а потом
        // плавно возвращался. scrollBy({ behavior: 'instant' }) старый Safari не принимает.
        jumpScroll(() => window.scrollBy(0, shift));
      }
    });
  });

  document.querySelectorAll('.faq details').forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) {
        return;
      }

      document.querySelectorAll('.faq details').forEach((item) => {
        if (item !== details) {
          item.removeAttribute('open');
        }
      });

      const question = details.querySelector('summary')?.textContent?.trim();

      if (!question || trackedQuestions.has(question)) {
        return;
      }

      trackedQuestions.add(question);
      trackEvent('faq_open', { question });
    });
  });
}

function initSite() {
  // Без touchstart-обработчика iOS Safari не показывает :active.
  document.addEventListener('touchstart', () => {}, { passive: true });
  saveUTMParams();
  initYandexMetrika();
  initGoogleAnalytics();
  updateTelegramLinks();
  bindAnchorLinks();
  bindMobileNav();
  bindReadProgress();
  bindTrackedLinks();
  bindGalleryView();
  bindHeroVideo();
  bindLiveTiles();
  bindRoofVideos();
  bindRoofCatalog();
  bindRoofPage();
  bindScrollDepth();
  bindLeadForm();
  bindFAQ();
}

window.MRTAnalytics = {
  buildTelegramDeepLink,
  getStoredUTMParams,
  trackEvent,
};
window.trackEvent = trackEvent;

// script.js стоит последним в <body> на всех страницах: разметка уже разобрана, DOMContentLoaded
// не ждём. Cloudflare дописывает после него свой маяк type="module", а модули задерживают
// DOMContentLoaded: если маяк повиснет (мобильные сети РФ режут IP Cloudflare), без этого
// не заработали бы ни форма заявки, ни счётчики.
initSite();
