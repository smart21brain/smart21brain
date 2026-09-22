/* Notifications / announcements. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const TYPES = [['general', 'General announcement'], ['fee_reminder', 'Fee reminder'], ['attendance_warning', 'Attendance warning'], ['exam_announcement', 'Examination announcement'], ['class_announcement', 'Class announcement']];
  const AUD = [['all', 'Everyone (all students, parents and staff)'], ['parents', 'All parents'], ['teachers', 'All teachers'], ['class', 'A specific class'], ['student', 'A specific student']];
  const typeText = (t) => (TYPES.find((x) => x[0] === t) || [0, SC.cap(t)])[1];

  async function composeModal(done) {
    const lk = await SC.lookups(); let student = null;
    const back = SC.formModal({
      title: 'Create announcement', size: 'wide', submit: 'Send notification',
      body: `<div class="cols">${SC.f.select('type', 'Type', TYPES, { required: true, value: 'general', noBlank: true })}${SC.f.select('audience', 'Send to', AUD, { required: true, value: 'all', noBlank: true })}</div>
        <div id="audClass" class="sc-hide">${SC.f.select('class_id', 'Class', SC.opts.classes(lk, false), { placeholder: 'Choose a class' })}</div>
        <div id="audStudent" class="sc-hide"><div class="sc-field"><label for="nsQ">Student</label><input class="sc-input" id="nsQ" type="search" placeholder="Type the student's name or ID…" autocomplete="off"><div id="nsRes" class="sc-list"></div><div id="nsPicked" class="sc-small" style="margin-top:.4rem"></div></div></div>
        ${SC.f.input('title', 'Title', { required: true, attr: { maxlength: 120 }, placeholder: 'e.g. Parents meeting on Saturday' })}${SC.f.textarea('message', 'Message', { required: true, rows: 5, placeholder: 'Write the message people will read…' })}`,
      onOpen: (form) => {
        const aud = form.querySelector('[name=audience]');
        aud.addEventListener('change', () => { form.querySelector('#audClass').classList.toggle('sc-hide', aud.value !== 'class'); form.querySelector('#audStudent').classList.toggle('sc-hide', aud.value !== 'student'); });
        const run = SC.debounce(async () => {
          const q = form.querySelector('#nsQ').value.trim(); const box = form.querySelector('#nsRes'); if (q.length < 2) { box.innerHTML = ''; return; }
          let d; try { d = await SC.api.get('/students' + SC.qs({ q, limit: 5 })); } catch (e) { box.innerHTML = `<div class="sc-form-error show">${esc(e.message)}</div>`; return; }
          box.innerHTML = d.students.map((s) => `<div class="sc-spread"><span>${esc(s.full_name)} <span class="sc-muted sc-small">${esc(s.admission_no)}</span></span><button type="button" class="sc-btn primary sm" data-pick="${s.id}" data-n="${esc(s.full_name)}">Choose</button></div>`).join('') || '<div class="sc-muted sc-small">No student found.</div>';
        }, 250);
        form.querySelector('#nsQ').addEventListener('input', run);
        form.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; student = Number(b.dataset.pick); form.querySelector('#nsPicked').innerHTML = `<span class="sc-chip ok"><i class="fa-solid fa-check"></i> ${esc(b.dataset.n)}</span>`; form.querySelector('#nsRes').innerHTML = ''; });
      },
      onSubmit: async (f) => {
        if (f.audience === 'class' && !f.class_id) throw new Error('Please choose the class to notify.');
        if (f.audience === 'student' && !student) throw new Error('Please choose the student to notify.');
        await SC.api.post('/notifications', { ...f, student_id: student });
        SC.closeModal(); SC.toast('Notification sent successfully.'); done();
      },
    });
    return back;
  }

  SC.modules.notifications = async (el, args) => {
    const st = { type: '' }; const canSend = SC.can('announcements.manage');
    async function load() {
      const d = await SC.api.get('/notifications' + SC.qs({ type: st.type, limit: 50 }));
      el.innerHTML = `${SC.pageHead('Notifications', SC.isParent() ? 'Messages from the school' : 'Announcements and alerts', `${d.unread ? '<button class="sc-btn ghost" data-act="readall"><i class="fa-solid fa-check-double"></i> Mark all as read</button>' : ''}${canSend ? '<button class="sc-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> Create Announcement</button>' : ''}`)}
        <div class="sc-card"><div class="sc-toolbar"><select class="sc-select" id="nType"><option value="">All types</option>${TYPES.map(([v, l]) => `<option value="${v}" ${st.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="sc-muted sc-small">${d.unread} unread</span></div>
        ${d.notifications.length ? `<div class="sc-list">${d.notifications.map((n) => `<div class="sc-notice-row ${n.is_read ? '' : 'unread'}"><div class="ico"><i class="fa-solid ${SC.noticeIcon(n.type)}"></i></div><div style="flex:1;min-width:0"><div class="sc-spread"><b>${esc(n.title)}</b><span class="sc-small sc-muted sc-nowrap">${SC.dateTime(n.created_at)}</span></div>
          <div class="sc-row" style="gap:.4rem;margin:.2rem 0"><span class="sc-chip info">${esc(typeText(n.type))}</span><span class="sc-chip">${esc(n.audience === 'class' ? 'Class: ' + (n.class_label || '') : n.audience === 'student' ? 'Student: ' + (n.student_name || '') : SC.cap(n.audience))}</span></div>
          <div style="white-space:pre-wrap">${esc(n.message)}</div><div class="sc-row" style="margin-top:.4rem">${n.is_read ? '' : `<button class="sc-btn ghost sm" data-act="read" data-id="${n.id}"><i class="fa-solid fa-check"></i> Mark as read</button>`}${canSend ? `<button class="sc-btn danger-ghost sm" data-act="del" data-id="${n.id}"><i class="fa-solid fa-trash"></i></button>` : ''}</div></div></div>`).join('')}</div>` : SC.empty('fa-bell-slash', 'No notifications', 'When the school sends a message it will show up here.', canSend ? '<button class="sc-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> Create Announcement</button>' : '')}</div>`;
      el.querySelector('#nType').addEventListener('change', (e) => { st.type = e.target.value; load(); });
      SC.refreshBadge();
    }
    SC.delegate(el, {
      new: () => composeModal(load),
      read: async (b) => { await SC.api.put(`/notifications/${b.dataset.id}/read`); load(); },
      readall: async () => { await SC.api.put('/notifications/read-all'); load(); },
      del: async (b) => { if (!(await SC.confirm({ title: 'Delete this notification?', message: 'It will disappear for everyone who received it.', confirmText: 'Yes, delete' }))) return; await SC.api.del(`/notifications/${b.dataset.id}`); SC.toast('Notification deleted.'); load(); },
    });
    await load();
    if (args[0] === 'new' && canSend) { history.replaceState(null, '', '#notifications'); SC.after(() => composeModal(load)); }
  };
})();
