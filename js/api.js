/* ============================================================
   Lyfter Badge App — capa de datos (interfaz única, 2 backends)
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.LYFTER_CONFIG || { mode: 'mock', apiBaseUrl: 'http://localhost:5000' };

  var APP_BASE = window.location.origin +
    window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);

  /* ── Sesión ─────────────────────────────── */
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
     MOCK (localStorage)
     ========================================================= */
  var STORE_KEY = 'lyfter_badge_state';
  var storeMem = null;

  function seedState() {
    var summitBadges = [
      { id: 'b1', emoji: '🚀', name: 'Bienvenida',  desc: 'Check-in en recepción',    token: 'a1b2-c3d4', redemptions: 128 },
      { id: 'b2', emoji: '🎤', name: 'Keynote',     desc: 'Charla principal',         token: 'e5f6-g7h8', redemptions: 96 },
      { id: 'b3', emoji: '☕', name: 'Networking',  desc: 'Café y conexiones',        token: 'i9j0-k1l2', redemptions: 74 },
      { id: 'b4', emoji: '💡', name: 'Workshop',    desc: 'Taller práctico',          token: 'm3n4-o5p6', redemptions: 41 },
      { id: 'b5', emoji: '🏗️', name: 'Demo',        desc: 'Demostración de producto', token: 'q7r8-s9t0', redemptions: 20 },
    ];
    var hackathonBadges = [
      { id: 'h1', emoji: '🚀', name: 'Inicio',   desc: 'Apertura del hackathon', token: 'k1k2-k3k4', redemptions: 15 },
      { id: 'h2', emoji: '🧠', name: 'Mentoría', desc: 'Sesión con mentores',    token: 'k5k6-k7k8', redemptions: 10 },
      { id: 'h3', emoji: '🏆', name: 'Pitch',    desc: 'Presentación final',     token: 'k9ka-kbkc', redemptions: 8 }
    ];
    return {
      users: [
        { id: 'u-admin', name: 'Admin Lyfter',  email: 'admin@lyfter.app',  password: 'admin123',  role: 'admin' },
        { id: 'u-ana',   name: 'Ana Torres',    email: 'ana@lyfter.app',    password: 'ana123',    role: 'participant' },
        { id: 'u-carlos',name: 'Carlos Méndez', email: 'carlos@lyfter.app', password: 'carlos123', role: 'participant' },
        { id: 'u-lucia', name: 'Lucía Herrera', email: 'lucia@lyfter.app',  password: 'lucia123',  role: 'participant' }
      ],
      events: [
        { id: 'evt-summit', name: 'Lyfter Summit 2026', description: 'Evento insignia anual de la comunidad Lyfter.',
          start: '2026-09-10', end: '2026-09-11', prize: '🎟️ Entrada VIP al after-party', active: true, totalParticipants: 150, badges: summitBadges },
        { id: 'evt-hack', name: 'Hackathon de Verano', description: 'Dos días construyendo en equipo.',
          start: '2026-07-01', end: '2026-07-02', prize: '🎟️ Mentoría 1:1 con el jurado', active: true, totalParticipants: 60, badges: hackathonBadges }
      ],
      progress: {
        'u-ana':    { 'evt-summit': ['b1', 'b2', 'b3'] },
        'u-carlos': { 'evt-summit': ['b1'] },
        'u-lucia':  { 'evt-summit': ['b1', 'b2', 'b3', 'b4', 'b5'] }
      },
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
  function publicUser(u) { return { id: u.id, nombre: u.name, email: u.email, rol: u.role, created_at: null }; }
  function computeMockStatus(e) {
    var manual = e.status;
    if (['draft','pending','cancelled','postponed','archived','paused'].indexOf(manual) !== -1) return manual;
    var now = new Date();
    var start = e.start ? new Date(e.start) : null;
    var end = e.end ? new Date(e.end) : null;
    if (start && end) {
      if (now < start) return 'upcoming';
      if (now >= start && now <= end) return 'ongoing';
      if (now > end) return 'finished';
    }
    return manual || 'draft';
  }
  function eventDto(e) {
    return { id: e.id, name: e.name, description: e.description, start: e.start, end: e.end,
      prize: e.prize, active: e.active !== false, status: computeMockStatus(e),
      photo: e.photo || null, access_qr: e.access_qr || null, tags: e.tags || [], location: e.location || '' };
  }

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
    async _loginWithGoogle(googleUser) {
      // En modo mock, simular login con Google buscando por email.
      // Si no existe, crear usuario nuevo automáticamente (igual que el backend).
      var email = String(googleUser.email).toLowerCase();
      var u = mockState.users.find(function (x) { return x.email.toLowerCase() === email; });
      if (!u) {
        u = { id: uid('u'), name: googleUser.name || email.split('@')[0], email: email,
              password: null, role: 'participant', provider: 'google', avatar: googleUser.photo || '' };
        mockState.users.push(u); persist();
      }
      return { token: 'mock-google-' + u.id, user: publicUser(u) };
    },
    async listEvents() { return mockState.events.filter(function(e){ return e.active !== false; }).map(eventDto); },
    async listAdminEvents() { return mockState.events.map(eventDto); },
    async getEventDetail(eventId) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      var sess = getSession();
      var done = sess ? redeemedIds(sess.user.id, eventId) : [];
      var blist = e.badges.map(function (b) {
        return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, obtained: done.indexOf(b.id) !== -1, scannedAt: done.indexOf(b.id) !== -1 ? new Date().toISOString() : null };
      });
      var complete = blist.length > 0 && done.length >= blist.length;
      return { id: e.id, name: e.name, prize: e.prize, badges: blist,
        total: blist.length, obtained: done.length, complete: complete,
        prizeRevealed: complete ? e.prize : null };
    },
    async redeem(eventId, token) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      var sess = getSession(); if (!sess) throw new Error('Sin sesión');
      var userId = sess.user.id;
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
        active: true, totalParticipants: 0, badges: [] };
      mockState.events.push(e); persist();
      return eventDto(e);
    },
    async updateEvent(eventId, data) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      if (data.nombre !== undefined)      e.name        = data.nombre.trim();
      if (data.descripcion !== undefined) e.description = data.descripcion.trim();
      if (data.premio !== undefined)      e.prize       = data.premio.trim();
      if (data.fecha_inicio !== undefined) e.start      = data.fecha_inicio;
      if (data.fecha_fin !== undefined)   e.end         = data.fecha_fin;
      if (data.activo !== undefined)      e.active      = data.activo;
      if (data.status !== undefined)      e.status      = data.status;
      persist();
      return eventDto(e);
    },
    async addBadge(eventId, data) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      var b = { id: uid('b'), emoji: data.emoji || '🏅', name: data.name.trim(),
        desc: (data.desc || '').trim() || 'Sin descripción', token: genToken(), redemptions: 0 };
      e.badges.push(b); persist();
      return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, token: b.token, redeemUrl: null, redeemed: 0, qrImage: null };
    },
    async listAdminBadges(eventId) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      return {
        event: { id: e.id, name: e.name, totalParticipants: e.totalParticipants, access_qr: e.access_qr || null, photo: e.photo || null },
        badges: e.badges.map(function (b) {
          return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, token: b.token,
            redeemUrl: APP_BASE + 'redeem.html?event=' + e.id + '&token=' + b.token,
            redeemed: b.redemptions || 0, qrImage: null };
        })
      };
    },
    async generateEventAccessQr(eventId) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      var url = APP_BASE + 'join.html?event=' + eventId;
      e.access_qr = 'mock-qr'; e.join_url = url; persist();
      return { access_qr: 'mock-qr', join_url: url };
    },
    async updateEventPhoto(eventId, base64) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      e.photo = base64; persist(); return { ok: true };
    },
    async joinEvent(eventId, coords) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      return { status: 'joined', event: eventDto(e) };
    },
    async updateEventCoordinates(eventId, lat, lng) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      e.lat = lat; e.lng = lng; persist(); return { ok: true };
    },
    async getJoinedEvents() {
      var sess = getSession();
      if (!sess) return [];
      var userId = sess.user.id;
      var joined = mockState.progress[userId] ? Object.keys(mockState.progress[userId]) : [];
      return mockState.events.filter(function(e) { return joined.indexOf(e.id) !== -1; }).map(eventDto);
    },
    async updateEventLocation(eventId, location) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      e.location = location; persist(); return { ok: true };
    },
    async updateInterests(interests) {
      var sess = getSession();
      var u = mockState.users.find(function(x){ return x.id === sess.user.id; });
      if (u) { u.interests = interests; persist(); }
      return { ok: true };
    },
    async getRecommended() {
      var sess = getSession();
      var u = mockState.users.find(function(x){ return x.id === sess.user.id; });
      var interests = u ? (u.interests || []) : [];
      return mockState.events.filter(function(e){ return e.active !== false; }).filter(function(e) {
        var tags = e.tags || [];
        return interests.some(function(i){ return tags.indexOf(i) !== -1; });
      }).slice(0, 5).map(eventDto);
    },
    async updateEventTags(eventId, tags) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      e.tags = tags; persist(); return { ok: true };
    },
    async deleteBadge(eventId, badgeId) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      e.badges = e.badges.filter(function(b){ return b.id !== badgeId; }); persist();
      return { ok: true };
    },
    async deleteEvent(eventId) {
      mockState.events = mockState.events.filter(function(e) { return e.id !== eventId; });
      persist(); return { ok: true };
    },
    async getDashboard() {
      var totalP = mockState.users.filter(function(u){ return u.role === 'participant'; }).length;
      var totalBC = mockState.events.reduce(function(a, e) {
        return a + e.badges.reduce(function(x, b){ return x + (b.redemptions || 0); }, 0);
      }, 0);
      var progreso = mockState.events.map(function(e) {
        var totalB = e.badges.length;
        var totalC = e.badges.reduce(function(a, b){ return a + (b.redemptions || 0); }, 0);
        return { id: e.id, nombre: e.name, total_badges: totalB, total_canjeados: totalC,
          porcentaje: totalB > 0 ? Math.round(totalC / totalB * 1000) / 10 : 0,
          participantes_unicos: e.totalParticipants || 0 };
      });
      return {
        total_participantes: totalP,
        total_eventos: mockState.events.length,
        total_badges_creados: mockState.events.reduce(function(a,e){ return a + e.badges.length; }, 0),
        total_badges_canjeados: totalBC,
        progreso_por_evento: progreso
      };
    },
    async getUsers() {
      return mockState.users.map(function(u) {
        return { id: u.id, nombre: u.name, email: u.email, rol: u.role, created_at: null };
      });
    },
    async changeUserRole(userId, rol) {
      var u = mockState.users.find(function(x){ return x.id === userId; });
      if (!u) throw new Error('Usuario no encontrado');
      u.role = rol; persist();
      return { id: u.id, nombre: u.name, email: u.email, rol: u.role, created_at: null };
    },
    async regenerateBadgeQr(badgeId) {
      for (var i = 0; i < mockState.events.length; i++) {
        var e = mockState.events[i];
        for (var j = 0; j < e.badges.length; j++) {
          if (e.badges[j].id === badgeId) {
            var b = e.badges[j];
            b.token = genToken(); persist();
            return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, token: b.token,
              redeemUrl: APP_BASE + 'redeem.html?event=' + e.id + '&token=' + b.token,
              redeemed: b.redemptions || 0, qrImage: null };
          }
        }
      }
      throw new Error('Badge no encontrado');
    },
    async changePassword(currentPw, newPw) {
      var sess = getSession();
      var u = mockState.users.find(function(x){ return x.id === sess.user.id; });
      if (!u || u.password !== currentPw) throw new Error('Contraseña actual incorrecta');
      if (newPw.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
      u.password = newPw; persist();
      return { ok: true };
    },
    async getProfile() {
      var sess = getSession();
      var u = mockState.users.find(function(x){ return x.id === sess.user.id; });
      return { id: u.id, nombre: u.name, email: u.email, rol: u.role, avatar: u.avatar || null, interests: u.interests || [], privacy: u.privacy || { show_in_leaderboard: true, show_badges: true } };
    },
    async updateName(name) {
      var sess = getSession(); var u = mockState.users.find(function(x){ return x.id === sess.user.id; });
      if (u) { u.name = name; persist(); } return { ok: true };
    },
    async updateEmail(email) {
      var sess = getSession(); var u = mockState.users.find(function(x){ return x.id === sess.user.id; });
      if (u) { u.email = email; persist(); } return { ok: true };
    },
    async updatePrivacy(settings) {
      var sess = getSession(); var u = mockState.users.find(function(x){ return x.id === sess.user.id; });
      if (u) { u.privacy = settings; persist(); } return { ok: true };
    },
    async deleteAccount() {
      var sess = getSession();
      mockState.users = mockState.users.filter(function(x){ return x.id !== sess.user.id; });
      persist(); return { ok: true };
    },
    async updateAvatar(base64) {
      var sess = getSession();
      var u = mockState.users.find(function(x){ return x.id === sess.user.id; });
      if (u) { u.avatar = base64; persist(); }
      return { ok: true };
    },
    async getEventStats(eventId) {
      var e = mockEvent(eventId); if (!e) throw new Error('Evento no encontrado');
      var total = e.badges.length;
      var canjeados = e.badges.reduce(function(a,b){ return a + (b.redemptions||0); }, 0);
      return {
        evento: { id: e.id, nombre: e.name },
        participantes_activos: e.totalParticipants || 0,
        completaron: 0, no_completaron: e.totalParticipants || 0, pct_completaron: 0,
        total_badges: total, total_canjeados: canjeados,
        pct_canjeados: total > 0 ? Math.round(canjeados/total*100) : 0,
        progreso_distribucion: {"0-25": 5, "26-50": 10, "51-75": 8, "76-100": 3},
        badge_ranking: e.badges.map(function(b){ return {nombre:b.name, icon:b.emoji||'🏅', count:b.redemptions||0}; }).sort(function(a,b){return b.count-a.count;}),
        top_usuarios: [],
        actividad_por_hora: []
      };
    },
    async getLeaderboard() {
      var result = mockState.users.map(function(u) {
        var total = 0;
        if (mockState.progress[u.id]) {
          Object.values(mockState.progress[u.id]).forEach(function(arr) { total += arr.length; });
        }
        return { id: u.id, nombre: u.name, avatar: u.avatar || null, badges: total };
      });
      result.sort(function(a, b) { return b.badges - a.badges; });
      return result;
    },
    resetDemo() { mockState = seedState(); persist(); }
  };

  /* =========================================================
     BACKEND (fetch → API Flask)
     ========================================================= */
  function roleFromBackend(rol) { return rol === 'admin' ? 'admin' : 'participant'; }
  function mapUser(u) { return { id: u.id, name: u.nombre, email: u.email, role: roleFromBackend(u.rol) }; }
  function mapEvent(e) {
    return {
      id: e.id,
      name: e.nombre,
      description: e.descripcion,
      start: e.fecha_inicio,
      end: e.fecha_fin,
      prize: e.premio,
      active: e.activo !== false,
      status: e.status || 'draft',
      photo: e.photo || null,
      access_qr: e.access_qr || null,
      tags: e.tags || [],
      location: e.location || '',
    };
  }

  async function apiRequest(method, path, body) {
    if (!navigator.onLine) {
      var offlineErr = new Error('Sin conexión. Verificá tu internet.');
      offlineErr.offline = true;
      throw offlineErr;
    }

    var controller = new AbortController();
    var tid = setTimeout(function() { controller.abort(); }, 15000);

    var headers = { 'Content-Type': 'application/json' };
    var s = getSession();
    if (s && s.token) headers.Authorization = 'Bearer ' + s.token;
    var res;
    try {
      res = await fetch(CFG.apiBaseUrl + path, {
        method: method, headers: headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado. Intentá de nuevo.');
      throw new Error('No se pudo conectar con el servidor (' + CFG.apiBaseUrl + ')');
    } finally {
      clearTimeout(tid);
    }
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) {
      clearSession();
      var _p = window.location.pathname;
      if (!_p.includes('login.html') && !_p.includes('register.html')) {
        window.location.replace('login.html?next=' + encodeURIComponent(_p + window.location.search + window.location.hash));
      }
      throw new Error(data.error || 'Sesión expirada');
    }
    if (!res.ok) throw new Error(data.error || ('Error ' + res.status));
    return data;
  }

  var Backend = {
    async _login(email, password) {
      var d = await apiRequest('POST', '/auth/login', { email: email, password: password });
      return { token: d.token, user: mapUser(d.user) };
    },
    async _register(data) {
      var d = await apiRequest('POST', '/auth/register', { nombre: data.name, email: data.email, password: data.password });
      return { token: d.token, user: mapUser(d.user) };
    },
    async _loginWithGoogle(googleUser) {
      // googleUser = { idToken, email, name, photo }
      var d = await apiRequest('POST', '/auth/google', { idToken: googleUser.idToken });
      return { token: d.token, user: mapUser(d.user) };
    },
    async listEvents() { return (await apiRequest('GET', '/events/')).map(mapEvent); },
    async listAdminEvents() { return (await apiRequest('GET', '/admin/events')).map(mapEvent); },
    async getEventDetail(eventId) {
      var d = await apiRequest('GET', '/events/' + eventId);
      return {
        id: d.id, name: d.nombre, prize: d.premio,
        badges: (d.badges || []).map(function (b) {
          return { id: b.id, emoji: b.icon || '🏅', name: b.nombre, desc: b.descripcion,
            obtained: !!b.obtenido, scannedAt: b.scanned_at || null };
        }),
        total: d.total_badges, obtained: d.obtenidos, complete: !!d.completado,
        prizeRevealed: d.premio_revelado || null
      };
    },
    async redeem(eventId, token, coords) {
      if (!token) throw new Error('Ingresa el token del QR');
      var body = coords ? { lat: coords.lat, lng: coords.lng } : {};
      var d = await apiRequest('POST', '/redeem/' + eventId + '/' + token, body);
      return {
        status: d.status === 'duplicado' ? 'duplicate' : 'ok',
        badge: d.badge ? { emoji: d.badge.icon || '🏅', name: d.badge.nombre, desc: d.badge.descripcion } : null,
        complete: !!d.completado, prize: d.premio || null,
        progress: d.progreso ? { obtained: d.progreso.obtenidos, total: d.progreso.total } : null
      };
    },
    async createEvent(data) {
      var d = await apiRequest('POST', '/admin/event', {
        nombre: data.name, descripcion: data.description,
        fecha_inicio: data.start, fecha_fin: data.end, premio: data.prize
      });
      return mapEvent(d);
    },
    async updateEvent(eventId, data) {
      var d = await apiRequest('PATCH', '/admin/events/' + eventId, data);
      return mapEvent(d);
    },
    async addBadge(eventId, data) {
      var d = await apiRequest('POST', '/admin/events/' + eventId + '/badge', {
        nombre: data.name, descripcion: data.desc, icon: data.emoji || '🏅'
      });
      return { id: d.id, emoji: d.icon || '🏅', name: d.nombre, desc: d.descripcion,
        token: d.token, redeemUrl: null, redeemed: 0, qrImage: d.qr_image || null };
    },
    async listAdminBadges(eventId) {
      var d = await apiRequest('GET', '/admin/events/' + eventId + '/badges');
      return {
        event: { id: d.evento.id, name: d.evento.nombre, totalParticipants: undefined, access_qr: d.evento.access_qr || null, photo: d.evento.photo || null },
        badges: (d.badges || []).map(function (b) {
          return { id: b.id, emoji: b.icon || '🏅', name: b.nombre, desc: b.descripcion,
            token: b.token, redeemUrl: b.redeem_url || (APP_BASE + 'redeem.html?event=' + d.evento.id + '&token=' + b.token),
            redeemed: b.canjeados || 0, qrImage: b.qr_image || null };
        })
      };
    },
    async generateEventAccessQr(eventId) {
      return await apiRequest('POST', '/admin/events/' + eventId + '/access-qr');
    },
    async updateEventPhoto(eventId, base64) {
      return await apiRequest('POST', '/admin/events/' + eventId + '/photo', { photo: base64 });
    },
    async joinEvent(eventId, coords) {
      var body = coords ? { lat: coords.lat, lng: coords.lng } : {};
      return await apiRequest('POST', '/events/' + eventId + '/join', body);
    },
    async updateEventCoordinates(eventId, lat, lng) {
      return await apiRequest('POST', '/admin/events/' + eventId + '/coordinates', { lat: lat, lng: lng });
    },
    async getJoinedEvents() {
      return (await apiRequest('GET', '/events/joined')).map(mapEvent);
    },
    async updateEventLocation(eventId, location) {
      return await apiRequest('POST', '/admin/events/' + eventId + '/location', { location: location });
    },
    async updateInterests(interests) {
      return await apiRequest('POST', '/auth/interests', { interests: interests });
    },
    async getRecommended() {
      return (await apiRequest('GET', '/events/recommended')).map(mapEvent);
    },
    async updateEventTags(eventId, tags) {
      return await apiRequest('POST', '/admin/events/' + eventId + '/tags', { tags: tags });
    },
    async deleteBadge(eventId, badgeId) {
      return await apiRequest('DELETE', '/admin/events/' + eventId + '/badges/' + badgeId);
    },
    async deleteEvent(eventId) {
      return await apiRequest('DELETE', '/admin/events/' + eventId);
    },
    async getDashboard() {
      return await apiRequest('GET', '/admin/dashboard');
    },
    async getUsers() {
      return await apiRequest('GET', '/admin/users');
    },
    async changeUserRole(userId, rol) {
      return await apiRequest('PATCH', '/admin/users/' + userId + '/role', { rol: rol });
    },
    async regenerateBadgeQr(badgeId) {
      var d = await apiRequest('POST', '/admin/badges/' + badgeId + '/regenerate-qr');
      return { id: d.id, emoji: d.icon || '🏅', name: d.nombre, desc: d.descripcion,
        token: d.token, redeemUrl: d.redeem_url, redeemed: d.canjeados || 0, qrImage: d.qr_image || null };
    },
    async changePassword(currentPw, newPw) {
      return await apiRequest('POST', '/auth/change-password', {
        current_password: currentPw,
        new_password: newPw
      });
    },
    async getProfile() {
      return await apiRequest('GET', '/auth/profile');
    },
    async updateName(name) {
      return await apiRequest('POST', '/auth/profile/name', { name: name });
    },
    async updateEmail(email) {
      return await apiRequest('POST', '/auth/profile/email', { email: email });
    },
    async updatePrivacy(settings) {
      return await apiRequest('POST', '/auth/profile/privacy', settings);
    },
    async deleteAccount() {
      return await apiRequest('DELETE', '/auth/profile');
    },
    async updateAvatar(base64) {
      return await apiRequest('POST', '/auth/profile/avatar', { avatar: base64 });
    },
    async getEventStats(eventId) {
      return await apiRequest('GET', '/admin/events/' + eventId + '/stats');
    },
    async getLeaderboard() {
      return await apiRequest('GET', '/leaderboard');
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
  async function loginWithGoogle(googleUser) {
    var r = await impl._loginWithGoogle(googleUser);
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
    loginWithGoogle: loginWithGoogle,
    logout: logout,
    listEvents:       impl.listEvents.bind(impl),
    listAdminEvents:  impl.listAdminEvents.bind(impl),
    getEventDetail:   impl.getEventDetail.bind(impl),
    redeem:           impl.redeem.bind(impl),
    createEvent:      impl.createEvent.bind(impl),
    updateEvent:      impl.updateEvent.bind(impl),
    addBadge:         impl.addBadge.bind(impl),
    listAdminBadges:  impl.listAdminBadges.bind(impl),
    deleteBadge:      impl.deleteBadge.bind(impl),
    deleteEvent:      impl.deleteEvent.bind(impl),
    getDashboard:     impl.getDashboard.bind(impl),
    getUsers:         impl.getUsers.bind(impl),
    changeUserRole:   impl.changeUserRole.bind(impl),
    regenerateBadgeQr: impl.regenerateBadgeQr.bind(impl),
    changePassword:   impl.changePassword.bind(impl),
    getProfile:       impl.getProfile.bind(impl),
    updateName:       impl.updateName.bind(impl),
    updateEmail:      impl.updateEmail.bind(impl),
    updatePrivacy:    impl.updatePrivacy.bind(impl),
    deleteAccount:    impl.deleteAccount.bind(impl),
    updateAvatar:     impl.updateAvatar.bind(impl),
    getEventStats:          impl.getEventStats.bind(impl),
    getLeaderboard:         impl.getLeaderboard.bind(impl),
    generateEventAccessQr:  impl.generateEventAccessQr.bind(impl),
    updateEventPhoto:       impl.updateEventPhoto.bind(impl),
    joinEvent:              impl.joinEvent.bind(impl),
    getJoinedEvents:      impl.getJoinedEvents.bind(impl),
    updateEventLocation:      impl.updateEventLocation.bind(impl),
    updateEventCoordinates:   impl.updateEventCoordinates.bind(impl),
    updateInterests:  impl.updateInterests.bind(impl),
    getRecommended:   impl.getRecommended.bind(impl),
    updateEventTags:  impl.updateEventTags.bind(impl),
    resetDemo:              impl.resetDemo.bind(impl)
  };
})();
