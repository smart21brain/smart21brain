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
              placements: f.getAll('placements'),
            });
          }
          say('✅ Video posted — now live wherever you selected.');
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
        el.innerHTML = videos.length ? videos.map((v) => row(v.title, [v.subject, v.placements.join(', ')].filter(Boolean).join(' · '), `/api/videos/${v.id}`, loadVideos)).join('')
          : '<p class="text-soft" style="font-size:.85rem">No videos yet.</p>';
        wireRowDeletes(el);
      } catch { el.innerHTML = '<p class="text-soft" style="font-size:.85rem">Couldn\'t load videos.</p>'; }
    }

    const ROLE_LABELS = { user: 'Student', teacher: 'Teacher', parent: 'Parent', admin: 'Admin' };
    function initials(name) {
      return (name || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
    }
    let allUsers = [];

    function renderUsersTable(list) {
      const tbody = document.getElementById('admin-users-tbody');
      if (!tbody) return;
      tbody.innerHTML = list.length ? list.map((u) => `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-3">
              <div class="user-avatar role-${u.role}">${escapeHtml(initials(u.name))}</div>
              <div>
                <div class="fw-bold" style="font-size:.88rem">${escapeHtml(u.name)}</div>
                <div class="text-soft" style="font-size:.78rem">${escapeHtml(u.email)}</div>
              </div>
            </div>
          </td>
          <td>
            <select class="role-select role-${u.role}" data-user-role="${u.id}">
              ${Object.entries(ROLE_LABELS).map(([value, label]) =>
                `<option value="${value}" ${u.role === value ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </td>
          <td class="text-soft" style="font-size:.85rem">${escapeHtml(new Date(u.created_at + 'Z').toLocaleDateString())}</td>
        </tr>`).join('') : '<tr><td colspan="3" class="text-soft text-center py-4" style="font-size:.85rem">No users match your search.</td></tr>';

      tbody.querySelectorAll('[data-user-role]').forEach((select) => {
        select.addEventListener('change', async () => {
          const id = select.dataset.userRole;
          const previousOption = Array.from(select.options).find((o) => o.defaultSelected);
          const previous = previousOption?.value;
          const avatar = select.closest('tr')?.querySelector('.user-avatar');
          select.className = `role-select role-${select.value}`; // optimistic — reverted below on failure
          if (avatar) avatar.className = `user-avatar role-${select.value}`;
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
            const target = allUsers.find((u) => String(u.id) === String(id));
            if (target) target.role = select.value;
            if (previousOption) previousOption.defaultSelected = false;
            select.querySelector(`option[value="${select.value}"]`).defaultSelected = true;
          } catch (err) {
            say('❌ ' + err.message, true);
            if (previous) {
              select.value = previous;
              select.className = `role-select role-${previous}`;
              if (avatar) avatar.className = `user-avatar role-${previous}`;
            }
          }
        });
      });
    }

    async function loadUsers() {
      const tbody = document.getElementById('admin-users-tbody');
      try {
        const { users } = await (await fetch('/api/users', { credentials: 'include' })).json();
        allUsers = users;

        // Stat cards: real counts by role, computed from the same response
        // that fills the table below — no extra request needed.
        const counts = { user: 0, teacher: 0, parent: 0, admin: 0 };
        users.forEach((u) => { if (u.role in counts) counts[u.role]++; });
        const setStat = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n.toLocaleString(); };
        setStat('stat-total-users', users.length);
        setStat('stat-students', counts.user);
        setStat('stat-teachers', counts.teacher);
        setStat('stat-parents', counts.parent);
        const lastUpdated = document.getElementById('admin-last-updated');
        if (lastUpdated) lastUpdated.textContent = `Last updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const countLabel = document.getElementById('admin-users-count');
        if (countLabel) countLabel.textContent = `${users.length.toLocaleString()} total`;

        if (!tbody) return;
        renderUsersTable(allUsers);
      } catch { if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-soft" style="font-size:.85rem">Couldn\'t load users.</td></tr>'; }
    }

    document.getElementById('admin-users-search')?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = q
        ? allUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        : allUsers;
      renderUsersTable(filtered);
    });

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

    // ---- Recent content activity feed ----
    // There's no separate moderation/approval workflow in this app —
    // games, quizzes, posts, materials and videos go live the moment
    // they're created — so this pulls the real lists and shows the
    // newest items across all of them, instead of a fake pending queue.
    function timeAgo(iso) {
      const then = new Date(iso + 'Z').getTime();
      const mins = Math.round((Date.now() - then) / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.round(hours / 24)}d ago`;
    }

    async function loadActivity() {
      const list = document.getElementById('admin-activity-list');
      const countEl = document.getElementById('admin-activity-count');
      if (!list) return;
      try {
        const [games, quizzes, posts, materials, videos] = await Promise.all([
          fetch('/api/games', { credentials: 'include' }).then((r) => r.json()).then((d) => d.games || []),
          fetch('/api/quizzes', { credentials: 'include' }).then((r) => r.json()).then((d) => d.quizzes || []),
          fetch('/api/blog', { credentials: 'include' }).then((r) => r.json()).then((d) => d.posts || []),
          fetch('/api/materials', { credentials: 'include' }).then((r) => r.json()).then((d) => d.materials || []),
          fetch('/api/videos', { credentials: 'include' }).then((r) => r.json()).then((d) => d.videos || []),
        ]);
        const items = [
          ...games.map((g) => ({ title: g.title, type: 'Game', icon: 'fa-gamepad', created_at: g.created_at })),
          ...quizzes.map((q) => ({ title: q.title, type: 'Quiz', icon: 'fa-circle-question', created_at: q.created_at })),
          ...posts.map((p) => ({ title: p.title, type: 'Blog post', icon: 'fa-newspaper', created_at: p.created_at })),
          ...materials.map((m) => ({ title: m.title, type: 'Material', icon: 'fa-file-lines', created_at: m.created_at })),
          ...videos.map((v) => ({ title: v.title, type: 'Video', icon: 'fa-video', created_at: v.created_at })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

        countEl.textContent = items.length ? `${items.length} recent` : '';
        list.innerHTML = items.length ? items.map((it) => `
          <div class="moderation-row">
            <div class="flex-grow-1 d-flex align-items-center gap-2">
              <i class="fa-solid ${it.icon}" style="color:var(--s21-primary);width:1.2rem;text-align:center"></i>
              <div>
                <div class="fw-bold" style="font-size:.9rem">${escapeHtml(it.title)}</div>
                <div class="text-soft" style="font-size:.78rem">${it.type} · ${timeAgo(it.created_at)}</div>
              </div>
            </div>
          </div>`).join('') : '<p class="text-soft" style="font-size:.85rem">Nothing published yet.</p>';
      } catch {
        list.innerHTML = '<p class="text-soft" style="font-size:.85rem">Couldn\'t load recent activity.</p>';
      }
    }

    // ---- Platform settings toggles ----
    async function loadSettings() {
      const toggles = document.querySelectorAll('[data-setting]');
      if (!toggles.length) return;
      try {
        const { settings } = await (await fetch('/api/settings', { credentials: 'include' })).json();
        toggles.forEach((input) => {
          input.checked = !!settings[input.dataset.setting];
          input.disabled = false;
        });
      } catch {
        const fb = document.getElementById('admin-settings-feedback');
        if (fb) fb.textContent = "Couldn't load current settings.";
      }
    }

    document.querySelectorAll('[data-setting]').forEach((input) => {
      input.addEventListener('change', async () => {
        const fb = document.getElementById('admin-settings-feedback');
        const previous = !input.checked; // value before this toggle
        try {
          await postJSON('/api/settings', { [input.dataset.setting]: input.checked });
          if (fb) { fb.style.color = 'var(--s21-primary)'; fb.textContent = '✅ Setting saved.'; }
        } catch (err) {
          input.checked = previous;
          if (fb) { fb.style.color = 'var(--s21-accent)'; fb.textContent = '❌ ' + err.message; }
        }
      });
    });

    loadGames();
    loadQuizzes();
    loadBlog();
    loadMaterials();
    loadVideos();
    loadUsers();
    loadActivity();
    loadSettings();
  });
})();
