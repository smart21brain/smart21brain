/* Smart21Brain — dashboard.js
   Loads the signed-in user's real stats from /api/dashboard and applies
   them to the welcome banner (photo + name), the quiz/game stat cards,
   and a "Recent activity" list built from their actual quiz attempts and
   game plays. Course/video/book progress, streaks, XP and badges aren't
   tracked by the backend yet, so those sections stay as illustrative
   demo content for now. */
(function () {
  function t(key, fallback) { return (window.S21_t ? window.S21_t(key) : null) || fallback; }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Lightweight "time ago" label, consistent with the style used elsewhere
  // on the site (e.g. "2 hours ago" on admin.html).
  function timeAgo(isoString) {
    const then = new Date(isoString).getTime();
    if (!isoString || Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const mins = Math.max(0, Math.round(diffMs / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(then).toLocaleDateString();
  }

  function renderRecentActivity(data) {
    const list = document.getElementById('dash-recent-activity-list');
    if (!list) return;

    const quizEvents = (data.recent_quizzes || []).map((q) => ({
      icon: 'fa-circle-question',
      label: `${t('dash_completed_quiz', 'Completed quiz')}: ${escapeHtml(q.title)}`,
      detail: q.total ? `${q.score}/${q.total}` : '',
      when: q.completed_at,
    }));
    const gameEvents = (data.recent_games || []).map((g) => ({
      icon: 'fa-gamepad',
      label: `${t('dash_played_game', 'Played')} ${escapeHtml(g.title || 'a game')}`,
      detail: typeof g.score === 'number' ? `${g.score} pts` : '',
      when: g.played_at,
    }));

    const events = [...quizEvents, ...gameEvents]
      .filter((e) => e.when)
      .sort((a, b) => new Date(b.when) - new Date(a.when))
      .slice(0, 5);

    if (!events.length) return; // leave the "nothing yet" placeholder in place

    list.innerHTML = events.map((e) => `
      <li class="d-flex gap-2">
        <i class="fa-solid ${e.icon} text-soft mt-1"></i>
        <span>${e.label}${e.detail ? ` — <span class="text-soft">${escapeHtml(e.detail)}</span>` : ''}
          <span class="text-soft d-block" style="font-size:.75rem">${escapeHtml(timeAgo(e.when))}</span>
        </span>
      </li>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const avatarImg = document.getElementById('dash-avatar-img');
    const heading = document.getElementById('dash-welcome-heading');

    fetch('/api/dashboard', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.user) return; // guest, or session expired — keep demo defaults

        const user = data.user;
        if (avatarImg && user.avatar_key) {
          avatarImg.src = `/api/avatar/${encodeURIComponent(user.id)}`;
        }
        if (avatarImg && user.name) {
          avatarImg.alt = `${user.name}'s profile picture`;
        }
        if (heading && user.name) {
          heading.textContent = `Welcome back, ${user.name}! 👋`;
        }

        const quizzesEl = document.getElementById('dash-stat-quizzes');
        const gamesEl = document.getElementById('dash-stat-games');
        const avgEl = document.getElementById('dash-stat-quiz-avg');
        if (quizzesEl) quizzesEl.textContent = data.quiz_attempts ?? 0;
        if (gamesEl) gamesEl.textContent = data.games_played ?? 0;
        if (avgEl) avgEl.textContent = `${data.quiz_avg_percent ?? 0}%`;

        renderRecentActivity(data);

        // Streak
        const streakEl = document.getElementById('dash-streak-label');
        if (streakEl) {
          streakEl.textContent = data.streak_days > 0
            ? `${data.streak_days}-${t('dash_day_streak', 'day streak')}`
            : t('dash_no_streak_yet', 'No streak yet');
        }

        // Level / XP
        const levelEl = document.getElementById('dash-level-label');
        if (levelEl) {
          levelEl.textContent = `${t('dash_level_word', 'Level')} ${data.level} · ${data.xp} XP`;
        }
        const perLevel = data.xp_per_level || 200;
        const intoLevel = data.xp_into_level || 0;
        const progressLabel = document.getElementById('dash-level-progress-label');
        if (progressLabel) {
          progressLabel.textContent = `${intoLevel} / ${perLevel} ${t('dash_xp_to_next_level', 'XP to next level')}`;
        }
        const progressBar = document.getElementById('dash-level-progress-bar');
        if (progressBar) {
          progressBar.style.width = `${Math.min(100, Math.round((intoLevel / perLevel) * 100))}%`;
        }

        // Badges
        const badges = data.badges || {};
        document.querySelectorAll('[data-badge-id]').forEach((el) => {
          const earned = !!badges[el.dataset.badgeId];
          el.classList.toggle('locked', !earned);
        });
        const badgesCountEl = document.getElementById('dash-badges-count');
        if (badgesCountEl) {
          badgesCountEl.textContent = `${data.earned_badges?.length ?? 0} ${t('dash_of', 'of')} ${data.badge_total ?? 8} ${t('dash_earned_word', 'earned')}`;
        }
      })
      .catch(() => { /* not signed in, or offline — keep the defaults */ });
  });
})();
