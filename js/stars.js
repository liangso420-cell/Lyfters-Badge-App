(function () {
  'use strict';

  // ── Aurora blob ──────────────────────────────────────────────────────────
  var aurora = document.createElement('div');
  aurora.style.cssText = [
    'position:fixed',
    'top:50%',
    'left:50%',
    'width:1000px',
    'height:800px',
    'margin-top:-400px',
    'margin-left:-500px',
    'border-radius:50%',
    'pointer-events:none',
    'z-index:0',
    'will-change:transform',
    'transition:transform 0.9s cubic-bezier(0.2,0.6,0.4,1)',
    'background:radial-gradient(ellipse at center,rgba(216,151,231,0.11) 0%,rgba(112,207,255,0.07) 40%,transparent 70%)',
    'filter:blur(40px)'
  ].join(';');
  document.body.insertBefore(aurora, document.body.firstChild);

  // ── Stars canvas ─────────────────────────────────────────────────────────
  var C = document.createElement('canvas');
  C.id = 'stars-bg';
  C.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none;';
  document.body.insertBefore(C, document.body.firstChild);

  var ctx = C.getContext('2d');
  var W, H;
  var mouse = { x: -9999, y: -9999, active: false };
  var COLORS = ['255,255,255', '216,151,231', '112,207,255', '171,209,148', '255,203,138'];
  var COUNT  = 180;
  var stars  = [];
  var bursts = [];
  var shoots = [];
  var t = 0;
  var nextShoot = 0;

  function resize() {
    W = C.width  = window.innerWidth;
    H = C.height = window.innerHeight;
  }

  function mkStar() {
    var c = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      ox: 0, oy: 0,
      r:  0.7 + Math.random() * 1.6,
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.32),
      vy: (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.22),
      twSpeed: 0.004 + Math.random() * 0.014,
      twPhase: Math.random() * Math.PI * 2,
      color: c
    };
  }

  function seed() {
    stars = [];
    for (var i = 0; i < COUNT; i++) stars.push(mkStar());
  }

  // ── Shooting star factory ─────────────────────────────────────────────────
  function spawnShoot() {
    var startX = Math.random() * W * 0.6;
    var startY = Math.random() * H * 0.3;
    var angle  = (Math.PI / 6) + Math.random() * (Math.PI / 6);
    var speed  = 8 + Math.random() * 7;
    shoots.push({
      x: startX, y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      len: 80 + Math.random() * 60
    });
    nextShoot = t + 240 + Math.floor(Math.random() * 420);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t++;

    // Shooting stars
    if (t >= nextShoot) spawnShoot();
    for (var si = shoots.length - 1; si >= 0; si--) {
      var sh = shoots[si];
      sh.x += sh.vx; sh.y += sh.vy; sh.life -= 0.018;
      if (sh.life <= 0) { shoots.splice(si, 1); continue; }
      var tailX = sh.x - sh.vx * (sh.len / Math.sqrt(sh.vx*sh.vx + sh.vy*sh.vy));
      var tailY = sh.y - sh.vy * (sh.len / Math.sqrt(sh.vx*sh.vx + sh.vy*sh.vy));
      var grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.6, 'rgba(216,151,231,' + (sh.life * 0.5) + ')');
      grad.addColorStop(1,   'rgba(255,255,255,' + (sh.life * 0.9) + ')');
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sh.x, sh.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = sh.life * 1.8;
      ctx.stroke();
    }

    // Constellation lines
    for (var a = 0; a < stars.length - 1; a++) {
      var sa = stars[a];
      for (var b = a + 1; b < stars.length; b++) {
        var sb = stars[b];
        var dx = sb.x - sa.x;
        if (Math.abs(dx) > 120) continue;
        var dy = sb.y - sa.y;
        var d2 = dx*dx + dy*dy;
        if (d2 > 14400) continue;
        var mx = (sa.x + sb.x) * 0.5;
        var my = (sa.y + sb.y) * 0.5;
        var mdx = mx - mouse.x;
        var mdy = my - mouse.y;
        var mDist = Math.sqrt(mdx*mdx + mdy*mdy);
        var boost = mDist < 200 ? (1 - mDist / 200) * 0.4 : 0;
        var alpha = (1 - Math.sqrt(d2) / 120) * (0.16 + boost);
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.strokeStyle = 'rgba(216,151,231,' + alpha + ')';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // Stars
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;

      // Mouse repulsion + grow
      var edx = s.x - mouse.x;
      var edy = s.y - mouse.y;
      var ed  = Math.sqrt(edx*edx + edy*edy);
      var proximity = 0;
      if (ed < 170 && ed > 0) {
        proximity = (170 - ed) / 170;
        var force = proximity * 0.9;
        s.ox += (edx / ed) * force;
        s.oy += (edy / ed) * force;
      }
      s.ox *= 0.88; s.oy *= 0.88;

      var drawX = s.x + s.ox;
      var drawY = s.y + s.oy;
      var twinkle = 0.5 + 0.5 * ((Math.sin(t * s.twSpeed + s.twPhase) + 1) * 0.5);
      var alpha   = twinkle + proximity * 0.45;
      var radius  = s.r + proximity * 2.2;

      if (proximity > 0.05) {
        ctx.shadowColor = 'rgba(' + s.color + ',0.85)';
        ctx.shadowBlur  = radius * 9;
      }
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle   = 'rgba(' + s.color + ',1)';
      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur  = 0;
    }
    ctx.globalAlpha = 1;

    // Click bursts
    for (var bi = bursts.length - 1; bi >= 0; bi--) {
      var bp = bursts[bi];
      bp.life -= 0.045;
      if (bp.life <= 0) { bursts.splice(bi, 1); continue; }
      bp.x += bp.vx; bp.y += bp.vy;
      bp.vx *= 0.93; bp.vy *= 0.93;
      var ba = bp.life * bp.life;
      ctx.globalAlpha = ba;
      ctx.fillStyle   = 'rgba(' + bp.color + ',1)';
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.r * bp.life + 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(draw);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function setMouse(x, y) {
    mouse.x = x; mouse.y = y; mouse.active = true;
    var cx = x - W * 0.5;
    var cy = y - H * 0.5;
    aurora.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
  }

  window.addEventListener('mousemove', function (e) { setMouse(e.clientX, e.clientY); });
  window.addEventListener('touchmove', function (e) {
    if (e.touches[0]) setMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('mouseleave', function () {
    mouse.x = -9999; mouse.y = -9999; mouse.active = false;
    aurora.style.transform = 'translate(0px,0px)';
  });
  window.addEventListener('touchend', function () {
    mouse.x = -9999; mouse.y = -9999;
  });

  window.addEventListener('click', function (e) {
    var cx = e.clientX, cy = e.clientY;
    for (var i = 0; i < 20; i++) {
      var angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      var speed = 1.5 + Math.random() * 3.5;
      var c = COLORS[Math.floor(Math.random() * COLORS.length)];
      bursts.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r:  0.8 + Math.random() * 1.4,
        life: 1.0,
        color: c
      });
    }
  });

  window.addEventListener('resize', function () { resize(); seed(); });

  resize();
  seed();
  nextShoot = 180 + Math.floor(Math.random() * 180);
  draw();
})();
