(function () {
  'use strict';

  /* ========== THEME SWITCHER ========== */
  var THEME_KEY = 'invitacion-theme';
  var PETAL_THEMES = { botanic: 1, boho: 1 };
  var BOKEH_THEMES = { 'dark-moody': 1, vintage: 1 };
  var DEFAULT_THEME = 'classic';

  var root = document.documentElement;
  var themeSelect = document.getElementById('themeSelect');
  var particlesLayer = null;
  var particleTimer = null;
  var activeParticleMode = null;

  function getTheme() {
    return root.getAttribute('data-theme') || DEFAULT_THEME;
  }

  function setTheme(theme) {
    if (!theme) theme = DEFAULT_THEME;
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    if (themeSelect && themeSelect.value !== theme) themeSelect.value = theme;
    syncParticles(theme);
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    var initial = saved || (themeSelect && themeSelect.value) || root.getAttribute('data-theme') || DEFAULT_THEME;
    setTheme(initial);
    if (themeSelect) {
      themeSelect.addEventListener('change', function () {
        setTheme(themeSelect.value);
      });
    }
  }

  /* ========== PARTICLES (CSS-animated, DOM-cleaned) ========== */
  function ensureParticlesLayer() {
    if (particlesLayer && document.body.contains(particlesLayer)) return particlesLayer;
    particlesLayer = document.createElement('div');
    particlesLayer.className = 'particles-layer';
    particlesLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(particlesLayer);
    return particlesLayer;
  }

  function clearParticles() {
    if (particleTimer) {
      clearInterval(particleTimer);
      particleTimer = null;
    }
    if (particlesLayer) {
      particlesLayer.innerHTML = '';
    }
    activeParticleMode = null;
  }

  function spawnPetal(layer) {
    var el = document.createElement('span');
    el.className = 'particle particle--petal';
    var left = Math.random() * 100;
    var dur = 6 + Math.random() * 7;
    var drift = (Math.random() * 120 - 60) + 'px';
    var spin = (200 + Math.random() * 400) * (Math.random() > 0.5 ? 1 : -1) + 'deg';
    var sway = (2 + Math.random() * 3) + 's';
    var size = (8 + Math.random() * 10) + 'px';
    el.style.left = left + 'vw';
    el.style.setProperty('--dur', dur + 's');
    el.style.setProperty('--drift', drift);
    el.style.setProperty('--spin', spin);
    el.style.setProperty('--sway', sway);
    el.style.setProperty('--particle-size', size);
    el.style.opacity = String(0.55 + Math.random() * 0.4);
    layer.appendChild(el);
    window.setTimeout(function () {
      if (el.parentNode) el.remove();
    }, dur * 1000 + 80);
  }

  function spawnBokeh(layer) {
    var el = document.createElement('span');
    el.className = 'particle particle--bokeh';
    var left = Math.random() * 100;
    var top = Math.random() * 100;
    var dur = 8 + Math.random() * 10;
    var sz = (6 + Math.random() * 22) + 'px';
    var blur = (2 + Math.random() * 6) + 'px';
    var dx = (Math.random() * 80 - 40) + 'px';
    var dy = (-20 - Math.random() * 80) + 'px';
    var scale = (0.6 + Math.random() * 1.2).toFixed(2);
    var op = (0.25 + Math.random() * 0.45).toFixed(2);
    el.style.left = left + 'vw';
    el.style.top = top + 'vh';
    el.style.setProperty('--dur', dur + 's');
    el.style.setProperty('--sz', sz);
    el.style.setProperty('--blur', blur);
    el.style.setProperty('--dx', dx);
    el.style.setProperty('--dy', dy);
    el.style.setProperty('--scale', scale);
    el.style.setProperty('--op', op);
    layer.appendChild(el);
    window.setTimeout(function () {
      if (el.parentNode) el.remove();
    }, dur * 1000 + 80);
  }

  function startPetals() {
    var layer = ensureParticlesLayer();
    var max = window.matchMedia('(max-width: 480px)').matches ? 10 : 16;
    var i;
    for (i = 0; i < 6; i++) spawnPetal(layer);
    particleTimer = setInterval(function () {
      if (layer.childElementCount >= max) return;
      spawnPetal(layer);
    }, 420);
  }

  function startBokeh() {
    var layer = ensureParticlesLayer();
    var max = window.matchMedia('(max-width: 480px)').matches ? 12 : 20;
    var i;
    for (i = 0; i < 8; i++) spawnBokeh(layer);
    particleTimer = setInterval(function () {
      if (layer.childElementCount >= max) return;
      spawnBokeh(layer);
    }, 550);
  }

  function syncParticles(theme) {
    var mode = null;
    if (PETAL_THEMES[theme]) mode = 'petal';
    else if (BOKEH_THEMES[theme]) mode = 'bokeh';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clearParticles();
      return;
    }

    if (mode === activeParticleMode) return;
    clearParticles();
    if (mode === 'petal') {
      activeParticleMode = 'petal';
      startPetals();
    } else if (mode === 'bokeh') {
      activeParticleMode = 'bokeh';
      startBokeh();
    }
  }

  /* ========== WELCOME MODAL ========== */
  var modal = document.getElementById('modalWelcome');
  var btn = document.getElementById('btnIngresar');
  if (btn) btn.addEventListener('click', function () { modal.classList.remove('visible'); });
  if (modal) modal.classList.add('visible');

  /* ========== HEADER SCROLL EFFECT ========== */
  var header = document.querySelector('.site-header');
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 60);
  }, { passive: true });

  /* ========== MOBILE MENU ========== */
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

  /* ========== MUSIC BUTTON ========== */
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

  /* ========== REVEAL ON SCROLL ========== */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { revealObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ========== IMAGE FALLBACK ========== */
  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('error', function () {
      this.style.display = 'none';
    });
  });

  /* ========== GOOGLE SHEETS FORM (RSVP) ========== */
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

  /* ========== COUNTDOWN ========== */
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

  /* boot theme + particles */
  initTheme();
})();
