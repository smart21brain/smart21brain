/* ============================================================
   Smart21Brain Gamification — Three.js interactive game-icon
   background. A field of drifting gamepad / ball / joystick /
   dice / trophy / star badges (matching the section's own
   game-emoji palette) that gently react to the mouse / touch
   cursor. The section's own background colour is untouched —
   the renderer stays fully transparent.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var host = document.getElementById("gamificationCanvas");
    var section = host && host.closest(".section-gamification");
    if (!host || !section || typeof THREE === "undefined") return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isSmall = window.innerWidth < 768;

    // ---------- Renderer / scene / camera ----------
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 22;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      return; // WebGL unavailable — the existing background still looks fine on its own
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // fully transparent: section keeps its own bg colour
    host.appendChild(renderer.domElement);

    function resize() {
      var w = host.clientWidth || section.clientWidth;
      var h = host.clientHeight || section.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    window.addEventListener("resize", resize);

    // ---------- Palette (matches the .game-emoji badges already in this section) ----------
    var palette = [
      { a: "#3A86FF", b: "#4DABF7" }, // blue  — Math Master
      { a: "#FFD166", b: "#FFB703" }, // gold  — default game-emoji
      { a: "#06A77D", b: "#2DD4A7" }, // teal  — Science Star
      { a: "#7B61FF", b: "#A78BFA" }, // purple— Coding Hero
      { a: "#EF476F", b: "#FF7096" }  // pink accent
    ];

    // ---------- Badge texture builder: gradient circle + white glyph ----------
    function badgeCanvas(drawGlyph, colorSet) {
      var size = 256;
      var cvs = document.createElement("canvas");
      cvs.width = cvs.height = size;
      var ctx = cvs.getContext("2d");
      var cx = size / 2, cy = size / 2, r = size * 0.42;

      ctx.save();
      ctx.shadowColor = "rgba(20,20,30,0.35)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      var grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      grad.addColorStop(0, colorSet.a);
      grad.addColorStop(1, colorSet.b);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // subtle inner ring for a polished "badge" look
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#fff";
      ctx.translate(cx, cy);
      drawGlyph(ctx, r);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      var tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    }

    // ---------- Game glyphs (drawn centred at 0,0, scaled to badge radius r) ----------
    function drawGamepad(ctx, r) {
      var s = r * 0.011;
      ctx.save(); ctx.scale(s, s);
      ctx.lineJoin = "round";
      // body
      ctx.beginPath();
      ctx.moveTo(-46, -6);
      ctx.bezierCurveTo(-52, -26, -30, -34, -14, -30);
      ctx.lineTo(14, -30);
      ctx.bezierCurveTo(30, -34, 52, -26, 46, -6);
      ctx.bezierCurveTo(50, 14, 34, 30, 20, 18);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-20, 18);
      ctx.bezierCurveTo(-34, 30, -50, 14, -46, -6);
      ctx.closePath();
      ctx.fill();
      // cut-outs (D-pad + buttons) in badge colour so they read as holes
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      // D-pad cross
      ctx.fillRect(-32, -8, 14, 5);
      ctx.fillRect(-27, -13, 5, 14);
      // ABXY dots
      ctx.beginPath(); ctx.arc(24, -10, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(32, -2, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(16, -2, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(24, 6, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    function drawSoccerBall(ctx, r) {
      var rad = r * 0.5;
      ctx.save();
      ctx.lineWidth = r * 0.045;
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.stroke();
      // centre pentagon
      var sides = 5, ang = -Math.PI / 2, pr = rad * 0.42;
      ctx.beginPath();
      for (var i = 0; i <= sides; i++) {
        var a = ang + (i * 2 * Math.PI) / sides;
        var x = Math.cos(a) * pr, y = Math.sin(a) * pr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      // spokes out to the ring, each ending in a small hex-ish dot
      for (var j = 0; j < sides; j++) {
        var a2 = ang + (j * 2 * Math.PI) / sides;
        var x1 = Math.cos(a2) * pr, y1 = Math.sin(a2) * pr;
        var x2 = Math.cos(a2) * rad * 0.86, y2 = Math.sin(a2) * rad * 0.86;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x2, y2, rad * 0.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function drawJoystick(ctx, r) {
      var s = r * 0.011;
      ctx.save(); ctx.scale(s, s);
      // base
      ctx.beginPath();
      ctx.ellipse(0, 34, 40, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // stick
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(0, -18);
      ctx.stroke();
      // ball top
      ctx.beginPath();
      ctx.arc(0, -30, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawDice(ctx, r) {
      var half = r * 0.42;
      ctx.save();
      ctx.lineJoin = "round";
      roundRect(ctx, -half, -half, half * 2, half * 2, half * 0.28);
      ctx.fill();
      // pips (5-face), cut out as holes
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      var pip = half * 0.16;
      var pts = [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]];
      pts.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p[0] * half * 0.5, p[1] * half * 0.5, pip, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, rad) {
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
    }

    function drawTrophy(ctx, r) {
      var s = r * 0.011;
      ctx.save(); ctx.scale(s, s);
      ctx.lineJoin = "round";
      // cup
      ctx.beginPath();
      ctx.moveTo(-26, -34);
      ctx.lineTo(26, -34);
      ctx.bezierCurveTo(28, -4, 16, 14, 0, 16);
      ctx.bezierCurveTo(-16, 14, -28, -4, -26, -34);
      ctx.closePath();
      ctx.fill();
      // handles
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(-34, -22, 12, Math.PI * 0.2, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(34, -22, 12, Math.PI * 1.3, Math.PI * 2.6); ctx.stroke();
      // stem + base
      ctx.fillRect(-5, 16, 10, 12);
      roundRect(ctx, -22, 28, 44, 10, 4);
      ctx.fill();
      ctx.restore();
    }

    function drawStar(ctx, r) {
      var spikes = 5, outer = r * 0.5, inner = outer * 0.42;
      var rot = -Math.PI / 2;
      ctx.beginPath();
      for (var i = 0; i < spikes; i++) {
        var xo = Math.cos(rot) * outer, yo = Math.sin(rot) * outer;
        ctx.lineTo(xo, yo);
        rot += Math.PI / spikes;
        var xi = Math.cos(rot) * inner, yi = Math.sin(rot) * inner;
        ctx.lineTo(xi, yi);
        rot += Math.PI / spikes;
      }
      ctx.closePath();
      ctx.fill();
    }

    var glyphSet = [drawGamepad, drawSoccerBall, drawJoystick, drawDice, drawTrophy, drawStar];

    // ---------- Build the badge texture pool ----------
    var textures = [];
    glyphSet.forEach(function (fn) {
      palette.forEach(function (c) {
        textures.push(badgeCanvas(fn, c));
      });
    });

    // ---------- Sprites ----------
    var group = new THREE.Group();
    scene.add(group);
    var sprites = [];
    var count = isSmall ? 12 : reduceMotion ? 12 : 20;

    function visibleSizeAtZ(depth) {
      var vFov = (camera.fov * Math.PI) / 180;
      var height = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z - depth);
      var width = height * camera.aspect;
      return { width: width, height: height };
    }

    // Grid-jittered placement so badges spread across the whole section
    // instead of clumping behind the image or the text column.
    var cols = isSmall ? 4 : 6;
    var rows = Math.max(3, Math.ceil(count / cols));
    var cellOrder = [];
    for (var c = 0; c < cols * rows; c++) cellOrder.push(c);
    for (var sIdx = cellOrder.length - 1; sIdx > 0; sIdx--) {
      var rIdx = Math.floor(Math.random() * (sIdx + 1));
      var tmp = cellOrder[sIdx]; cellOrder[sIdx] = cellOrder[rIdx]; cellOrder[rIdx] = tmp;
    }
    var cellIndex = 0;

    for (var i = 0; i < count; i++) {
      var tex = textures[Math.floor(Math.random() * textures.length)];
      var mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.5 + Math.random() * 0.28 // soft — sits behind the real content
      });
      var sprite = new THREE.Sprite(mat);
      var z = -5 + Math.random() * 7; // -5 .. 2
      var bounds = visibleSizeAtZ(z);
      var usableW = bounds.width * 0.96;
      var usableH = bounds.height * 0.92;

      var cell = cellOrder[cellIndex % cellOrder.length];
      cellIndex++;
      var col = cell % cols;
      var row = Math.floor(cell / cols);
      var cellW = usableW / cols;
      var cellH = usableH / rows;
      var jitterX = (Math.random() - 0.5) * cellW * 0.8;
      var jitterY = (Math.random() - 0.5) * cellH * 0.8;
      var baseX = -usableW / 2 + cellW * (col + 0.5) + jitterX;
      var baseY = -usableH / 2 + cellH * (row + 0.5) + jitterY;

      sprite.position.set(baseX, baseY, z);
      var scale = 1.6 + Math.random() * 1.3;
      sprite.scale.set(scale, scale, 1);
      group.add(sprite);
      sprites.push({
        sprite: sprite,
        base: new THREE.Vector3(baseX, baseY, z),
        offset: new THREE.Vector2(0, 0),
        vel: new THREE.Vector2(0, 0),
        phase: Math.random() * Math.PI * 2,
        speed: 0.22 + Math.random() * 0.3,
        floatAmp: 0.35 + Math.random() * 0.5,
        rotSpeed: (Math.random() - 0.5) * 0.12
      });
    }

    // ---------- Mouse tracking (raycast onto z=0 plane) ----------
    var raycaster = new THREE.Raycaster();
    var ndc = new THREE.Vector2(9999, 9999);
    var mouseWorld = new THREE.Vector3(9999, 9999, 0);
    var groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    var pointerActive = false;

    function updatePointerFromEvent(clientX, clientY) {
      var rect = section.getBoundingClientRect();
      if (
        clientX < rect.left || clientX > rect.right ||
        clientY < rect.top || clientY > rect.bottom
      ) {
        pointerActive = false;
        return;
      }
      pointerActive = true;
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    window.addEventListener("mousemove", function (e) {
      updatePointerFromEvent(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches[0]) {
        updatePointerFromEvent(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchend", function () { pointerActive = false; }, { passive: true });
    window.addEventListener("mouseleave", function () { pointerActive = false; }, { passive: true });

    // ---------- Pause when off-screen (perf) ----------
    var isVisible = true;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      io.observe(section);
    }

    // ---------- Animation loop ----------
    var clock = new THREE.Clock();
    var gravityRadius = 8.5;
    var gravityStrength = 1.6;
    var coreRadius = 2.2;
    var repelStrength = 3.0;

    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      var t = clock.getElapsedTime();

      if (pointerActive) {
        raycaster.setFromCamera(ndc, camera);
        var hit = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, hit);
        if (hit) mouseWorld.copy(hit);
      }

      for (var i2 = 0; i2 < sprites.length; i2++) {
        var s = sprites[i2];
        var float = Math.sin(t * s.speed + s.phase) * s.floatAmp;
        var floatX = Math.cos(t * s.speed * 0.7 + s.phase) * s.floatAmp * 0.5;

        if (pointerActive && !reduceMotion) {
          var px = s.base.x + s.offset.x;
          var py = s.base.y + float * 0.3 + s.offset.y;
          var dx = mouseWorld.x - px;
          var dy = mouseWorld.y - py;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

          if (dist < gravityRadius) {
            var pull = (1 - dist / gravityRadius) * gravityStrength;
            s.vel.x += (dx / dist) * pull * 0.05;
            s.vel.y += (dy / dist) * pull * 0.05;
            s.vel.x += (-dy / dist) * pull * 0.025;
            s.vel.y += (dx / dist) * pull * 0.025;
          }
          if (dist < coreRadius) {
            var push = (1 - dist / coreRadius) * repelStrength;
            s.vel.x += (-dx / dist) * push * 0.09;
            s.vel.y += (-dy / dist) * push * 0.09;
          }
        }
        s.vel.x += -s.offset.x * 0.016;
        s.vel.y += -s.offset.y * 0.016;
        s.vel.x *= 0.91;
        s.vel.y *= 0.91;
        s.offset.x += s.vel.x;
        s.offset.y += s.vel.y;

        s.sprite.position.x = s.base.x + s.offset.x + floatX;
        s.sprite.position.y = s.base.y + s.offset.y + float;
        s.sprite.material.rotation += s.rotSpeed * 0.01;
      }

      renderer.render(scene, camera);
    }

    if (reduceMotion) {
      resize();
      renderer.render(scene, camera);
      window.addEventListener("resize", function () { renderer.render(scene, camera); });
    } else {
      animate();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
