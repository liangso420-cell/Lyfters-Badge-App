(function () {
  'use strict';

  var C = document.createElement('canvas');
  C.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;';
  document.body.appendChild(C);
  var ctx = C.getContext('2d');
  var W, H;

  var mouse   = { x: -9999, y: -9999, active: false };
  var trail   = [];
  var TRAIL_LEN = 18;
  var orbs    = [];
  var ripples = [];
  var t = 0;

  var ORB_COLORS = [
    'rgba(216,151,231,',
    'rgba(112,207,255,',
    'rgba(255,255,255,',
    'rgba(171,209,148,',
    'rgba(255,203,138,'
  ];

  function resize() {
    W = C.width  = window.innerWidth;
    H = C.height = window.innerHeight;
  }

  // ── Orbs ──────────────────────────────────────────────────────────────────
  function mkOrb() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  1.2 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)]
    };
  }

  function seedOrbs() {
    orbs = [];
    for (var i = 0; i < 30; i++) orbs.push(mkOrb());
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t++;

    // Orb connections
    for (var a = 0; a < orbs.length - 1; a++) {
      var oa = orbs[a];
      for (var b = a + 1; b < orbs.length; b++) {
        var ob = orbs[b];
        var dx = ob.x - oa.x;
        if (Math.abs(dx) > 90) continue;
        var dy  = ob.y - oa.y;
        var d2  = dx*dx + dy*dy;
        if (d2 > 8100) continue;
        var alpha = (1 - Math.sqrt(d2) / 90) * 0.18;
        ctx.beginPath();
        ctx.moveTo(oa.x, oa.y);
        ctx.lineTo(ob.x, ob.y);
        ctx.strokeStyle = 'rgba(216,151,231,' + alpha + ')';
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }
    }

    // Orb movement + draw
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      // Mouse repulsion
      var mdx = o.x - mouse.x;
      var mdy = o.y - mouse.y;
      var md  = Math.sqrt(mdx*mdx + mdy*mdy);
      if (md < 110 && md > 0) {
        var f = ((110 - md) / 110) * 0.5;
        o.vx += (mdx / md) * f;
        o.vy += (mdy / md) * f;
      }
      o.vx *= 0.97; o.vy *= 0.97;
      var spd = Math.sqrt(o.vx*o.vx + o.vy*o.vy);
      if (spd > 1.8) { o.vx *= 1.8/spd; o.vy *= 1.8/spd; }
      o.x += o.vx; o.y += o.vy;
      if (o.x < 0) { o.x = 0; o.vx *= -1; }
      if (o.x > W) { o.x = W; o.vx *= -1; }
      if (o.y < 0) { o.y = 0; o.vy *= -1; }
      if (o.y > H) { o.y = H; o.vy *= -1; }
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = o.color + '0.28)';
      ctx.fill();
    }

    // Mouse trail
    if (mouse.active && trail.length > 1) {
      for (var ti = 0; ti < trail.length; ti++) {
        var tp  = trail[ti];
        var pct = ti / (trail.length - 1);       // 0 = oldest, 1 = newest
        var ta  = pct * pct * 0.80;
        var tr  = 1 + pct * 4;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, tr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(216,151,231,' + ta + ')';
        ctx.fill();
      }
    }

    // Cursor aura
    if (mouse.active) {
      var pulse = 25 + 10 * Math.sin(t * 0.07);
      var grad  = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, pulse);
      grad.addColorStop(0,   'rgba(216,151,231,0.32)');
      grad.addColorStop(0.5, 'rgba(112,207,255,0.13)');
      grad.addColorStop(1,   'rgba(216,151,231,0)');
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Click ripples
    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      var rp = ripples[ri];
      rp.progress += 0.028;
      if (rp.progress >= 1) { ripples.splice(ri, 1); continue; }
      var inv = 1 - rp.progress;
      for (var rk = 0; rk < rp.rings.length; rk++) {
        var ring = rp.rings[rk];
        var rRadius = ring.r0 + rp.progress * 55;
        var rAlpha  = inv * inv * ring.a;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(216,151,231,' + rAlpha + ')';
        ctx.lineWidth   = 1.5 * inv;
        ctx.shadowColor = 'rgba(216,151,231,' + rAlpha * 0.5 + ')';
        ctx.shadowBlur  = 8 * inv;
        ctx.stroke();
        ctx.shadowBlur  = 0;
      }
    }

    requestAnimationFrame(draw);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function setMouse(x, y) {
    mouse.x = x; mouse.y = y; mouse.active = true;
    trail.push({ x: x, y: y });
    if (trail.length > TRAIL_LEN) trail.shift();
  }

  window.addEventListener('mousemove', function (e) { setMouse(e.clientX, e.clientY); });
  window.addEventListener('touchmove', function (e) {
    if (e.touches[0]) setMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('mouseleave', function () {
    mouse.active = false; mouse.x = -9999; mouse.y = -9999; trail = [];
  });
  window.addEventListener('touchend', function () {
    mouse.active = false; mouse.x = -9999; mouse.y = -9999; trail = [];
  });

  window.addEventListener('click', function (e) {
    ripples.push({
      x: e.clientX, y: e.clientY,
      progress: 0,
      rings: [
        { r0: 0,  a: 0.9 },
        { r0: 10, a: 0.6 },
        { r0: 20, a: 0.35 }
      ]
    });
  });

  window.addEventListener('resize', function () { resize(); seedOrbs(); });

  resize();
  seedOrbs();
  draw();
})();
