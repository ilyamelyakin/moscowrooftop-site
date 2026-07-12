const YM_COUNTER_ID = '110631938';
const GA_MEASUREMENT_ID = 'G-98JBGFFDDG';

const TELEGRAM_BOT_URL = 'https://t.me/MoscowRoofTopBot';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_STORAGE_KEY = 'moscow_rooftop_utm';
const PLACEHOLDER_YM_ID = 'YOUR_YM_COUNTER_ID';
const PLACEHOLDER_GA_ID = 'G-XXXXXXXXXX';
const ANALYTICS_HOSTS = new Set(['moscowrooftop.ru', 'www.moscowrooftop.ru']);

function isAnalyticsHost() {
  return ANALYTICS_HOSTS.has(window.location.hostname);
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
  console.log('[Analytics]', eventName, eventParams);
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

function bindVideoControls() {
  document.querySelectorAll('.gallery-item video').forEach((video) => {
    const toggle = video.parentElement?.querySelector('.video-toggle');
    const poster = video.getAttribute('poster');

    if (poster) {
      video.style.backgroundImage = `url("${poster}")`;
      video.style.backgroundPosition = 'center';
      video.style.backgroundSize = 'cover';
    }

    video.addEventListener('error', () => {
      if (toggle) {
        toggle.hidden = true;
      }
    });

    if (!toggle) {
      return;
    }

    toggle.addEventListener('click', () => {
      if (video.paused) {
        video
          .play()
          .then(() => {
            toggle.setAttribute('aria-label', 'Остановить видео');
            toggle.classList.add('is-playing');
          })
          .catch(() => {});
        return;
      }

      video.pause();
      toggle.setAttribute('aria-label', 'Воспроизвести видео');
      toggle.classList.remove('is-playing');
    });
  });
}

function bindFAQ() {
  const trackedQuestions = new Set();

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
  saveUTMParams();
  initYandexMetrika();
  initGoogleAnalytics();
  updateTelegramLinks();
  bindTrackedLinks();
  bindGalleryView();
  bindScrollDepth();
  bindVideoControls();
  bindFAQ();
}

window.MRTAnalytics = {
  buildTelegramDeepLink,
  getStoredUTMParams,
  trackEvent,
};
window.trackEvent = trackEvent;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSite);
} else {
  initSite();
}
