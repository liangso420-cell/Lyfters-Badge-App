/* ============================================================
   Lyfter Badge App — UI, router e interactividad (JS puro)
   Los datos se obtienen SIEMPRE vía window.LyfterAPI (ver api.js),
   que decide entre modo 'mock' (localStorage) y 'backend' (Flask).
   ============================================================ */
(function () {
  'use strict';

  var API = window.LyfterAPI;
  var app = document.getElementById('app');
  var modalRoot = document.getElementById('modal-root');
  var toastRoot = document.getElementById('toast-root');

  /* ---------------------------------------------------------
     Evento activo (persistido aparte de la fuente de datos)
     --------------------------------------------------------- */
  var ACTIVE_KEY = 'lyfter_active_event';
  var activeMem = null;
  function getActiveId() { try { return localStorage.getItem(ACTIVE_KEY) || null; } catch (e) { return activeMem; } }
  function setActiveId(id) { try { localStorage.setItem(ACTIVE_KEY, id); } catch (e) { activeMem = id; } }
  function ensureActive(events) {
    var id = getActiveId();
    var ok = events.some(function (e) { return e.id === id; });
    if (!ok) { id = events.length ? events[0].id : null; if (id) setActiveId(id); }
    return id;
  }

  /* ---------------------------------------------------------
     Utilidades de UI
     --------------------------------------------------------- */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg, type) {
    var colors = { success: '#16a34a', error: '#ef4444', info: '#6C63FF' };
    var el = document.createElement('div');
    el.className = 'anim-slide pointer-events-auto text-white text-sm font-medium px-4 py-2.5 rounded-btn shadow-soft';
    el.style.background = colors[type] || colors.info;
    el.textContent = msg;
    toastRoot.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s'; el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 300);
    }, 2600);
  }

  function closeModal() { modalRoot.innerHTML = ''; }

  function loadingHtml() {
    return '<div class="device-frame px-4 pt-24 text-center text-gray-400">' +
      '<div class="text-3xl animate-pulse-badge">🏆</div><p class="mt-3 text-sm">Cargando…</p></div>';
  }
  function errorHtml(msg) {
    return '<div class="device-frame px-4 pt-24 text-center">' +
      '<div class="text-3xl mb-2">⚠️</div>' +
      '<p class="text-sm text-gray-600">' + esc(msg) + '</p>' +
      '<button id="err-retry" class="mt-4 px-5 py-2.5 rounded-btn text-white font-medium text-sm" style="background:#6C63FF;">Reintentar</button>' +
      '</div>';
  }

  /* ---------------------------------------------------------
     Validación de formularios
     --------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function setFieldError(input, message) {
    var errBox = input.parentNode.querySelector('.field-error');
    if (!errBox) {
      errBox = document.createElement('p');
      errBox.className = 'field-error';
      input.parentNode.appendChild(errBox);
    }
    if (message) { errBox.textContent = message; input.classList.add('input-invalid'); return false; }
    errBox.textContent = ''; input.classList.remove('input-invalid'); return true;
  }

  /* ---------------------------------------------------------
     QR (SVG placeholder + descarga), sin librerías
     --------------------------------------------------------- */
  function qrSvg(size) {
    size = size || 140;
    return '' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="140" height="140" fill="#fff"/><g fill="#111">' +
      '<rect x="10" y="10" width="40" height="40"/><rect x="18" y="18" width="24" height="24" fill="#fff"/><rect x="26" y="26" width="8" height="8" fill="#111"/>' +
      '<rect x="90" y="10" width="40" height="40"/><rect x="98" y="18" width="24" height="24" fill="#fff"/><rect x="106" y="26" width="8" height="8" fill="#111"/>' +
      '<rect x="10" y="90" width="40" height="40"/><rect x="18" y="98" width="24" height="24" fill="#fff"/><rect x="26" y="106" width="8" height="8" fill="#111"/>' +
      '<rect x="62" y="10" width="8" height="8"/><rect x="62" y="26" width="8" height="8"/><rect x="62" y="42" width="8" height="8"/>' +
      '<rect x="78" y="62" width="8" height="8"/><rect x="62" y="62" width="8" height="8"/><rect x="94" y="62" width="8" height="8"/><rect x="110" y="62" width="8" height="8"/>' +
      '<rect x="62" y="78" width="8" height="8"/><rect x="62" y="94" width="8" height="8"/><rect x="62" y="110" width="8" height="8"/>' +
      '<rect x="78" y="78" width="8" height="8"/><rect x="94" y="94" width="8" height="8"/><rect x="110" y="110" width="8" height="8"/><rect x="94" y="110" width="8" height="8"/><rect x="110" y="94" width="8" height="8"/>' +
      '</g></svg>';
  }
  function downloadQr(badge) {
    var slug = badge.name.toLowerCase().replace(/\s+/g, '-');
    var a = document.createElement('a');
    var objUrl = null;
    if (badge.qrImage) {
      // QR real del backend: data URI PNG → descarga directa
      a.href = badge.qrImage;
      a.download = 'qr-' + slug + '.png';
    } else {
      // Modo mock: placeholder SVG
      var blob = new Blob([qrSvg(280)], { type: 'image/svg+xml' });
      objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = 'qr-' + slug + '.svg';
    }
    document.body.appendChild(a); a.click(); a.remove();
    if (objUrl) URL.revokeObjectURL(objUrl);
    toast('QR de "' + badge.name + '" descargado', 'success');
  }

  /* ---------------------------------------------------------
     Componentes de markup
     --------------------------------------------------------- */
  function inputField(opts) {
    return '<div>' +
      '<label class="text-sm font-medium text-gray-600">' + esc(opts.label) + '</label>' +
      '<input type="' + (opts.type || 'text') + '" name="' + opts.name + '" ' +
        'placeholder="' + esc(opts.placeholder || '') + '" value="' + esc(opts.value || '') + '" ' +
        'class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none" />' +
      '</div>';
  }
  function primaryButton(label, attrs) {
    return '<button ' + (attrs || '') + ' class="w-full py-3 rounded-btn text-white font-semibold" style="background:#6C63FF;">' + esc(label) + '</button>';
  }

  function adminShell(activeTab, innerHtml, events, activeId) {
    var eventOptions = events.map(function (e) {
      return '<option value="' + e.id + '"' + (e.id === activeId ? ' selected' : '') + '>' + esc(e.name) + '</option>';
    }).join('');
    var tabs = [
      { id: 'event', label: 'Crear evento', hash: '#/admin/event' },
      { id: 'badges', label: 'Badges', hash: '#/admin/badges' },
      { id: 'participation', label: 'Participación', hash: '#/admin/participation' }
    ].map(function (t) {
      var on = t.id === activeTab;
      return '<a href="' + t.hash + '" class="admin-tab px-4 py-2 text-sm font-medium border-b-2 ' +
        (on ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-primary') + '">' + esc(t.label) + '</a>';
    }).join('');

    return '' +
      '<header class="bg-white border-b border-gray-200">' +
        '<div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">' +
          '<div class="flex items-center gap-2"><span class="text-xl">🏆</span><span class="font-bold">Panel Admin</span></div>' +
          '<div class="flex items-center gap-3">' +
            (events.length ? '<select id="admin-event-select" class="px-3 py-2 bg-base rounded-btn border border-gray-200 text-sm focus:border-primary outline-none">' + eventOptions + '</select>' : '') +
            '<button id="admin-logout" class="text-sm text-gray-400 hover:text-primary flex items-center gap-1">⎋ Salir</button>' +
          '</div>' +
        '</div>' +
        '<nav class="max-w-3xl mx-auto px-4 flex gap-2">' + tabs + '</nav>' +
      '</header>' +
      '<section class="max-w-3xl mx-auto px-4 py-8">' + innerHtml + '</section>';
  }
  function mountAdminShell() {
    var sel = document.getElementById('admin-event-select');
    if (sel) sel.addEventListener('change', function () { setActiveId(sel.value); render(); });
    var out = document.getElementById('admin-logout');
    if (out) out.addEventListener('click', logout);
  }

  /* ---------------------------------------------------------
     Sesión / navegación
     --------------------------------------------------------- */
  function logout() { API.logout(); toast('Sesión cerrada', 'info'); navigate('#/login'); }

  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }
  function currentPath() { return location.hash.replace(/^#/, '') || '/login'; }

  function resolveRoute(path) {
    var user = API.currentUser();
    var isAuthRoute = (path === '/login' || path === '/register');
    var isAdminRoute = path.indexOf('/admin') === 0;
    if (!user) return isAuthRoute ? path : '/login';
    if (isAuthRoute) return user.role === 'admin' ? '/admin/event' : '/profile';
    if (isAdminRoute && user.role !== 'admin') return '/profile';
    if (path === '/profile' && user.role === 'admin') return '/admin/event';
    return routes[path] ? path : (user.role === 'admin' ? '/admin/event' : '/profile');
  }

  var routes = {
    '/login': renderLogin,
    '/register': renderRegister,
    '/profile': renderProfile,
    '/scan': renderScanner,
    '/admin/event': renderAdminEvent,
    '/admin/badges': renderAdminBadges,
    '/admin/participation': renderAdminParticipation
  };

  async function render() {
    var requested = currentPath();
    var resolved = resolveRoute(requested);
    if (resolved !== requested) { location.hash = resolved; return; }

    closeModal();
    app.innerHTML = loadingHtml();
    try {
      var view = await routes[resolved]();
      app.innerHTML = view.html;
      if (view.mount) view.mount();
    } catch (err) {
      app.innerHTML = errorHtml(err && err.message ? err.message : 'Error inesperado');
      var retry = document.getElementById('err-retry');
      if (retry) retry.addEventListener('click', render);
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  /* ---------------------------------------------------------
     VISTA 1: LOGIN
     --------------------------------------------------------- */
  async function renderLogin() {
    var demoHint = API.mode === 'mock'
      ? '<p class="text-center text-xs text-gray-300 pt-2">Demo · admin@lyfter.cc / admin123 · ana@correo.com / ana123</p>'
      : '';
    var html =
      '<section class="device-frame px-4 pt-12 pb-12">' +
        '<div class="card-soft p-8 anim-fade">' +
          '<div class="text-center mb-6">' +
            '<div class="text-4xl mb-2">🏆</div>' +
            '<h2 class="text-2xl font-bold">Lyfter Badge App</h2>' +
            '<p class="text-gray-400 text-sm mt-1">Escanea, colecciona, gana</p>' +
          '</div>' +
          '<form id="login-form" class="space-y-4" novalidate>' +
            inputField({ label: 'Email', type: 'email', name: 'email', placeholder: 'tu@correo.com' }) +
            inputField({ label: 'Contraseña', type: 'password', name: 'password', placeholder: '••••••••' }) +
            primaryButton('Entrar', 'type="submit"') +
            '<p class="text-center text-sm text-gray-500">¿No tienes cuenta? <a href="#/register" class="text-primary font-medium">Regístrate</a></p>' +
            demoHint +
          '</form>' +
        '</div>' +
      '</section>';
    return {
      html: html,
      mount: function () {
        var form = document.getElementById('login-form');
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          var email = form.email, pass = form.password, ok = true;
          ok = setFieldError(email, EMAIL_RE.test(email.value.trim()) ? '' : 'Email no válido') && ok;
          ok = setFieldError(pass, pass.value ? '' : 'Ingresa tu contraseña') && ok;
          if (!ok) return;
          try {
            await API.login(email.value.trim(), pass.value);
            toast('¡Bienvenido!', 'success');
            render();
          } catch (err) { setFieldError(pass, err.message || 'No se pudo iniciar sesión'); }
        });
      }
    };
  }

  /* ---------------------------------------------------------
     VISTA 2: REGISTRO
     --------------------------------------------------------- */
  async function renderRegister() {
    var html =
      '<section class="device-frame px-4 pt-12 pb-12">' +
        '<div class="card-soft p-8 anim-fade">' +
          '<div class="text-center mb-6">' +
            '<div class="text-4xl mb-2">🏆</div>' +
            '<h2 class="text-2xl font-bold">Crear cuenta</h2>' +
            '<p class="text-gray-400 text-sm mt-1">Únete y empieza a coleccionar badges</p>' +
          '</div>' +
          '<form id="register-form" class="space-y-4" novalidate>' +
            inputField({ label: 'Nombre completo', name: 'name', placeholder: 'Ana Pérez' }) +
            inputField({ label: 'Email', type: 'email', name: 'email', placeholder: 'tu@correo.com' }) +
            inputField({ label: 'Contraseña', type: 'password', name: 'password', placeholder: '••••••••' }) +
            inputField({ label: 'Confirmar contraseña', type: 'password', name: 'confirm', placeholder: '••••••••' }) +
            primaryButton('Crear cuenta', 'type="submit"') +
            '<p class="text-center text-sm text-gray-500">¿Ya tienes cuenta? <a href="#/login" class="text-primary font-medium">Inicia sesión</a></p>' +
          '</form>' +
        '</div>' +
      '</section>';
    return {
      html: html,
      mount: function () {
        var form = document.getElementById('register-form');
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          var name = form.name, email = form.email, pass = form.password, confirm = form.confirm, ok = true;
          ok = setFieldError(name, name.value.trim() ? '' : 'Ingresa tu nombre') && ok;
          ok = setFieldError(email, EMAIL_RE.test(email.value.trim()) ? '' : 'Email no válido') && ok;
          ok = setFieldError(pass, pass.value.length >= 6 ? '' : 'Mínimo 6 caracteres') && ok;
          ok = setFieldError(confirm, (confirm.value === pass.value && confirm.value) ? '' : 'Las contraseñas no coinciden') && ok;
          if (!ok) return;
          try {
            await API.register({ name: name.value.trim(), email: email.value.trim(), password: pass.value });
            toast('Cuenta creada 🎉', 'success');
            render();
          } catch (err) { setFieldError(email, err.message || 'No se pudo crear la cuenta'); }
        });
      }
    };
  }

  /* ---------------------------------------------------------
     VISTA 3: PERFIL DEL PARTICIPANTE
     --------------------------------------------------------- */
  async function renderProfile() {
    var user = API.currentUser();
    var events = await API.listEvents();
    if (!events.length) {
      return { html: '<section class="device-frame px-4 pt-12"><div class="card-soft p-8 text-center text-gray-500">No hay eventos disponibles todavía.<br><button id="profile-logout" class="mt-4 text-sm text-primary">⎋ Salir</button></div></section>',
        mount: function () { document.getElementById('profile-logout').addEventListener('click', logout); } };
    }
    var activeId = ensureActive(events);
    var detail = await API.getEventDetail(activeId);
    var total = detail.total, doneCount = detail.obtained;
    var pct = total ? Math.round((doneCount / total) * 100) : 0;
    var complete = detail.complete;

    var eventOptions = events.map(function (e) {
      return '<option value="' + e.id + '"' + (e.id === activeId ? ' selected' : '') + '>' + esc(e.name) + '</option>';
    }).join('');

    var grid = detail.badges.map(function (b) {
      if (b.obtained) {
        return '<div class="rounded-card p-3 text-center" style="background:#EEEDFF;">' +
          '<div class="text-3xl">' + b.emoji + '</div><p class="text-xs font-medium mt-1">' + esc(b.name) + '</p>' +
          '<span class="text-green-500 text-sm">✅</span></div>';
      }
      return '<div class="rounded-card p-3 text-center bg-gray-100">' +
        '<div class="text-3xl opacity-40">' + b.emoji + '</div><p class="text-xs text-gray-400 mt-1">' + esc(b.name) + '</p>' +
        '<span class="text-gray-400 text-sm">🔒</span></div>';
    }).join('');

    var prizeBox = complete
      ? '<div class="mt-6 p-4 rounded-card" style="background:#EEEDFF;">' +
          '<p class="text-xs uppercase tracking-wide text-primary font-semibold text-center">Premio desbloqueado</p>' +
          '<p class="text-lg font-bold mt-1 text-center">' + esc(detail.prizeRevealed || detail.prize) + '</p></div>'
      : '<div class="mt-6 p-4 rounded-card border border-dashed border-gray-300 text-center text-sm text-gray-500">' +
          '🎁 Completa los ' + total + ' badges para revelar el <span class="font-medium text-gray-700">premio sorpresa</span></div>';

    var completedBanner = complete
      ? '<div class="card-soft p-6 text-center mb-4 anim-pop">' +
          '<div class="text-5xl mb-2">🎉</div>' +
          '<h3 class="text-lg font-bold text-primary">¡Felicidades, ' + esc(user.name.split(' ')[0]) + '!</h3>' +
          '<p class="text-sm text-gray-500 mt-1">Completaste los ' + total + ' badges de ' + esc(detail.name) + '</p></div>'
      : '';

    var html =
      '<section class="device-frame px-4 pt-12 pb-28">' +
        completedBanner +
        '<div class="card-soft p-6 anim-fade">' +
          '<div class="flex items-center justify-between mb-5">' +
            '<h2 class="text-xl font-bold">Hola, ' + esc(user.name.split(' ')[0]) + ' 👋</h2>' +
            '<button id="profile-logout" class="text-sm text-gray-400 hover:text-primary flex items-center gap-1">⎋ Salir</button>' +
          '</div>' +
          '<label class="text-sm font-medium text-gray-600">Evento activo</label>' +
          '<select id="profile-event-select" class="w-full mt-1 mb-5 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none">' + eventOptions + '</select>' +
          '<div class="mb-1 flex justify-between text-sm">' +
            '<span class="font-medium text-gray-700">Tu progreso</span>' +
            '<span class="text-primary font-semibold">' + doneCount + ' de ' + total + ' badges</span>' +
          '</div>' +
          '<div class="w-full h-3 bg-gray-200 rounded-full mb-6 overflow-hidden">' +
            '<div class="h-3 rounded-full transition-all duration-500" style="width:' + pct + '%; background:#6C63FF;"></div></div>' +
          '<div class="grid grid-cols-3 gap-3">' + grid + '</div>' +
          prizeBox +
        '</div>' +
      '</section>' +
      '<div class="fixed bottom-0 left-0 right-0 flex justify-center pb-6 pointer-events-none">' +
        '<button id="fab-scan" class="pointer-events-auto px-6 py-4 rounded-full text-white font-semibold shadow-soft flex items-center gap-2 active:scale-95 transition" ' +
          'style="background:#6C63FF; box-shadow:0 4px 20px rgba(108,99,255,0.4);">📷 Escanear QR</button>' +
      '</div>';

    return {
      html: html,
      mount: function () {
        document.getElementById('profile-logout').addEventListener('click', logout);
        document.getElementById('fab-scan').addEventListener('click', function () { navigate('#/scan'); });
        var sel = document.getElementById('profile-event-select');
        sel.addEventListener('change', function () { setActiveId(sel.value); render(); });
      }
    };
  }

  /* ---------------------------------------------------------
     VISTA 4 (+5): ESCÁNER QR  → modal de celebración
     --------------------------------------------------------- */
  async function renderScanner() {
    // En modo backend no hay cámara: se canjea pegando el token del QR.
    var manualBlock = API.mode === 'backend'
      ? '<div class="absolute bottom-6 left-4 right-4">' +
          '<input id="scan-token" type="text" placeholder="Pega el token del QR" ' +
            'class="w-full px-4 py-3 rounded-btn bg-white/90 outline-none text-sm" />' +
          '<button id="scan-redeem" class="mt-2 w-full py-3 rounded-btn text-white font-semibold" style="background:#6C63FF;">Canjear</button>' +
        '</div>'
      : '<p class="text-gray-500 mt-1 text-xs">(toca el visor para simular un escaneo)</p>';

    var html =
      '<section class="device-frame px-4 pt-12">' +
        '<div class="rounded-card overflow-hidden relative" style="background:#111; height:520px;">' +
          '<button id="scan-close" class="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur hover:bg-white/30">✕</button>' +
          '<div class="absolute inset-0 flex flex-col items-center justify-center">' +
            '<button id="scan-viewer" class="relative" style="width:240px; height:240px;" aria-label="Simular escaneo de QR">' +
              '<span class="scanner-corner corner-tl"></span><span class="scanner-corner corner-tr"></span>' +
              '<span class="scanner-corner corner-bl"></span><span class="scanner-corner corner-br"></span>' +
              '<span class="scan-line" style="top:0;"></span>' +
            '</button>' +
            '<p class="text-gray-300 mt-8 text-sm">Apunta al código QR</p>' +
          '</div>' +
          manualBlock +
        '</div>' +
      '</section>';

    return {
      html: html,
      mount: function () {
        document.getElementById('scan-close').addEventListener('click', function () { navigate('#/profile'); });
        if (API.mode === 'backend') {
          document.getElementById('scan-redeem').addEventListener('click', function () {
            doRedeem(document.getElementById('scan-token').value.trim());
          });
        } else {
          document.getElementById('scan-viewer').addEventListener('click', function () { doRedeem(null); });
        }
      }
    };
  }

  async function doRedeem(token) {
    var events = await API.listEvents();
    var activeId = ensureActive(events);
    try {
      var r = await API.redeem(activeId, token);
      if (r.status === 'none') { toast('Ya completaste todos los badges de este evento', 'info'); navigate('#/profile'); return; }
      if (r.status === 'duplicate') { toast('Ya tenías "' + r.badge.name + '"', 'info'); navigate('#/profile'); return; }
      showCelebration(r);
    } catch (err) { toast(err.message || 'No se pudo canjear', 'error'); }
  }

  function showCelebration(r) {
    var isLast = r.complete;
    var prizeBlock = (isLast && r.prize)
      ? '<div class="mt-4 p-4 rounded-card" style="background:#EEEDFF;">' +
          '<p class="text-xs uppercase tracking-wide text-primary font-semibold">Premio desbloqueado</p>' +
          '<p class="text-lg font-bold mt-1">' + esc(r.prize) + '</p></div>'
      : '';
    var title = isLast ? '¡Completaste el evento!' : '¡Badge obtenido!';
    var subtitle = isLast
      ? 'Obtuviste todos los badges del evento.'
      : esc(r.badge.desc || '');

    modalRoot.innerHTML =
      '<div class="fixed inset-0 z-50 flex items-center justify-center p-6 anim-fade" style="background:rgba(17,24,39,0.7);">' +
        '<div class="card-soft p-8 text-center w-full max-w-sm anim-pop">' +
          '<div class="text-6xl animate-pulse-badge mb-4">' + r.badge.emoji + '</div>' +
          '<h3 class="text-2xl font-bold text-primary">' + title + '</h3>' +
          '<p class="text-lg font-semibold mt-2">' + esc(r.badge.name) + '</p>' +
          '<p class="text-sm text-gray-500 mt-1">' + subtitle + '</p>' +
          prizeBlock +
          '<button id="celebrate-ok" class="mt-6 w-full py-3 rounded-btn text-white font-semibold" style="background:#6C63FF;">¡Genial!</button>' +
        '</div>' +
      '</div>';
    document.getElementById('celebrate-ok').addEventListener('click', function () { closeModal(); navigate('#/profile'); });
  }

  /* ---------------------------------------------------------
     VISTA 6: ADMIN — CREAR EVENTO
     --------------------------------------------------------- */
  async function renderAdminEvent() {
    var events = await API.listAdminEvents();
    var activeId = ensureActive(events);
    var inner =
      '<div class="card-soft p-8 anim-fade">' +
        '<h2 class="text-xl font-bold mb-1">Crear evento</h2>' +
        '<p class="text-sm text-gray-400 mb-6">Configura un nuevo evento de badges</p>' +
        '<form id="event-form" class="space-y-4" novalidate>' +
          inputField({ label: 'Nombre del evento', name: 'name', placeholder: 'Lyfter Summit 2026' }) +
          '<div><label class="text-sm font-medium text-gray-600">Descripción</label>' +
            '<textarea name="description" rows="3" placeholder="Descripción del evento..." ' +
            'class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none"></textarea></div>' +
          '<div class="grid grid-cols-2 gap-4">' +
            inputField({ label: 'Fecha inicio', type: 'date', name: 'start' }) +
            inputField({ label: 'Fecha fin', type: 'date', name: 'end' }) +
          '</div>' +
          inputField({ label: 'Premio sorpresa 🎁', name: 'prize', placeholder: 'Entrada VIP al after-party' }) +
          primaryButton('Crear evento', 'type="submit"') +
        '</form>' +
      '</div>';
    return {
      html: adminShell('event', inner, events, activeId),
      mount: function () {
        mountAdminShell();
        var form = document.getElementById('event-form');
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          var ok = true;
          ok = setFieldError(form.name, form.name.value.trim() ? '' : 'Ingresa un nombre') && ok;
          ok = setFieldError(form.start, form.start.value ? '' : 'Selecciona la fecha de inicio') && ok;
          ok = setFieldError(form.end, form.end.value ? '' : 'Selecciona la fecha de fin') && ok;
          if (ok && form.start.value && form.end.value && form.end.value < form.start.value)
            ok = setFieldError(form.end, 'La fecha fin no puede ser anterior al inicio') && ok;
          if (!ok) return;
          try {
            var created = await API.createEvent({
              name: form.name.value.trim(), description: form.description.value.trim(),
              start: form.start.value, end: form.end.value, prize: form.prize.value.trim()
            });
            setActiveId(created.id);
            toast('Evento creado ✅ — agrega sus badges', 'success');
            navigate('#/admin/badges');
          } catch (err) { toast(err.message || 'No se pudo crear el evento', 'error'); }
        });
      }
    };
  }

  /* ---------------------------------------------------------
     VISTA 7: ADMIN — GESTIÓN DE BADGES
     --------------------------------------------------------- */
  var selectedBadgeId = null;

  async function renderAdminBadges() {
    var events = await API.listAdminEvents();
    var activeId = ensureActive(events);
    if (!activeId) {
      return { html: adminShell('badges', '<div class="card-soft p-8 text-center text-gray-500">Primero crea un evento.</div>', events, activeId), mount: mountAdminShell };
    }
    var data = await API.listAdminBadges(activeId);
    var badges = data.badges;
    if (selectedBadgeId && !badges.some(function (b) { return b.id === selectedBadgeId; })) selectedBadgeId = null;
    var selected = badges.find(function (b) { return b.id === selectedBadgeId; }) || badges[0] || null;

    var list = badges.length
      ? badges.map(function (b) {
          return '<div class="flex items-center justify-between p-4 rounded-card bg-base">' +
            '<div class="flex items-center gap-3"><span class="text-2xl">' + b.emoji + '</span>' +
              '<div><p class="font-medium">' + esc(b.name) + '</p><p class="text-xs text-gray-400">' + esc(b.desc) + '</p></div></div>' +
            '<button data-qr="' + b.id + '" class="qr-btn px-4 py-2 rounded-btn text-sm font-medium text-primary border border-primary hover:bg-primary-soft">Ver QR</button>' +
          '</div>';
        }).join('')
      : '<p class="text-sm text-gray-400 text-center py-4">Aún no hay badges. Agrega el primero abajo 👇</p>';

    var qrImage = selected && selected.qrImage
      ? '<img src="' + esc(selected.qrImage) + '" width="140" height="140" alt="Código QR de ' + esc(selected.name) + '" />'
      : qrSvg(140);
    var qrPanel = selected
      ? '<div class="p-6 rounded-card text-center" style="background:#EEEDFF;">' +
          '<p class="text-sm font-semibold text-primary mb-3">QR generado para "' + esc(selected.name) + '"</p>' +
          '<div class="inline-block bg-white p-3 rounded-card shadow-soft">' + qrImage + '</div>' +
          '<p class="text-xs text-gray-400 mt-2 break-all">' + esc(selected.redeemUrl) + '</p>' +
          '<button id="qr-download" class="mt-3 px-5 py-2.5 rounded-btn text-white font-medium text-sm" style="background:#6C63FF;">⬇️ Descargar QR</button>' +
        '</div>'
      : '';

    var inner =
      '<div class="card-soft p-8 anim-fade">' +
        '<h2 class="text-xl font-bold mb-1">Badges — ' + esc(data.event.name) + '</h2>' +
        '<p class="text-sm text-gray-400 mb-6">Crea badges y genera sus códigos QR</p>' +
        '<div class="space-y-3 mb-6">' + list + '</div>' +
        '<div class="p-4 rounded-card border border-dashed border-gray-300 mb-6">' +
          '<p class="text-sm font-semibold mb-3 text-gray-700">➕ Agregar nuevo badge</p>' +
          '<form id="add-badge-form" novalidate>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
              '<input type="text" name="name" placeholder="Nombre del badge" class="px-4 py-3 bg-white rounded-btn border border-gray-200 focus:border-primary outline-none" />' +
              '<input type="text" name="desc" placeholder="Descripción" class="px-4 py-3 bg-white rounded-btn border border-gray-200 focus:border-primary outline-none" />' +
            '</div>' +
            '<button type="submit" class="mt-3 px-5 py-2.5 rounded-btn text-white font-medium text-sm" style="background:#6C63FF;">Agregar badge</button>' +
          '</form>' +
        '</div>' +
        qrPanel +
      '</div>';

    return {
      html: adminShell('badges', inner, events, activeId),
      mount: function () {
        mountAdminShell();
        Array.prototype.forEach.call(document.querySelectorAll('.qr-btn'), function (btn) {
          btn.addEventListener('click', function () { selectedBadgeId = btn.getAttribute('data-qr'); render(); });
        });
        var dl = document.getElementById('qr-download');
        if (dl && selected) dl.addEventListener('click', function () { downloadQr(selected); });
        var form = document.getElementById('add-badge-form');
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          if (!setFieldError(form.name, form.name.value.trim() ? '' : 'Ingresa un nombre')) return;
          try {
            var b = await API.addBadge(activeId, { name: form.name.value.trim(), desc: form.desc.value.trim(), emoji: '🏅' });
            selectedBadgeId = b.id;
            toast('Badge "' + b.name + '" agregado', 'success');
            render();
          } catch (err) { toast(err.message || 'No se pudo agregar el badge', 'error'); }
        });
      }
    };
  }

  /* ---------------------------------------------------------
     VISTA 8: ADMIN — SEGUIMIENTO DE PARTICIPACIÓN
     --------------------------------------------------------- */
  async function renderAdminParticipation() {
    var events = await API.listAdminEvents();
    var activeId = ensureActive(events);
    if (!activeId) {
      return { html: adminShell('participation', '<div class="card-soft p-8 text-center text-gray-500">Primero crea un evento.</div>', events, activeId), mount: mountAdminShell };
    }
    var data = await API.listAdminBadges(activeId);
    var totalP = data.event.totalParticipants;
    var rows = data.badges.length
      ? data.badges.map(function (b) {
          var t = b.token || '';
          var tokenShort = t.length > 9 ? (t.slice(0, 4) + '…' + t.slice(-4)) : t;
          var participantes = (totalP != null) ? (b.redeemed + ' / ' + totalP) : String(b.redeemed);
          return '<tr>' +
            '<td class="py-3 pr-4"><span class="mr-2">' + b.emoji + '</span>' + esc(b.name) + '</td>' +
            '<td class="py-3 pr-4 text-gray-400 font-mono text-xs">' + esc(tokenShort) + '</td>' +
            '<td class="py-3 pr-4"><span class="font-semibold text-primary">' + b.redeemed + '</span></td>' +
            '<td class="py-3 text-gray-500">' + participantes + '</td></tr>';
        }).join('')
      : '<tr><td colspan="4" class="py-6 text-center text-gray-400">Este evento aún no tiene badges.</td></tr>';

    var inner =
      '<div class="card-soft p-8 anim-fade">' +
        '<h2 class="text-xl font-bold mb-1">Participación — ' + esc(data.event.name) + '</h2>' +
        '<p class="text-sm text-gray-400 mb-6">Estado de redención por badge</p>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm">' +
          '<thead><tr class="text-left text-gray-400 border-b border-gray-200">' +
            '<th class="py-3 pr-4 font-medium">Badge</th><th class="py-3 pr-4 font-medium">QR token</th>' +
            '<th class="py-3 pr-4 font-medium">Canjeados</th><th class="py-3 font-medium">Participantes</th>' +
          '</tr></thead><tbody class="divide-y divide-gray-100">' + rows + '</tbody></table></div>' +
      '</div>';
    return { html: adminShell('participation', inner, events, activeId), mount: mountAdminShell };
  }

  /* ---------------------------------------------------------
     ARRANQUE
     --------------------------------------------------------- */
  if (!location.hash) location.hash = '#/login';
  render();

  // Reset de demo (solo modo mock): lyfterReset()
  window.lyfterReset = function () {
    try { API.resetDemo(); toast('Datos de demo reiniciados', 'info'); }
    catch (e) { toast(e.message, 'error'); return; }
    API.logout(); navigate('#/login');
  };
})();
