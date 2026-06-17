/* ============================================================
   Lyfter Badge App — utilidades compartidas
   ============================================================ */
(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var ACTIVE_KEY = 'lyfter_active_event';
  var activeMem = null;

  /* ── Evento activo ── */
  function getActiveId() { try { return localStorage.getItem(ACTIVE_KEY) || null; } catch (e) { return activeMem; } }
  function setActiveId(id) { try { localStorage.setItem(ACTIVE_KEY, id); } catch (e) { activeMem = id; } }
  function ensureActive(evs) {
    var id = getActiveId();
    var ok = evs.some(function (e) { return e.id === id; });
    if (!ok) { id = evs.length ? evs[0].id : null; if (id) setActiveId(id); }
    return id;
  }

  /* ── Escape HTML ── */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── Toast ── */
  var TOAST_COLORS = { success: '#16a34a', error: '#ef4444', warning: '#d97706', info: '#6C63FF' };

  function toast(msg, type) {
    var toastRoot = document.getElementById('toast-root');
    if (!toastRoot) return;
    var el = document.createElement('div');
    el.className = 'anim-slide pointer-events-auto text-white text-sm font-medium px-4 py-2.5 rounded-btn shadow-soft';
    el.style.background = TOAST_COLORS[type] || TOAST_COLORS.info;
    el.textContent = msg;
    toastRoot.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s'; el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 300);
    }, 2800);
  }

  window.toast = toast;

  function toastNextPage(msg, type) {
    try { sessionStorage.setItem('lyfter_toast', msg); sessionStorage.setItem('lyfter_toast_type', type || 'info'); } catch (e) {}
  }
  function showPendingToast() {
    try {
      var msg = sessionStorage.getItem('lyfter_toast');
      var t   = sessionStorage.getItem('lyfter_toast_type');
      if (msg) { sessionStorage.removeItem('lyfter_toast'); sessionStorage.removeItem('lyfter_toast_type'); toast(msg, t || 'info'); }
    } catch (e) {}
  }

  /* ── Modal base ── */
  function closeModal() {
    var r = document.getElementById('modal-root');
    if (r) r.innerHTML = '';
  }

  /* ── Confirm modal ── */
  function showConfirm(msg, onConfirm, onCancel, opts) {
    opts = opts || {};
    var confirmLabel = opts.confirmLabel || 'Confirmar';
    var confirmColor = opts.danger !== false ? '#ef4444' : '#6C63FF';
    var root = document.getElementById('modal-root');
    root.innerHTML =
      '<div class="fixed inset-0 z-50 flex items-center justify-center p-6 anim-fade" style="background:rgba(17,24,39,0.75);">' +
        '<div class="bg-white rounded-card p-6 w-full max-w-sm shadow-soft anim-pop">' +
          '<p class="text-sm text-gray-700 leading-relaxed mb-6">' + esc(msg) + '</p>' +
          '<div class="flex gap-3 justify-end">' +
            '<button id="confirm-cancel" class="px-5 py-2.5 rounded-btn border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>' +
            '<button id="confirm-ok" class="px-5 py-2.5 rounded-btn text-white text-sm font-medium" style="background:' + confirmColor + ';">' + esc(confirmLabel) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('confirm-cancel').addEventListener('click', function () { closeModal(); if (onCancel) onCancel(); });
    document.getElementById('confirm-ok').addEventListener('click', function () { closeModal(); if (onConfirm) onConfirm(); });
  }

  /* ── HTML de estado ── */
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
  function skeletonCard(n) {
    var rows = '';
    for (var i = 0; i < (n || 3); i++) {
      rows += '<div class="h-16 bg-gray-100 rounded-card animate-pulse mb-3"></div>';
    }
    return rows;
  }

  /* ── Validación ── */
  function setFieldError(input, message) {
    var errBox = input.parentNode.querySelector('.field-error');
    if (!errBox) { errBox = document.createElement('p'); errBox.className = 'field-error text-xs text-red-500 mt-1'; input.parentNode.appendChild(errBox); }
    if (message) { errBox.textContent = message; input.classList.add('input-invalid'); return false; }
    errBox.textContent = ''; input.classList.remove('input-invalid'); return true;
  }

  /* ── QR ── */
  function qrSvg(size) {
    size = size || 140;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">' +
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
      a.href = badge.qrImage;
      a.download = 'badge-' + slug + '.png';
    } else {
      var blob = new Blob([qrSvg(280)], { type: 'image/svg+xml' });
      objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = 'badge-' + slug + '.svg';
    }
    document.body.appendChild(a); a.click(); a.remove();
    if (objUrl) URL.revokeObjectURL(objUrl);
    toast('QR de "' + badge.name + '" descargado', 'success');
  }

  /* ── Componentes de markup ── */
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

  /* ----- Drawer lateral ----- */
  function showDrawer(avatarUrl, userName, onAvatarSave, isAdmin) {
    try {
      var savedTheme = localStorage.getItem('lyfter_theme');
      if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    } catch(e) {}
    var root = document.getElementById('modal-root');
    var avatarHtml = avatarUrl
      ? '<img src="' + avatarUrl + '" class="w-16 h-16 rounded-full object-cover border-2 border-primary" />'
      : '<div class="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center text-3xl">👤</div>';

    root.innerHTML =
      '<div id="drawer-overlay" class="fixed inset-0 z-50 flex justify-end" style="background:rgba(17,24,39,0.5);">' +
        '<div id="drawer-panel" class="bg-white h-full w-72 shadow-soft flex flex-col" style="transform:translateX(100%); transition:transform 0.25s ease;">' +
          '<div class="p-5 border-b border-gray-100 flex items-center gap-3">' +
            avatarHtml +
            '<div>' +
              '<p class="font-semibold text-gray-800">' + esc(userName || 'Usuario') + '</p>' +
              '<p class="text-xs text-gray-400">Mi cuenta</p>' +
            '</div>' +
          '</div>' +
          '<nav class="flex-1 overflow-y-auto py-4">' +
            '<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2">Configuración</p>' +
            '<button id="drawer-account-btn" class="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left justify-between">' +
              '<div class="flex items-center gap-3">' +
                (avatarUrl ? '<img src="' + avatarUrl + '" class="w-8 h-8 rounded-full object-cover" />' : '<div class="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-sm">👤</div>') +
                '<span>Centro de cuenta</span>' +
              '</div>' +
              '<span class="text-gray-300">›</span>' +
            '</button>' +
            '<div class="mt-2 border-t border-gray-100 pt-2">' +
              '<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2 mt-2">Privacidad</p>' +
              '<button id="drawer-privacy-btn" class="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left">🔒 <span>Configuración de privacidad</span></button>' +
            '</div>' +
            '<div class="mt-2 border-t border-gray-100 pt-2">' +
              '<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2 mt-2">Apariencia</p>' +
              '<button id="drawer-theme-btn" class="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left">🌙 <span>Tema oscuro/claro</span></button>' +
            '</div>' +
            '<div class="mt-2 border-t border-gray-100 pt-2">' +
              '<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2 mt-2">Información</p>' +
              '<button id="drawer-about-btn" class="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left">ℹ️ <span>Acerca de la app</span></button>' +
            '</div>' +
            (isAdmin
              ? '<div class="mt-2 border-t border-gray-100 pt-2">' +
                  '<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2 mt-2">Administración</p>' +
                  '<button id="drawer-users-btn" class="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left">👥 <span>Gestionar usuarios</span></button>' +
                '</div>'
              : '') +
          '</nav>' +
          '<div class="p-5 border-t border-gray-100">' +
            '<button id="drawer-close" class="w-full py-2.5 rounded-btn border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cerrar</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    requestAnimationFrame(function() {
      document.getElementById('drawer-panel').style.transform = 'translateX(0)';
    });

    function closeDrawer() {
      var panel = document.getElementById('drawer-panel');
      if (panel) panel.style.transform = 'translateX(100%)';
      setTimeout(closeModal, 250);
    }

    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    document.getElementById('drawer-overlay').addEventListener('click', function(e) {
      if (e.target === this) closeDrawer();
    });

    // Centro de cuenta
    var accountBtn = document.getElementById('drawer-account-btn');
    if (accountBtn) {
      accountBtn.addEventListener('click', function() {
        var nav = document.getElementById('drawer-panel').querySelector('nav');
        window.LyfterAPI.getProfile().then(function(p) {
          var avatarEl = p.avatar
            ? '<img src="' + p.avatar + '" class="w-20 h-20 rounded-full object-cover border-2 border-gray-100 cursor-pointer" id="account-avatar-img" />'
            : '<div class="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center text-4xl cursor-pointer" id="account-avatar-img">👤</div>';

          nav.innerHTML =
            '<div class="py-4">' +
              '<div class="px-5 mb-4">' +
                '<button id="drawer-account-back" class="text-xs text-primary flex items-center gap-1">← Volver</button>' +
              '</div>' +
              '<div class="text-center px-5 mb-6">' +
                '<div class="flex justify-center mb-3">' + avatarEl + '</div>' +
                '<p class="font-bold text-gray-800 text-lg">' + esc(p.nombre || '') + '</p>' +
                '<p class="text-xs text-gray-400">' + esc(p.email || '') + '</p>' +
              '</div>' +
              '<div class="border-t border-gray-100">' +
                '<button id="acc-photo-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<span>📷 Foto de perfil</span><span class="text-gray-300">›</span>' +
                '</button>' +
                '<button id="acc-name-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<div class="text-left"><p class="text-sm text-gray-700">Nombre</p><p class="text-xs text-gray-400">' + esc(p.nombre || '') + '</p></div><span class="text-gray-300">›</span>' +
                '</button>' +
                '<button id="acc-email-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<div class="text-left"><p class="text-sm text-gray-700">Email</p><p class="text-xs text-gray-400">' + esc(p.email || '') + '</p></div><span class="text-gray-300">›</span>' +
                '</button>' +
                '<button id="acc-pw-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<span>🔑 Contraseña</span><span class="text-gray-300">›</span>' +
                '</button>' +
                '<button id="acc-interests-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<div class="text-left"><p class="text-sm text-gray-700">🎯 Mis intereses</p><p class="text-xs text-gray-400">' + (p.interests && p.interests.length ? p.interests.slice(0,2).join(', ') + (p.interests.length > 2 ? '...' : '') : 'Sin configurar') + '</p></div><span class="text-gray-300">›</span>' +
                '</button>' +
              '</div>' +
              '<div class="border-t border-gray-100 mt-4">' +
                '<button id="acc-delete-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-red-500 hover:bg-red-50">' +
                  '<span>🗑 Eliminar cuenta</span><span class="text-red-300">›</span>' +
                '</button>' +
              '</div>' +
            '</div>';

          function goBack() {
            closeModal();
            window.LyfterAPI.getProfile().then(function(p2) { showDrawer(p2.avatar, p2.nombre, onAvatarSave, isAdmin); }).catch(function() { showDrawer(null, null, onAvatarSave, isAdmin); });
          }

          document.getElementById('drawer-account-back').addEventListener('click', goBack);

          // Foto
          document.getElementById('account-avatar-img').addEventListener('click', function() {
            var input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.onchange = function() {
              var file = input.files[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) { toast('Máximo 2MB', 'error'); return; }
              var reader = new FileReader();
              reader.onload = async function(ev) {
                try {
                  await window.LyfterAPI.updateAvatar(ev.target.result);
                  toast('Foto actualizada', 'success');
                  if (onAvatarSave) onAvatarSave(ev.target.result);
                  goBack();
                } catch(err) { toast(err.message || 'Error', 'error'); }
              };
              reader.readAsDataURL(file);
            };
            input.click();
          });

          // Nombre
          document.getElementById('acc-name-btn').addEventListener('click', function() {
            var currentName = p.nombre || '';
            var modalRoot = document.getElementById('modal-root');
            modalRoot.innerHTML =
              '<div class="fixed inset-0 z-50 flex items-center justify-center p-6 anim-fade" style="background:rgba(17,24,39,0.75);">' +
                '<div class="bg-white rounded-card p-6 w-full max-w-sm shadow-soft anim-pop">' +
                  '<p class="text-sm font-semibold text-gray-700 mb-3">✏️ Cambiar nombre</p>' +
                  '<input id="inline-name-input" type="text" value="' + esc(currentName) + '" class="w-full px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none text-sm mb-4" />' +
                  '<div class="flex gap-3 justify-end">' +
                    '<button id="inline-cancel" class="px-5 py-2.5 rounded-btn border border-gray-200 text-sm font-medium text-gray-600">Cancelar</button>' +
                    '<button id="inline-save" class="px-5 py-2.5 rounded-btn text-white text-sm font-medium" style="background:#6C63FF;">Guardar</button>' +
                  '</div>' +
                '</div>' +
              '</div>';
            document.getElementById('inline-cancel').addEventListener('click', closeModal);
            document.getElementById('inline-save').addEventListener('click', async function() {
              var btn = this;
              var name = document.getElementById('inline-name-input').value.trim();
              if (!name) { toast('Ingresa un nombre', 'error'); return; }
              btn.disabled = true; btn.textContent = 'Guardando...';
              try {
                await window.LyfterAPI.updateName(name);
                toast('Nombre actualizado', 'success');
                closeModal();
                goBack();
              } catch(err) { toast(err.message || 'Error', 'error'); btn.disabled = false; btn.textContent = 'Guardar'; }
            });
          });

          // Email
          document.getElementById('acc-email-btn').addEventListener('click', function() {
            var currentEmail = p.email || '';
            var modalRoot = document.getElementById('modal-root');
            modalRoot.innerHTML =
              '<div class="fixed inset-0 z-50 flex items-center justify-center p-6 anim-fade" style="background:rgba(17,24,39,0.75);">' +
                '<div class="bg-white rounded-card p-6 w-full max-w-sm shadow-soft anim-pop">' +
                  '<p class="text-sm font-semibold text-gray-700 mb-3">📧 Cambiar email</p>' +
                  '<input id="inline-email-input" type="email" value="' + esc(currentEmail) + '" class="w-full px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none text-sm mb-4" />' +
                  '<div class="flex gap-3 justify-end">' +
                    '<button id="inline-cancel" class="px-5 py-2.5 rounded-btn border border-gray-200 text-sm font-medium text-gray-600">Cancelar</button>' +
                    '<button id="inline-save" class="px-5 py-2.5 rounded-btn text-white text-sm font-medium" style="background:#6C63FF;">Guardar</button>' +
                  '</div>' +
                '</div>' +
              '</div>';
            document.getElementById('inline-cancel').addEventListener('click', closeModal);
            document.getElementById('inline-save').addEventListener('click', async function() {
              var btn = this;
              var email = document.getElementById('inline-email-input').value.trim();
              if (!email) { toast('Ingresa un email', 'error'); return; }
              btn.disabled = true; btn.textContent = 'Guardando...';
              try {
                await window.LyfterAPI.updateEmail(email);
                toast('Email actualizado', 'success');
                closeModal();
                goBack();
              } catch(err) { toast(err.message || 'Error', 'error'); btn.disabled = false; btn.textContent = 'Guardar'; }
            });
          });

          // Contraseña
          document.getElementById('acc-pw-btn').addEventListener('click', function() {
            var modalRoot = document.getElementById('modal-root');
            modalRoot.innerHTML =
              '<div class="fixed inset-0 z-50 flex items-center justify-center p-6 anim-fade" style="background:rgba(17,24,39,0.75);">' +
                '<div class="bg-white rounded-card p-6 w-full max-w-sm shadow-soft anim-pop">' +
                  '<p class="text-sm font-semibold text-gray-700 mb-3">🔑 Cambiar contraseña</p>' +
                  '<div class="space-y-3 mb-4">' +
                    '<input id="inline-pw-current" type="password" placeholder="Contraseña actual" class="w-full px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none text-sm" />' +
                    '<input id="inline-pw-new" type="password" placeholder="Nueva contraseña (mín. 6)" class="w-full px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none text-sm" />' +
                  '</div>' +
                  '<div class="flex gap-3 justify-end">' +
                    '<button id="inline-cancel" class="px-5 py-2.5 rounded-btn border border-gray-200 text-sm font-medium text-gray-600">Cancelar</button>' +
                    '<button id="inline-save" class="px-5 py-2.5 rounded-btn text-white text-sm font-medium" style="background:#6C63FF;">Guardar</button>' +
                  '</div>' +
                '</div>' +
              '</div>';
            document.getElementById('inline-cancel').addEventListener('click', closeModal);
            document.getElementById('inline-save').addEventListener('click', async function() {
              var btn = this;
              var current = document.getElementById('inline-pw-current').value;
              var newPw = document.getElementById('inline-pw-new').value;
              if (!current || !newPw) { toast('Completa ambos campos', 'error'); return; }
              btn.disabled = true; btn.textContent = 'Guardando...';
              try {
                await window.LyfterAPI.changePassword(current, newPw);
                toast('Contraseña actualizada', 'success');
                closeModal();
              } catch(err) { toast(err.message || 'Error', 'error'); btn.disabled = false; btn.textContent = 'Guardar'; }
            });
          });

          // Intereses
          document.getElementById('acc-interests-btn').addEventListener('click', function() {
            var TAGS = ['Desarrollo Web','Mobile','Inteligencia Artificial','Data Science','Ciberseguridad','DevOps','Cloud','Blockchain','UX/UI','Product Management','Emprendimiento','Marketing Digital','Diseño','Videojuegos','Robótica','Fintech','Educación Tech','Open Source','Backend','Frontend'];
            var selected = (p.interests || []).slice();
            var nav2 = document.getElementById('drawer-panel').querySelector('nav');
            nav2.innerHTML =
              '<div class="px-5 py-4">' +
                '<button id="interests-back" class="text-xs text-primary mb-4 flex items-center gap-1">← Volver</button>' +
                '<p class="text-sm font-semibold text-gray-700 mb-3">🎯 Mis intereses</p>' +
                '<div class="flex flex-wrap gap-2 mb-4">' +
                  TAGS.map(function(tag) {
                    var isSel = selected.indexOf(tag) !== -1;
                    return '<button type="button" data-itag="' + esc(tag) + '" class="itag-btn px-3 py-1.5 rounded-full text-xs border transition ' + (isSel ? 'text-white" style="background:#6C63FF; border-color:#6C63FF;"' : 'border-gray-200 text-gray-600"') + '>' + esc(tag) + '</button>';
                  }).join('') +
                '</div>' +
                '<button id="interests-save" class="w-full py-2.5 rounded-btn text-white text-sm font-medium" style="background:#6C63FF;">Guardar</button>' +
              '</div>';
            Array.prototype.forEach.call(document.querySelectorAll('.itag-btn'), function(btn) {
              btn.addEventListener('click', function() {
                var tag = btn.getAttribute('data-itag');
                var idx = selected.indexOf(tag);
                if (idx === -1) { selected.push(tag); btn.style.background='#6C63FF'; btn.style.color='white'; btn.style.borderColor='#6C63FF'; }
                else { selected.splice(idx,1); btn.style.background=''; btn.style.color=''; btn.style.borderColor=''; }
              });
            });
            document.getElementById('interests-back').addEventListener('click', function() { accountBtn.click(); });
            document.getElementById('interests-save').addEventListener('click', async function() {
              var btn = this; btn.disabled = true; btn.textContent = 'Guardando...';
              try { await window.LyfterAPI.updateInterests(selected); toast('Intereses actualizados','success'); accountBtn.click(); }
              catch(err) { toast(err.message||'Error','error'); btn.disabled=false; btn.textContent='Guardar'; }
            });
          });

          // Eliminar cuenta
          document.getElementById('acc-delete-btn').addEventListener('click', function() {
            showConfirm('¿Eliminar tu cuenta? Esta acción es irreversible.', async function() {
              try {
                await window.LyfterAPI.deleteAccount();
                window.LyfterAPI.logout();
                window.location.href = 'login.html';
              } catch(err) { toast(err.message || 'Error', 'error'); }
            }, null, { confirmLabel: 'Eliminar cuenta', danger: true });
          });

        }).catch(function() { toast('No se pudo cargar el perfil', 'error'); });
      });
    }

    // Privacidad
    var privacyBtn = document.getElementById('drawer-privacy-btn');
    if (privacyBtn) {
      privacyBtn.addEventListener('click', function() {
        var nav = document.getElementById('drawer-panel').querySelector('nav');
        window.LyfterAPI.getProfile().then(function(p) {
          var privacy = p.privacy || { show_in_leaderboard: true, show_badges: true };
          nav.innerHTML =
            '<div class="px-5 py-4">' +
              '<button id="drawer-privacy-back" class="text-xs text-primary mb-4 flex items-center gap-1">← Volver</button>' +
              '<p class="text-sm font-semibold text-gray-700 mb-4">🔒 Privacidad</p>' +
              '<div class="space-y-4">' +
                '<div class="flex items-center justify-between">' +
                  '<div><p class="text-sm text-gray-700">Aparecer en clasificación</p><p class="text-xs text-gray-400">Otros usuarios pueden verte en el ranking</p></div>' +
                  '<input type="checkbox" id="priv-leaderboard" ' + (privacy.show_in_leaderboard ? 'checked' : '') + ' class="w-5 h-5 accent-primary cursor-pointer" />' +
                '</div>' +
                '<div class="flex items-center justify-between">' +
                  '<div><p class="text-sm text-gray-700">Mostrar mis badges</p><p class="text-xs text-gray-400">Otros pueden ver tus badges obtenidos</p></div>' +
                  '<input type="checkbox" id="priv-badges" ' + (privacy.show_badges ? 'checked' : '') + ' class="w-5 h-5 accent-primary cursor-pointer" />' +
                '</div>' +
              '</div>' +
              '<button id="drawer-privacy-save" class="w-full mt-5 py-2.5 rounded-btn text-white text-sm font-medium" style="background:#6C63FF;">Guardar</button>' +
            '</div>';
          document.getElementById('drawer-privacy-back').addEventListener('click', function() {
            closeModal();
            window.LyfterAPI.getProfile().then(function(p2) { showDrawer(p2.avatar, p2.nombre, onAvatarSave, isAdmin); }).catch(function() { showDrawer(null, null, onAvatarSave, isAdmin); });
          });
          document.getElementById('drawer-privacy-save').addEventListener('click', async function() {
            var btn = this;
            btn.disabled = true; btn.textContent = 'Guardando...';
            try {
              await window.LyfterAPI.updatePrivacy({
                show_in_leaderboard: document.getElementById('priv-leaderboard').checked,
                show_badges: document.getElementById('priv-badges').checked
              });
              toast('Privacidad actualizada', 'success');
              closeModal();
            } catch(err) { toast(err.message || 'Error', 'error'); btn.disabled = false; btn.textContent = 'Guardar'; }
          });
        });
      });
    }

    // Tema oscuro/claro
    var themeBtn = document.getElementById('drawer-theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        var html = document.documentElement;
        var isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        try { localStorage.setItem('lyfter_theme', isDark ? 'light' : 'dark'); } catch(e) {}
        themeBtn.querySelector('span').textContent = isDark ? 'Tema oscuro/claro' : 'Tema oscuro/claro ✓';
        toast(isDark ? 'Tema claro activado' : 'Tema oscuro activado', 'info');
      });
    }

    // Acerca de
    var aboutBtn = document.getElementById('drawer-about-btn');
    if (aboutBtn) {
      aboutBtn.addEventListener('click', function() {
        var nav = document.getElementById('drawer-panel').querySelector('nav');
        nav.innerHTML =
          '<div class="px-5 py-4">' +
            '<button id="drawer-about-back" class="text-xs text-primary mb-4 flex items-center gap-1">← Volver</button>' +
            '<div class="text-center py-4">' +
              '<div class="text-4xl mb-3">🏆</div>' +
              '<p class="font-bold text-gray-800 text-lg">Lyfter Badge App</p>' +
              '<p class="text-xs text-gray-400 mt-1">Versión 1.0.0</p>' +
              '<p class="text-xs text-gray-400 mt-3">Escanea, colecciona y gana badges en eventos</p>' +
              '<div class="mt-4 pt-4 border-t border-gray-100 text-left space-y-2">' +
                '<p class="text-xs text-gray-500 font-medium">Términos y condiciones</p>' +
                '<p class="text-xs text-gray-500 font-medium">Política de privacidad</p>' +
              '</div>' +
            '</div>' +
          '</div>';
        document.getElementById('drawer-about-back').addEventListener('click', function() {
          closeModal();
          window.LyfterAPI.getProfile().then(function(p) { showDrawer(p.avatar, p.nombre, onAvatarSave, isAdmin); }).catch(function() { showDrawer(null, null, onAvatarSave, isAdmin); });
        });
      });
    }

    var usersBtn = document.getElementById('drawer-users-btn');
    if (usersBtn) {
      usersBtn.addEventListener('click', function() {
        var panel = document.getElementById('drawer-panel');
        var nav = panel.querySelector('nav');
        nav.innerHTML = '<div class="px-5 py-4">' +
          '<button id="drawer-users-back" class="text-xs text-primary mb-4 flex items-center gap-1">← Volver</button>' +
          '<p class="text-sm font-semibold text-gray-700 mb-2">Gestionar usuarios</p>' +
          '<input id="drawer-users-search" type="text" placeholder="Buscar por nombre o email..." class="w-full px-3 py-2 mb-3 text-sm bg-gray-50 rounded-btn border border-gray-200 focus:border-primary outline-none" />' +
          '<div id="drawer-users-list" class="text-center text-gray-400 text-sm py-4">Cargando...</div>' +
        '</div>';

        document.getElementById('drawer-users-back').addEventListener('click', function() {
          closeModal();
          window.LyfterAPI.getProfile().then(function(p) {
            showDrawer(p.avatar, p.nombre, onAvatarSave, true);
          }).catch(function() { showDrawer(null, null, onAvatarSave, true); });
        });

        window.LyfterAPI.getUsers().then(function(usersList) {
          var listEl = document.getElementById('drawer-users-list');
          if (!listEl) return;
          if (!usersList || !usersList.length) {
            listEl.innerHTML = '<p class="text-sm text-gray-400">Sin usuarios.</p>';
            return;
          }
          var currentUser = window.LyfterAPI.currentUser();
          listEl.innerHTML = usersList.map(function(u) {
            var isSelf = currentUser && u.id === currentUser.id;
            var isAdminUser = u.rol === 'admin';
            var btnLabel = isAdminUser ? '→ Participante' : '→ Admin';
            var nextRol = isAdminUser ? 'participant' : 'admin';
            return '<div class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">' +
              '<div class="flex-1 min-w-0 mr-2">' +
                '<p class="text-sm font-medium text-gray-800 truncate">' + esc(u.nombre) + (isSelf ? ' <span class="text-xs text-gray-400">(tú)</span>' : '') + '</p>' +
                '<p class="text-xs text-gray-400 truncate">' + esc(u.email) + '</p>' +
              '</div>' +
              '<button data-uid="' + u.id + '" data-rol="' + nextRol + '" data-nombre="' + esc(u.nombre) + '"' +
                (isSelf ? ' disabled' : '') +
                ' class="role-drawer-btn flex-shrink-0 px-2 py-1 rounded-btn text-xs font-medium border ' +
                (isAdminUser ? 'text-purple-600 border-purple-300' : 'text-gray-500 border-gray-200') +
                (isSelf ? ' opacity-40 cursor-not-allowed' : ' hover:bg-gray-50') + '">' +
                btnLabel +
              '</button>' +
            '</div>';
          }).join('');

          Array.prototype.forEach.call(listEl.querySelectorAll('.role-drawer-btn'), function(btn) {
            btn.addEventListener('click', async function() {
              var uid = btn.getAttribute('data-uid');
              var rol = btn.getAttribute('data-rol');
              var nombre = btn.getAttribute('data-nombre');
              var rolLabel = rol === 'admin' ? 'Admin' : 'Participante';
              btn.disabled = true; btn.textContent = '...';
              try {
                await window.LyfterAPI.changeUserRole(uid, rol);
                toast('Rol de ' + nombre + ' cambiado a ' + rolLabel, 'success');
                usersBtn.click();
              } catch(err) {
                toast(err.message || 'No se pudo cambiar el rol', 'error');
                btn.disabled = false;
                btn.textContent = rol === 'admin' ? '→ Participante' : '→ Admin';
              }
            });
          });

          var searchInput = document.getElementById('drawer-users-search');
          if (searchInput) {
            searchInput.addEventListener('input', function() {
              var q = searchInput.value.trim().toLowerCase();
              var filtered = q
                ? usersList.filter(function(u) {
                    return u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                  })
                : usersList;
              var listEl = document.getElementById('drawer-users-list');
              if (!listEl) return;
              var currentUser = window.LyfterAPI.currentUser();
              if (!filtered.length) {
                listEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Sin resultados.</p>';
                return;
              }
              listEl.innerHTML = filtered.map(function(u) {
                var isSelf = currentUser && u.id === currentUser.id;
                var isAdminUser = u.rol === 'admin';
                var btnLabel = isAdminUser ? '→ Participante' : '→ Admin';
                var nextRol = isAdminUser ? 'participant' : 'admin';
                return '<div class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">' +
                  '<div class="flex-1 min-w-0 mr-2">' +
                    '<p class="text-sm font-medium text-gray-800 truncate">' + esc(u.nombre) + (isSelf ? ' <span class="text-xs text-gray-400">(tú)</span>' : '') + '</p>' +
                    '<p class="text-xs text-gray-400 truncate">' + esc(u.email) + '</p>' +
                  '</div>' +
                  '<button data-uid="' + u.id + '" data-rol="' + nextRol + '" data-nombre="' + esc(u.nombre) + '"' +
                    (isSelf ? ' disabled' : '') +
                    ' class="role-drawer-btn flex-shrink-0 px-2 py-1 rounded-btn text-xs font-medium border ' +
                    (isAdminUser ? 'text-purple-600 border-purple-300' : 'text-gray-500 border-gray-200') +
                    (isSelf ? ' opacity-40 cursor-not-allowed' : ' hover:bg-gray-50') + '">' +
                    btnLabel +
                  '</button>' +
                '</div>';
              }).join('');
              Array.prototype.forEach.call(listEl.querySelectorAll('.role-drawer-btn'), function(btn) {
                btn.addEventListener('click', async function() {
                  var uid = btn.getAttribute('data-uid');
                  var rol = btn.getAttribute('data-rol');
                  var nombre = btn.getAttribute('data-nombre');
                  var rolLabel = rol === 'admin' ? 'Admin' : 'Participante';
                  btn.disabled = true; btn.textContent = '...';
                  try {
                    await window.LyfterAPI.changeUserRole(uid, rol);
                    toast('Rol de ' + nombre + ' cambiado a ' + rolLabel, 'success');
                    usersBtn.click();
                  } catch(err) {
                    toast(err.message || 'No se pudo cambiar el rol', 'error');
                    btn.disabled = false;
                    btn.textContent = rol === 'admin' ? '→ Participante' : '→ Admin';
                  }
                });
              });
            });
          }
        }).catch(function(err) {
          var listEl = document.getElementById('drawer-users-list');
          if (listEl) listEl.innerHTML = '<p class="text-sm text-red-400">Error: ' + esc(err.message) + '</p>';
        });
      });
    }
  }

  /* ----- Shell admin ----- */
  function adminShell(activeTab, innerHtml, events, activeId) {
    var eventOptions = events.map(function (e) {
      return '<option value="' + e.id + '"' + (e.id === activeId ? ' selected' : '') + '>' + esc(e.name) + '</option>';
    }).join('');
    var tabs = [
      { id: 'event',         label: 'Eventos',    href: 'admin-event.html' },
      { id: 'participation', label: 'Dashboard',  href: 'admin-participation.html' }
    ].map(function (t) {
      var on = t.id === activeTab;
      return '<a href="' + t.href + '" class="admin-tab px-4 py-2 text-sm font-medium border-b-2 ' +
        (on ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-primary') + '">' + esc(t.label) + '</a>';
    }).join('');

    return '' +
      '<header class="bg-white border-b border-gray-200 sticky top-0 z-40">' +
        '<div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">' +
          '<div class="flex items-center gap-2"><span class="text-xl">🏆</span><span class="font-bold text-gray-800">Panel Admin</span></div>' +
          '<div class="flex items-center gap-3">' +
            (events.length ? '<select id="admin-event-select" class="px-3 py-2 bg-base rounded-btn border border-gray-200 text-sm focus:border-primary outline-none">' + eventOptions + '</select>' : '') +
            '<button id="admin-profile-menu" class="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-sm font-medium text-primary" style="background-size:cover;background-position:center;">☰</button>' +
            '<button id="admin-logout" class="text-sm text-gray-400 hover:text-primary flex items-center gap-1">⎋ Salir</button>' +
          '</div>' +
        '</div>' +
        '<nav class="max-w-4xl mx-auto px-4 flex gap-1">' + tabs + '</nav>' +
      '</header>' +
      '<section class="max-w-4xl mx-auto px-4 py-6">' + innerHtml + '</section>';
  }

  function mountAdminShell() {
    var sel = document.getElementById('admin-event-select');
    if (sel) sel.addEventListener('change', function () { setActiveId(sel.value); location.reload(); });
    var out = document.getElementById('admin-logout');
    if (out) out.addEventListener('click', logout);
    var profileBtn = document.getElementById('admin-profile-menu');
    if (profileBtn) {
      profileBtn.addEventListener('click', async function() {
        try {
          var p = await window.LyfterAPI.getProfile();
          showDrawer(p.avatar, p.nombre, function(newAvatar) {
            if (newAvatar) {
              profileBtn.style.backgroundImage = 'url(' + newAvatar + ')';
              profileBtn.style.backgroundSize = 'cover';
            }
          }, true);
        } catch(e) {
          showDrawer(null, null, null, true);
        }
      });
    }
  }

  /* ── Sesión ── */
  function logout() {
    window.LyfterAPI.logout();
    window.location.href = 'login.html';
  }

  /* ── API pública ── */
  window.LyfterUtils = {
    EMAIL_RE: EMAIL_RE,
    esc: esc,
    toast: toast,
    toastNextPage: toastNextPage,
    showPendingToast: showPendingToast,
    closeModal: closeModal,
    showConfirm: showConfirm,
    loadingHtml: loadingHtml,
    errorHtml: errorHtml,
    skeletonCard: skeletonCard,
    setFieldError: setFieldError,
    qrSvg: qrSvg,
    downloadQr: downloadQr,
    inputField: inputField,
    primaryButton: primaryButton,
    showDrawer: showDrawer,
    adminShell: adminShell,
    mountAdminShell: mountAdminShell,
    logout: logout,
    getActiveId: getActiveId,
    setActiveId: setActiveId,
    ensureActive: ensureActive
  };

  window.lyfterReset = function () {
    try { window.LyfterAPI.resetDemo(); toast('Datos de demo reiniciados', 'info'); }
    catch (e) { toast(e.message, 'error'); return; }
    window.LyfterAPI.logout();
    window.location.href = 'login.html';
  };
})();
