/* ============================================================
   Pato Tutorial — Lyfter Badge App mascot onboarding guide
   Self-contained: no external deps, pure CSS animations,
   localStorage state, mobile-first responsive.
   ============================================================ */
(function () {
  'use strict';

  /* ── State keys ──────────────────────────────────────────── */
  var KEY_DONE   = 'lyfter_pato_done';
  var pageName   = (window.location.pathname.split('/').pop() || 'landing.html').replace('.html', '') || 'landing';
  var KEY_PAGE   = 'lyfter_pato_' + pageName;
  var FINAL_PAGE = 'user-ranking';

  /* ── Bail early (zero cost if already seen) ──────────────── */
  try {
    if (localStorage.getItem(KEY_DONE) === '1') return;
    if (localStorage.getItem(KEY_PAGE) === '1') return;
  } catch (e) {}

  /* ── Asset base path ─────────────────────────────────────── */
  var base = '';
  try {
    var selfEl = document.querySelector('script[src*="pato-tutorial"]');
    if (selfEl) base = selfEl.getAttribute('src').replace('js/pato-tutorial.js', '');
  } catch (e) {}

  var IMGS = {
    pato1: base + 'pato/pato1.webp',
    pato2: base + 'pato/pato2.webp',
    pato3: base + 'pato/pato3.png'
  };

  /* ── Steps per page — target: CSS selector to spotlight ─── */
  var ALL_STEPS = {
    landing: [
      {
        duck: 'pato2', pos: 'br', anim: 'bounce',
        target: null,
        text: '¡Hola! Soy <strong>Pato</strong>, tu guía en Lyfter 🦆<br>Te explico todo en segundos.'
      },
      {
        duck: 'pato1', pos: 'bl', anim: 'float',
        target: '#como-funciona',
        text: 'Lyfter es una plataforma de <strong>gamificación para eventos</strong>. Asistís, escaneás QRs y coleccionás <strong>badges digitales</strong>.'
      },
      {
        duck: 'pato3', pos: 'br', anim: 'float',
        target: '.stat-item:nth-child(3)',
        text: 'Al completar todos los badges de un evento ¡desbloqueás un <strong>premio sorpresa</strong>! 🎁'
      },
      {
        duck: 'pato1', pos: 'br', anim: 'celebrate',
        target: '#hero-actions',
        text: '¿Listo para empezar? ¡Creá tu cuenta gratis y sumate al juego! 🚀'
      }
    ],
    profile: [
      {
        duck: 'pato2', pos: 'br', anim: 'bounce',
        target: '#all-events-grid',
        text: '¡Bienvenido a tu panel! Acá ves todos los <strong>eventos disponibles</strong> en los que podés participar.'
      },
      {
        duck: 'pato1', pos: 'bl', anim: 'float',
        target: '.event-card',
        text: 'Tocá cualquier evento para ver sus badges y unirte. Los marcados con ✨ son <strong>recomendados para vos</strong>.'
      },
      {
        duck: 'pato3', pos: 'bl', anim: 'hop',
        target: '.lyfter-bottom-nav',
        text: '👇 La barra inferior tiene todas las secciones: <strong>Inicio, Explorar, Escanear, Eventos y Perfil</strong>. ¡Explorá la app!'
      },
      {
        duck: 'pato1', pos: 'br', anim: 'celebrate',
        target: null,
        text: '¡Ya sabés todo lo básico! Ahora explorá, escaneá badges y subí al ranking. ¡Pato confía en vos! 🦆🚀'
      }
    ],
    'user-events': [
      {
        duck: 'pato3', pos: 'br', anim: 'bounce',
        target: '#app',
        text: 'Acá están los eventos en los que <strong>ya participás</strong>. Ves tu progreso de badges en cada uno.'
      },
      {
        duck: 'pato2', pos: 'bl', anim: 'float',
        target: null,
        text: 'Completá todos los badges de un evento para desbloquear el <strong>premio sorpresa</strong>. ¡No te quedes sin terminar ninguno! 🏆'
      }
    ],
    scan: [
      {
        duck: 'pato2', pos: 'bl', anim: 'bounce',
        target: '#scan-video',
        text: '¡Esta es mi parte favorita! 📸 Apuntá la cámara al <strong>código QR</strong> de cualquier badge para escanearlo.'
      },
      {
        duck: 'pato1', pos: 'br', anim: 'float',
        target: null,
        text: 'Cada badge tiene un QR único. Escaneá todos los de un evento para completar la colección y <strong>ganar el premio</strong>. ¡A cazar badges!'
      }
    ],
    'user-achievements': [
      {
        duck: 'pato1', pos: 'br', anim: 'bounce',
        target: '#app',
        text: 'Los <strong>Logros</strong> son medallas especiales que ganás al cumplir objetivos dentro de Lyfter.'
      },
      {
        duck: 'pato2', pos: 'bl', anim: 'float',
        target: null,
        text: 'Hay <strong>4 rarezas</strong>: Común ⚪, Raro 🟢, Épico 🟣 y Legendario 🟡. ¡Los más difíciles dan más XP!'
      },
      {
        duck: 'pato3', pos: 'br', anim: 'celebrate',
        target: null,
        text: 'Los logros bloqueados muestran una <strong>pista</strong> para obtenerlos. ¡Completá todos para ser un maestro Lyfter! 🌟'
      }
    ],
    'user-ranking': [
      {
        duck: 'pato1', pos: 'br', anim: 'bounce',
        target: '#panel-leaderboard',
        text: 'El ranking muestra quién acumula más <strong>XP</strong>. ¡Escaneá badges y desbloqueá logros para subir posiciones!'
      },
      {
        duck: 'pato2', pos: 'bl', anim: 'float',
        target: '#tab-leaderboard',
        text: 'Cada badge y logro te da XP. ¡Apuntá al podio y mostrá de qué estás hecho! 🏆'
      },
      {
        duck: 'pato1', pos: 'br', anim: 'celebrate',
        target: null,
        text: '¡Completaste el tour con Pato! Ya sabés todo sobre Lyfter. ¡Buena suerte y a coleccionar! 🦆✨'
      }
    ]
  };

  var steps = ALL_STEPS[pageName];
  if (!steps || !steps.length) return;

  var stepIdx = 0;
  var total   = steps.length;
  var spotRetryTimer = null;

  /* ── Inject CSS ──────────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    /* ── Dark overlay ──────────────────────────────────────── */
    '#pato-overlay{',
    'position:fixed;inset:0;',
    'background:rgba(0,0,0,.54);',
    'z-index:9985;',
    'pointer-events:all;',
    'transition:opacity .35s ease;',
    '}',

    /* ── Spotlight ring (transparent box with glowing border) ── */
    '#pato-spot{',
    'position:fixed;',
    'z-index:9986;',
    'pointer-events:none;',
    'border-radius:14px;',
    'opacity:0;',
    'transition:opacity .3s ease, top .35s cubic-bezier(.34,1.56,.64,1),',
    '           left .35s cubic-bezier(.34,1.56,.64,1),',
    '           width .35s cubic-bezier(.34,1.56,.64,1),',
    '           height .35s cubic-bezier(.34,1.56,.64,1);',
    '}',
    '#pato-spot.visible{',
    'opacity:1;',
    'animation:pato-spot-pulse 2.2s ease-in-out infinite;',
    '}',

    '@keyframes pato-spot-pulse{',
    '0%,100%{box-shadow:',
    '  0 0 0 9999px rgba(0,0,0,.54),',
    '  0 0 0 2.5px rgba(216,151,231,.9),',
    '  0 0 0 5px rgba(216,151,231,.2),',
    '  0 0 28px rgba(216,151,231,.55);}',
    '50%{box-shadow:',
    '  0 0 0 9999px rgba(0,0,0,.54),',
    '  0 0 0 2.5px rgba(216,151,231,1),',
    '  0 0 0 8px rgba(216,151,231,.28),',
    '  0 0 48px rgba(216,151,231,.8);}}',

    /* ── Container — opacity-only transition ─────────────────── */
    '#pato-wrap{position:fixed;z-index:9995;display:flex;flex-direction:column;',
    'align-items:center;pointer-events:none;',
    'transition:opacity .22s ease;}',

    /* Positions */
    '#pato-wrap.pos-br{bottom:24px;right:24px;left:auto;top:auto;align-items:flex-end;}',
    '#pato-wrap.pos-bl{bottom:24px;left:24px;right:auto;top:auto;align-items:flex-start;}',
    '#pato-wrap.pos-bc{bottom:24px;left:50%;transform:translateX(-50%);right:auto;top:auto;align-items:center;}',
    '#pato-wrap.pos-tr{top:80px;right:24px;bottom:auto;left:auto;align-items:flex-end;}',

    /* Speech bubble */
    '#pato-bubble{position:relative;background:#1e2130;',
    'border:1px solid rgba(216,151,231,.35);border-radius:24px;',
    'padding:26px 30px 22px;max-width:480px;min-width:290px;margin-bottom:20px;',
    'box-shadow:0 8px 32px rgba(0,0,0,.55),0 0 0 1px rgba(216,151,231,.1),',
    '           0 0 60px rgba(216,151,231,.08);',
    'pointer-events:all;',
    'animation:pato-bubble-in .38s cubic-bezier(.34,1.56,.64,1) both;}',

    /* Bubble tail — default centered */
    '#pato-bubble::after{content:\'\';position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);',
    'border:8px solid transparent;border-top-color:rgba(216,151,231,.3);border-bottom:none;}',
    '#pato-bubble::before{content:\'\';position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);z-index:1;',
    'border:7px solid transparent;border-top-color:#1e2130;border-bottom:none;}',

    /* Tail right-align for br / tr */
    '#pato-wrap.pos-br #pato-bubble::after,#pato-wrap.pos-tr #pato-bubble::after',
    '{left:auto;right:20px;transform:none;}',
    '#pato-wrap.pos-br #pato-bubble::before,#pato-wrap.pos-tr #pato-bubble::before',
    '{left:auto;right:21px;transform:none;}',

    /* Tail left-align for bl */
    '#pato-wrap.pos-bl #pato-bubble::after{left:20px;transform:none;}',
    '#pato-wrap.pos-bl #pato-bubble::before{left:21px;transform:none;}',

    /* Close (X) button */
    '#pato-x{position:absolute;top:10px;right:14px;background:none;border:none;color:#6f7686;',
    'font-size:19px;line-height:1;padding:2px;cursor:pointer;pointer-events:all;',
    'transition:color .15s;}',
    '#pato-x:hover{color:#e68a8d;}',

    /* Body text */
    '#pato-txt{font-family:Manrope,sans-serif;font-size:20px;line-height:1.65;',
    'color:#cdd2db;margin:0 28px 14px 0;}',
    '#pato-txt strong{color:#d897e7;font-weight:700;}',
    '#pato-txt br{line-height:2;}',

    /* Step dots */
    '#pato-dots{display:flex;gap:7px;align-items:center;margin-bottom:14px;}',
    '.pato-dot{width:9px;height:9px;border-radius:50%;background:#2f343f;',
    'transition:background .2s,transform .2s;}',
    '.pato-dot.on{background:#d897e7;transform:scale(1.4);}',
    '.pato-dot.was{background:#6f7686;}',

    /* Controls row */
    '#pato-ctrls{display:flex;justify-content:space-between;align-items:center;}',
    '#pato-skip{background:none;border:none;font-family:Manrope,sans-serif;font-size:15px;',
    'color:#6f7686;cursor:pointer;pointer-events:all;padding:0;transition:color .15s;}',
    '#pato-skip:hover{color:#e68a8d;}',
    '#pato-next{height:46px;padding:0 22px;',
    'background:linear-gradient(135deg,#d897e7,#e68a8d);border:none;border-radius:999px;',
    'font-family:Poppins,sans-serif;font-size:16px;font-weight:700;color:#3a1f20;',
    'cursor:pointer;pointer-events:all;',
    'transition:opacity .15s,transform .1s,box-shadow .15s;',
    'box-shadow:0 2px 12px rgba(230,138,141,.35);}',
    '#pato-next:hover{opacity:.92;transform:translateY(-1px);',
    'box-shadow:0 4px 18px rgba(230,138,141,.5);}',

    /* Duck image */
    '#pato-img{width:344px;height:auto;display:block;',
    'filter:drop-shadow(0 8px 28px rgba(0,0,0,.65)) drop-shadow(0 0 2px rgba(216,151,231,.2));',
    'pointer-events:all;cursor:pointer;',
    'transition:opacity .28s ease,filter .28s ease;',
    'transform-origin:bottom center;}',
    '#pato-img:hover{',
    'filter:drop-shadow(0 8px 28px rgba(0,0,0,.65)) drop-shadow(0 0 18px rgba(216,151,231,.6));',
    '}',

    /* Wrapper que controla el flip sin interferir con las animaciones del img */
    '#pato-img-wrap{display:block;transition:transform .22s ease;transform-origin:bottom center;}',

    /* ── Keyframe animations ────────────────────────────────── */
    '@keyframes pato-bubble-in{',
    'from{opacity:0;transform:scale(.68) translateY(10px)}',
    'to{opacity:1;transform:scale(1) translateY(0)}}',

    '@keyframes pato-float{',
    '0%,100%{transform:translateY(0) rotate(0deg)}',
    '30%{transform:translateY(-9px) rotate(-1.5deg)}',
    '70%{transform:translateY(-6px) rotate(1deg)}}',

    '@keyframes pato-bounce-in{',
    '0%{transform:translateY(120px) scale(.45);opacity:0}',
    '55%{transform:translateY(-14px) scale(1.08);opacity:1}',
    '75%{transform:translateY(5px) scale(.96)}',
    '88%{transform:translateY(-5px) scale(1.03)}',
    '100%{transform:translateY(0) scale(1);opacity:1}}',

    '@keyframes pato-hop{',
    '0%,100%{transform:translateY(0) rotate(0)}',
    '20%{transform:translateY(-18px) rotate(-6deg)}',
    '45%{transform:translateY(-26px) rotate(0)}',
    '70%{transform:translateY(-14px) rotate(6deg)}}',

    '@keyframes pato-celebrate{',
    '0%,100%{transform:scale(1) rotate(0)}',
    '12%{transform:scale(1.16) rotate(-8deg)}',
    '28%{transform:scale(1.1) rotate(8deg)}',
    '44%{transform:scale(1.2) rotate(-5deg)}',
    '60%{transform:scale(1.07) rotate(5deg)}',
    '76%{transform:scale(1.13) rotate(-3deg)}}',

    '@keyframes pato-walk{',
    '0%,100%{transform:translateX(0) rotate(0)}',
    '25%{transform:translateX(5px) rotate(2.5deg)}',
    '75%{transform:translateX(-5px) rotate(-2.5deg)}}',

    '@keyframes pato-pulse-glow{',
    '0%,100%{filter:drop-shadow(0 8px 28px rgba(0,0,0,.65)) drop-shadow(0 0 0px rgba(216,151,231,0))}',
    '50%{filter:drop-shadow(0 8px 28px rgba(0,0,0,.65)) drop-shadow(0 0 22px rgba(216,151,231,.7))}}',

    /* ── Animation classes ──────────────────────────────────── */
    '#pato-img.pato-float    {animation:pato-float     3.2s ease-in-out infinite;}',
    '#pato-img.pato-bounce   {animation:pato-bounce-in  .8s cubic-bezier(.34,1.56,.64,1) both;}',
    '#pato-img.pato-hop      {animation:pato-hop         .7s ease-in-out 3;}',
    '#pato-img.pato-celebrate{animation:pato-celebrate  1.3s ease-in-out 2,',
    '                          pato-pulse-glow 1.3s ease-in-out 2;}',
    '#pato-img.pato-walk     {animation:pato-walk        .6s ease-in-out infinite;}',

    /* ── Mobile ─────────────────────────────────────────────── */
    '@media(max-width:639px){',
    '#pato-wrap.pos-br,#pato-wrap.pos-bl,#pato-wrap.pos-tr{',
    'left:50%;transform:translateX(-50%);right:auto;top:auto;bottom:20px;align-items:center;}',
    '#pato-wrap.pos-bc{left:50%;transform:translateX(-50%);}',
    '#pato-bubble{max-width:calc(100vw - 32px);min-width:240px;}',
    '#pato-img{width:256px;}',
    /* Re-center tails on mobile */
    '#pato-wrap.pos-br #pato-bubble::after,',
    '#pato-wrap.pos-bl #pato-bubble::after,',
    '#pato-wrap.pos-tr #pato-bubble::after',
    '{left:50%;right:auto;transform:translateX(-50%);}',
    '#pato-wrap.pos-br #pato-bubble::before,',
    '#pato-wrap.pos-bl #pato-bubble::before,',
    '#pato-wrap.pos-tr #pato-bubble::before',
    '{left:50%;right:auto;transform:translateX(-50%);}',
    '#pato-spot{display:none;}',  /* hide spotlight on small screens — layout too tight */
    '}'
  ].join('');
  document.head.appendChild(styleEl);

  /* ── Build DOM ───────────────────────────────────────────── */
  var overlayEl = document.createElement('div'); overlayEl.id = 'pato-overlay';
  var spotEl    = document.createElement('div'); spotEl.id    = 'pato-spot';
  var wrap      = document.createElement('div'); wrap.id      = 'pato-wrap';
  var bubble    = document.createElement('div'); bubble.id    = 'pato-bubble';
  var xBtn      = document.createElement('button'); xBtn.id   = 'pato-x'; xBtn.textContent = '✕';
  xBtn.setAttribute('aria-label', 'Cerrar tutorial');
  var txtEl     = document.createElement('p');      txtEl.id  = 'pato-txt';
  var dotsEl    = document.createElement('div');    dotsEl.id = 'pato-dots';
  var ctrls     = document.createElement('div');    ctrls.id  = 'pato-ctrls';
  var skipBtn   = document.createElement('button'); skipBtn.id = 'pato-skip'; skipBtn.textContent = 'Saltar tour';
  var nextBtn   = document.createElement('button'); nextBtn.id = 'pato-next';
  var imgEl     = document.createElement('img');    imgEl.id  = 'pato-img'; imgEl.alt = 'Pato — guía Lyfter';

  ctrls.appendChild(skipBtn);
  ctrls.appendChild(nextBtn);
  bubble.appendChild(xBtn);
  bubble.appendChild(txtEl);
  bubble.appendChild(dotsEl);
  bubble.appendChild(ctrls);
  wrap.appendChild(bubble);
  var imgWrap = document.createElement('div'); imgWrap.id = 'pato-img-wrap';
  imgWrap.appendChild(imgEl);
  wrap.appendChild(imgWrap);

  /* ── Duck quack sound ────────────────────────────────────── */
  function playQuack() {
    try {
      var audio = new Audio(base + 'pato/freesound_community-075176_duck-quack-40345.mp3');
      audio.volume = 0.45;
      var p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
  }

  /* ── Spotlight helpers ───────────────────────────────────── */
  function clearSpot() {
    if (spotRetryTimer) { clearTimeout(spotRetryTimer); spotRetryTimer = null; }
    spotEl.classList.remove('visible');
    overlayEl.style.opacity = '1';
  }

  function positionSpot(el) {
    var pad  = 10;
    var rect = el.getBoundingClientRect();
    /* don't show if element is off-screen or zero-sized */
    if (rect.width < 4 || rect.height < 4) return;
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    spotEl.style.left   = (rect.left   - pad) + 'px';
    spotEl.style.top    = (rect.top    - pad) + 'px';
    spotEl.style.width  = (rect.width  + pad * 2) + 'px';
    spotEl.style.height = (rect.height + pad * 2) + 'px';
    spotEl.classList.add('visible');
    overlayEl.style.opacity = '0';
  }

  function showSpot(selector, retries) {
    clearSpot();
    if (!selector) return;
    var el = document.querySelector(selector);
    if (el) {
      /* scroll into view if mostly off screen */
      var r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        setTimeout(function () { positionSpot(el); }, 450);
      } else {
        positionSpot(el);
      }
      return;
    }
    /* SPA pages render content asynchronously — retry */
    if (retries > 0) {
      spotRetryTimer = setTimeout(function () {
        showSpot(selector, retries - 1);
      }, 500);
    }
  }

  /* pato1 mira derecha, pato2/pato3 miran izquierda */
  var DUCK_FACES_RIGHT = { pato1: true, pato2: false, pato3: false };
  /* posiciones del lado derecho de pantalla */
  var POS_ON_RIGHT = { br: true, tr: true, bl: false, bc: false };

  /* ── Apply a step ────────────────────────────────────────── */
  function applyStep(idx) {
    var s      = steps[idx];
    var isLast = (idx === total - 1);

    /* Position class */
    wrap.className = 'pos-' + s.pos;

    /* Flip el wrapper según dirección natural del pato vs lado de pantalla */
    var facesRight = DUCK_FACES_RIGHT[s.duck];
    var onRight    = POS_ON_RIGHT[s.pos] || false;
    imgWrap.style.transform = (facesRight ? onRight : !onRight) ? 'scaleX(-1)' : '';

    /* Duck image — crossfade via opacity */
    imgEl.style.opacity = '0';
    imgEl.className     = '';
    imgEl.src           = IMGS[s.duck];
    void imgEl.offsetWidth;

    var shown = false;
    function showDuck() {
      if (shown) return;
      shown = true;
      imgEl.style.opacity = '1';
      imgEl.className = 'pato-' + s.anim;
    }
    if (imgEl.complete && imgEl.naturalWidth) {
      showDuck();
    } else {
      imgEl.onload  = showDuck;
      imgEl.onerror = showDuck;
      setTimeout(showDuck, 500);
    }

    /* Bubble text */
    txtEl.innerHTML = s.text;

    /* Dots */
    dotsEl.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var d = document.createElement('span');
      d.className = 'pato-dot' + (i === idx ? ' on' : i < idx ? ' was' : '');
      dotsEl.appendChild(d);
    }

    /* Next button label */
    nextBtn.textContent = isLast ? '¡Entendido! ✓' : 'Siguiente →';

    /* Re-trigger bubble entrance animation */
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = '';

    /* Spotlight — up to 5 retries × 500 ms = 2.5 s window for SPA renders */
    showSpot(s.target, 5);
  }

  /* ── Navigation ──────────────────────────────────────────── */
  function goNext() {
    if (stepIdx < total - 1) {
      wrap.style.opacity = '0';
      var nextIdx = stepIdx + 1;
      setTimeout(function () {
        stepIdx = nextIdx;
        applyStep(stepIdx);
        wrap.style.opacity = '1';
      }, 200);
    } else {
      try { localStorage.setItem(KEY_PAGE, '1'); } catch (e) {}
      if (pageName === FINAL_PAGE) {
        try { localStorage.setItem(KEY_DONE, '1'); } catch (e) {}
      }
      destroy();
    }
  }

  function skipAll() {
    try { localStorage.setItem(KEY_DONE, '1'); } catch (e) {}
    destroy();
  }

  function destroy() {
    clearSpot();
    nextBtn.removeEventListener('click', onNext);
    skipBtn.removeEventListener('click', onSkip);
    xBtn.removeEventListener('click',    onSkip);
    imgEl.removeEventListener('click',   onDuckClick);

    [wrap, overlayEl, spotEl].forEach(function (el) { el.style.opacity = '0'; });
    setTimeout(function () {
      [wrap, overlayEl, spotEl, styleEl].forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    }, 320);
  }

  /* ── Event handlers ──────────────────────────────────────── */
  function onNext(e)  { e.stopPropagation(); goNext();  }
  function onSkip(e)  { e.stopPropagation(); skipAll(); }
  function onDuckClick() {
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = 'pato-bubble-in .38s cubic-bezier(.34,1.56,.64,1) both';
    imgEl.className = '';
    void imgEl.offsetWidth;
    imgEl.className = 'pato-hop';
    var origAnim = 'pato-' + steps[stepIdx].anim;
    setTimeout(function () {
      if (imgEl.className === 'pato-hop') imgEl.className = origAnim;
    }, 2200);
  }

  nextBtn.addEventListener('click', onNext);
  skipBtn.addEventListener('click', onSkip);
  xBtn.addEventListener('click',    onSkip);
  imgEl.addEventListener('click',   onDuckClick);

  /* ── Preload duck images ─────────────────────────────────── */
  ['pato/pato1.webp', 'pato/pato2.webp', 'pato/pato3.png'].forEach(function (f) {
    var p = new Image(); p.src = base + f;
  });

  /* ── Mount after page is fully loaded ───────────────────── */
  function mount() {
    applyStep(0);
    document.body.appendChild(overlayEl);
    document.body.appendChild(spotEl);
    document.body.appendChild(wrap);
    playQuack();
  }

  function scheduleMount() {
    setTimeout(mount, 650);
  }

  if (document.readyState === 'complete') {
    scheduleMount();
  } else {
    window.addEventListener('load', scheduleMount);
  }

})();
