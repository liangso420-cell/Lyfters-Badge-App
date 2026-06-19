// Ambient floating particles — subtle background effect
(function() {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var mouse = { x: -999, y: -999 };
  var particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    for (var i = 0; i < 45; i++) {
      var isLila = Math.random() < 0.3;
      particles.push({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        r:     Math.random() * 1.5 + 1,
        vx:    (Math.random() - 0.5) * 0.4,
        vy:    (Math.random() - 0.5) * 0.4,
        color: isLila ? 'rgba(216,151,231,0.10)' : 'rgba(255,255,255,0.12)'
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var dx = p.x - mouse.x;
      var dy = p.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80 && dist > 0) {
        var force = (80 - dist) / 80;
        p.vx += (dx / dist) * force * 0.3;
        p.vy += (dy / dist) * force * 0.3;
      }
      p.vx *= 0.98;
      p.vy *= 0.98;
      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 1.5) { p.vx *= 1.5 / speed; p.vy *= 1.5 / speed; }
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', function() { resize(); createParticles(); });
  window.addEventListener('mousemove', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('touchmove', function(e) {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('mouseleave', function() { mouse.x = -999; mouse.y = -999; });

  resize();
  createParticles();
  animate();
})();
