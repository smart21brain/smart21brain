/* Smart21Brain — Admin content manager
   Wires the "Add Game / Add Quiz / Add Blog Post / Upload Material" forms
   on admin.html to the real /api endpoints (Cloudflare Pages Functions). */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const feedback = document.getElementById('cm-feedback');
    if (!feedback) return; // not on the admin page

    function say(message, isError) {
      feedback.textContent = message;
      feedback.style.color = isError ? 'var(--s21-accent)' : 'var(--s21-primary)';
    }

    async function postJSON(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed.');
      return data;
    }

    // Add Game
    document.getElementById('admin-game-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await postJSON('/api/games', {
          title: f.get('title'),
          subject: f.get('subject') || null,
          emoji: f.get('emoji') || '🎮',
          description: f.get('description') || null,
        });
        say('✅ Game created.');
        e.target.reset();
        loadGames();
      } catch (err) {
        say('❌ ' + err.message, true);
      }
    });

    // Add Quiz
    document.getElementById('admin-quiz-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      let questions;
      try {
        questions = JSON.parse(f.get('questions'));
        if (!Array.isArray(questions) || questions.length === 0) throw new Error();
      } catch {
        say('❌ Questions must be valid JSON — an array of {prompt, options[], correct_index, explanation}.', true);
        return;
      }
      try {
        await postJSON('/api/quizzes', {
          title: f.get('title'),
          subject: f.get('subject') || null,
          description: f.get('description') || null,
          questions,
        });
        say('✅ Quiz created.');
        e.target.reset();
        loadQuizzes();
      } catch (err) {
        say('❌ ' + err.message, true);
      }
    });

    // Add Blog Post
    document.getElementById('admin-blog-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await postJSON('/api/blog', {
          title: f.get('title'),
          slug: f.get('slug') || null,
          excerpt: f.get('excerpt') || null,
          content: f.get('content'),
        });
        say('✅ Blog post published.');
        e.target.reset();
        loadBlog();
      } catch (err) {
        say('❌ ' + err.message, true);
      }
    });

    // Upload Material (multipart — goes straight to R2 via the API)
    document.getElementById('admin-material-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        const res = await fetch('/api/materials', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Upload failed.');
        say('✅ Material uploaded.');
        e.target.reset();
        loadMaterials();
      } catch (err) {
        say('❌ ' + err.message, true);
      }
    });

    // ---- Manage existing content: list + delete ----
    async function del(url) {
      const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed.');
    }

    async function loadGames() {
      const el = document.getElementById('mg-games-list');
      if (!el) return;
      try {
        const { games } = await (await fetch('/api/games', { credentials: 'include' })).json();
        el.innerHTML = games.length ? games.map((g) => row(g.title, g.subject, `/api/games/${g.id}`, loadGames)).join('')
          : '<p class="text-soft" style="font-size:.85rem">No games yet.</p>';
        wireRowDeletes(el);
      } catch { el.innerHTML = '<p class="text-soft" style="font-size:.85rem">Couldn\'t load games.</p>'; }
    }
    async function loadQuizzes() {
      const el = document.getElementById('mg-quizzes-list');
      if (!el) return;
      try {
        const { quizzes } = await (await fetch('/api/quizzes', { credentials: 'include' })).json();
        el.innerHTML = quizzes.length ? quizzes.map((q) => row(q.title, q.subject, `/api/quizzes/${q.id}`, loadQuizzes)).join('')
          : '<p class="text-soft" style="font-size:.85rem">No quizzes yet.</p>';
        wireRowDeletes(el);
      } catch { el.innerHTML = '<p class="text-soft" style="font-size:.85rem">Couldn\'t load quizzes.</p>'; }
    }
    async function loadBlog() {
      const el = document.getElementById('mg-blog-list');
      if (!el) return;
      try {
        const { posts } = await (await fetch('/api/blog', { credentials: 'include' })).json();
        el.innerHTML = posts.length ? posts.map((p) => row(p.title, p.slug, `/api/blog/${p.slug}`, loadBlog)).join('')
          : '<p class="text-soft" style="font-size:.85rem">No posts yet.</p>';
        wireRowDeletes(el);
      } catch { el.innerHTML = '<p class="text-soft" style="font-size:.85rem">Couldn\'t load posts.</p>'; }
    }
    async function loadMaterials() {
      const el = document.getElementById('mg-materials-list');
      if (!el) return;
      try {
        const { materials } = await (await fetch('/api/materials', { credentials: 'include' })).json();
        el.innerHTML = materials.length ? materials.map((m) => row(m.title, m.file_type, `/api/materials/${m.id}`, loadMaterials)).join('')
          : '<p class="text-soft" style="font-size:.85rem">No materials yet.</p>';
        wireRowDeletes(el);
      } catch { el.innerHTML = '<p class="text-soft" style="font-size:.85rem">Couldn\'t load materials.</p>'; }
    }

    function row(title, subtitle, deleteUrl, reload) {
      return `
        <div class="d-flex justify-content-between align-items-center p-2" style="border:1px solid var(--s21-border);border-radius:10px">
          <div>
            <div class="fw-bold" style="font-size:.9rem">${escapeHtml(title)}</div>
            ${subtitle ? `<div class="text-soft" style="font-size:.78rem">${escapeHtml(subtitle)}</div>` : ''}
          </div>
          <button class="btn-s21 btn-s21-outline" style="padding:.4rem .8rem;font-size:.8rem" data-delete-url="${deleteUrl}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>`;
    }
    function escapeHtml(str) {
      const d = document.createElement('div');
      d.textContent = str == null ? '' : String(str);
      return d.innerHTML;
    }
    function wireRowDeletes(container) {
      container.querySelectorAll('[data-delete-url]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this item? This cannot be undone.')) return;
          try {
            await del(btn.dataset.deleteUrl);
            say('✅ Deleted.');
            loadGames(); loadQuizzes(); loadBlog(); loadMaterials();
          } catch (err) {
            say('❌ ' + err.message, true);
          }
        });
      });
    }

    loadGames();
    loadQuizzes();
    loadBlog();
    loadMaterials();
  });
})();
