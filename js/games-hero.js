/* Smart21Brain — games-hero.js
   Powers the Games hub hero: a mouse-scrubbed background video, a
   typewriter line, and a delayed fade-in for the action pills.
   Vanilla JS port of a React/Tailwind hero spec — same behaviour,
   no build step. */
(function () {
  const hero = document.getElementById('gamesHero');
  if (!hero) return;

  /* ---------- Mouse-scrub video ---------- */
  const video = document.getElementById('gamesHeroVideo');
  if (video) {
    const SENSITIVITY = 0.8;
    let prevX = null;
    let targetTime = 0;
    let seeking = false;
    let ready = false;

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    video.addEventListener('loadedmetadata', () => {
      ready = true;
      targetTime = 0;
      try { video.currentTime = 0; } catch (e) { /* no-op */ }
    });

    const requestSeek = () => {
      if (!ready || seeking) return;
      seeking = true;
      try { video.currentTime = targetTime; } catch (e) { seeking = false; }
    };

    video.addEventListener('seeked', () => {
      seeking = false;
      if (Math.abs(video.currentTime - targetTime) > 0.03) requestSeek();
    });

    window.addEventListener('mousemove', (e) => {
      if (!ready || !video.duration) { prevX = e.clientX; return; }
      if (prevX === null) { prevX = e.clientX; return; }
      const delta = e.clientX - prevX;
      prevX = e.clientX;
      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTime = clamp(targetTime + offset, 0, video.duration);
      requestSeek();
    });
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
