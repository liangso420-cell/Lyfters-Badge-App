/* ============================================================
   Lyfter Badge App — utilidades compartidas
   ============================================================ */
(function () {
  'use strict';

  var _i18nLang = 'es';
  var _i18nData = {};
  try { _i18nLang = localStorage.getItem('lyfter_lang') || 'es'; } catch(e) {}

  var _i18nStrings = {
    es: {
      greeting: 'Hola',
      events_btn: 'Eventos',
      no_event_title: 'Aún no estás en ningún evento',
      no_event_desc: 'Escanea el QR de un evento para unirte y empezar a coleccionar badges.',
      no_event_sub: 'O explora los eventos disponibles para encontrar uno que te interese.',
      explore_events: 'Explorar eventos',
      scan_qr: 'Escanear QR',
      active_event: 'Evento activo',
      your_progress: 'Tu progreso',
      badges_of: 'badges obtenidos',
      my_badges: 'Mis badges',
      leaderboard: 'Clasificación',
      scan_first: '¡Escanea tu primer QR para empezar!',
      prize_unlocked: 'Premio desbloqueado',
      complete_badges: 'Completa los',
      complete_badges2: 'badges para revelar el',
      surprise_prize: 'premio sorpresa',
      congrats: '¡Felicidades,',
      completed_event: '¡Completaste el evento!',
      completed_badges_of: 'Completaste todos los badges de',
      my_badges_obtained: 'Mis badges obtenidos',
      loading: 'Cargando...',
      no_data: 'Sin datos todavía.',
      load_error: 'No se pudo cargar.',
      app_tagline: 'Escanea, colecciona, gana',
      email_label: 'Email',
      password_label: 'Contraseña',
      enter_btn: 'Entrar',
      or_continue: 'o continúa con',
      continue_google: 'Continuar con Google',
      no_account: '¿No tienes cuenta?',
      sign_up: 'Regístrate',
      create_account: 'Crear cuenta',
      join_tagline: 'Únete y empieza a coleccionar badges',
      full_name: 'Nombre completo',
      confirm_password: 'Confirmar contraseña',
      already_account: '¿Ya tienes cuenta?',
      sign_in: 'Inicia sesión',
      interests_title: '¿Cuáles son tus intereses?',
      interests_desc: 'Selecciona los temas que te interesan para recibir recomendaciones personalizadas',
      save_continue: 'Guardar y continuar',
      skip_now: 'Omitir por ahora',
      connecting: 'Conectando...',
      welcome: '¡Bienvenido!',
      welcome_google: '¡Bienvenido con Google! 🎉',
      account_created: '¡Cuenta creada! 🎉',
      explore_events_title: 'Explorar eventos',
      recommended_for_you: '✨ Recomendados para ti',
      all_events: 'Todos los eventos',
      no_events_available: 'No hay eventos disponibles por ahora.',
      how_to_participate: '¿Cómo participar?',
      how_to_participate_desc: 'Escanea el QR del evento para unirte y empezar a coleccionar badges.',
      close: 'Cerrar',
      recommended_badge: '✨ Recomendado',
      point_at_qr: 'Apunta al código QR',
      processing: 'Procesando...',
      camera_unavailable: 'Cámara no disponible',
      enter_code_manually: 'Ingresar código manualmente',
      hide: 'Ocultar',
      enter_code_placeholder: 'Pega o escribe el token del QR',
      redeem_badge: 'Canjear badge',
      redeeming: 'Canjeando...',
      badge_obtained: '¡Badge obtenido!',
      share_instagram: '📸 Compartir en Instagram',
      awesome: '¡Genial!',
      generating: 'Generando...',
      got_badge: '¡Obtuve el badge!',
      badge_already_obtained: 'Badge ya obtenido',
      error_try_again: 'Error — intentá de nuevo',
      joined_event: '¡Te uniste al evento! 🎉',
      already_in_event: 'Ya estás en este evento',
      completed_all_badges: 'Ya completaste todos los badges de este evento 🎉',
      admin_create_event: 'Crear evento',
      admin_create_event_desc: 'Configura un nuevo evento de badges',
      admin_event_name: 'Nombre del evento',
      admin_description: 'Descripción',
      admin_description_placeholder: 'Descripción del evento...',
      admin_start_date: 'Fecha inicio',
      admin_end_date: 'Fecha fin',
      admin_prize: 'Premio sorpresa',
      admin_location: 'Ubicación',
      admin_tags_title: 'Tags del evento',
      admin_tags_desc: 'Ayudan a recomendar este evento a usuarios interesados',
      admin_badges_title: '➕ Badges del evento',
      admin_badges_desc: 'Agrega los badges que los participantes podrán ganar',
      admin_add_badge: '➕ Agregar badge',
      admin_create_btn: 'Crear evento',
      admin_creating: 'Creando...',
      admin_events_title: 'Eventos',
      admin_search_placeholder: '🔍 Buscar evento...',
      admin_finish: 'Terminar',
      admin_adding: 'Agregando...',
      admin_save: 'Guardar',
      admin_saving: 'Guardando...',
      admin_cancel: 'Cancelar',
      admin_access_qr: 'QR de acceso al evento',
      admin_access_qr_desc: 'Los usuarios escanean este QR para unirse al evento',
      admin_generate_qr: 'Generar QR de acceso',
      admin_generating: 'Generando...',
      admin_download: '⬇️ Descargar',
      admin_badges_count: 'Badges',
      admin_no_badges: 'Sin badges. Agrega el primero abajo.',
      admin_no_events: 'No hay eventos. Crea el primero arriba.',
      admin_delete_event_confirm: '¿Eliminar este evento? Se eliminarán todos sus badges y canjes.',
      admin_delete_badge_confirm: '¿Eliminar este badge?',
      admin_participants: 'Participantes',
      admin_events: 'Eventos',
      admin_badges_created: 'Badges creados',
      admin_badges_redeemed: 'Badges canjeados',
      admin_progress_by_event: 'Progreso por evento',
      admin_leaderboard: 'Clasificación',
      admin_stats_by_event: 'Estadísticas por evento',
      admin_select_event: 'Selecciona un evento...',
      admin_loading_stats: 'Cargando estadísticas...',
      admin_active_participants: 'Participantes activos',
      admin_completed_event: 'Completaron evento',
      admin_completion_rate: 'Tasa completación',
      admin_progress_dist: 'Distribución de progreso',
      admin_completion: 'Finalización',
      admin_top_badges: 'Badges más obtenidos',
      admin_top_users: '👥 Top participantes',
      admin_activity: '⏰ Actividad por hora',
      admin_no_data: 'Sin datos',
      admin_no_activity: 'Sin datos de actividad',
      admin_completed: 'completaron',
      admin_not_completed: 'no completaron',
      admin_name_label: 'Nombre',
      admin_prize_label: 'Premio',
      admin_inicio_label: 'Inicio',
      admin_fin_label: 'Fin',
      admin_tags_label: 'Tags',
      admin_add_badge_label: '➕ Agregar badge',
      admin_event_created: 'Evento "',
      admin_event_created2: '" creado',
      admin_now_add_badges: 'Ahora agrega los badges del evento',
      admin_badge_name_placeholder: 'Nombre del badge *',
      admin_badge_desc_placeholder: 'Descripción',
      admin_badge_emoji_placeholder: 'Emoji (ej: 🏅)',
      admin_redeem_count: 'canjes',
      admin_added: 'Agregado',
      redeem_loading: 'Canjeando badge…',
      redeem_already_have: '¡Ya tenías este badge!',
      redeem_already_desc: 'ya estaba en tu colección.',
      redeem_completed_event: '¡Completaste el evento!',
      redeem_completed_desc: '¡Felicidades! Obtuviste todos los badges.',
      redeem_badge_obtained: '¡Badge obtenido!',
      redeem_prize_unlocked: 'Premio desbloqueado',
      redeem_of: 'de',
      redeem_badges: 'badges',
      redeem_view_profile: 'Ver mi perfil',
      redeem_session_expired: 'Sesión expirada',
      redeem_invalid_qr: 'QR inválido',
      redeem_event_unavailable: 'Evento no disponible',
      redeem_could_not: 'No se pudo canjear',
      redeem_login_again: 'Iniciar sesión de nuevo',
      redeem_retry: 'Reintentar',
      redeem_go_home: 'Ir al inicio',
      redeem_not_recognized: 'QR no reconocido',
      redeem_not_recognized_desc: 'Este enlace no contiene los datos necesarios.',
      forgot_password: '¿Olvidaste tu contraseña?'
    },
    en: {
      greeting: 'Hello',
      events_btn: 'Events',
      no_event_title: "You're not in any event yet",
      no_event_desc: 'Scan an event QR to join and start collecting badges.',
      no_event_sub: 'Or explore available events to find one that interests you.',
      explore_events: 'Explore events',
      scan_qr: 'Scan QR',
      active_event: 'Active event',
      your_progress: 'Your progress',
      badges_of: 'badges obtained',
      my_badges: 'My badges',
      leaderboard: 'Leaderboard',
      scan_first: 'Scan your first QR to get started!',
      prize_unlocked: 'Prize unlocked',
      complete_badges: 'Complete',
      complete_badges2: 'badges to reveal the',
      surprise_prize: 'surprise prize',
      congrats: 'Congratulations,',
      completed_event: 'You completed the event!',
      completed_badges_of: 'You completed all badges of',
      my_badges_obtained: 'My obtained badges',
      loading: 'Loading...',
      no_data: 'No data yet.',
      load_error: 'Could not load.',
      app_tagline: 'Scan, collect, win',
      email_label: 'Email',
      password_label: 'Password',
      enter_btn: 'Sign in',
      or_continue: 'or continue with',
      continue_google: 'Continue with Google',
      no_account: "Don't have an account?",
      sign_up: 'Sign up',
      create_account: 'Create account',
      join_tagline: 'Join and start collecting badges',
      full_name: 'Full name',
      confirm_password: 'Confirm password',
      already_account: 'Already have an account?',
      sign_in: 'Sign in',
      interests_title: 'What are your interests?',
      interests_desc: 'Select the topics you are interested in to receive personalized recommendations',
      save_continue: 'Save and continue',
      skip_now: 'Skip for now',
      connecting: 'Connecting...',
      welcome: 'Welcome!',
      welcome_google: 'Welcome with Google! 🎉',
      account_created: 'Account created! 🎉',
      explore_events_title: 'Explore events',
      recommended_for_you: '✨ Recommended for you',
      all_events: 'All events',
      no_events_available: 'No events available right now.',
      how_to_participate: 'How to participate?',
      how_to_participate_desc: 'Scan the event QR to join and start collecting badges.',
      close: 'Close',
      recommended_badge: '✨ Recommended',
      point_at_qr: 'Point at the QR code',
      processing: 'Processing...',
      camera_unavailable: 'Camera unavailable',
      enter_code_manually: 'Enter code manually',
      hide: 'Hide',
      enter_code_placeholder: 'Paste or type the QR token',
      redeem_badge: 'Redeem badge',
      redeeming: 'Redeeming...',
      badge_obtained: 'Badge obtained!',
      share_instagram: '📸 Share on Instagram',
      awesome: 'Awesome!',
      generating: 'Generating...',
      got_badge: 'I got the badge!',
      badge_already_obtained: 'Badge already obtained',
      error_try_again: 'Error — try again',
      joined_event: 'You joined the event! 🎉',
      already_in_event: 'You are already in this event',
      completed_all_badges: 'You already completed all badges of this event 🎉',
      admin_create_event: 'Create event',
      admin_create_event_desc: 'Configure a new badges event',
      admin_event_name: 'Event name',
      admin_description: 'Description',
      admin_description_placeholder: 'Event description...',
      admin_start_date: 'Start date',
      admin_end_date: 'End date',
      admin_prize: 'Surprise prize',
      admin_location: 'Location',
      admin_tags_title: 'Event tags',
      admin_tags_desc: 'Help recommend this event to interested users',
      admin_badges_title: '➕ Event badges',
      admin_badges_desc: 'Add the badges participants can earn',
      admin_add_badge: '➕ Add badge',
      admin_create_btn: 'Create event',
      admin_creating: 'Creating...',
      admin_events_title: 'Events',
      admin_search_placeholder: '🔍 Search event...',
      admin_finish: 'Finish',
      admin_adding: 'Adding...',
      admin_save: 'Save',
      admin_saving: 'Saving...',
      admin_cancel: 'Cancel',
      admin_access_qr: 'Event access QR',
      admin_access_qr_desc: 'Users scan this QR to join the event',
      admin_generate_qr: 'Generate access QR',
      admin_generating: 'Generating...',
      admin_download: '⬇️ Download',
      admin_badges_count: 'Badges',
      admin_no_badges: 'No badges. Add the first one below.',
      admin_no_events: 'No events. Create the first one above.',
      admin_delete_event_confirm: 'Delete this event? All its badges and redemptions will be deleted.',
      admin_delete_badge_confirm: 'Delete this badge?',
      admin_participants: 'Participants',
      admin_events: 'Events',
      admin_badges_created: 'Badges created',
      admin_badges_redeemed: 'Badges redeemed',
      admin_progress_by_event: 'Progress by event',
      admin_leaderboard: 'Leaderboard',
      admin_stats_by_event: 'Statistics by event',
      admin_select_event: 'Select an event...',
      admin_loading_stats: 'Loading statistics...',
      admin_active_participants: 'Active participants',
      admin_completed_event: 'Completed event',
      admin_completion_rate: 'Completion rate',
      admin_progress_dist: 'Progress distribution',
      admin_completion: 'Completion',
      admin_top_badges: 'Most obtained badges',
      admin_top_users: '👥 Top participants',
      admin_activity: '⏰ Activity by hour',
      admin_no_data: 'No data',
      admin_no_activity: 'No activity data',
      admin_completed: 'completed',
      admin_not_completed: 'not completed',
      admin_name_label: 'Name',
      admin_prize_label: 'Prize',
      admin_inicio_label: 'Start',
      admin_fin_label: 'End',
      admin_tags_label: 'Tags',
      admin_add_badge_label: '➕ Add badge',
      admin_event_created: 'Event "',
      admin_event_created2: '" created',
      admin_now_add_badges: 'Now add the event badges',
      admin_badge_name_placeholder: 'Badge name *',
      admin_badge_desc_placeholder: 'Description',
      admin_badge_emoji_placeholder: 'Emoji (e.g. 🏅)',
      admin_redeem_count: 'redemptions',
      admin_added: 'Added',
      redeem_loading: 'Redeeming badge…',
      redeem_already_have: 'You already had this badge!',
      redeem_already_desc: 'was already in your collection.',
      redeem_completed_event: 'You completed the event!',
      redeem_completed_desc: 'Congratulations! You got all the badges.',
      redeem_badge_obtained: 'Badge obtained!',
      redeem_prize_unlocked: 'Prize unlocked',
      redeem_of: 'of',
      redeem_badges: 'badges',
      redeem_view_profile: 'View my profile',
      redeem_session_expired: 'Session expired',
      redeem_invalid_qr: 'Invalid QR',
      redeem_event_unavailable: 'Event not available',
      redeem_could_not: 'Could not redeem',
      redeem_login_again: 'Sign in again',
      redeem_retry: 'Retry',
      redeem_go_home: 'Go to home',
      redeem_not_recognized: 'QR not recognized',
      redeem_not_recognized_desc: 'This link does not contain the necessary data.',
      forgot_password: 'Forgot your password?'
    }
  };

  function t(key) {
    var strings = _i18nStrings[_i18nLang] || _i18nStrings['es'];
    return strings[key] || _i18nStrings['es'][key] || key;
  }

  function setLang(lang) {
    _i18nLang = lang;
    try { localStorage.setItem('lyfter_lang', lang); } catch(e) {}
  }

  function getLang() { return _i18nLang; }

  var LANGUAGES = {
    'es': 'Español',
    'en': 'English'
  };

  var _currentLang = 'es';
  try { _currentLang = localStorage.getItem('lyfter_lang') || 'es'; } catch(e) {}

  function getCurrentLang() { return _currentLang; }
  function setCurrentLang(lang) {
    _currentLang = lang;
    try { localStorage.setItem('lyfter_lang', lang); } catch(e) {}
  }

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
      '<div class="fixed inset-0 z-50 flex items-center justify-center p-6 anim-fade" style="background:rgba(0,0,0,0.65);">' +
        '<div class="rounded-card p-6 w-full max-w-sm anim-pop" style="background:#1c1f27;border:1px solid rgba(255,255,255,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.5);">' +
          '<p class="text-sm leading-relaxed mb-6" style="color:rgba(240,234,242,0.85);">' + esc(msg) + '</p>' +
          '<div class="flex gap-3 justify-end">' +
            '<button id="confirm-cancel" class="px-5 py-2.5 rounded-btn text-sm font-medium" style="border:1px solid rgba(255,255,255,0.1);color:rgba(240,234,242,0.7);background:transparent;">Cancelar</button>' +
            '<button id="confirm-ok" class="px-5 py-2.5 rounded-btn text-white text-sm font-medium" style="background:' + confirmColor + ';">' + esc(confirmLabel) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('confirm-cancel').addEventListener('click', function () { closeModal(); if (onCancel) onCancel(); });
    document.getElementById('confirm-ok').addEventListener('click', function () { closeModal(); if (onConfirm) onConfirm(); });
  }

  /* ── HTML de estado ── */
  function loadingHtml() {
    setTimeout(function() {
      var canvas = document.getElementById('lottie-loader');
      if (!canvas) return;
      import('https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web/dist/dotlottie-web.browser.es2022.js')
        .then(function(m) {
          var DotLottieClass = m.DotLottie || m.default;
          if (DotLottieClass) {
            new DotLottieClass({ autoplay: true, loop: true, canvas: canvas, src: 'lodernuevo.json' });
          }
        })
        .catch(function(e) { console.log('Lottie error:', e); });
    }, 200);

    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;">' +
      '<canvas id="lottie-loader" style="width:200px;height:200px;display:block;"></canvas>' +
      '<p style="font-family:Manrope,sans-serif;font-size:14px;color:#8b93a3;margin-top:16px;">Cargando...</p>' +
    '</div>';
  }
  function hideLoading() {
    var ls = document.getElementById('loading-screen');
    if (!ls) return;
    ls.style.opacity = '0';
    ls.style.pointerEvents = 'none';
    setTimeout(function() { ls.style.display = 'none'; }, 400);
  }
  function errorHtml(msg) {
    return '<div class="device-frame px-4 pt-24 text-center">' +
      '<div class="text-3xl mb-2">⚠️</div>' +
      '<p class="text-sm text-gray-400">' + esc(msg) + '</p>' +
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
      '<label class="text-sm font-medium text-gray-400">' + esc(opts.label) + '</label>' +
      '<input type="' + (opts.type || 'text') + '" name="' + opts.name + '" ' +
        'placeholder="' + esc(opts.placeholder || '') + '" value="' + esc(opts.value || '') + '" ' +
        'class="w-full mt-1 px-4 py-3 bg-base rounded-btn border border-gray-200 focus:border-primary outline-none" ' +
        'style="background:#1a1d24;color:#f0eaf2;border-color:rgba(255,255,255,0.1);" />' +
      '</div>';
  }
  function primaryButton(label, attrs) {
    return '<button ' + (attrs || '') + ' class="w-full py-3 rounded-btn font-semibold" style="background:#6C63FF;color:#fff;">' + esc(label) + '</button>';
  }

  /* ----- Drawer lateral ----- */
  function showDrawer(avatarUrl, userName, onAvatarSave, isAdmin) {
    try {
      var savedTheme = localStorage.getItem('lyfter_theme');
      if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    } catch(e) {}
    var root = document.getElementById('modal-root');
    var avatarHtml = avatarUrl
      ? '<img src="' + avatarUrl + '" class="w-16 h-16 rounded-full object-cover" style="border:2px solid rgba(216,151,231,0.5);" />'
      : '<div class="w-16 h-16 rounded-full flex items-center justify-center" style="background:rgba(216,151,231,0.15);"><img src="assets/icons/ui/icono-perfil.png" alt="perfil" style="width:32px;height:32px;object-fit:contain;vertical-align:middle;" /></div>';
    var dBtn = 'style="background:transparent;border:none;width:100%;display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1.25rem;font-size:0.875rem;color:rgba(240,234,242,0.75);text-align:left;cursor:pointer;transition:background 0.15s;"';
    var dBtnHover = 'onmouseover="this.style.background=\'rgba(255,255,255,0.04)\'" onmouseout="this.style.background=\'transparent\'"';

    root.innerHTML =
      '<div id="drawer-overlay" class="fixed inset-0 z-50 flex justify-end" style="background:rgba(0,0,0,0.55);">' +
        '<div id="drawer-panel" class="h-full w-72 flex flex-col" style="background:#1c1f27;border-left:1px solid rgba(255,255,255,0.07);box-shadow:-8px 0 32px rgba(0,0,0,0.4);transform:translateX(100%);transition:transform 0.25s ease;">' +
          '<div class="p-5 flex items-center gap-3" style="border-bottom:1px solid rgba(255,255,255,0.07);">' +
            avatarHtml +
            '<div>' +
              '<p class="font-semibold" style="color:#f0eaf2;">' + esc(userName || 'Usuario') + '</p>' +
              '<p class="text-xs" style="color:rgba(240,234,242,0.45);">Mi cuenta</p>' +
            '</div>' +
          '</div>' +
          '<nav class="flex-1 overflow-y-auto py-4">' +
            '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2" style="color:rgba(240,234,242,0.35);">Configuración</p>' +
            '<button id="drawer-account-btn" ' + dBtn + ' ' + dBtnHover + ' style="background:transparent;border:none;width:100%;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.25rem;font-size:0.875rem;color:rgba(240,234,242,0.75);cursor:pointer;">' +
              '<div class="flex items-center gap-3">' +
                (avatarUrl ? '<img src="' + avatarUrl + '" class="w-8 h-8 rounded-full object-cover" />' : '<img src="assets/icons/ui/icono-perfil.png" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:4px;">') +
                '<span>Centro de cuenta</span>' +
              '</div>' +
              '<span style="color:rgba(240,234,242,0.25);">›</span>' +
            '</button>' +
            '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
              '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-2" style="color:rgba(240,234,242,0.35);">Privacidad</p>' +
              '<button id="drawer-privacy-btn" ' + dBtn + ' ' + dBtnHover + '><img src="assets/icons/ui/icono-perfil.png" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:4px;"><span>Configuración de privacidad</span></button>' +
            '</div>' +
            '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
              '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-2" style="color:rgba(240,234,242,0.35);">Apariencia</p>' +
              '<button id="drawer-lang-btn" ' + dBtn + ' ' + dBtnHover + '><img src="assets/icons/ui/icono-traduccion.png" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:4px;"> <span>Idioma</span></button>' +
            '</div>' +
            '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
              '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-2" style="color:rgba(240,234,242,0.35);">Información</p>' +
              '<button id="drawer-about-btn" ' + dBtn + ' ' + dBtnHover + '><img src="assets/icons/ui/icono-acerca.png" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:4px;"> <span>Acerca de la app</span></button>' +
            '</div>' +
            (isAdmin
              ? '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
                  '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-2" style="color:rgba(240,234,242,0.35);">Administración</p>' +
                  '<button id="drawer-users-btn" ' + dBtn + ' ' + dBtnHover + '><img src="assets/icons/ui/icono-usuarios.png" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:4px;"> <span>Gestionar usuarios</span></button>' +
                '</div>'
              : '') +
            '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
              '<button id="drawer-logout-btn" ' + dBtn + ' ' + dBtnHover + ' style="background:transparent;border:none;width:100%;display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1.25rem;font-size:0.875rem;color:rgba(248,113,113,0.75);cursor:pointer;">⎋ <span>Cerrar sesión</span></button>' +
            '</div>' +
          '</nav>' +
          '<div class="p-5" style="border-top:1px solid rgba(255,255,255,0.07);">' +
            '<button id="drawer-close" class="w-full py-2.5 rounded-btn text-sm font-medium" style="border:1px solid rgba(255,255,255,0.1);color:rgba(240,234,242,0.6);background:transparent;">Cerrar</button>' +
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

    function restoreDrawerNav() {
      var panel = document.getElementById('drawer-panel');
      if (!panel) return;
      var nav = panel.querySelector('nav');
      if (!nav) return;
      window.LyfterAPI.getProfile().then(function(p2) {
        nav.innerHTML =
          '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2" style="color:rgba(240,234,242,0.35);">Configuración</p>' +
          '<button id="drawer-account-btn-2" ' + dBtn + ' ' + dBtnHover + ' style="background:transparent;border:none;width:100%;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.25rem;font-size:0.875rem;color:rgba(240,234,242,0.75);cursor:pointer;">' +
            '<div class="flex items-center gap-3">' +
              (p2.avatar ? '<img src="' + p2.avatar + '" class="w-8 h-8 rounded-full object-cover" />' : '<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm" style="background:rgba(216,151,231,0.15);"><img src="assets/icons/ui/icono-perfil.png" style="width:18px;height:18px;object-fit:contain;"></div>') +
              '<span>Centro de cuenta</span>' +
            '</div>' +
            '<span style="color:rgba(240,234,242,0.25);">›</span>' +
          '</button>' +
          '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
            '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-2" style="color:rgba(240,234,242,0.35);">Privacidad</p>' +
            '<button id="drawer-privacy-btn-2" ' + dBtn + ' ' + dBtnHover + '><img src="assets/icons/ui/icono-perfil.png" style="width:18px;height:18px;object-fit:contain;margin-right:4px;"> <span>Configuración de privacidad</span></button>' +
          '</div>' +
          '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
            '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-2" style="color:rgba(240,234,242,0.35);">Apariencia</p>' +
            '<button id="drawer-lang-btn-2" ' + dBtn + ' ' + dBtnHover + '><img src="assets/icons/ui/icono-traduccion.png" style="width:18px;height:18px;object-fit:contain;margin-right:4px;"> <span>Idioma</span></button>' +
          '</div>' +
          '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
            '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-2" style="color:rgba(240,234,242,0.35);">Información</p>' +
            '<button id="drawer-about-btn-2" ' + dBtn + ' ' + dBtnHover + '><img src="assets/icons/ui/icono-acerca.png" style="width:18px;height:18px;object-fit:contain;margin-right:4px;"> <span>Acerca de la app</span></button>' +
          '</div>' +
          (isAdmin ? '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
            '<p class="text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-2" style="color:rgba(240,234,242,0.35);">Administración</p>' +
            '<button id="drawer-users-btn-2" ' + dBtn + ' ' + dBtnHover + '><img src="assets/icons/ui/icono-usuarios.png" style="width:18px;height:18px;object-fit:contain;margin-right:4px;"> <span>Gestionar usuarios</span></button>' +
          '</div>' : '') +
          '<div class="mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.07);">' +
            '<button id="drawer-logout-btn-2" ' + dBtn + ' ' + dBtnHover + ' style="color:rgba(248,113,113,0.75);">⎋ <span>Cerrar sesión</span></button>' +
          '</div>';

        var ab2 = document.getElementById('drawer-account-btn-2');
        if (ab2) ab2.addEventListener('click', function() { accountBtn.click(); });
        var pb2 = document.getElementById('drawer-privacy-btn-2');
        if (pb2) pb2.addEventListener('click', function() { privacyBtn && privacyBtn.click(); });
        var lb2 = document.getElementById('drawer-lang-btn-2');
        if (lb2) lb2.addEventListener('click', function() { langBtn && langBtn.click(); });
        var ab2b = document.getElementById('drawer-about-btn-2');
        if (ab2b) ab2b.addEventListener('click', function() { aboutBtn && aboutBtn.click(); });
        var ub2 = document.getElementById('drawer-users-btn-2');
        if (ub2) ub2.addEventListener('click', function() { usersBtn && usersBtn.click(); });
        var lb2b = document.getElementById('drawer-logout-btn-2');
        if (lb2b) lb2b.addEventListener('click', function() {
          showConfirm('¿Cerrar sesión?', function() { logout(); }, null, { confirmLabel: 'Cerrar sesión', danger: false });
        });
      }).catch(function() {
        closeModal();
        showDrawer(avatarUrl, userName, onAvatarSave, isAdmin);
      });
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
            : '<div class="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center cursor-pointer" id="account-avatar-img"><img src="assets/icons/ui/icono-perfil.png" alt="perfil" style="width:40px;height:40px;object-fit:contain;vertical-align:middle;" /></div>';

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
                  '<img src="assets/icons/ui/icono-añadir-imagen.png" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px;"><span>Foto de perfil</span><span class="text-gray-300">›</span>' +
                '</button>' +
                '<button id="acc-name-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<div class="text-left"><p class="text-sm text-gray-700">Nombre</p><p class="text-xs text-gray-400">' + esc(p.nombre || '') + '</p></div><span class="text-gray-300">›</span>' +
                '</button>' +
                '<button id="acc-email-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<div class="text-left"><p class="text-sm text-gray-700">Email</p><p class="text-xs text-gray-400">' + esc(p.email || '') + '</p></div><span class="text-gray-300">›</span>' +
                '</button>' +
                '<button id="acc-pw-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<span>Contraseña</span><span class="text-gray-300">›</span>' +
                '</button>' +
                '<button id="acc-interests-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">' +
                  '<div class="text-left"><p class="text-sm text-gray-700">Mis intereses</p><p class="text-xs text-gray-400">' + (p.interests && p.interests.length ? p.interests.slice(0,2).join(', ') + (p.interests.length > 2 ? '...' : '') : 'Sin configurar') + '</p></div><span class="text-gray-300">›</span>' +
                '</button>' +
              '</div>' +
              '<div class="border-t border-gray-100 mt-4">' +
                '<button id="acc-delete-btn" class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-red-500 hover:bg-red-50">' +
                  '<img src="assets/icons/ui/icono-basura-blanco.png" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px;">Eliminar cuenta<span class="text-red-300">›</span>' +
                '</button>' +
              '</div>' +
            '</div>';

          function goBack() {
            restoreDrawerNav();
          }

          document.getElementById('drawer-account-back').addEventListener('click', goBack);

          // Foto
          function pickAvatar() {
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
          }
          document.getElementById('account-avatar-img').addEventListener('click', pickAvatar);
          var photoBtn = document.getElementById('acc-photo-btn');
          if (photoBtn) photoBtn.addEventListener('click', pickAvatar);

          // Nombre
          document.getElementById('acc-name-btn').addEventListener('click', function() {
            var currentName = p.nombre || '';
            var modalRoot = document.getElementById('modal-root');
            modalRoot.innerHTML =
              '<div class="fixed inset-0 z-50 flex items-center justify-center p-6 anim-fade" style="background:rgba(17,24,39,0.75);">' +
                '<div class="bg-white rounded-card p-6 w-full max-w-sm shadow-soft anim-pop">' +
                  '<p class="text-sm font-semibold text-gray-700 mb-3"><img src="assets/icons/ui/icono-editar.png" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:4px;">Cambiar nombre</p>' +
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
                  '<p class="text-sm font-semibold text-gray-700 mb-3">Cambiar contraseña</p>' +
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
              '<p class="text-sm font-semibold text-gray-700 mb-4">Privacidad</p>' +
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
            restoreDrawerNav();
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

    var langBtn = document.getElementById('drawer-lang-btn');
    if (langBtn) {
      langBtn.addEventListener('click', function() {
        var LANGUAGES = {
          'es': 'Español',
          'en': 'English'
        };
        var currentLang = 'es';
        try { currentLang = localStorage.getItem('lyfter_lang') || 'es'; } catch(e) {}

        var nav = document.getElementById('drawer-panel').querySelector('nav');
        nav.innerHTML =
          '<div class="px-5 py-4">' +
            '<button id="drawer-lang-back" class="text-xs text-primary mb-4 flex items-center gap-1">← Volver</button>' +
            '<p class="text-sm font-semibold text-gray-700 mb-3">Idioma</p>' +
            '<div class="space-y-1">' +
              Object.keys(LANGUAGES).map(function(code) {
                var isSelected = currentLang === code;
                return '<button data-lang="' + code + '" class="lang-option w-full flex items-center justify-between px-4 py-3 rounded-btn text-sm hover:bg-gray-50 ' +
                  (isSelected ? 'text-primary font-semibold bg-primary-soft' : 'text-gray-700') + '">' +
                  '<span>' + LANGUAGES[code] + '</span>' +
                  (isSelected ? '<span class="text-primary">✓</span>' : '') +
                '</button>';
              }).join('') +
            '</div>' +
          '</div>';

        document.getElementById('drawer-lang-back').addEventListener('click', function() {
          restoreDrawerNav();
        });

        Array.prototype.forEach.call(document.querySelectorAll('.lang-option'), function(btn) {
          btn.addEventListener('click', function() {
            var lang = btn.getAttribute('data-lang');
            setLang(lang);
            closeModal();
            toast('Idioma cambiado — recargando...', 'info');
            setTimeout(function() { location.reload(); }, 800);
          });
        });
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
              '<img src="assets/icons/ui/logo-lyfter.jpeg" alt="Lyfter" style="width:80px;height:80px;object-fit:contain;border-radius:16px;display:block;margin:0 auto 12px;" />' +
              '<p class="font-bold text-gray-800 text-lg">Lyfter Badge App</p>' +
              '<p class="text-xs text-gray-400 mt-1">Versión 1.0.0</p>' +
              '<p class="text-xs text-gray-400 mt-3">Escanea, colecciona y gana badges en eventos</p>' +
              '<div class="mt-4 pt-4 border-t border-gray-100 text-left space-y-2">' +
                '<a href="terms.html" class="text-xs text-gray-500 font-medium block">Términos y condiciones</a>' +
                '<a href="privacy.html" class="text-xs text-gray-500 font-medium block">Política de privacidad</a>' +
              '</div>' +
            '</div>' +
          '</div>';
        document.getElementById('drawer-about-back').addEventListener('click', function() {
          restoreDrawerNav();
        });
      });
    }

    var logoutBtn = document.getElementById('drawer-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        showConfirm('¿Cerrar sesión?', function() { logout(); }, null, { confirmLabel: 'Cerrar sesión', danger: false });
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
          restoreDrawerNav();
        });

        var PAGE_SIZE = 10;
        var _usersCache = null;
        var _usersPage = 0;
        var _usersFiltered = null;

        function makeUserRow(u, currentUser) {
          var isSelf = currentUser && u.id === currentUser.id;
          var isAdminUser = u.rol === 'admin';
          var btnLabel = isAdminUser ? '→ Participante' : '→ Admin';
          var nextRol = isAdminUser ? 'participant' : 'admin';
          return '<div class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">' +
            '<img src="assets/icons/ui/icono-perfil.png" style="width:32px;height:32px;object-fit:contain;border-radius:50%;margin-right:8px;flex-shrink:0;" />' +
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
        }

        function bindRoleButtons(container) {
          Array.prototype.forEach.call(container.querySelectorAll('.role-drawer-btn'), function(btn) {
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
        }

        function renderUsersList(users) {
          var listEl = document.getElementById('drawer-users-list');
          if (!listEl) return;
          var currentUser = window.LyfterAPI.currentUser();
          _usersFiltered = users;
          _usersPage = 0;
          var page = users.slice(0, PAGE_SIZE);
          listEl.innerHTML = page.map(function(u) { return makeUserRow(u, currentUser); }).join('');
          _usersPage = 1;
          bindRoleButtons(listEl);
        }

        function loadUsersPage() {
          var listEl = document.getElementById('drawer-users-list');
          if (!listEl || !_usersFiltered) return;
          var start = _usersPage * PAGE_SIZE;
          if (start >= _usersFiltered.length) return;
          var currentUser = window.LyfterAPI.currentUser();
          var page = _usersFiltered.slice(start, start + PAGE_SIZE);
          var html = page.map(function(u) { return makeUserRow(u, currentUser); }).join('');
          listEl.insertAdjacentHTML('beforeend', html);
          _usersPage++;
          bindRoleButtons(listEl);
        }

        window.LyfterAPI.getUsers().then(function(usersList) {
          var listEl = document.getElementById('drawer-users-list');
          if (!listEl) return;
          if (!usersList || !usersList.length) {
            listEl.innerHTML = '<p class="text-sm text-gray-400">Sin usuarios.</p>';
            return;
          }
          _usersCache = usersList;
          renderUsersList(usersList);

          listEl.style.maxHeight = '320px';
          listEl.style.overflowY = 'auto';
          listEl.addEventListener('scroll', function() {
            if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 50) {
              loadUsersPage();
            }
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
              var listEl2 = document.getElementById('drawer-users-list');
              if (!listEl2) return;
              if (!filtered.length) {
                listEl2.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Sin resultados.</p>';
                _usersFiltered = [];
                return;
              }
              renderUsersList(filtered);
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
    var eventOptions = events.map(function(e) {
      return '<option value="' + e.id + '"' + (e.id === activeId ? ' selected' : '') + '>' + esc(e.name) + '</option>';
    }).join('');

    function navItem(id, icon, label, href) {
      var on = activeTab === id;
      var s = on
        ? 'display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;border-radius:12px;font-family:Poppins,sans-serif;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;color:#f4f6f9;background:linear-gradient(90deg,rgba(216,151,231,0.18),rgba(230,138,141,0.10));border:1px solid rgba(216,151,231,0.28);'
        : 'display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;border-radius:12px;font-family:Poppins,sans-serif;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;color:#8b93a3;background:transparent;border:1px solid transparent;';
      return '<a href="' + href + '" style="' + s + '"><span style="font-size:17px;">' + icon + '</span>' + label + '</a>';
    }

    var eventBlock = '';

    var sidebar =
      '<aside id="admin-sidebar" style="position:fixed;top:0;left:0;bottom:0;width:248px;background:#1a1d24;border-right:1px solid #262a33;display:flex;flex-direction:column;padding:26px 18px;z-index:20;overflow-y:auto;">' +
        '<div style="display:flex;align-items:center;gap:10px;padding:0 8px 26px;">' +
          '<img src="assets/icons/ui/logo-lyfter.jpeg" alt="Lyfter" style="width:28px;height:28px;object-fit:contain;border-radius:6px;vertical-align:middle;display:inline-block;" />' +
          '<span style="font-family:Poppins,sans-serif;font-size:20px;font-weight:700;color:#f4f6f9;letter-spacing:-0.01em;">Lyfter</span>' +
        '</div>' +
        '<a href="landing.html" style="display:block;font-size:12px;color:#8b93a3;text-decoration:none;padding:4px 8px;border-radius:8px;margin-bottom:12px;transition:color .15s;" onmouseover="this.style.color=\'#d897e7\'" onmouseout="this.style.color=\'#8b93a3\'">← Inicio</a>' +
        '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#5a6172;font-weight:700;padding:6px 12px 10px;">Admin</div>' +
        '<nav style="display:flex;flex-direction:column;gap:4px;">' +
          navItem('event',         '', 'Eventos',    'admin-event.html') +
          navItem('participation', '', 'Dashboard',   'admin-participation.html') +
          navItem('leaderboard',   '', 'Leaderboard', 'admin-leaderboard.html') +
        '</nav>' +
        eventBlock +
        '<div style="margin-top:16px;border-top:1px solid #262a33;padding-top:16px;">' +
          '<a href="workspace.html" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;color:#8b93a3;text-decoration:none;font-size:14px;font-weight:600;transition:color .15s;" onmouseover="this.style.color=\'#d897e7\'" onmouseout="this.style.color=\'#8b93a3\'">' +
            '<span style="font-size:17px;">🏢</span> Mi Workspace' +
          '</a>' +
        '</div>' +
        '<div style="margin-top:auto;padding-top:22px;">' +
          '<button id="admin-profile-menu" style="width:100%;height:44px;border-radius:12px;border:1px solid #353a46;background:transparent;color:#aab1bf;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">☰ Mi perfil</button>' +
        '</div>' +
      '</aside>';

    var glows =
      '<div style="position:fixed;top:-200px;right:-120px;width:900px;height:620px;pointer-events:none;z-index:0;background:radial-gradient(44% 60% at 30% 30%,rgba(216,151,231,0.16),transparent 70%),radial-gradient(44% 60% at 76% 40%,rgba(112,207,255,0.12),transparent 70%);"></div>';

    var main =
      '<main id="admin-main" style="margin-left:248px;min-height:100vh;position:relative;z-index:1;padding:34px 44px 70px;background:#15171d;">' +
        innerHtml +
      '</main>';

    return glows + sidebar + main;
  }

  function mountAdminShell() {
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

  /* ── XP & Logros: feedback visual ── */
  var RARITY_STYLES = {
    common:    { color: '#6B7280', label: 'Común',      glow: 'rgba(107,114,128,0.30)' },
    rare:      { color: '#2563EB', label: 'Raro',       glow: 'rgba(37,99,235,0.35)' },
    epic:      { color: '#7C3AED', label: 'Épico',      glow: 'rgba(124,58,237,0.40)' },
    legendary: { color: '#D97706', label: 'Legendario', glow: 'rgba(217,119,6,0.45)' }
  };

  var ACHIEVEMENT_ICONS = {
    'primer_paso':    'assets/icons/achievements/primer-paso.png',
    'coleccionista':  'assets/icons/achievements/coleccionista.png',
    'vertigo':        'assets/icons/achievements/vertigo.png',
    'completista':    'assets/icons/achievements/perfeccionista.png',
    'perfeccionista': 'assets/icons/achievements/perfeccionista.png',
    'viajero':        'assets/icons/achievements/viajero.png',
    'veterano':       'assets/icons/achievements/veterano.png',
    'ojo_halcon':     'assets/icons/achievements/ojo-de-halcon.png',
    'leyenda':        'assets/icons/achievements/leyenda.png'
  };

  // Toast flotante "+N XP" (y banner opcional de subida de nivel).
  // opts = { levelUp:bool, level:int }
  function showXpGain(amount, opts) {
    opts = opts || {};
    var root = document.getElementById('toast-root');
    if (!root) return;
    if (opts.levelUp) {
      var banner = document.createElement('div');
      banner.className = 'pointer-events-none anim-pop text-white text-base font-bold px-5 py-3 rounded-card shadow-soft';
      banner.style.background = 'linear-gradient(135deg,#6C63FF,#9C63FF)';
      var lname = window.LyfterAPI && window.LyfterAPI.levelName ? window.LyfterAPI.levelName(opts.level) : '';
      banner.textContent = '⬆️ ¡Subiste al nivel ' + opts.level + (lname ? ' · ' + lname : '') + '!';
      root.appendChild(banner);
      setTimeout(function () {
        banner.style.transition = 'opacity .4s'; banner.style.opacity = '0';
        setTimeout(function () { banner.remove(); }, 400);
      }, 2600);
    }
    if (amount > 0) {
      var chip = document.createElement('div');
      chip.className = 'pointer-events-none anim-pop text-white text-lg font-extrabold px-4 py-2 rounded-full shadow-soft';
      chip.style.background = '#16a34a';
      chip.textContent = '+' + amount + ' XP';
      root.appendChild(chip);
      setTimeout(function () {
        chip.style.transition = 'transform .5s, opacity .5s';
        chip.style.transform = 'translateY(-24px)'; chip.style.opacity = '0';
        setTimeout(function () { chip.remove(); }, 500);
      }, 1600);
    }
  }

  // Muestra un modal por cada logro desbloqueado (tap o 3s para avanzar),
  // luego invoca onDone. `slugs` es la lista de slugs de redeem.
  function showAchievementUnlocks(slugs, onDone) {
    onDone = onDone || function () {};
    if (!slugs || !slugs.length) { onDone(); return; }
    window.LyfterAPI.getAchievements().then(function (data) {
      var bySlug = {};
      (data.unlocked || []).forEach(function (a) { bySlug[a.slug] = a; });
      var queue = slugs.map(function (s) { return bySlug[s]; }).filter(Boolean);
      _showAchievementAt(queue, 0, onDone);
    }).catch(function () { onDone(); });
  }

  function _showAchievementAt(queue, i, onDone) {
    if (i >= queue.length) { onDone(); return; }
    var a = queue[i];
    var iconSrc = ACHIEVEMENT_ICONS[a.slug] || a.icon || 'assets/icons/achievements/primer-paso.png';
    var rs = RARITY_STYLES[a.rarity] || RARITY_STYLES.common;
    var root = document.getElementById('modal-root');
    if (!root) { onDone(); return; }
    var advanced = false;
    function advance() {
      if (advanced) return; advanced = true;
      closeModal();
      _showAchievementAt(queue, i + 1, onDone);
    }
    root.innerHTML =
      '<div id="ach-overlay" class="fixed inset-0 z-[70] flex items-center justify-center p-6 anim-fade" style="background:rgba(17,24,39,0.8);">' +
        '<div class="bg-white rounded-card p-8 text-center w-full max-w-xs shadow-soft anim-pop" style="border-top:5px solid ' + rs.color + ';">' +
          '<p class="text-xs font-semibold uppercase tracking-wide mb-3" style="color:' + rs.color + ';">¡Logro desbloqueado!</p>' +
          '<div class="mb-3" style="filter:drop-shadow(0 0 14px ' + rs.glow + ');display:flex;justify-content:center;"><img src="' + iconSrc + '" style="width:80px;height:80px;object-fit:contain;display:block;" /></div>' +
          '<h3 class="text-lg font-bold text-gray-800">' + esc(a.name) + '</h3>' +
          '<p class="text-sm text-gray-500 mt-1">' + esc(a.description || '') + '</p>' +
          '<span class="inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold text-white" style="background:' + rs.color + ';">' + rs.label + ' · +' + (a.xp_reward || 0) + ' XP</span>' +
          '<p class="text-[11px] text-gray-300 mt-4">Tocá para continuar</p>' +
        '</div>' +
      '</div>';
    document.getElementById('ach-overlay').addEventListener('click', advance);
    setTimeout(advance, 3000);
  }

  // Markup de la barra de XP (para la vista de perfil). `xp` = respuesta de getXpProfile.
  function xpBarHtml(xp) {
    var pct = xp.progress_pct != null ? xp.progress_pct : 0;
    var nextLine = xp.xp_for_next > 0
      ? (xp.xp_for_next + ' XP para nivel ' + (xp.level + 1))
      : '¡Nivel máximo alcanzado!';
    return '' +
      '<div class="rounded-card p-5 mb-4" style="background:#1c1f27;border:1px solid rgba(255,255,255,0.07);box-shadow:0 4px 24px rgba(0,0,0,0.4);">' +
        '<div class="flex items-center justify-between mb-2">' +
          '<div class="flex items-center gap-2">' +
            '<span class="inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm" style="background:rgba(216,151,231,0.15);color:#d897e7;">' + xp.level + '</span>' +
            '<div><p class="text-sm font-bold" style="color:#f0eaf2;">' + esc(xp.level_name) + '</p>' +
            '<p class="text-xs" style="color:rgba(240,234,242,0.44);">' + xp.xp_total + ' XP totales</p></div>' +
          '</div>' +
          '<span class="text-sm font-bold" style="color:#d897e7;">' + pct + '%</span>' +
        '</div>' +
        '<div class="w-full h-3 rounded-full overflow-hidden" style="background:rgba(255,255,255,0.07);">' +
          '<div class="h-3 rounded-full" style="width:' + pct + '%;background:linear-gradient(90deg,#6C63FF,#d897e7);transition:width 0.7s;"></div>' +
        '</div>' +
        '<p class="text-xs mt-1\.5" style="color:rgba(240,234,242,0.44);">' + nextLine + '</p>' +
      '</div>';
  }

  // Markup de la grilla de logros. `data` = respuesta de getAchievements.
  function achievementsGridHtml(data) {
    function fmtDate(iso) {
      if (!iso) return '';
      try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); }
      catch (e) { return ''; }
    }
    var cells = [];
    (data.unlocked || []).forEach(function (a) {
      var rs = RARITY_STYLES[a.rarity] || RARITY_STYLES.common;
      var iconSrc = ACHIEVEMENT_ICONS[a.slug] || a.icon || 'assets/icons/achievements/primer-paso.png';
      cells.push('<div class="rounded-card p-3 text-center" style="background:#21242d;border:1px solid ' + rs.color + '44;box-shadow:0 2px 10px ' + rs.glow + ';">' +
        '<div style="display:flex;justify-content:center;"><img src="' + iconSrc + '" style="width:48px;height:48px;object-fit:contain;display:block;" /></div>' +
        '<p class="text-xs font-semibold mt-1" style="color:#f0eaf2;">' + esc(a.name) + '</p>' +
        '<p class="text-\[10px\] mt-0\.5" style="color:' + rs.color + ';">' + rs.label + '</p>' +
        (a.unlocked_at ? '<p class="text-\[10px\]" style="color:rgba(240,234,242,0.35);">' + fmtDate(a.unlocked_at) + '</p>' : '') +
      '</div>');
    });
    (data.locked || []).forEach(function (a) {
      var iconSrc = ACHIEVEMENT_ICONS[a.slug] || a.icon || 'assets/icons/achievements/primer-paso.png';
      cells.push('<div class="rounded-card p-3 text-center" style="background:#1a1d24;border:1px solid rgba(255,255,255,0.06);" title="' + esc(a.hint || '') + '">' +
        '<div style="opacity:0.25;filter:grayscale(1);display:flex;justify-content:center;"><img src="' + iconSrc + '" style="width:48px;height:48px;object-fit:contain;display:block;" /></div>' +
        '<p class="text-xs mt-1" style="color:rgba(240,234,242,0.44);">' + esc(a.name) + '</p>' +
        '<p class="text-\[10px\]" style="color:rgba(240,234,242,0.25);"></p>' +
      '</div>');
    });
    var count = (data.unlocked || []).length;
    var total = count + (data.locked || []).length;
    return '<div class="rounded-card p-5 mb-4" style="background:#1c1f27;border:1px solid rgba(255,255,255,0.07);box-shadow:0 4px 24px rgba(0,0,0,0.4);">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<h3 class="text-sm font-bold" style="color:#f0eaf2;">Logros</h3>' +
        '<span class="text-xs" style="color:rgba(240,234,242,0.44);">' + count + '/' + total + '</span>' +
      '</div>' +
      '<div class="grid grid-cols-3 gap-2\.5">' + cells.join('') + '</div>' +
    '</div>';
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
    ensureActive: ensureActive,
    getCurrentLang: getCurrentLang,
    setCurrentLang: setCurrentLang,
    t: t,
    setLang: setLang,
    getLang: getLang,
    showXpGain: showXpGain,
    showAchievementUnlocks: showAchievementUnlocks,
    xpBarHtml: xpBarHtml,
    achievementsGridHtml: achievementsGridHtml,
    hideLoading: hideLoading
  };

  window.lyfterReset = function () {
    try { window.LyfterAPI.resetDemo(); toast('Datos de demo reiniciados', 'info'); }
    catch (e) { toast(e.message, 'error'); return; }
    window.LyfterAPI.logout();
    window.location.href = 'login.html';
  };
})();
