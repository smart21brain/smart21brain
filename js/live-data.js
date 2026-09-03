/* Smart21Brain — live data wiring
   Pulls real content from the /api endpoints (Cloudflare Pages Functions +
   D1/R2) into the public pages. Every fetch fails silently and leaves the
   existing static demo content in place if the API isn't reachable yet
   (e.g. this site hasn't been deployed to Cloudflare Pages, or is being
   previewed as plain static files) — so nothing breaks before deploy. */
(function () {
  const SUBJECT_COLORS = {
    math: 'var(--subj-math)', science: 'var(--subj-science)',
    language: 'var(--subj-language)', computer: 'var(--subj-computer)',
    social: 'var(--subj-social)', creative: 'var(--subj-creative)',
  };

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  async function getJSON(url) {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('request failed');
    return res.json();
  }

  // ---- games.html: append live-created games below the curated ones ----
  async function wireGamesPage() {
    const grid = document.getElementById('live-games-grid');
    const section = document.getElementById('live-games-section');
    if (!grid || !section) return;
    try {
      const { games } = await getJSON('/api/games');
      if (!games || games.length === 0) return;
      grid.innerHTML = games.map((g) => `
        <div class="col-6 col-md-3">
          <div class="s21-card game-card">
            <div class="game-emoji">${esc(g.emoji || '🎮')}</div>
            <h3 class="h6 mb-1">${esc(g.title)}</h3>
            ${g.subject ? `<span class="text-soft" style="font-size:.78rem">${esc(g.subject)}</span>` : ''}
            ${g.description ? `<p class="text-soft mt-1" style="font-size:.8rem">${esc(g.description)}</p>` : ''}
          </div>
        </div>
      `).join('');
      section.style.display = '';
    } catch (e) { /* API not reachable yet — leave static content as-is */ }
  }

  // ---- blog.html: append live posts below the curated ones ----
  async function wireBlogListPage() {
    const grid = document.getElementById('live-blog-grid');
    const section = document.getElementById('live-blog-section');
    if (!grid || !section) return;
    try {
      const { posts } = await getJSON('/api/blog');
      if (!posts || posts.length === 0) return;
      grid.innerHTML = posts.map((p) => `
        <div class="col-md-6">
          <a href="blog-post.html?slug=${encodeURIComponent(p.slug)}" class="text-reset text-decoration-none">
            <div class="s21-card p-3">
              <h3 class="h6 mb-1">${esc(p.title)}</h3>
              ${p.excerpt ? `<p class="text-soft mb-0" style="font-size:.85rem">${esc(p.excerpt)}</p>` : ''}
              <span class="text-soft" style="font-size:.76rem">${esc(new Date(p.created_at).toLocaleDateString())}</span>
            </div>
          </a>
        </div>
      `).join('');
      section.style.display = '';
    } catch (e) { /* ignore */ }
  }

  // ---- blog-post.html?slug=... : render a live post in place of the demo article ----
  async function wireBlogPostPage() {
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    const liveSection = document.getElementById('live-post-section');
    if (!slug || !liveSection) return;
    try {
      const { post } = await getJSON(`/api/blog/${encodeURIComponent(slug)}`);
      document.getElementById('live-post-title').textContent = post.title;
      document.getElementById('live-post-date').textContent = new Date(post.created_at).toLocaleDateString();
      document.getElementById('live-post-body').textContent = post.content;
      document.title = post.title + ' — Smart21Brain';

      document.getElementById('post-hero-static')?.style.setProperty('display', 'none');
      document.getElementById('post-body-static')?.style.setProperty('display', 'none');
      liveSection.style.display = '';
    } catch (e) { /* slug not found or API unreachable — keep the static demo article */ }
  }

  // ---- quiz.html: try to load a real quiz; fall back to the built-in demo ----
  async function loadLiveQuiz() {
    try {
      const { quizzes } = await getJSON('/api/quizzes');
      if (!quizzes || quizzes.length === 0) return null;
      const { quiz } = await getJSON(`/api/quizzes/${quizzes[0].id}`);
      const questions = quiz.questions.map((q) => ({
        question: q.prompt, options: q.options, correct: q.correct_index, explanation: q.explanation || '',
      }));
      return { id: quiz.id, questions };
    } catch (e) {
      return null;
    }
  }
  async function submitQuizAttempt(quizId, answers) {
    if (!quizId) return;
    try {
      await fetch(`/api/quizzes/${quizId}/attempt`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
    } catch (e) { /* not signed in, or API unreachable — score just won't be recorded */ }
  }
  window.S21_loadLiveQuiz = loadLiveQuiz;
  window.S21_submitQuizAttempt = submitQuizAttempt;

  // ---- dashboard.html: real name + real avg quiz score + recent activity ----
  async function wireDashboardPage() {
    const welcomeName = document.querySelector('[data-i18n="dash_welcome_back_amara"]');
    if (!welcomeName) return; // not on the dashboard
    try {
      const me = await getJSON('/api/auth/me');
      if (!me || !me.user) {
        window.location.href = 'login.html';
        return;
      }

      const data = await getJSON('/api/dashboard');
      if (!data || !data.user) {
        window.location.href = 'login.html';
        return;
      }

      welcomeName.textContent = `Welcome back, ${data.user.name}! 👋`;
      welcomeName.removeAttribute('data-i18n');

      const scoreCard = [...document.querySelectorAll('.dash-stat-card')]
        .find((c) => c.querySelector('.fa-circle-question'));
      if (scoreCard) {
        scoreCard.querySelector('.stat-num').textContent = data.quiz_avg_percent + '%';
      }

      const activity = [...data.recent_quizzes.map((q) => ({
        text: `Scored ${q.score}/${q.total} on "${q.title}"`, date: q.completed_at,
      })), ...data.recent_games.map((g) => ({
        text: `Played "${g.title}" — score ${g.score}`, date: g.played_at,
      }))].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      if (activity.length) {
        const notif = [...document.querySelectorAll('.s21-card h3.h6')]
          .find((h) => h.textContent.includes('Notifications'))?.closest('.s21-card');
        if (notif) {
          const list = notif.querySelector('ul');
          if (list) {
            list.innerHTML = activity.map((a) => `
              <li class="d-flex gap-2"><i class="fa-solid fa-circle-check text-soft mt-1"></i> <span>${esc(a.text)}</span></li>
            `).join('');
          }
        }
      }
    } catch (e) { /* not signed in, or API unreachable — leave demo dashboard as-is */ }
  }

  // ---- index.html: real, live homepage numbers (no invented marketing
  // figures). Active learners and quizzes completed are counted straight
  // from the database; video lessons / digital books are the actual
  // counts of lessons/books published on the site right now. If the API
  // isn't reachable the static "0" already in the markup is left alone
  // rather than showing a fabricated number. ----
  function animateStat(el, target, suffix) {
    const numTarget = Number(target) || 0;
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(progress * numTarget).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = numTarget.toLocaleString() + (suffix || '');
    }
    requestAnimationFrame(tick);
  }

  async function wireHomeStats() {
    const nodes = document.querySelectorAll('[data-live-stat]');
    if (!nodes.length) return;
    try {
      const stats = await getJSON('/api/stats');
      nodes.forEach((el) => {
        const key = el.dataset.liveStat;
        if (!(key in stats)) return;
        animateStat(el, stats[key], el.dataset.suffix);
      });
    } catch (e) { /* API unreachable — leave the static "0" placeholders */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireGamesPage();
    wireBlogListPage();
    wireBlogPostPage();
    wireDashboardPage();
    wireHomeStats();
  });
})();
