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

    // Post Video — toggle file-vs-URL fields, then upload (multipart) or POST JSON
    const videoForm = document.getElementById('admin-video-form');
    if (videoForm) {
      const fileWrap = document.getElementById('video-source-file');
      const urlWrap = document.getElementById('video-source-url');
      videoForm.querySelectorAll('input[name="source"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          const isFile = videoForm.querySelector('input[name="source"]:checked').value === 'file';
          fileWrap.classList.toggle('d-none', !isFile);
          urlWrap.classList.toggle('d-none', isFile);
        });
      });

      videoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(videoForm);
        const source = f.get('source');
        try {
          if (source === 'file') {
            if (!f.get('file') || !f.get('file').size) throw new Error('Choose a video file to upload.');
            f.delete('source');
            f.delete('external_url');
            const res = await fetch('/api/videos', { method: 'POST', credentials: 'include', body: f });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Upload failed.');
          } else {
            const external_url = f.get('external_url');
            if (!external_url) throw new Error('Paste a video URL.');
            await postJSON('/api/videos', {
              title: f.get('title'),
              subject: f.get('subject') || null,
              description: f.get('description') || null,
              external_url,
              thumbnail_url: f.get('thumbnail_url') || null,
            });
          }
          say('✅ Video posted — now live on every video listing site-wide.');
          videoForm.reset();
          fileWrap.classList.remove('d-none');
          urlWrap.classList.add('d-none');
          loadVideos();
        } catch (err) {
          say('❌ ' + err.message, true);
        }
      });
    }

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
    async function loadVideos() {
      const el = document.getElementById('mg-videos-list');
      if (!el) return;
      try {
        const { videos } = await (await fetch('/api/videos', { credentials: 'include' })).json();
        el.innerHTML = videos.length ? videos.map((v) => row(v.title, v.subject, `/api/videos/${v.id}`, loadVideos)).join('')
          : '<p class="text-soft" style="font-size:.85rem">No videos yet.</p>';
        wireRowDeletes(el);
      } catch { el.innerHTML = '<p class="text-soft" style="font-size:.85rem">Couldn\'t load videos.</p>'; }
    }

    const ROLE_LABELS = { user: 'Student', teacher: 'Teacher', parent: 'Parent', admin: 'Admin' };
    async function loadUsers() {
      const tbody = document.getElementById('admin-users-tbody');
      if (!tbody) return;
      try {
        const { users } = await (await fetch('/api/users', { credentials: 'include' })).json();
        tbody.innerHTML = users.length ? users.map((u) => `
          <tr>
            <td>${escapeHtml(u.name)}<div class="text-soft" style="font-size:.75rem">${escapeHtml(u.email)}</div></td>
            <td>
              <select class="form-select form-select-sm" style="width:auto" data-user-role="${u.id}">
                ${Object.entries(ROLE_LABELS).map(([value, label]) =>
                  `<option value="${value}" ${u.role === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </td>
            <td class="text-soft" style="font-size:.85rem">${escapeHtml(new Date(u.created_at + 'Z').toLocaleDateString())}</td>
          </tr>`).join('') : '<tr><td colspan="3" class="text-soft" style="font-size:.85rem">No users yet.</td></tr>';

        tbody.querySelectorAll('[data-user-role]').forEach((select) => {
          select.addEventListener('change', async () => {
            const id = select.dataset.userRole;
            const previous = Array.from(select.options).find((o) => o.defaultSelected)?.value;
            try {
              const res = await fetch(`/api/users/${id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: select.value }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || 'Could not update role.');
              say(`✅ Role updated to ${ROLE_LABELS[select.value]}.`);
            } catch (err) {
              say('❌ ' + err.message, true);
              if (previous) select.value = previous; // revert the dropdown on failure
            }
          });
        });
      } catch { tbody.innerHTML = '<tr><td colspan="3" class="text-soft" style="font-size:.85rem">Couldn\'t load users.</td></tr>'; }
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
            loadGames(); loadQuizzes(); loadBlog(); loadMaterials(); loadVideos();
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
    loadVideos();
    loadUsers();
  });
})();
