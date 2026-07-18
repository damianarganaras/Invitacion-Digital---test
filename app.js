/* ============================================================
   INVITACIÓN DIGITAL — Orquestador de previsualización
   Módulos:
   1. ConfigStore     → estado (tema, secciones, layout) + localStorage
   2. ConfigPanel     → <dialog> nativo con fallback, switches y radios
   3. ParticlesEngine → pétalos / bokeh según tendencia activa
   4. RevealFX        → IntersectionObserver + clase .visible
   5. Módulos base    → modal bienvenida, header, menú, música,
                        formulario RSVP (Google Sheets) y countdown
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     1. CONFIG STORE
     ============================================================ */
  var CONFIG_KEY = 'invitacion-config';
  var THEMES = [
    'minimalist-editorial', 'botanic-fineart', 'classic-monogram',
    'boho-terracotta', 'modern-lineart', 'vintage-gatsby',
    'rustic-quinta', 'dark-cyber-oled'
  ];
  var LAYOUTS = ['grid', 'carousel', 'stack'];
  /* Mapa switch → id de sección en el DOM (RSVP excluido a propósito) */
  var SECTION_IDS = {
    countdown: 'countdown-section',
    regalos: 'regalos-section',
    dresscode: 'dresscode-section',
    canciones: 'canciones-section'
  };
  var DEFAULT_CONFIG = {
    theme: 'classic-monogram',
    sections: { countdown: true, regalos: true, dresscode: true, canciones: true },
    galleryLayout: 'grid'
  };

  function loadConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return clone(DEFAULT_CONFIG);
      var c = JSON.parse(raw);
      return {
        theme: THEMES.indexOf(c.theme) > -1 ? c.theme : DEFAULT_CONFIG.theme,
        sections: Object.assign({}, DEFAULT_CONFIG.sections, c.sections || {}),
        galleryLayout: LAYOUTS.indexOf(c.galleryLayout) > -1 ? c.galleryLayout : DEFAULT_CONFIG.galleryLayout
      };
    } catch (e) {
      return clone(DEFAULT_CONFIG);
    }
  }
  function saveConfig() {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch (e) {}
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var config = loadConfig();
  var root = document.documentElement;

  /* ============================================================
     2. TEMA + SECCIONES + LAYOUT (aplicadores al DOM)
     ============================================================ */
  function applyTheme(theme) {
    config.theme = theme;
    root.setAttribute('data-theme', theme);
    if (trendSelect && trendSelect.value !== theme) trendSelect.value = theme;
    ParticlesEngine.sync(theme); // limpia y reinicia efectos
    saveConfig();
  }

  function applySections() {
    Object.keys(SECTION_IDS).forEach(function (key) {
      var el = document.getElementById(SECTION_IDS[key]);
      if (el) el.classList.toggle('section-disabled', !config.sections[key]);
    });
    sectionSwitches.forEach(function (sw) {
      sw.checked = !!config.sections[sw.getAttribute('data-section')];
    });
  }

  function applyGalleryLayout() {
    var galeria = document.getElementById('galeria');
    if (galeria) galeria.setAttribute('data-layout', config.galleryLayout);
    layoutRadios.forEach(function (r) {
      r.checked = (r.value === config.galleryLayout);
    });
  }

  /* ============================================================
     3. CONFIG PANEL (<dialog> con fallback para Safari viejo)
     ============================================================ */
  var btnConfig = document.getElementById('btnConfig');
  var btnCloseConfig = document.getElementById('btnCloseConfig');
  var dialog = document.getElementById('configModal');
  var trendSelect = document.getElementById('trendSelect');
  var sectionSwitches = Array.prototype.slice.call(document.querySelectorAll('input.switch[data-section]'));
  var layoutRadios = Array.prototype.slice.call(document.querySelectorAll('input[name="galleryLayout"]'));
  var dialogSupported = !!(dialog && typeof dialog.showModal === 'function');

  function openConfig() {
    if (!dialog) return;
    if (dialogSupported) dialog.showModal();
    else dialog.classList.add('fallback-open');
  }
  function closeConfig() {
    if (!dialog) return;
    if (dialogSupported && dialog.open) dialog.close();
    dialog.classList.remove('fallback-open');
  }

  if (btnConfig) btnConfig.addEventListener('click', openConfig);
  if (btnCloseConfig) btnCloseConfig.addEventListener('click', closeConfig);

  if (dialog) {
    /* Click fuera del panel (backdrop) cierra el modal */
    dialog.addEventListener('click', function (e) {
      var r = dialog.getBoundingClientRect();
      var inside =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeConfig();
    });
    /* Escape en fallback */
    if (!dialogSupported) {
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeConfig();
      });
    }
  }

  /* Selector de tendencia: aplica tema + reinicia partículas al instante */
  if (trendSelect) {
    trendSelect.addEventListener('change', function () {
      applyTheme(trendSelect.value);
    });
  }

  /* Interruptores de secciones */
  sectionSwitches.forEach(function (sw) {
    sw.addEventListener('change', function () {
      var key = sw.getAttribute('data-section');
      config.sections[key] = sw.checked;
      applySections();
      saveConfig();
    });
  });

  /* Radios de layout de galería */
  layoutRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (!radio.checked) return;
      config.galleryLayout = radio.value;
      applyGalleryLayout();
      saveConfig();
    });
  });

  /* ============================================================
     4. PARTICLES ENGINE
     - botanic-fineart / rustic-quinta  → pétalos con balanceo X
     - vintage-gatsby / dark-cyber-oled → bokeh ascendente
     Limpieza estricta al cambiar de tendencia (.remove())
     ============================================================ */
  var ParticlesEngine = (function () {
    var PETAL_THEMES = { 'botanic-fineart': 1, 'rustic-quinta': 1 };
    var BOKEH_THEMES = { 'vintage-gatsby': 1, 'dark-cyber-oled': 1 };

    var layer = null;
    var timer = null;
    var mode = null;

    function reducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function ensureLayer() {
      if (layer && document.body.contains(layer)) return layer;
      layer = document.createElement('div');
      layer.className = 'particles-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
      return layer;
    }

    /* Limpieza inmediata exigida por spec */
    function clear() {
      if (timer) { clearInterval(timer); timer = null; }
      document.querySelectorAll('.particle').forEach(function (p) { p.remove(); });
      mode = null;
    }

    function scheduleRemoval(el, durSec) {
      window.setTimeout(function () {
        if (el.parentNode) el.remove(); // evita fugas de memoria
      }, durSec * 1000 + 80);
    }

    function spawnPetal(host) {
      var el = document.createElement('span');
      el.className = 'particle particle--petal';
      var dur = 6 + Math.random() * 7;
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.setProperty('--dur', dur + 's');
      el.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px'); /* balanceo X */
      el.style.setProperty('--spin', ((200 + Math.random() * 400) * (Math.random() > 0.5 ? 1 : -1)) + 'deg');
      el.style.setProperty('--sway', (2 + Math.random() * 3) + 's');
      el.style.setProperty('--particle-size', (8 + Math.random() * 10) + 'px');
      el.style.opacity = String(0.55 + Math.random() * 0.4);
      host.appendChild(el);
      scheduleRemoval(el, dur);
    }

    function spawnBokeh(host) {
      var el = document.createElement('span');
      el.className = 'particle particle--bokeh';
      var dur = 9 + Math.random() * 9;
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.top = (100 + Math.random() * 8) + 'vh'; /* nace bajo el viewport y asciende */
      el.style.setProperty('--dur', dur + 's');
      el.style.setProperty('--sz', (6 + Math.random() * 22) + 'px');
      el.style.setProperty('--blur', (2 + Math.random() * 6) + 'px');
      el.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      el.style.setProperty('--scale', (0.6 + Math.random() * 1.2).toFixed(2));
      el.style.setProperty('--op', (0.25 + Math.random() * 0.45).toFixed(2));
      host.appendChild(el);
      scheduleRemoval(el, dur);
    }

    function start(kind) {
      var host = ensureLayer();
      var isMobile = window.matchMedia('(max-width: 480px)').matches;
      var max = kind === 'petal' ? (isMobile ? 10 : 16) : (isMobile ? 12 : 20);
      var spawn = kind === 'petal' ? spawnPetal : spawnBokeh;
      var initial = kind === 'petal' ? 6 : 8;
      var interval = kind === 'petal' ? 420 : 550;
      for (var i = 0; i < initial; i++) spawn(host);
      timer = setInterval(function () {
        if (document.hidden) return;             // ahorro de batería en pestaña oculta
        if (host.childElementCount >= max) return;
        spawn(host);
      }, interval);
    }

    function sync(theme) {
      var next = null;
      if (PETAL_THEMES[theme]) next = 'petal';
      else if (BOKEH_THEMES[theme]) next = 'bokeh';

      if (reducedMotion()) { clear(); return; }
      if (next === mode) return;
      clear(); // elimina partículas del tema anterior antes de iniciar
      if (next) {
        mode = next;
        start(next);
      }
    }

    return { sync: sync, clear: clear };
  })();

  /* ============================================================
     5. REVEAL FX — IntersectionObserver + .visible
     ============================================================ */
  (function initReveal() {
    var reveals = document.querySelectorAll('.reveal');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { obs.observe(el); });
  })();

  /* ============================================================
     6. MÓDULOS BASE (lógica original preservada)
     ============================================================ */

  /* ---- WELCOME MODAL ---- */
  var modal = document.getElementById('modalWelcome');
  var btn = document.getElementById('btnIngresar');
  if (btn) btn.addEventListener('click', function () { modal.classList.remove('visible'); });
  if (modal) modal.classList.add('visible');

  /* ---- HEADER SCROLL EFFECT ---- */
  var header = document.querySelector('.site-header');
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 60);
  }, { passive: true });

  /* ---- MOBILE MENU ---- */
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.header-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }

  /* ---- MUSIC BUTTON ---- */
  var btnMusica = document.getElementById('btnMusica');
  var audio = document.getElementById('audioBoda');
  if (btnMusica && audio) {
    btnMusica.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().catch(function () {});
        btnMusica.classList.add('is-playing');
      } else {
        audio.pause();
        btnMusica.classList.remove('is-playing');
      }
    });
    audio.addEventListener('play', function () { btnMusica.classList.add('is-playing'); });
    audio.addEventListener('pause', function () { btnMusica.classList.remove('is-playing'); });
  }

  /* ---- IMAGE FALLBACK ---- */
  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('error', function () {
      this.style.display = 'none';
    });
  });

  /* ---- GOOGLE SHEETS FORM (RSVP) — INTACTO ---- */
  var form = document.getElementById('deseos');
  var formBody = document.getElementById('formBody');
  var formSuccess = document.getElementById('formSuccess');
  var formError = document.getElementById('formError');
  var wrapSend = document.getElementById('wrapSend');
  var btnRetry = document.getElementById('btnRetry');

  var SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx6G-97RARCPxAtnRrdkIC-1a8ilB0l-GtCtFItMVsBy9lCh2w1d7IM-nsyiO8sE2CANg/exec';

  function showLoading() { if (wrapSend) wrapSend.classList.add('active'); }
  function hideLoading() { if (wrapSend) wrapSend.classList.remove('active'); }
  function showSuccess() {
    if (formBody) formBody.hidden = true;
    if (formError) formError.hidden = true;
    if (formSuccess) formSuccess.hidden = false;
  }
  function showError() {
    if (formSuccess) formSuccess.hidden = true;
    if (formError) formError.hidden = false;
  }
  function resetForm() {
    if (formError) formError.hidden = true;
    if (formBody) formBody.hidden = false;
  }

  if (btnRetry) btnRetry.addEventListener('click', resetForm);

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showLoading();

      var data = {
        nombre: form.nombre.value.trim(),
        email: form.email.value.trim(),
        invitados: form.invitados.value,
        alergia: form.alergia.value.trim(),
        bebida: form.bebida.value,
        mensaje: form.mensaje.value.trim()
      };

      // text/plain evita el preflight CORS; el script hace JSON.parse del body
      fetch(SHEETS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(data)
      }).then(function (response) {
        hideLoading();
        if (response.ok) {
          return response.json().then(function (json) {
            if (json && json.status === 'success') {
              showSuccess();
              form.reset();
            } else {
              showError();
            }
          });
        }
        showError();
      }).catch(function (err) {
        hideLoading();
        console.error('Network error:', err);
        // Si el script respondió ok pero CORS bloqueó la lectura,
        // asumimos éxito para no confundir al usuario.
        showSuccess();
        form.reset();
      });
    });
  }

  /* ---- COUNTDOWN — INTACTO ---- */
  if (typeof infoInvitacion !== 'undefined' && infoInvitacion.fechaJs) {
    var target = new Date(infoInvitacion.fechaJs).getTime();
    var contEl = document.getElementById('contador');
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function updateCountdown() {
      if (!contEl) return;
      var now = Date.now();
      var dist = target - now;
      if (dist < 0) {
        contEl.innerHTML = '<div class="count-box" data-label="¡Hoy!">🎉</div>';
        return;
      }
      var d = Math.floor(dist / 86400000);
      var h = Math.floor((dist % 86400000) / 3600000);
      var m = Math.floor((dist % 3600000) / 60000);
      var s = Math.floor((dist % 60000) / 1000);
      contEl.innerHTML =
        '<div class="count-box" data-label="Días">' + d + '</div>' +
        '<div class="count-box" data-label="Hrs">' + pad(h) + '</div>' +
        '<div class="count-box" data-label="Mins">' + pad(m) + '</div>' +
        '<div class="count-box" data-label="Segs">' + pad(s) + '</div>';
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  /* ============================================================
     BOOT: aplicar estado persistido
     ============================================================ */
  applyTheme(config.theme);
  applySections();
  applyGalleryLayout();
})();
