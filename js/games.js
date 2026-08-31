/* Smart21Brain — games.js
   A self-contained arithmetic game engine shared by Addition Race,
   Multiplication Rush, and future number games. Each game page sets
   `window.S21_GAME_CONFIG` before this script loads to pick the operation
   and leaderboard key — everything else (timer, lives, levels, HUD,
   leaderboard) is shared. */
(function () {
  const GAME_DURATION = 60; // seconds
  const LIVES_START = 3;
  const LEVEL_UP_EVERY = 5; // correct answers

  const OPERATIONS = {
    addition: {
      symbol: '+',
      make(level) {
        const max = 5 + level * 5;
        const a = randInt(1, max);
        const b = randInt(1, max);
        return { a, b, answer: a + b };
      },
    },
    multiplication: {
      symbol: '×',
      make(level) {
        const max = Math.min(2 + level, 12); // caps at ×12 tables
        const a = randInt(1, max);
        const b = randInt(1, 12);
        return { a, b, answer: a * b };
      },
    },
    sequence: {
      symbol: null,
      make(level) {
        const step = randInt(1, 3 + Math.floor(level / 2));
        const start = randInt(1, 10 + level * 2);
        const goUp = Math.random() > 0.3 || level < 2;
        const terms = [];
        let cur = start;
        for (let i = 0; i < 4; i++) {
          terms.push(cur);
          cur = goUp ? cur + step : cur - step;
        }
        return { terms, answer: cur, display: `${terms.join(', ')}, ?` };
      },
    },
  };

  const config = window.S21_GAME_CONFIG || { operation: 'addition', leaderboardKey: 's21-addition-race-scores' };
  const op = OPERATIONS[config.operation] || OPERATIONS.addition;
  const LEADERBOARD_KEY = config.leaderboardKey;

  let state = null;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; }
  }
  function saveScore(name, score) {
    const board = getLeaderboard();
    board.push({ name, score, date: new Date().toISOString() });
    board.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.slice(0, 8)));
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function renderLeaderboard() {
    const el = $('game-leaderboard');
    if (!el) return;
    const board = getLeaderboard();
    if (!board.length) {
      el.innerHTML = `<p class="text-soft" style="font-size:.85rem">${window.S21_t ? window.S21_t('runtime_no_scores_yet') : 'No scores yet — be the first!'}</p>`;
      return;
    }
    el.innerHTML = board.map((entry, i) => `
      <div class="d-flex align-items-center justify-content-between py-2 ${i < board.length - 1 ? 'border-bottom' : ''}">
        <span><strong>#${i + 1}</strong> ${escapeHtml(entry.name)}</span>
        <span class="badge-pill">${entry.score} pts</span>
      </div>
    `).join('');
  }

  function renderHearts() {
    const el = $('game-lives');
    if (!el) return;
    el.innerHTML = Array.from({ length: LIVES_START }).map((_, i) =>
      `<i class="fa-solid fa-heart" style="color:${i < state.lives ? 'var(--s21-accent)' : '#E3E6EA'};margin-right:.2rem"></i>`
    ).join('');
  }

  function renderProblem() {
    if (state.problem.display) {
      $('game-problem').textContent = state.problem.display;
    } else {
      $('game-problem').textContent = `${state.problem.a} ${op.symbol} ${state.problem.b} = ?`;
    }
  }

  function updateHud() {
    $('game-score').textContent = state.score;
    $('game-level').textContent = state.level;
    $('game-timer').textContent = state.timeLeft;
    renderHearts();
  }

  function tick() {
    state.timeLeft -= 1;
    $('game-timer').textContent = state.timeLeft;
    if (state.timeLeft <= 0) endGame();
  }

  function startGame() {
    state = { score: 0, level: 1, lives: LIVES_START, timeLeft: GAME_DURATION, correctStreak: 0, problem: op.make(1) };
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    updateHud();
    renderProblem();
    const input = $('game-answer-input');
    input.value = '';
    input.focus();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = state.score;
    $('final-level').textContent = state.level;
    renderLeaderboard();
  }

  function handleAnswer(e) {
    e.preventDefault();
    if (!state || state.timeLeft <= 0) return;
    const input = $('game-answer-input');
    const value = parseInt(input.value, 10);
    const feedback = $('game-feedback');

    if (value === state.problem.answer) {
      state.score += 10 * state.level;
      state.correctStreak += 1;
      feedback.textContent = window.S21_t ? window.S21_t('runtime_correct') : 'Correct! ✓';
      feedback.style.color = '#0B6E4F';
      if (state.correctStreak % LEVEL_UP_EVERY === 0) state.level += 1;
    } else {
      state.lives -= 1;
      feedback.textContent = window.S21_t
        ? `${window.S21_t('runtime_not_quite')} ${state.problem.answer}.`
        : `Not quite — it was ${state.problem.answer}.`;
      feedback.style.color = 'var(--s21-accent)';
    }

    input.value = '';
    updateHud();

    if (state.lives <= 0) { endGame(); return; }

    state.problem = op.make(state.level);
    renderProblem();
    input.focus();
    setTimeout(() => { if (feedback) feedback.textContent = ''; }, 900);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn')) return; // not on a game page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('game-answer-form')?.addEventListener('submit', handleAnswer);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || (window.S21_t ? window.S21_t('runtime_anonymous') : 'Anonymous');
      saveScore(name, state.score);
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.(window.S21_t ? window.S21_t('runtime_score_saved_toast') : 'Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    renderLeaderboard();
  });
})();
