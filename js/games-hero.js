/* Smart21Brain — games-hero.js
   Powers the Games hub hero: an eased, mouse-scrubbed mascot clip,
   a typewriter line, and a delayed fade-in for the action pills.
   Vanilla JS port of a React/Tailwind hero spec — same behaviour,
   no build step. */
(function () {
  const hero = document.getElementById('gamesHero');
  if (!hero) return;

  /* ---------- Mouse-scrub video, eased with requestAnimationFrame ----------
     Raw currentTime jumps feel jerky on a short clip, so instead of
     seeking straight to the target frame we ease a "rendered" time
     toward it every animation frame — a smooth, weighted catch-up
     rather than a snap. */
  const video = document.getElementById('gamesHeroVideo');
  const figure = document.querySelector('.s21hero-video__figure');
  if (video && figure) {
    const SENSITIVITY = 0.8;
    const EASE = 0.12;
    let prevX = null;
    let targetTime = 0;
    let renderedTime = 0;
    let ready = false;
    let rafId = null;

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    const loop = () => {
      if (ready && video.duration) {
        renderedTime += (targetTime - renderedTime) * EASE;
        if (Math.abs(targetTime - renderedTime) < 0.005) renderedTime = targetTime;
        if (Math.abs(video.currentTime - renderedTime) > 0.008) {
          try { video.currentTime = renderedTime; } catch (e) { /* no-op */ }
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    video.addEventListener('loadedmetadata', () => {
      ready = true;
      targetTime = 0;
      renderedTime = 0;
      try { video.currentTime = 0; } catch (e) { /* no-op */ }
      if (!rafId) rafId = requestAnimationFrame(loop);
    });

    const scrub = (clientX) => {
      if (!ready || !video.duration) { prevX = clientX; return; }
      if (prevX === null) { prevX = clientX; return; }
      const delta = clientX - prevX;
      prevX = clientX;
      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTime = clamp(targetTime + offset, 0, video.duration);
    };

    figure.addEventListener('mousemove', (e) => scrub(e.clientX));
    figure.addEventListener('mouseleave', () => { prevX = null; });
    figure.addEventListener('touchstart', (e) => {
      if (e.touches[0]) prevX = e.touches[0].clientX;
    }, { passive: true });
    figure.addEventListener('touchmove', (e) => {
      if (e.touches[0]) scrub(e.touches[0].clientX);
    }, { passive: true });
  }

  /* ---------- Typewriter ---------- */
  const typeTarget = document.getElementById('gamesHeroTypeText');
  const cursor = document.getElementById('gamesHeroCursor');
  if (typeTarget) {
    const text = typeTarget.getAttribute('data-text') || '';
    const speed = 38;
    const startDelay = 600;
    let i = 0;

    setTimeout(() => {
      const tick = () => {
        i += 1;
        typeTarget.textContent = text.slice(0, i);
        if (i < text.length) {
          setTimeout(tick, speed);
        } else if (cursor) {
          cursor.classList.add('is-done');
        }
      };
      tick();
    }, startDelay);
  }

  /* ---------- Pills fade-in (independent of typewriter) ---------- */
  const pills = document.getElementById('gamesHeroPills');
  if (pills) {
    setTimeout(() => pills.classList.add('is-visible'), 400);
  }

  /* ---------- Copy email ---------- */
  const copyBtn = document.getElementById('gamesHeroCopyEmail');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const email = copyBtn.getAttribute('data-email') || '';
      const done = () => {
        if (window.S21_toast) window.S21_toast('Email copied!', { type: 'success', icon: 'fa-copy' });
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(done);
      } else {
        done();
      }
    });
  }
})();
