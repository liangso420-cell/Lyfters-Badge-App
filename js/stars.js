// Starfield background — fixed canvas behind all page content
(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.id = 'stars-bg';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext('2d');
  var stars = [];
  var COUNT = 90;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function seed() {
    stars = [];
    for (var i = 0; i < COUNT; i++) {
      stars.push({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        r:     0.5 + Math.random() * 1.2,
        color: Math.random() < 0.12 ? '#d897e7' : '#ffffff',
        speed: 0.003 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  resize();
  seed();

  window.addEventListener('resize', function () {
    resize();
    seed();
  });

  var t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 1;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var osc = (Math.sin(t * s.speed + s.phase) + 1) / 2; // 0–1
      ctx.globalAlpha = 0.15 + osc * 0.55;                 // 0.15–0.70
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();
