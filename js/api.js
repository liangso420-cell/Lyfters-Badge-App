/* ============================================================
   Lyfter Badge App — capa de datos (interfaz única, 2 backends)
   ------------------------------------------------------------
   Expone window.LyfterAPI con una interfaz ASÍNCRONA común.
   Según window.LYFTER_CONFIG.mode usa la implementación 'mock'
   (localStorage) o 'backend' (fetch a la API Flask del repo).

   Todas las implementaciones devuelven los MISMOS DTOs normalizados,
   de modo que las vistas (app.js) no saben de dónde vienen los datos:

     Session      { token, user:{ id, name, email, role } }   role: 'admin'|'participant'
     Event        { id, name, description, start, end, prize }
     EventDetail  { id, name, prize, badges:[Badge], total, obtained, complete, prizeRevealed }
     Badge (part) { id, emoji, name, desc, obtained }
     AdminBadges  { event:{ id, name, totalParticipants? }, badges:[AdminBadge] }
     AdminBadge   { id, emoji, name, desc, token, redeemUrl, redeemed }
     Redeem       { status:'ok'|'duplicate'|'none', badge:{ emoji,name,desc }, complete, prize, progress:{ obtained,total } }
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.LYFTER_CONFIG || { mode: 'mock', apiBaseUrl: 'http://localhost:5000' };

  /* ---------------------------------------------------------
     SESIÓN — compartida por ambos modos (localStorage + fallback)
     --------------------------------------------------------- */
  var SESSION_KEY = 'lyfter_session';
  var sessionMem = null;

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
    catch (e) { return sessionMem; }
  }
  function saveSession(s) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
    catch (e) { sessionMem = s; }
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    sessionMem = null;
  }

  /* =========================================================
     IMPLEMENTACIÓN MOCK (localStorage)
     ========================================================= */
  var STORE_KEY = 'lyfter_badge_state';
  var storeMem = null;

  function seedState() {
    var summitBadges = [
      { id: 'b1', emoji: '🚀', name: 'Bienvenida',  desc: 'Check-in en recepción',    token: 'a1b2-c3d4', redemptions: 128 },
      { id: 'b2', emoji: '🎤', name: 'Keynote',     desc: 'Charla principal',         token: 'e5f6-g7h8', redemptions: 96 },
      { id: 'b3', emoji: '☕', name: 'Networking',  desc: 'Café y conexiones',        token: 'i9j0-k1l2', redemptions: 74 },
      { id: 'b4', emoji: '💡', name: 'Workshop',    desc: 'Taller práctico',          token: 'm3n4-o5p6', redemptions: 41 },
      { id: 'b5', emoji: '🏗️', name: 'Demo',        desc: 'Demostración de producto', token: 'q7r8-s9t0', redemptions: 0 },
      { id: 'b6', emoji: '🍕', name: 'Almuerzo',    desc: 'Pausa para el almuerzo',   token: 'u1v2-w3x4', redemptions: 0 },
      { id: 'b7', emoji: '🎁', name: 'Stand',       desc: 'Visita a un stand',        token: 'y5z6-a7b8', redemptions: 0 },
      { id: 'b8', emoji: '🌟', name: 'Cierre',      desc: 'Ceremonia de cierre',      token: 'c9d0-e1f2', redemptions: 0 }
    ];
    var hackathonBadges = [
      { id: 'h1', emoji: '🚀', name: 'Inicio',   desc: 'Apertura del hackathon', token: 'k1k2-k3k4', redemptions: 0 },
      { id: 'h2', emoji: '🧠', name: 'Mentoría', desc: 'Sesión con mentores',    token: 'k5k6-k7k8', redemptions: 0 },
      { id: 'h3', emoji: '🏆', name: 'Pitch',    desc: 'Presentación final',     token: 'k9ka-kbkc', redemptions: 0 }
    ];
    return {
      users: [
        { id: 'u-admin', name: 'Admin Lyfter', email: 'admin@lyfter.cc', password: 'admin123', role: 'admin' },
        { id: 'u-ana',   name: 'Ana Pérez',    email: 'ana@correo.com',  password: 'ana123',   role: 'participant' }
      ],
      events: [
        { id: 'evt-summit', name: 'Lyfter Summit 2026', description: 'Evento insignia anual de la comunidad Lyfter.',
          start: '2026-09-10', end: '2026-09-11', prize: '🎟️ Entrada VIP al after-party', totalParticipants: 150, badges: summitBadges },
        { id: 'evt-hack', name: 'Hackathon de Verano', description: 'Dos días construyendo en equipo.',
          start: '2026-07-01', end: '2026-07-02', prize: '🎟️ Mentoría 1:1 con el jurado', totalParticipants: 60, badges: hackathonBadges }
      ],
      progress: { 'u-ana': { 'evt-summit': ['b1', 'b2', 'b3'] } },
      _seq: 0
    };
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; }
    catch (e) { return storeMem; }
  }
  function writeStore(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
    catch (e) { storeMem = s; }
  }

  var mockState = readStore();
  if (!mockState) { mockState = seedState(); writeStore(mockState); }
  function persist() { writeStore(mockState); }

  function uid(prefix) { return prefix + '-' + (mockState._seq = (mockState._seq || 0) + 1); }
  function genToken() {
    var chars = 'abcdef0123456789', part = function () {
      var s = ''; for (var i = 0; i < 4; i++) s += chars[Math.floor((performance.now() * (i + 1)) % chars.length)]; return s;
    };
    return part() + '-' + part();
  }
  function mockUserById(id) { return mockState.users.find(function (u) { return u.id === id; }) || null; }
  function mockEvent(id) { return mockState.events.find(function (e) { return e.id === id; }) || null; }
  function redeemedIds(userId, eventId) {
    return (mockState.progress[userId] && mockState.progress[userId][eventId]) || [];
  }
  function publicUser(u) { return { id: u.id, name: u.name, email: u.email, role: u.role }; }
  function eventDto(e) { return { id: e.id, name: e.name, description: e.description, start: e.start, end: e.end, prize: e.prize }; }

  var Mock = {
    async _login(email, password) {
      var u = mockState.users.find(function (x) { return x.email.toLowerCase() === String(email).toLowerCase(); });
      if (!u || u.password !== password) throw new Error('Credenciales incorrectas');
      return { token: 'mock-' + u.id, user: publicUser(u) };
    },
    async _register(data) {
      var email = String(data.email).trim().toLowerCase();
      if (mockState.users.some(function (u) { return u.email.toLowerCase() === email; }))
        throw new Error('Ese email ya está registrado');
      var u = { id: uid('u'), name: data.name.trim(), email: email, password: data.password, role: 'participant' };
      mockState.users.push(u); persist();
      return { token: 'mock-' + u.id, user: publicUser(u) };
    },
    async listEvents() { return mockState.events.map(eventDto); },
    async listAdminEvents() { return mockState.events.map(eventDto); },
    async getEventDetail(eventId) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      var done = redeemedIds(getSession().user.id, eventId);
      var badges = e.badges.map(function (b) {
        return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, obtained: done.indexOf(b.id) !== -1 };
      });
      var complete = badges.length > 0 && done.length >= badges.length;
      return { id: e.id, name: e.name, prize: e.prize, badges: badges,
        total: badges.length, obtained: done.length, complete: complete,
        prizeRevealed: complete ? e.prize : null };
    },
    // token === null → redime el siguiente pendiente (simulación de escaneo)
    async redeem(eventId, token) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      var userId = getSession().user.id;
      var done = redeemedIds(userId, eventId);
      var badge = token
        ? e.badges.find(function (b) { return b.token === token; })
        : e.badges.find(function (b) { return done.indexOf(b.id) === -1; });
      if (token && !badge) throw new Error('QR inválido');
      if (!badge) return { status: 'none', badge: null, complete: true, prize: null, progress: { obtained: done.length, total: e.badges.length } };

      var dup = done.indexOf(badge.id) !== -1;
      if (!dup) {
        if (!mockState.progress[userId]) mockState.progress[userId] = {};
        if (!mockState.progress[userId][eventId]) mockState.progress[userId][eventId] = [];
        mockState.progress[userId][eventId].push(badge.id);
        badge.redemptions = (badge.redemptions || 0) + 1;
        persist();
      }
      var obtained = redeemedIds(userId, eventId).length;
      var complete = obtained >= e.badges.length;
      return {
        status: dup ? 'duplicate' : 'ok',
        badge: { emoji: badge.emoji, name: badge.name, desc: badge.desc },
        complete: complete, prize: complete ? e.prize : null,
        progress: { obtained: obtained, total: e.badges.length }
      };
    },
    async createEvent(data) {
      var e = { id: uid('evt'), name: data.name.trim(), description: (data.description || '').trim(),
        start: data.start, end: data.end, prize: (data.prize || '').trim() || 'Premio sorpresa',
        totalParticipants: 0, badges: [] };
      mockState.events.push(e); persist();
      return eventDto(e);
    },
    async addBadge(eventId, data) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      var b = { id: uid('b'), emoji: data.emoji || '🏅', name: data.name.trim(),
        desc: (data.desc || '').trim() || 'Sin descripción', token: genToken(), redemptions: 0 };
      e.badges.push(b); persist();
      return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, token: b.token, qrImage: null };
    },
    async listAdminBadges(eventId) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      return {
        event: { id: e.id, name: e.name, totalParticipants: e.totalParticipants },
        badges: e.badges.map(function (b) {
          return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, token: b.token,
            redeemUrl: window.location.origin + '/redeem/' + e.id + '/' + b.token, redeemed: b.redemptions || 0,
            qrImage: null };
        })
      };
    },
    resetDemo() { mockState = seedState(); persist(); }
  };

  /* =========================================================
     IMPLEMENTACIÓN BACKEND (fetch → API Flask)
     ========================================================= */
  function roleFromBackend(rol) { return rol === 'admin' ? 'admin' : 'participant'; }
  function mapUser(u) { return { id: u.id, name: u.nombre, email: u.email, role: roleFromBackend(u.rol) }; }
  function mapEvent(e) { return { id: e.id, name: e.nombre, description: e.descripcion, start: e.fecha_inicio, end: e.fecha_fin, prize: e.premio }; }

  async function request(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    var s = getSession();
    if (s && s.token) headers.Authorization = 'Bearer ' + s.token;
    var res;
    try {
      res = await fetch(CFG.apiBaseUrl + path, {
        method: method, headers: headers, body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new Error('No se pudo conectar con el servidor (' + CFG.apiBaseUrl + ')');
    }
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) { clearSession(); throw new Error(data.error || 'Sesión expirada'); }
    if (!res.ok) throw new Error(data.error || ('Error ' + res.status));
    return data;
  }

  var Backend = {
    async _login(email, password) {
      var d = await request('POST', '/auth/login', { email: email, password: password });
      return { token: d.token, user: mapUser(d.user) };
    },
    async _register(data) {
      var d = await request('POST', '/auth/register', { nombre: data.name, email: data.email, password: data.password });
      return { token: d.token, user: mapUser(d.user) };
    },
    async listEvents() { return (await request('GET', '/events/')).map(mapEvent); },
    async listAdminEvents() { return (await request('GET', '/admin/events')).map(mapEvent); },
    async getEventDetail(eventId) {
      var d = await request('GET', '/events/' + eventId);
      return {
        id: d.id, name: d.nombre, prize: d.premio,
        badges: (d.badges || []).map(function (b) {
          return { id: b.id, emoji: b.icon || '🏅', name: b.nombre, desc: b.descripcion, obtained: !!b.obtenido };
        }),
        total: d.total_badges, obtained: d.obtenidos, complete: !!d.completado,
        prizeRevealed: d.premio_revelado || null
      };
    },
    // En backend SIEMPRE se requiere token (el QR físico lo contiene).
    async redeem(eventId, token) {
      if (!token) throw new Error('Ingresa el token del QR (no hay simulación contra el backend)');
      var d = await request('POST', '/redeem/' + eventId + '/' + token);
      return {
        status: d.status === 'duplicado' ? 'duplicate' : 'ok',
        badge: d.badge ? { emoji: d.badge.icon || '🏅', name: d.badge.nombre, desc: d.badge.descripcion } : null,
        complete: !!d.completado, prize: d.premio || null,
        progress: d.progreso ? { obtained: d.progreso.obtenidos, total: d.progreso.total } : null
      };
    },
    async createEvent(data) {
      var d = await request('POST', '/admin/event', {
        nombre: data.name, descripcion: data.description,
        fecha_inicio: data.start, fecha_fin: data.end, premio: data.prize
      });
      return mapEvent(d);
    },
    async addBadge(eventId, data) {
      var d = await request('POST', '/admin/events/' + eventId + '/badge', {
        nombre: data.name, descripcion: data.desc, icon: data.emoji || '🏅'
      });
      return { id: d.id, emoji: d.icon || '🏅', name: d.nombre, desc: d.descripcion, token: d.token, qrImage: d.qr_image || null };
    },
    async listAdminBadges(eventId) {
      var d = await request('GET', '/admin/events/' + eventId + '/badges');
      return {
        event: { id: d.evento.id, name: d.evento.nombre, totalParticipants: undefined },
        badges: (d.badges || []).map(function (b) {
          return { id: b.id, emoji: b.icon || '🏅', name: b.nombre, desc: b.descripcion, token: b.token,
            redeemUrl: b.redeem_url || ('/redeem/' + eventId + '/' + b.token), redeemed: b.canjeados || 0,
            qrImage: b.qr_image || null };  // data URI PNG generado por el backend
        })
      };
    },
    async deleteBadge(eventId, badgeId) {
      return await request('DELETE', '/admin/events/' + eventId + '/badges/' + badgeId);
    },
    resetDemo() { throw new Error('resetDemo no disponible en modo backend'); }
  };

  /* =========================================================
     SELECCIÓN + WRAPPERS públicos
     ========================================================= */
  var impl = CFG.mode === 'backend' ? Backend : Mock;

  async function login(email, password) {
    var r = await impl._login(email, password);
    saveSession(r);
    return r.user;
  }
  async function register(data) {
    var r = await impl._register(data);
    saveSession(r);
    return r.user;
  }
  function logout() { clearSession(); }

  window.LyfterAPI = {
    mode: CFG.mode,
    getSession: getSession,
    currentUser: function () { var s = getSession(); return s ? s.user : null; },
    login: login,
    register: register,
    logout: logout,
    listEvents: impl.listEvents,
    listAdminEvents: impl.listAdminEvents,
    getEventDetail: impl.getEventDetail,
    redeem: impl.redeem,
    createEvent: impl.createEvent,
    addBadge: impl.addBadge,
    listAdminBadges: impl.listAdminBadges,
    deleteBadge: impl.deleteBadge,
    resetDemo: impl.resetDemo
  };
})();
