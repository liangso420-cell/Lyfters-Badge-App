/* ============================================================
   Pato Tutorial — Lyfter Badge App mascot onboarding guide
   Self-contained: no external deps, pure CSS animations,
   localStorage state, mobile-first responsive.
   ============================================================ */
(function () {
  'use strict';

  /* ── State keys ──────────────────────────────────────────── */
  var KEY_DONE = 'lyfter_pato_done';
  var pageName = (window.location.pathname.split('/').pop() || 'landing.html').replace('.html', '') || 'landing';
  var KEY_PAGE = 'lyfter_pato_' + pageName;

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
    pato1: base + 'pato/pato1.webp',   /* front-facing, confident — explaining */
    pato2: base + 'pato/pato2.webp',   /* walking, side — excited / arriving   */
    pato3: base + 'pato/pato3.png'     /* side glance — casual / follow me     */
  };

  /* ── Steps per page ──────────────────────────────────────── */
  var ALL_STEPS = {
    landing: [
      {
        duck: 'pato2', pos: 'br', anim: 'bounce',
        text: '¡Hola! Soy <strong>Pato</strong>, tu guía en Lyfter 🦆<br>Te explico todo en segundos.'
      },
      {
        duck: 'pato1', pos: 'bl', anim: 'float',
        text: 'Lyfter es una plataforma de <strong>gamificación para eventos</strong>. Asistís, escaneás QRs y coleccionás <strong>badges digitales</strong>.'
      },
      {
        duck: 'pato3', pos: 'br', anim: 'float',
        text: 'Al completar todos los badges de un evento ¡desbloqueás un <strong>premio sorpresa</strong>! 🎁'
      },
      {
        duck: 'pato1', pos: 'bc', anim: 'celebrate',
        text: '¿Listo para empezar? ¡Creá tu cuenta gratis y sumate al juego! 🚀'
      }
    ],
    profile: [
      {
        duck: 'pato2', pos: 'br', anim: 'bounce',
        text: '¡Bienvenido a tu panel! Acá ves todos los <strong>eventos disponibles</strong> en los que podés participar.'
      },
      {
        duck: 'pato1', pos: 'bl', anim: 'float',
        text: 'Tocá cualquier evento para ver sus badges y unirte. Los marcados con ✨ son <strong>recomendados para vos</strong>.'
      },
      {
        duck: 'pato3', pos: 'bc', anim: 'hop',
        text: '☝️ La barra de arriba tiene todas las secciones: <strong>Eventos, Escanear, Logros y Ranking</strong>. ¡Explorá!'
      },
      {
        duck: 'pato1', pos: 'br', anim: 'celebrate',
        text: '¡Todo listo! Tocá en Pato en cualquier momento si querés volver a ver este tour. 🦆'
      }
    ],
    'user-events': [
      {
        duck: 'pato3', pos: 'br', anim: 'bounce',
        text: 'Acá están los eventos en los que <strong>ya participás</strong>. Ves tu progreso de badges en cada uno.'
      },
      {
        duck: 'pato2', pos: 'bl', anim: 'float',
        text: 'Completá todos los badges de un evento para desbloquear el <strong>premio sorpresa</strong>. ¡No te quedes sin terminar ninguno! 🏆'
      }
    ],
    scan: [
      {
        duck: 'pato2', pos: 'bl', anim: 'bounce',
        text: '¡Esta es mi parte favorita! 📸 Apuntá la cámara al <strong>código QR</strong> de cualquier badge para escanearlo.'
      },
      {
        duck: 'pato1', pos: 'br', anim: 'float',
        text: 'Cada badge tiene un QR único. Escaneá todos los de un evento para completar la colección y <strong>ganar el premio</strong>. ¡A cazar badges!'
      }
    ],
    'user-achievements': [
      {
        duck: 'pato1', pos: 'br', anim: 'bounce',
        text: 'Los <strong>Logros</strong> son medallas especiales que ganás al cumplir objetivos dentro de Lyfter.'
      },
      {
        duck: 'pato2', pos: 'bl', anim: 'float',
        text: 'Hay <strong>4 rarezas</strong>: Común ⚪, Raro 🟢, Épico 🟣 y Legendario 🟡. ¡Los más difíciles dan más XP!'
      },
      {
        duck: 'pato3', pos: 'br', anim: 'celebrate',
        text: 'Los logros bloqueados muestran una <strong>pista</strong> para obtenerlos. ¡Completá todos para ser un maestro Lyfter! 🌟'
      }
    ],
    'user-ranking': [
      {
        duck: 'pato1', pos: 'br', anim: 'bounce',
        text: 'El ranking muestra quién acumula más <strong>XP</strong>. ¡Escaneá badges y desbloqueá logros para subir posiciones!'
      },
      {
        duck: 'pato2', pos: 'bl', anim: 'float',
        text: 'Cada badge y logro te da XP. ¡Apuntá al podio y mostrá de qué estás hecho! 🏆'
      },
      {
        duck: 'pato1', pos: 'bc', anim: 'celebrate',
        text: '¡Completaste el tour con Pato! Ya sabés todo sobre Lyfter. ¡Buena suerte y a coleccionar! 🦆✨'
      }
    ]
  };

  var steps = ALL_STEPS[pageName];
  if (!steps || !steps.length) return;

  var stepIdx = 0;
  var total   = steps.length;

  /* ── Inject CSS ──────────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    /* Container — opacity-only transition avoids conflict with translateX(-50%) on pos-bc */
    '#pato-wrap{position:fixed;z-index:9990;display:flex;flex-direction:column;',
    'align-items:center;pointer-events:none;',
    'transition:opacity .22s ease;}',

    /* Positions */
    '#pato-wrap.pos-br{bottom:24px;right:24px;left:auto;top:auto;align-items:flex-end;}',
    '#pato-wrap.pos-bl{bottom:24px;left:24px;right:auto;top:auto;align-items:flex-start;}',
    '#pato-wrap.pos-bc{bottom:24px;left:50%;transform:translateX(-50%);right:auto;top:auto;align-items:center;}',
    '#pato-wrap.pos-tr{top:80px;right:24px;bottom:auto;left:auto;align-items:flex-end;}',

    /* Speech bubble */
    '#pato-bubble{position:relative;background:#1e2130;',
    'border:1px solid rgba(216,151,231,.35);border-radius:18px;',
    'padding:14px 16px 12px;max-width:280px;min-width:190px;margin-bottom:10px;',
    'box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 0 1px rgba(216,151,231,.08);',
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
    '#pato-x{position:absolute;top:8px;right:10px;background:none;border:none;color:#6f7686;',
    'font-size:14px;line-height:1;padding:2px;cursor:pointer;pointer-events:all;',
    'transition:color .15s;}',
    '#pato-x:hover{color:#e68a8d;}',

    /* Body text */
    '#pato-txt{font-family:Manrope,sans-serif;font-size:13px;line-height:1.65;',
    'color:#cdd2db;margin:0 20px 10px 0;}',
    '#pato-txt strong{color:#d897e7;font-weight:700;}',
    '#pato-txt br{line-height:2;}',

    /* Step dots */
    '#pato-dots{display:flex;gap:5px;align-items:center;margin-bottom:10px;}',
    '.pato-dot{width:6px;height:6px;border-radius:50%;background:#2f343f;',
    'transition:background .2s,transform .2s;}',
    '.pato-dot.on{background:#d897e7;transform:scale(1.4);}',
    '.pato-dot.was{background:#6f7686;}',

    /* Controls row */
    '#pato-ctrls{display:flex;justify-content:space-between;align-items:center;}',
    '#pato-skip{background:none;border:none;font-family:Manrope,sans-serif;font-size:11px;',
    'color:#6f7686;cursor:pointer;pointer-events:all;padding:0;transition:color .15s;}',
    '#pato-skip:hover{color:#e68a8d;}',
    '#pato-next{height:30px;padding:0 14px;',
    'background:linear-gradient(135deg,#d897e7,#e68a8d);border:none;border-radius:999px;',
    'font-family:Poppins,sans-serif;font-size:12px;font-weight:700;color:#3a1f20;',
    'cursor:pointer;pointer-events:all;',
    'transition:opacity .15s,transform .1s,box-shadow .15s;',
    'box-shadow:0 2px 10px rgba(230,138,141,.3);}',
    '#pato-next:hover{opacity:.92;transform:translateY(-1px);',
    'box-shadow:0 4px 16px rgba(230,138,141,.45);}',

    /* Duck image */
    '#pato-img{width:110px;height:auto;display:block;',
    'filter:drop-shadow(0 6px 22px rgba(0,0,0,.55));',
    'pointer-events:all;cursor:pointer;',
    'transition:opacity .28s ease,filter .28s ease;',
    'transform-origin:bottom center;}',
    '#pato-img:hover{',
    'filter:drop-shadow(0 6px 22px rgba(0,0,0,.55)) drop-shadow(0 0 14px rgba(216,151,231,.55));',
    '}',

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
    '0%,100%{filter:drop-shadow(0 6px 22px rgba(0,0,0,.55)) drop-shadow(0 0 0px rgba(216,151,231,0))}',
    '50%{filter:drop-shadow(0 6px 22px rgba(0,0,0,.55)) drop-shadow(0 0 18px rgba(216,151,231,.6))}}',

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
    '#pato-bubble{max-width:calc(100vw - 44px);min-width:220px;}',
    '#pato-img{width:82px;}',
    /* Re-center tails on mobile */
    '#pato-wrap.pos-br #pato-bubble::after,',
    '#pato-wrap.pos-bl #pato-bubble::after,',
    '#pato-wrap.pos-tr #pato-bubble::after',
    '{left:50%;right:auto;transform:translateX(-50%);}',
    '#pato-wrap.pos-br #pato-bubble::before,',
    '#pato-wrap.pos-bl #pato-bubble::before,',
    '#pato-wrap.pos-tr #pato-bubble::before',
    '{left:50%;right:auto;transform:translateX(-50%);}',
    '}'
  ].join('');
  document.head.appendChild(styleEl);

  /* ── Build DOM ───────────────────────────────────────────── */
  var wrap    = document.createElement('div');    wrap.id = 'pato-wrap';
  var bubble  = document.createElement('div');    bubble.id = 'pato-bubble';
  var xBtn    = document.createElement('button'); xBtn.id = 'pato-x'; xBtn.textContent = '✕';
  xBtn.setAttribute('aria-label', 'Cerrar tutorial');
  var txtEl   = document.createElement('p');      txtEl.id = 'pato-txt';
  var dotsEl  = document.createElement('div');    dotsEl.id = 'pato-dots';
  var ctrls   = document.createElement('div');    ctrls.id = 'pato-ctrls';
  var skipBtn = document.createElement('button'); skipBtn.id = 'pato-skip'; skipBtn.textContent = 'Saltar tour';
  var nextBtn = document.createElement('button'); nextBtn.id = 'pato-next';
  var imgEl   = document.createElement('img');    imgEl.id = 'pato-img'; imgEl.alt = 'Pato — guía Lyfter';

  ctrls.appendChild(skipBtn);
  ctrls.appendChild(nextBtn);
  bubble.appendChild(xBtn);
  bubble.appendChild(txtEl);
  bubble.appendChild(dotsEl);
  bubble.appendChild(ctrls);
  wrap.appendChild(bubble);
  wrap.appendChild(imgEl);

  /* ── Apply a step ────────────────────────────────────────── */
  function applyStep(idx) {
    var s      = steps[idx];
    var isLast = (idx === total - 1);

    /* Position class */
    wrap.className = 'pos-' + s.pos;

    /* Duck image — crossfade via opacity */
    imgEl.style.opacity = '0';
    imgEl.className     = '';
    imgEl.src           = IMGS[s.duck];
    void imgEl.offsetWidth; /* force reflow so animation re-triggers */

    var shown = false;
    function showDuck() {
      if (shown) return;            /* idempotent — only the first caller wins */
      shown = true;
      imgEl.style.opacity = '1';
      imgEl.className = 'pato-' + s.anim;
    }
    if (imgEl.complete && imgEl.naturalWidth) {
      showDuck();
    } else {
      imgEl.onload  = showDuck;
      imgEl.onerror = showDuck;     /* asset missing/slow → still reveal the box */
      /* Safety net: never leave the duck invisible if neither event fires. */
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
      /* Finished all steps on this page */
      try { localStorage.setItem(KEY_PAGE, '1'); } catch (e) {}
      destroy();
    }
  }

  function skipAll() {
    try { localStorage.setItem(KEY_DONE, '1'); } catch (e) {}
    destroy();
  }

  function destroy() {
    nextBtn.removeEventListener('click', onNext);
    skipBtn.removeEventListener('click', onSkip);
    xBtn.removeEventListener('click',    onSkip);
    imgEl.removeEventListener('click',   onDuckClick);
    wrap.style.opacity = '0';
    setTimeout(function () {
      if (wrap.parentNode)    wrap.parentNode.removeChild(wrap);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    }, 280);
  }

  /* ── Event handlers (named so destroy() can remove them) ─── */
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

  /* ── Preload all duck images ─────────────────────────────── */
  ['pato/pato1.webp', 'pato/pato2.webp', 'pato/pato3.png'].forEach(function (f) {
    var p = new Image();
    p.src = base + f;
  });

  /* ── Mount after page is fully loaded ───────────────────── */
  /* Delay 650ms after window.load so the loading-screen 0.4s
     fade-out finishes before Pato appears.                   */
  function mount() {
    applyStep(0);
    document.body.appendChild(wrap);
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
