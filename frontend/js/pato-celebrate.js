/* ============================================================
   Pato Celebrate — confetti burst + dancing Pato mascot overlay
   Self-contained, no external deps, pure CSS/canvas animations.
   Usage: PatoCelebrate.show({ duration: 2800, onDone: fn })
   ============================================================ */
(function () {
  'use strict';

  var base = '';
  try {
    var selfEl = document.querySelector('script[src*="pato-celebrate"]');
    if (selfEl) base = selfEl.getAttribute('src').replace('js/pato-celebrate.js', '');
  } catch (e) {}

  var PATO_IMG = base + 'pato/pato2.webp';

  function show(opts) {
    opts = opts || {};
    var duration = opts.duration != null ? opts.duration : 2800;
    var onDone   = opts.onDone || null;

    /* ── Confetti canvas ───────────────────────────────────── */
    var W = window.innerWidth;
    var H = window.innerHeight;

    var canvas    = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:99993;pointer-events:none;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var COLORS = ['#d897e7','#e68a8d','#70cfff','#abd194','#ffcb8a','#f4f6f9','#d897e7','#e68a8d'];
    var particles = [];
    for (var i = 0; i < 140; i++) {
      particles.push({
        x:      W * 0.10 + Math.random() * W * 0.80,
        y:      H * 0.15 + Math.random() * H * 0.25,
        w:      5 + Math.random() * 9,
        h:      7 + Math.random() * 7,
        color:  COLORS[Math.floor(Math.random() * COLORS.length)],
        vx:     (Math.random() - 0.5) * 10,
        vy:     -5  - Math.random() * 9,
        gravity:0.28 + Math.random() * 0.22,
        rot:    Math.random() * Math.PI * 2,
        rotV:   (Math.random() - 0.5) * 0.22,
        opacity:1,
        shape:  Math.random() > 0.45 ? 'rect' : 'circle'
      });
    }

    /* ── Pato mascot ───────────────────────────────────────── */
    var styleEl = document.createElement('style');
    styleEl.textContent = [
      '@keyframes pato-cel-dance{',
      '0%,100%{transform:translateY(0) rotate(0) scale(1)}',
      '12%{transform:translateY(-24px) rotate(-9deg) scale(1.12)}',
      '28%{transform:translateY(-36px) rotate(8deg) scale(1.18)}',
      '44%{transform:translateY(-22px) rotate(-6deg) scale(1.1)}',
      '60%{transform:translateY(-32px) rotate(6deg) scale(1.15)}',
      '76%{transform:translateY(-18px) rotate(-3deg) scale(1.08)}}',
      '#pato-cel-img{',
      'position:fixed;bottom:0;right:28px;',
      'width:130px;height:auto;',
      'z-index:99994;pointer-events:none;',
      'transform:translateY(140px);',
      'transition:transform .55s cubic-bezier(.34,1.56,.64,1);',
      'filter:drop-shadow(0 8px 24px rgba(0,0,0,.55));',
      'will-change:transform;}',
      '#pato-cel-img.pato-cel-in{',
      'transform:translateY(0);',
      'animation:pato-cel-dance 1s ease-in-out infinite;}'
    ].join('');
    document.head.appendChild(styleEl);

    var imgEl  = document.createElement('img');
    imgEl.id   = 'pato-cel-img';
    imgEl.src  = PATO_IMG;
    imgEl.alt  = '¡Pato celebra!';
    document.body.appendChild(imgEl);

    /* Slide Pato up after a double rAF so the CSS transition fires */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        imgEl.classList.add('pato-cel-in');
      });
    });

    /* ── Animation loop ────────────────────────────────────── */
    var startTime = null;
    var rafId;
    var fadeFrom  = duration * 0.55;

    function frame(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;

      ctx.clearRect(0, 0, W, H);

      for (var j = 0; j < particles.length; j++) {
        var p = particles[j];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rot += p.rotV;
        if (elapsed > fadeFrom) {
          p.opacity = Math.max(0, 1 - (elapsed - fadeFrom) / (duration * 0.45));
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      if (elapsed < duration) {
        rafId = requestAnimationFrame(frame);
      } else {
        cleanup();
        if (onDone) onDone();
      }
    }

    function cleanup() {
      cancelAnimationFrame(rafId);
      imgEl.style.animation  = 'none';
      imgEl.style.transition = 'transform 0.38s ease';
      imgEl.style.transform  = 'translateY(140px)';
      setTimeout(function () {
        if (canvas.parentNode)  canvas.parentNode.removeChild(canvas);
        if (imgEl.parentNode)   imgEl.parentNode.removeChild(imgEl);
        if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      }, 420);
    }

    rafId = requestAnimationFrame(frame);
  }

  window.PatoCelebrate = { show: show };

})();
