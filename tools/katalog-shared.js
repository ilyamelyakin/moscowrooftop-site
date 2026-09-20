      (function () {
        'use strict';
        var BOT_URL = '{{BOT_URL}}';
        var API_TIMEOUT = 4000;
        var CACHE_KEY = 'mr_roofs_cache';
        var CACHE_TTL = 300000; // ровно TTL воркера
        var root = document.documentElement;
        var isMiniApp = root.classList.contains('is-miniapp');
        // И лента каталога, и страница крыши: всё, у чего есть имя крыши.
        var cards = [].slice.call(document.querySelectorAll('[data-roof-name]'));
        var statusNode = document.getElementById('cat-status');
        // Бейджи, нарисованные сборщиком, приходят уже без hidden. По ним и
        // понимаем, есть ли что терять, если /api/roofs не ответит.
        var hasBakedStatuses = !!document.querySelector('.cat-badge:not([hidden])');
        // Написание сайта -> написание таблицы (SHEET_NAME_ALIASES воркера).
        var aliases = {};
        try { aliases = JSON.parse(document.getElementById('cat-aliases').textContent || '{}'); } catch (e) {}

        function safely(fn) {
          try { fn(); return true; } catch (e) { return false; }
        }
        function isInTelegram(tg) {
          // Официальные клиенты проставляют платформу; вне Telegram она 'unknown'.
          return !!(tg && tg.platform && tg.platform !== 'unknown');
        }
        function sendToBot(tg, payload) {
          // sendData доступен только у Mini App, открытого кнопкой reply-клавиатуры.
          if (!tg || typeof tg.sendData !== 'function') return false;
          return safely(function () { tg.sendData(JSON.stringify(payload)); });
        }
        function normalizeRoofName(name) {
          return String(name || '').replace(/ё/g, 'е').replace(/Ё/g, 'Е').replace(/\s+/g, ' ').trim().toLowerCase();
        }
        function formatPrice(value) {
          if (!value) return 'Цена по запросу';
          return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
        }

        // --- Галерея: нативный скролл со snap, JS только считает кадры ---
        function revealImage(img) {
          if (!img.dataset.src) return;   // уже раскрыт: иначе src стал бы "undefined"
          // Источников теперь два — avif и webp, — и подставить надо оба.
          // С querySelector срабатывал только первый, а второй оставался без
          // srcset: браузер без поддержки avif пропускал пустой <source> и
          // скатывался на запасной jpg, то есть на самый тяжёлый вариант.
          var sources = img.parentNode ? img.parentNode.querySelectorAll('source[data-srcset]') : [];
          [].forEach.call(sources, function (source) {
            source.srcset = source.dataset.srcset;
            delete source.dataset.srcset;
          });
          img.addEventListener('load', function () {
            // Догрузка кадра не должна утаскивать ленту вбок (см. keepAtStart).
            var rail = img.closest ? img.closest('.cat-rail') : null;
            if (rail && !rail.dataset.touched && rail.scrollLeft !== 0) rail.scrollLeft = 0;
          }, { once: true });
          img.srcset = img.dataset.srcset || '';
          img.src = img.dataset.src;
          delete img.dataset.src;
        }

        // Один наблюдатель на все отложенные кадры: и слайды ленты, и снимки
        // на странице крыши. Браузерный loading="lazy" в горизонтальном
        // контейнере срабатывает непредсказуемо, поэтому подставляем сами.
        var lazyImages = [].slice.call(document.querySelectorAll('img[data-src]'));
        if ('IntersectionObserver' in window) {
          var lazyObserver = new IntersectionObserver(
            function (entries) {
              entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                lazyObserver.unobserve(entry.target);
                revealImage(entry.target);
              });
            },
            { rootMargin: '400px' }
          );
          lazyImages.forEach(function (img) { lazyObserver.observe(img); });
        } else {
          lazyImages.forEach(revealImage);
        }

        cards.forEach(function (card) {
          var rail = card.querySelector('.cat-rail');
          if (!rail) return;
          // Пока ленту не листали руками, она обязана стоять на первом кадре:
          // догрузка соседних снимков иначе утаскивает её вбок.
          ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (evt) {
            rail.addEventListener(evt, function () { rail.dataset.touched = '1'; }, { passive: true, once: true });
          });
          function keepAtStart() {
            if (!rail.dataset.touched && rail.scrollLeft !== 0) rail.scrollLeft = 0;
          }
          var slides = [].slice.call(rail.querySelectorAll('.cat-slide'));
          var photoSlides = slides.filter(function (slide) { return !slide.classList.contains('cat-slide-more'); });

          var counter = card.querySelector('.cat-counter');
          var dots = [].slice.call(card.querySelectorAll('.cat-dot'));
          // Кадров в галерее бывает больше, чем слайдов в ленте: хвост уходит на страницу крыши.
          var total = counter ? Number(counter.dataset.total) || slides.length : slides.length;
          var ticking = false;
          function sync() {
            var index = Math.round(rail.scrollLeft / Math.max(rail.clientWidth, 1));
            if (counter) {
              // На плитке «Смотреть все» счётчик кадров прячем — это не фотография.
              var onMoreTile = index >= photoSlides.length;
              counter.hidden = onMoreTile;
              if (!onMoreTile) counter.textContent = Math.min(index + 1, total) + ' / ' + total;
            }
            dots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === index); });
            ticking = false;
          }
          rail.addEventListener(
            'scroll',
            function () { if (!ticking) { ticking = true; requestAnimationFrame(sync); } },
            { passive: true }
          );
          keepAtStart();
          window.addEventListener('load', keepAtStart);

          var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
          function step(direction) {
            rail.scrollBy({ left: direction * rail.clientWidth, behavior: motion.matches ? 'auto' : 'smooth' });
          }
          var prev = card.querySelector('.cat-arrow-prev');
          var next = card.querySelector('.cat-arrow-next');
          if (prev) prev.addEventListener('click', function () { step(-1); });
          if (next) next.addEventListener('click', function () { step(1); });
          rail.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
            if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
          });
        });

        // --- Лайтбокс: только там, где есть мышь; на телефоне кадр и так во всю ширину ---
        var lightbox = document.getElementById('cat-lightbox');
        var canLightbox =
          lightbox &&
          typeof lightbox.showModal === 'function' &&
          window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (canLightbox) {
          var galleries = {};
          try { galleries = JSON.parse(document.getElementById('cat-galleries').textContent || '{}'); } catch (e) {}
          var lbImg = document.getElementById('cat-lightbox-img');
          var lbAvif = document.getElementById('cat-lb-avif');
          var lbWebp = document.getElementById('cat-lb-webp');
          var lbCounter = document.getElementById('cat-lb-counter');
          var active = { id: null, index: 0 };
          function renderLightbox() {
            var gallery = galleries[active.id];
            if (!gallery) return;
            var image = gallery.images[active.index];
            // Формат выбирает браузер сам: jpg на 1280 весит в среднем 148 КБ,
            // avif — 64 КБ. Раньше лайтбокс всегда тянул самый тяжёлый файл.
            if (lbAvif) lbAvif.srcset = image.b + '-1280.avif';
            if (lbWebp) lbWebp.srcset = image.b + '-1280.webp';
            lbImg.src = image.b + '-1280.jpg';
            lbImg.alt = image.a;
            lbCounter.textContent = active.index + 1 + ' / ' + gallery.images.length;
            var nextImage = gallery.images[active.index + 1];
            if (!nextImage) return;
            // Соседний кадр греем только после того, как приехал текущий, и в
            // том же формате: currentSrc показывает, что браузер реально выбрал.
            // Иначе на медленном канале предзагрузка отбирала канал у картинки,
            // которую человек смотрит прямо сейчас.
            var warm = function () {
              var chosen = lbImg.currentSrc || lbImg.src;
              var dot = chosen.lastIndexOf('.');
              var ext = dot === -1 ? '.jpg' : chosen.slice(dot);
              new Image().src = nextImage.b + '-1280' + ext;
            };
            if (lbImg.complete) warm();
            else lbImg.addEventListener('load', warm, { once: true });
          }
          function move(delta) {
            var gallery = galleries[active.id];
            if (!gallery) return;
            active.index = (active.index + delta + gallery.images.length) % gallery.images.length;
            renderLightbox();
          }
          document.addEventListener('click', function (event) {
            var slide = event.target.closest && event.target.closest('.cat-slide');
            if (!slide || slide.classList.contains('cat-slide-more')) return;
            var card = slide.closest('.cat-card');
            if (!card) return;
            event.preventDefault();
            active = { id: card.dataset.roofId, index: [].slice.call(card.querySelectorAll('.cat-slide')).indexOf(slide) };
            renderLightbox();
            lightbox.showModal();
          });
          document.getElementById('cat-lb-prev').addEventListener('click', function () { move(-1); });
          document.getElementById('cat-lb-next').addEventListener('click', function () { move(1); });
          document.getElementById('cat-lb-close').addEventListener('click', function () { lightbox.close(); });
          lightbox.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowRight') move(1);
            if (event.key === 'ArrowLeft') move(-1);
          });
        }

        // --- Статусы и цены из той же гугл-таблицы, что у бота ---
        function readCache() {
          try {
            var raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return Date.now() - parsed.ts < CACHE_TTL ? parsed.data : null;
          } catch (e) { return null; }
        }
        function writeCache(data) {
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
        }

        // Карточка возвращается на своё место, а не в хвост: data-order — это
        // позиция крыши в katalog-data.json, и порядок ленты задаёт владелец
        // папками в «Локации». appendChild сделал бы «вернулась = последняя».
        function insertByOrder(feed, card) {
          var order = Number(card.dataset.order || 0);
          var siblings = feed.children;
          for (var i = 0; i < siblings.length; i += 1) {
            if (siblings[i] !== card && Number(siblings[i].dataset.order || 0) > order) {
              feed.insertBefore(card, siblings[i]);
              return;
            }
          }
          feed.appendChild(card);
        }

        function applyRoofData(data) {
          if (!data || !data.roofs) return;
          var liveFeed = document.getElementById('cat-feed');      // на странице крыши их нет
          var offFeed = document.getElementById('cat-feed-off');
          var divider = document.getElementById('cat-divider');
          var known = {};
          var available = 0;
          var moved = [];
          cards.forEach(function (card) {
            var key = normalizeRoofName(card.dataset.roofName);
            known[key] = true;
            if (aliases[key]) known[aliases[key]] = true; // та же крыша под именем из таблицы
            // Нет ключа в таблице — крышу убрали или переименовали: обещать её нельзя.
            // Запасной ключ — как в сборщике (status_for/price_for). Воркер
            // сейчас зеркалит алиасы сам, но клиент не должен на это
            // полагаться: снимут зеркалирование — и крыша молча погаснет.
            var alt = aliases[key];
            var isOn = data.roofs[key] === true || (!!alt && data.roofs[alt] === true);
            var price = (data.prices && data.prices[key]) || (alt && data.prices && data.prices[alt]);
            var priceNode = card.querySelector('[data-roof-price]');
            if (priceNode && price) priceNode.textContent = formatPrice(price);
            if (!(key in data.roofs)) {
              // Название в таблице разошлось с сайтом — сигнал, а не тихая поломка.
              if (window.console) console.warn('[Каталог] крыши нет в таблице:', card.dataset.roofName);
            }
            var badge = card.querySelector('.cat-badge');
            if (badge) {
              badge.textContent = isOn ? 'В расписании' : 'Пока недоступна';
              badge.classList.toggle('is-off', !isOn);
              badge.hidden = false;
            }
            if (isOn) available += 1;
            // Всё ниже — в обе стороны: статусы уже нарисованы при сборке, и
            // живой ответ должен уметь не только спрятать крышу, но и вернуть
            // её обратно. Раньше is-off только добавлялся, и крыша, снова
            // ставшая доступной, оставалась серой до перезагрузки.
            card.classList.toggle('is-off', !isOn);
            var offNote = card.querySelector('.cat-off-note');
            if (offNote) offNote.hidden = isOn;
            var target = isOn ? liveFeed : offFeed;
            // Трогаем DOM, только если карточка и правда не в той ленте:
            // лишний appendChild — это лишний сдвиг вёрстки под пальцем.
            if (target && card.parentNode !== target) moved.push({ card: card, target: target });
          });
          moved.forEach(function (m) { insertByOrder(m.target, m.card); });
          if (offFeed && divider) {
            var hasOff = offFeed.children.length > 0;
            offFeed.hidden = !hasOff;
            divider.hidden = !hasOff;
          }

          if (statusNode) {
            if (available === cards.length) statusNode.innerHTML = 'Все <b>' + cards.length + '</b> крыш в расписании';
            else if (available === 0) statusNode.textContent = 'Сегодня все крыши заняты — напишите в бота, подберём дату';
            else statusNode.innerHTML = 'Сейчас в расписании <b>' + available + '</b> из ' + cards.length + ' крыш';
          }

          // Крыша есть в таблице, а фотографий на сайте ещё нет — показываем строкой.
          var extras = [];
          var moreHost = document.getElementById('cat-more-rows');
          if (!moreHost) return; // страница одной крыши: блока «другие крыши» нет
          moreHost.textContent = ''; // applyRoofData зовут дважды: снапшот, потом живой ответ
          Object.keys(data.roofs).forEach(function (key) {
            if (known[key] || data.roofs[key] !== true) return;
            if (key.length > 40 || !/^[а-яёa-z0-9 \-]+$/i.test(key)) return;
            extras.push({ name: key.charAt(0).toUpperCase() + key.slice(1), price: data.prices && data.prices[key] });
          });
          var moreBox = document.getElementById('cat-more');
          // В обе стороны: applyRoofData зовут дважды, и если во втором ответе
          // таких крыш не осталось, заголовок «Есть и другие крыши» висел бы
          // над пустотой.
          if (moreBox) moreBox.hidden = !extras.length;
          if (extras.length) {
            var host = moreHost;
            extras.slice(0, 12).forEach(function (extra) {
              var row = document.createElement('div');
              row.className = 'cat-more-row';
              var name = document.createElement('b');
              name.textContent = extra.name; // только textContent: таблицу правят руками
              var price = document.createElement('span');
              price.textContent = formatPrice(extra.price);
              row.appendChild(name);
              row.appendChild(price);
              host.appendChild(row);
            });
          }
        }

        // Ошибка внутри applyRoofData не должна проваливаться в catch у
        // loadRoofs и выдаваться за «сеть не ответила»: поломка разметки
        // выглядела бы как обычный сбой и не оставляла следа в консоли.
        function applyData(data) {
          try {
            applyRoofData(data);
          } catch (e) {
            if (window.console) console.error('[Каталог] не смог применить статусы:', e);
          }
        }

        function loadRoofs() {
          var cached = readCache();
          if (cached) { applyData(cached); return; }
          var controller = 'AbortController' in window ? new AbortController() : null;
          var timer = controller ? setTimeout(function () { controller.abort(); }, API_TIMEOUT) : null;
          fetch('/api/roofs', { headers: { Accept: 'application/json' }, signal: controller && controller.signal })
            .then(function (response) { return response.ok ? response.json() : Promise.reject(new Error(response.status)); })
            .then(function (data) {
              if (timer) clearTimeout(timer);
              if (!data || !data.ok) throw new Error('bad payload');
              writeCache(data);
              applyData(data);
            })
            .catch(function () {
              if (timer) clearTimeout(timer);
              // Ничего не прячем и не ломаем: цены и статусы-снапшот уже в HTML,
              // запись работает. Если статусы запечены при сборке — молчим:
              // затирать верную строку тревожным сообщением хуже, чем оставить
              // её как есть, а на медленном мобильном канале этот запрос не
              // доходит регулярно.
              if (statusNode && !hasBakedStatuses) {
                statusNode.textContent = 'Статусы не обновились — уточним при записи';
              }
            });
        }

        // --- Возврат в бота ---
        document.addEventListener('click', function (event) {
          var link = event.target.closest && event.target.closest('.cat-book');
          if (!link) return;
          var tg = window.Telegram && window.Telegram.WebApp;
          if (!isInTelegram(tg)) return; // обычный браузер — работает штатная ссылка ?start=book_…
          // На странице крыши .cat-card нет вовсе: имя лежит на <main
          // data-roof-name>. С .cat-card closest возвращал null, и следующая
          // строка бросала TypeError — sendData не вызывался, и возврат в
          // бота падал на запасную ссылку вместо штатного канала.
          var card = link.closest('[data-roof-name]');
          if (!card) return;
          safely(function () {
            if (tg.HapticFeedback && tg.HapticFeedback.impactOccurred) tg.HapticFeedback.impactOccurred('light');
          });
          if (!sendToBot(tg, { v: 1, a: 'book', roof: card.dataset.roofName })) return; // ссылка отработает сама
          event.preventDefault();
          // Если Telegram почему-то не закрыл окно — уходим по обычной ссылке.
          setTimeout(function () { window.location.href = link.href; }, 800);
        });

        function initTelegram() {
          var tg = window.Telegram && window.Telegram.WebApp;
          if (!tg) return false;
          // initData ПУСТ, когда Mini App открыт кнопкой reply-клавиатуры, — именно наш случай.
          // Поэтому «мы внутри Telegram» определяем по платформе, а не по initData.
          if (!isInTelegram(tg)) return true;
          // Каждый необязательный вызов — отдельно: на старых клиентах setHeaderColor
          // с произвольным hex бросает и обрывал всю инициализацию.
          safely(function () { tg.ready(); });
          safely(function () { tg.expand(); });
          safely(function () {
            if (tg.setHeaderColor && (!tg.isVersionAtLeast || tg.isVersionAtLeast('6.9'))) tg.setHeaderColor('#0b0a09');
          });
          safely(function () {
            if (tg.setBackgroundColor && (!tg.isVersionAtLeast || tg.isVersionAtLeast('6.9'))) tg.setBackgroundColor('#0b0a09');
          });
          safely(function () {
            if (!tg.MainButton) return;
            tg.MainButton.setParams({ text: 'Вернуться в бота', color: '#f6c56f', text_color: '#18100a' });
            tg.MainButton.onClick(function () {
              if (!sendToBot(tg, { v: 1, a: 'menu' })) safely(function () { tg.close(); });
            });
            tg.MainButton.show();
            root.classList.add('has-main-button');
          });
          return true;
        }

        // Статусы и цены не ждут DOMContentLoaded: его задерживает defer-скрипт
        // telegram.org, который в российских сетях может тянуться секундами.
        loadRoofs();

        // Опрос SDK тоже не ждёт DOMContentLoaded: его задерживает тот же defer-скрипт
        // telegram.org. Если SDK не приедет — останется липкая кнопка со ссылкой на бота.
        (function waitForTelegram() {
          if (initTelegram() || !isMiniApp) return;
          var waited = 0;
          var poll = setInterval(function () {
            waited += 250;
            if (initTelegram() || waited >= 8000) clearInterval(poll);
          }, 250);
        })();
      })();
