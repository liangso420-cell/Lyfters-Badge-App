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
  function showDrawer(avatarUrl, userName, onAvatarSave) {
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
            '<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2">Cuenta</p>' +
            '<button id="drawer-avatar-btn" class="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left">📷 <span>Cambiar foto de perfil</span></button>' +
            '<button id="drawer-pw-btn" class="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left">🔑 <span>Cambiar contraseña</span></button>' +
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

    document.getElementById('drawer-avatar-btn').addEventListener('click', function() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = function() {
        var file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast('La imagen no puede superar 2MB', 'error'); return; }
        var reader = new FileReader();
        reader.onload = async function(e) {
          try {
            await window.LyfterAPI.updateAvatar(e.target.result);
            toast('Foto actualizada', 'success');
            if (onAvatarSave) onAvatarSave(e.target.result);
            var img = document.querySelector('#drawer-panel img, #drawer-panel div.w-16');
            if (img) {
              var newImg = document.createElement('img');
              newImg.src = e.target.result;
              newImg.className = 'w-16 h-16 rounded-full object-cover border-2 border-primary';
              img.replaceWith(newImg);
            }
          } catch(err) { toast(err.message || 'No se pudo guardar la foto', 'error'); }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });

    document.getElementById('drawer-pw-btn').addEventListener('click', function() {
      var panel = document.getElementById('drawer-panel');
      panel.querySelector('nav').innerHTML =
        '<div class="px-5 py-4">' +
          '<button id="drawer-pw-back" class="text-xs text-primary mb-4 flex items-center gap-1">← Volver</button>' +
          '<p class="text-sm font-semibold text-gray-700 mb-3">Cambiar contraseña</p>' +
          '<div class="space-y-3">' +
            '<input id="drawer-pw-current" type="password" placeholder="Contraseña actual" class="w-full px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none text-sm" />' +
            '<input id="drawer-pw-new" type="password" placeholder="Nueva contraseña (mín. 6)" class="w-full px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none text-sm" />' +
            '<button id="drawer-pw-save" class="w-full py-2.5 rounded-btn text-white text-sm font-medium" style="background:#6C63FF;">Guardar</button>' +
          '</div>' +
        '</div>';
      document.getElementById('drawer-pw-back').addEventListener('click', function() {
        closeModal();
        window.LyfterAPI.getProfile().then(function(p) {
          showDrawer(p.avatar, p.nombre, onAvatarSave);
        }).catch(function() { showDrawer(null, null, onAvatarSave); });
      });
      document.getElementById('drawer-pw-save').addEventListener('click', async function() {
        var btn = this;
        var current = document.getElementById('drawer-pw-current').value;
        var newPw = document.getElementById('drawer-pw-new').value;
        if (!current || !newPw) { toast('Completa ambos campos', 'error'); return; }
        btn.disabled = true; btn.textContent = 'Guardando...';
        try {
          await window.LyfterAPI.changePassword(current, newPw);
          toast('Contraseña actualizada', 'success');
          closeDrawer();
        } catch(err) {
          toast(err.message || 'No se pudo cambiar', 'error');
          btn.disabled = false; btn.textContent = 'Guardar';
        }
      });
    });
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
          });
        } catch(e) {
          showDrawer(null, null, null);
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
