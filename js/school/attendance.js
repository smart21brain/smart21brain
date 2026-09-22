/* Daily attendance: take attendance, view summaries and repeated-absence alerts. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;

  SC.modules.attendance = async (el) => {
    const { classes } = await SC.api.get('/classes');
    const active = classes.filter((c) => c.status === 'active');
    const canTake = SC.can('attendance.take');
    const firstWith = active.find((c) => c.current_students > 0) || active[0];
    const st = { class_id: firstWith ? firstWith.id : '', date: SC.today(), subject_id: '' };
    let sheet = null; let marks = {};

    const [sum, alerts] = await Promise.all([SC.api.get('/attendance/summary').catch(() => null), SC.api.get('/attendance/alerts').catch(() => null)]);
    const card = (label, r, icon) => SC.stat(icon, r && r.percent != null ? `${r.percent}%` : '—', label, r && r.percent != null ? `${r.present} present · ${r.absent} absent · ${r.late} late` : 'No attendance recorded', r && r.percent != null && r.percent < 75 ? 'red' : 'green');

    el.innerHTML = `${SC.pageHead('Attendance', canTake ? 'Choose a date and class, mark each student, then save' : 'View attendance records')}
      ${sum ? `<div class="sc-grid stats" style="margin-bottom:1.1rem">${card('Today', sum.day, 'fa-calendar-day')}${card('This week', sum.week, 'fa-calendar-week')}${card('This month', sum.month, 'fa-calendar')}</div>` : ''}
      ${alerts && alerts.alerts.length ? `<div class="sc-alert" style="margin-bottom:1.1rem"><i class="fa-solid fa-user-clock"></i><div><b>Repeated absences this month</b> (${alerts.threshold}+ sessions)<ul style="margin:.4rem 0 0;padding-left:1.1rem">${alerts.alerts.slice(0, 6).map((a) => `<li>${esc(a.message)} <span class="sc-muted">${esc(a.class_name || '')}</span> <a href="#student/${a.student_id}">View</a></li>`).join('')}</ul></div></div>` : ''}
      <div class="sc-card"><div class="sc-toolbar">
        <div class="sc-field"><label for="aDate">Date</label><input class="sc-input" id="aDate" type="date" value="${st.date}" max="${SC.today()}"></div>
        <div class="sc-field"><label for="aClass">Class</label><select class="sc-select" id="aClass">${active.map((c) => `<option value="${c.id}" ${String(c.id) === String(st.class_id) ? 'selected' : ''}>${esc(SC.classLabel(c))} (${c.current_students})</option>`).join('') || '<option value="">No classes</option>'}</select></div>
        <div class="sc-field"><label for="aSubj">Subject / session</label><select class="sc-select" id="aSubj"><option value="">Whole day (general)</option></select></div></div>
        <div id="aSheet">${active.length ? SC.skeleton(6) : SC.empty('fa-school', 'No classes to show', SC.state.role === 'teacher' ? 'You have not been assigned to a class yet. Ask your administrator.' : 'Create a class first.')}</div></div>`;

    const q = (s) => el.querySelector(s);
    async function loadSubjects() {
      const sel = q('#aSubj'); sel.innerHTML = '<option value="">Whole day (general)</option>'; st.subject_id = '';
      if (!st.class_id) return;
      try { const d = await SC.api.get(`/classes/${st.class_id}`); sel.innerHTML += d.subjects.map((s) => `<option value="${s.subject_id}">${esc(s.name)}</option>`).join(''); } catch (e) { /* optional */ }
    }
    async function loadSheet() {
      const box = q('#aSheet'); if (!st.class_id) return;
      box.innerHTML = SC.skeleton(6);
      try {
        sheet = await SC.api.get('/attendance/sheet' + SC.qs({ class_id: st.class_id, date: st.date, subject_id: st.subject_id }));
      } catch (e) { box.innerHTML = SC.errorBox(e); return; }
      marks = Object.fromEntries(sheet.students.map((s) => [s.id, s.status]));
      draw();
    }
    function counts() { const c = { present: 0, absent: 0, late: 0, none: 0 }; sheet.students.forEach((s) => { c[marks[s.id] || 'none'] += 1; }); return c; }
    function draw() {
      const box = q('#aSheet'); const editable = sheet.can_take;
      if (!sheet.students.length) { box.innerHTML = SC.empty('fa-user-slash', 'No students in this class', 'Register students into this class, then come back to take attendance.'); return; }
      const c = counts();
      box.innerHTML = `<div class="sc-spread" style="margin-bottom:.9rem"><div class="sc-row" style="gap:.5rem"><span class="sc-chip present">Present <b id="cP">${c.present}</b></span><span class="sc-chip absent">Absent <b id="cA">${c.absent}</b></span><span class="sc-chip late">Late <b id="cL">${c.late}</b></span><span class="sc-chip">Not marked <b id="cN">${c.none}</b></span>${sheet.already_saved ? '<span class="sc-chip info"><i class="fa-solid fa-circle-info"></i> Already saved — changes will update it</span>' : ''}</div>
        ${editable ? '<div class="sc-row"><button class="sc-btn ghost sm" data-act="allp"><i class="fa-solid fa-check-double"></i> Mark all present</button><button class="sc-btn ghost sm" data-act="alla"><i class="fa-solid fa-xmark"></i> Mark all absent</button></div>' : ''}</div>
        ${SC.table([
          { label: '#', render: (s) => sheet.students.indexOf(s) + 1 },
          { label: 'Student', render: (s) => `<div class="sc-person">${SC.avatar('students', s.id, s.full_name, false)}<span class="nm">${esc(s.full_name)}</span></div>` },
          { label: 'Student ID', render: (s) => esc(s.admission_no) },
          { label: 'Attendance', render: (s) => editable ? `<div class="sc-seg" data-sid="${s.id}">${['present', 'absent', 'late'].map((k) => `<button type="button" class="${k} ${marks[s.id] === k ? 'on' : ''}" data-act="mark" data-sid="${s.id}" data-k="${k}">${SC.cap(k)}</button>`).join('')}</div>` : (marks[s.id] ? SC.chip(marks[s.id]) : '<span class="sc-muted">Not marked</span>') },
        ], sheet.students, { cls: 'compact' })}
        ${editable ? `<div class="sc-row" style="justify-content:flex-end;margin-top:1rem"><button class="sc-btn primary lg" data-act="save"><i class="fa-solid fa-floppy-disk"></i> Save attendance</button></div>` : ''}`;
    }
    const refreshCounters = () => { const c = counts(); q('#cP').textContent = c.present; q('#cA').textContent = c.absent; q('#cL').textContent = c.late; q('#cN').textContent = c.none; };

    SC.delegate(el, {
      mark: (b) => {
        marks[b.dataset.sid] = b.dataset.k;
        b.closest('.sc-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); refreshCounters();
      },
      allp: () => { sheet.students.forEach((s) => { marks[s.id] = 'present'; }); draw(); },
      alla: async () => {
        if (!(await SC.confirm({ title: 'Mark everyone absent?', message: 'All students in this list will be set to Absent. You can still change individual students before saving.', confirmText: 'Yes, mark all absent', danger: false, icon: 'fa-user-xmark' }))) return;
        sheet.students.forEach((s) => { marks[s.id] = 'absent'; }); draw();
      },
      save: async (b) => {
        const records = sheet.students.filter((s) => marks[s.id]).map((s) => ({ student_id: s.id, status: marks[s.id] }));
        const missing = sheet.students.length - records.length;
        if (!records.length) return SC.toast('Please mark at least one student first.', 'warn');
        if (missing && !(await SC.confirm({ title: 'Some students are not marked', message: `${missing} student${missing === 1 ? ' is' : 's are'} not marked and will be skipped. Save anyway?`, confirmText: 'Save anyway', danger: false, icon: 'fa-floppy-disk' }))) return;
        b.disabled = true; b.innerHTML = '<span class="sc-spin"></span> Saving…';
        try { const r = await SC.api.post('/attendance', { class_id: Number(st.class_id), date: st.date, subject_id: st.subject_id ? Number(st.subject_id) : null, records });
          SC.toast(`Attendance saved. ${r.present} present, ${r.absent} absent, ${r.late} late.`); sheet.already_saved = true; draw(); }
        catch (e) { SC.fail(e); b.disabled = false; b.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save attendance'; }
      },
    });
    q('#aDate').addEventListener('change', (e) => { if (e.target.value > SC.today()) { e.target.value = SC.today(); SC.toast('You cannot take attendance for a future date.', 'warn'); } st.date = e.target.value || SC.today(); loadSheet(); });
    q('#aClass').addEventListener('change', async (e) => { st.class_id = e.target.value; await loadSubjects(); loadSheet(); });
    q('#aSubj').addEventListener('change', (e) => { st.subject_id = e.target.value; loadSheet(); });
    if (active.length) { await loadSubjects(); await loadSheet(); }
  };
})();
