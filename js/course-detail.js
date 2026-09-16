/* Smart21Brain — course-detail.js
   Loads a single course (by ?slug= or ?id=) on course.html and renders
   real data: description, objectives, curriculum, enrollment state and
   progress. No demo content — if a course has no data for a section,
   that section is hidden rather than filled with placeholders. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('slug') || params.get('id');

  const els = {
    crumb: document.getElementById('course-crumb'),
    badge: document.getElementById('course-badge'),
    badgeText: document.getElementById('course-badge-text'),
    title: document.getElementById('course-title'),
    tagline: document.getElementById('course-tagline'),
    metaRow: document.getElementById('course-meta-row'),
    heroImg: document.getElementById('course-hero-img'),
    description: document.getElementById('course-description'),
    objectivesWrap: document.getElementById('course-objectives-wrap'),
    objectives: document.getElementById('course-objectives'),
    requirementsWrap: document.getElementById('course-requirements-wrap'),
    requirements: document.getElementById('course-requirements'),
    curriculum: document.getElementById('course-curriculum'),
    progressBlock: document.getElementById('course-progress-block'),
    progressBar: document.getElementById('course-progress-bar'),
    progressPct: document.getElementById('course-progress-pct'),
    progressCount: document.getElementById('course-progress-count'),
    priceBlock: document.getElementById('course-price-block'),
    priceLabel: document.getElementById('course-price-label'),
    enrollFeedback: document.getElementById('course-enroll-feedback'),
    ctaBtn: document.getElementById('course-cta-btn'),
    includes: document.getElementById('course-includes'),
    instructorDivider: document.getElementById('course-instructor-divider'),
    instructorWrap: document.getElementById('course-instructor-wrap'),
    instructorAvatar: document.getElementById('course-instructor-avatar'),
    instructorName: document.getElementById('course-instructor-name'),
    contentSection: document.getElementById('course-content-section'),
    notFound: document.getElementById('course-not-found'),
  };

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', 'all-levels': 'All levels' };

  function metaSpan(icon, text) {
    return `<span><i class="fa-solid ${icon}"></i> <span>${esc(text)}</span></span>`;
  }

  function lessonIcon(l) {
    if (l.completed) return { bg: 'var(--s21-primary-light)', color: 'var(--s21-primary)', inner: '<i class="fa-solid fa-check"></i>' };
    const icons = { video: 'fa-circle-play', pdf: 'fa-file-pdf', quiz: 'fa-circle-question', text: 'fa-book-open' };
    return { bg: '#F1F3F5', color: '#8A93A0', inner: `<i class="fa-solid ${icons[l.content_type] || 'fa-book-open'}"></i>` };
  }

  function renderCurriculum(lessons, enrolled, isFree) {
    if (!lessons.length) {
      els.curriculum.innerHTML = '<div class="p-3 text-soft" style="font-size:.85rem">Lessons are being prepared for this course.</div>';
      return;
    }
    els.curriculum.innerHTML = lessons.map((l, i) => {
      const icon = lessonIcon(l);
      const canOpen = enrolled || l.is_preview;
      const durationLabel = l.duration_seconds
        ? `${Math.floor(l.duration_seconds / 60)}:${String(l.duration_seconds % 60).padStart(2, '0')}`
        : (l.content_type === 'quiz' ? 'Quiz' : l.content_type.charAt(0).toUpperCase() + l.content_type.slice(1));
      const action = canOpen
        ? `<a href="lesson.html?id=${l.id}" class="btn-s21 ${l.completed ? '' : 'btn-s21-outline'}" style="padding:.4rem .9rem;font-size:.78rem">${l.completed ? 'Review' : 'Start'}</a>`
        : `<span class="text-soft" style="font-size:.78rem"><i class="fa-solid fa-lock"></i> Locked</span>`;
      return `
        <div class="d-flex align-items-center gap-3 p-3 ${i < lessons.length - 1 ? 'border-bottom' : ''}">
          <span class="d-flex align-items-center justify-content-center" style="width:34px;height:34px;border-radius:50%;background:${icon.bg};color:${icon.color};font-size:.85rem;flex-shrink:0">${icon.completed ? icon.inner : (i + 1)}</span>
          <div class="flex-grow-1">
            <div class="fw-bold" style="font-size:.92rem">${esc(l.title)}</div>
            <div class="text-soft" style="font-size:.78rem">${esc(durationLabel)}${l.is_preview ? ' · Free preview' : ''}</div>
          </div>
          ${action}
        </div>`;
    }).join('');
  }

  async function main() {
    if (!key) { els.notFound.style.display = ''; return; }

    let data;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(key)}`, { credentials: 'include' });
      if (!res.ok) { els.notFound.style.display = ''; return; }
      data = await res.json();
    } catch {
      els.notFound.style.display = '';
      return;
    }

    const { course, lessons, enrollment } = data;
    els.contentSection.style.display = '';

    document.title = `${course.title} — Smart21Brain`;
    els.crumb.textContent = course.title;
    els.badgeText.textContent = `${course.category_name || 'Course'} · ${LEVEL_LABELS[course.level] || course.level}`;
    els.title.textContent = course.title;
    els.tagline.textContent = course.description || '';
    els.description.textContent = course.description || 'No description yet.';
    if (course.thumbnail_url) els.heroImg.src = course.thumbnail_url;
    els.heroImg.alt = course.title;

    const metaBits = [];
    metaBits.push(metaSpan('fa-regular fa-clock', `${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`));
    if (course.age_range) metaBits.push(metaSpan('fa-child', `Ages ${course.age_range}`));
    if (course.language) metaBits.push(metaSpan('fa-language', course.language));
    els.metaRow.innerHTML = metaBits.join('');

    if (course.objectives && course.objectives.length) {
      els.objectives.innerHTML = course.objectives.map((o) =>
        `<div class="col-md-6"><i class="fa-solid fa-circle-check" style="color:var(--s21-primary)"></i> <span>${esc(o)}</span></div>`
      ).join('');
    } else {
      els.objectivesWrap.style.display = 'none';
    }

    if (course.requirements && course.requirements.length) {
      els.requirements.innerHTML = course.requirements.map((r) => `<li>${esc(r)}</li>`).join('');
    } else {
      els.requirementsWrap.style.display = 'none';
    }

    const isEnrolled = !!enrollment;
    const isActive = isEnrolled && enrollment.payment_status !== 'pending';
    renderCurriculum(lessons, isActive, course.is_free);

    // Sidebar: progress (if actively enrolled) or price (if not)
    if (isActive) {
      const total = lessons.length;
      const done = lessons.filter((l) => l.completed).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      els.progressBlock.style.display = '';
      els.progressBar.style.width = `${pct}%`;
      els.progressPct.textContent = `${pct}% complete`;
      els.progressCount.textContent = `${done} / ${total} lessons`;
    } else {
      els.priceBlock.style.display = '';
      els.priceLabel.textContent = course.is_free ? 'Free' : `TZS ${Number(course.price).toLocaleString()}`;
    }

    // Includes list — built from what's actually true about this course.
    const includes = [];
    includes.push(`<li><i class="fa-solid fa-clapperboard text-soft me-2"></i> ${lessons.length} lesson${lessons.length === 1 ? '' : 's'}</li>`);
    if (course.certificate_enabled) includes.push('<li><i class="fa-solid fa-award text-soft me-2"></i> Certificate on completion</li>');
    includes.push('<li><i class="fa-solid fa-infinity text-soft me-2"></i> Lifetime access</li>');
    els.includes.innerHTML = includes.join('');

    if (course.instructor_name) {
      els.instructorDivider.style.display = '';
      els.instructorWrap.style.display = '';
      els.instructorName.textContent = course.instructor_name;
      if (course.instructor_avatar_key) els.instructorAvatar.src = `/api/avatar/${encodeURIComponent(course.instructor_id)}`;
      else els.instructorAvatar.style.display = 'none';
    }

    setupCta(course, lessons, enrollment);
  }

  function setupCta(course, lessons, enrollment) {
    const btn = els.ctaBtn;
    btn.disabled = false;

    async function whoAmI() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        return res.ok ? (await res.json()).user : null;
      } catch { return null; }
    }

    if (enrollment && enrollment.payment_status !== 'pending') {
      // Already enrolled — CTA jumps into the first not-yet-completed lesson.
      const next = lessons.find((l) => !l.completed) || lessons[0];
      btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Continue learning</span>';
      btn.onclick = () => { if (next) window.location.href = `lesson.html?id=${next.id}`; };
      return;
    }

    if (enrollment && enrollment.payment_status === 'pending') {
      btn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> <span>Payment pending</span>';
      btn.disabled = true;
      els.enrollFeedback.style.display = '';
      els.enrollFeedback.textContent = 'This is a paid course. We\'ve recorded your enrollment — contact us to complete payment and unlock the lessons.';
      return;
    }

    btn.innerHTML = course.is_free
      ? '<i class="fa-solid fa-play"></i> <span>Enroll free</span>'
      : `<i class="fa-solid fa-cart-shopping"></i> <span>Enroll — TZS ${Number(course.price).toLocaleString()}</span>`;

    btn.onclick = async () => {
      const user = await whoAmI();
      if (!user) {
        els.enrollFeedback.style.display = '';
        els.enrollFeedback.innerHTML = 'Please <a href="login.html">sign in</a> first to enroll.';
        return;
      }
      btn.disabled = true;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Enrolling…</span>';
      try {
        const res = await fetch(`/api/courses/${course.id}/enroll`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || 'Could not enroll');
        els.enrollFeedback.style.display = '';
        els.enrollFeedback.textContent = out.message || 'Enrolled!';
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        els.enrollFeedback.style.display = '';
        els.enrollFeedback.textContent = err.message || 'Something went wrong — please try again.';
      }
    };
  }

  main();
})();
