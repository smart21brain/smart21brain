/* Student registration / edit form (includes parent-guardian picker and success screen). */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const RELATIONS = ['Father', 'Mother', 'Guardian', 'Grandparent', 'Uncle / Aunt', 'Sibling', 'Other'];

  SC.modules.studentForm = async (el, editId) => {
    if (editId ? !SC.can('students.edit') : !SC.can('students.create')) { el.innerHTML = `<div class="sc-card">${SC.empty('fa-lock', 'Not allowed', 'You do not have permission to do this. Ask your school administrator.')}</div>`; return; }
    const lk = await SC.lookups();
    const isEdit = !!editId;
    let s = null;
    if (isEdit) s = (await SC.api.get(`/students/${editId}`)).student;
    SC.setTitle(isEdit ? `Edit ${s.full_name}` : 'Register Student', isEdit ? s.admission_no : 'Fill in the form — fields marked * are required');

    // guardians state (kept in memory; snapshot() copies current form values back)
    let guardians = isEdit
      ? s.parents.map((p) => ({ parent_id: p.id, label: `${p.full_name} · ${p.phone}`, relationship: p.relationship }))
      : [{ full_name: '', phone: '', alt_phone: '', email: '', address: '', occupation: '', relationship: 'Father' }];
    let selectedSubjects = isEdit ? s.subjects.map((x) => x.id) : null;

    const classOpts = SC.opts.classes(lk, true);
    const curClass = s && s.class ? s.class.id : '';
    el.innerHTML = `${SC.pageHead(isEdit ? 'Edit student' : 'Register a new student', isEdit ? 'Update the student\'s details' : 'A Student ID is created automatically when you save.', `<a class="sc-btn ghost" href="#${isEdit ? 'student/' + editId : 'students'}"><i class="fa-solid fa-arrow-left"></i> Back</a>`)}
      <div id="formArea"><form class="sc-stack" id="stForm" novalidate>
        <div class="sc-form-error" role="alert"></div>
        <div class="sc-card sc-form">${SC.f.section('fa-user', 'Personal information')}
          <div class="cols">${SC.f.input('adm', 'Student ID / Admission number', { value: isEdit ? s.admission_no : '', attr: { readonly: true }, hint: isEdit ? '' : 'Created automatically when you save.', placeholder: 'Automatic' })}${SC.f.select('gender', 'Gender', SC.opts.gender, { required: true, value: s ? s.gender : '' })}</div>
          <div class="cols-3">${SC.f.input('first_name', 'First name', { required: true, value: s ? s.first_name : '', attr: { maxlength: 60, autocomplete: 'off' } })}${SC.f.input('middle_name', 'Middle name', { value: s ? s.middle_name || '' : '' })}${SC.f.input('last_name', 'Last name', { required: true, value: s ? s.last_name : '' })}</div>
          <div class="cols-3">${SC.f.input('date_of_birth', 'Date of birth', { type: 'date', value: s ? s.date_of_birth || '' : '', attr: { max: SC.today() } })}${SC.f.input('nationality', 'Nationality', { value: s ? s.nationality || '' : 'Tanzanian' })}${SC.f.input('phone', 'Phone number', { type: 'tel', value: s ? s.phone || '' : '', placeholder: 'Optional' })}</div>
          <div class="cols">${SC.f.input('email', 'Email', { type: 'email', value: s ? s.email || '' : '', placeholder: 'Optional' })}${SC.f.input('address', 'Address', { value: s ? s.address || '' : '' })}</div>
          <div class="sc-field"><label>Student photo</label>${SC.photoField('photo', isEdit && s.has_photo ? SC.photoUrl('students', s.id) : '')}</div></div>

        <div class="sc-card sc-form">${SC.f.section('fa-graduation-cap', 'Academic information')}
          <div class="cols-3">${SC.f.select('class_id', 'Class', classOpts, { required: true, value: curClass, placeholder: 'Choose a class' })}${SC.f.input('stream', 'Stream', { attr: { readonly: true }, placeholder: 'From the class' })}${SC.f.input('year', 'Academic year', { attr: { readonly: true }, value: s && s.class ? s.class.year_name : '', placeholder: 'From the class' })}</div>
          <div class="sc-field"><label>Subjects</label><div id="subjBox" class="sc-row" style="gap:.5rem 1.2rem"><span class="sc-muted sc-small">Choose a class to see its subjects.</span></div><span class="hint">All subjects of the class are selected by default. Untick the ones this student does not take.</span></div>
          <div class="cols-3">${SC.f.input('admission_date', 'Admission date', { type: 'date', value: s ? s.admission_date : SC.today(), attr: { max: SC.today() } })}${SC.f.select('status', 'Student status', SC.opts.status, { value: s ? s.status : 'active', noBlank: true })}${SC.f.input('previous_school', 'Previous school', { value: s ? s.previous_school || '' : '', placeholder: 'Optional' })}</div></div>

        <div class="sc-card sc-form"><div class="sc-spread">${SC.f.section('fa-people-roof', 'Parent / guardian information')}<span class="sc-small sc-muted">One parent can have many children — pick an existing parent for brothers and sisters.</span></div>
          <div id="gBox" class="sc-stack"></div>
          <div class="sc-row"><button type="button" class="sc-btn ghost sm" data-act="gnew"><i class="fa-solid fa-plus"></i> Add another guardian</button><button type="button" class="sc-btn soft sm" data-act="gfind"><i class="fa-solid fa-magnifying-glass"></i> Choose an existing parent</button></div></div>

        <div class="sc-row" style="justify-content:flex-end;position:sticky;bottom:0;padding:.8rem 0;background:linear-gradient(0deg,var(--sc-bg) 60%,transparent)">
          <a class="sc-btn ghost" href="#${isEdit ? 'student/' + editId : 'students'}">Cancel</a><button type="submit" class="sc-btn primary lg" id="saveBtn"><i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Save changes' : 'Register student'}</button></div>
      </form></div>`;

    const form = el.querySelector('#stForm');
    SC.wirePhotoField(form);
    form.querySelectorAll('input[type=tel]').forEach((i) => { i.dataset.kind = 'phone'; });

    // ---------- subjects by class
    async function loadSubjects(classId, keep) {
      const box = form.querySelector('#subjBox'); const cls = lk.classes.find((c) => String(c.id) === String(classId));
      form.querySelector('[name=stream]').value = cls ? cls.stream || '—' : '';
      const yr = cls && (lk.years || []).find((y) => y.id === cls.academic_year_id); form.querySelector('[name=year]').value = yr ? yr.name : '';
      if (!classId) { box.innerHTML = '<span class="sc-muted sc-small">Choose a class to see its subjects.</span>'; return; }
      box.innerHTML = '<span class="sc-spin"></span>';
      const d = await SC.api.get(`/classes/${classId}`);
      const active = d.subjects.filter((x) => (lk.subjects.find((z) => z.id === x.subject_id) || {}).status !== 'inactive');
      if (!active.length) { box.innerHTML = '<span class="sc-alert" style="width:100%"><i class="fa-solid fa-circle-info"></i><span>This class has no subjects yet. Add subjects to the class in <a href="#classes">Classes</a>.</span></span>'; return; }
      box.innerHTML = active.map((x) => SC.f.check('subject_ids[]', esc(x.name), keep ? (selectedSubjects || []).includes(x.subject_id) : true, x.subject_id)).join('');
    }
    form.querySelector('[name=class_id]').addEventListener('change', (e) => { selectedSubjects = null; loadSubjects(e.target.value, false).catch(SC.fail); });
    if (curClass) loadSubjects(curClass, true).catch(SC.fail);

    // ---------- guardians
    const gBox = form.querySelector('#gBox');
    const snapshot = () => {
      guardians = guardians.map((g, i) => {
        if (g.parent_id) { const r = form.querySelector(`[name=g${i}_relationship]`); return { ...g, relationship: r ? r.value : g.relationship }; }
        const v = (k) => { const n = form.querySelector(`[name=g${i}_${k}]`); return n ? n.value : ''; };
        return { full_name: v('full_name'), phone: v('phone'), alt_phone: v('alt_phone'), email: v('email'), address: v('address'), occupation: v('occupation'), relationship: v('relationship') };
      });
    };
    const relSelect = (i, val) => SC.f.select(`g${i}_relationship`, 'Relationship', RELATIONS.map((r) => [r, r]), { value: RELATIONS.includes(val) ? val : 'Guardian', noBlank: true, required: true });
    function renderGuardians() {
      gBox.innerHTML = guardians.map((g, i) => g.parent_id
        ? `<div class="sc-card flat sc-form" style="background:var(--sc-primary-50)"><div class="sc-spread"><div class="sc-person"><span class="sc-avatar">${esc(SC.initials(g.label))}</span><div><div class="nm">${esc(g.label)}</div><div class="sb sc-muted">Existing parent${i === 0 ? ' · primary contact' : ''}</div></div></div>${guardians.length > 1 ? `<button type="button" class="sc-btn danger-ghost sm" data-act="gdel" data-i="${i}"><i class="fa-solid fa-xmark"></i> Remove</button>` : ''}</div><div class="cols">${relSelect(i, g.relationship)}</div></div>`
        : `<div class="sc-card flat sc-form" style="background:var(--sc-surface-2)"><div class="sc-spread"><b>${i === 0 ? 'Primary parent / guardian' : 'Additional guardian'}</b>${guardians.length > 1 ? `<button type="button" class="sc-btn danger-ghost sm" data-act="gdel" data-i="${i}"><i class="fa-solid fa-xmark"></i> Remove</button>` : ''}</div>
          <div class="cols">${SC.f.input(`g${i}_full_name`, 'Parent / guardian name', { required: true, value: g.full_name })}${relSelect(i, g.relationship)}</div>
          <div class="cols">${SC.f.input(`g${i}_phone`, 'Phone number', { type: 'tel', required: true, value: g.phone, placeholder: '+255 …', attr: { 'data-kind': 'phone' } })}${SC.f.input(`g${i}_alt_phone`, 'Alternative phone', { type: 'tel', value: g.alt_phone, attr: { 'data-kind': 'phone' } })}</div>
          <div class="cols">${SC.f.input(`g${i}_email`, 'Email', { type: 'email', value: g.email, placeholder: 'Optional' })}${SC.f.input(`g${i}_occupation`, 'Occupation', { value: g.occupation })}</div>
          ${SC.f.input(`g${i}_address`, 'Address', { value: g.address })}</div>`).join('');
    }
    renderGuardians();

    const pickExisting = () => {
      const back = SC.modal('Choose an existing parent', `<input class="sc-input" id="pQ" type="search" placeholder="Type a name or phone number…" autocomplete="off"><div id="pRes" style="margin-top:.8rem" class="sc-list"><div class="sc-muted sc-small">Start typing to search…</div></div>`);
      const run = SC.debounce(async () => {
        const q = back.querySelector('#pQ').value.trim(); const box = back.querySelector('#pRes');
        if (q.length < 2) { box.innerHTML = '<div class="sc-muted sc-small">Type at least 2 letters.</div>'; return; }
        try {
          const d = await SC.api.get('/parents' + SC.qs({ q, limit: 8 }));
          box.innerHTML = d.parents.length ? d.parents.map((p) => `<div class="sc-spread"><div><b>${esc(p.full_name)}</b><div class="sc-small sc-muted">${esc(p.phone)}${p.children ? ' · Children: ' + esc(p.children) : ''}</div></div><button class="sc-btn primary sm" data-pick="${p.id}" data-label="${esc(p.full_name)} · ${esc(p.phone)}">Choose</button></div>`).join('') : '<div class="sc-muted">No parent found. Close this window and fill in the new parent\'s details instead.</div>';
        } catch (e) { box.innerHTML = `<div class="sc-form-error show">${esc(e.message)}</div>`; }
      }, 250);
      back.querySelector('#pQ').addEventListener('input', run);
      back.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        snapshot();
        if (guardians.some((g) => String(g.parent_id) === b.dataset.pick)) { SC.toast('This parent is already added.', 'warn'); return; }
        // replace an untouched blank first guardian, otherwise append
        if (guardians.length === 1 && !guardians[0].parent_id && !guardians[0].full_name && !guardians[0].phone) guardians = [];
        guardians.push({ parent_id: Number(b.dataset.pick), label: b.dataset.label, relationship: 'Guardian' });
        SC.closeModal(); renderGuardians();
      });
    };
    SC.delegate(form, {
      gnew: () => { if (guardians.length >= 4) return SC.toast('A student can have up to 4 guardians.', 'warn'); snapshot(); guardians.push({ full_name: '', phone: '', alt_phone: '', email: '', address: '', occupation: '', relationship: 'Mother' }); renderGuardians(); },
      gfind: pickExisting,
      gdel: (b) => { snapshot(); guardians.splice(Number(b.dataset.i), 1); renderGuardians(); },
    });

    // ---------- submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = form.querySelector('.sc-form-error'); errBox.classList.remove('show');
      if (!SC.validate(form)) return SC.toast('Please fix the highlighted fields.', 'warn');
      snapshot();
      const f = SC.formData(form);
      const payload = {
        first_name: f.first_name, middle_name: f.middle_name, last_name: f.last_name, gender: f.gender, date_of_birth: f.date_of_birth, nationality: f.nationality, phone: f.phone, email: f.email, address: f.address,
        previous_school: f.previous_school, admission_date: f.admission_date, status: f.status, class_id: f.class_id, subject_ids: (f.subject_ids || []).map(Number),
        guardians: guardians.map((g, i) => ({ ...g, is_primary: i === 0 })),
      };
      if (!payload.subject_ids.length && form.querySelector('#subjBox input')) { errBox.textContent = 'Please choose at least one subject for this student.'; errBox.classList.add('show'); errBox.scrollIntoView({ block: 'center' }); return; }
      const btn = form.querySelector('#saveBtn'); const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="sc-spin"></span> Saving…';
      try {
        const res = isEdit ? await SC.api.put(`/students/${editId}`, payload) : await SC.api.post('/students', payload);
        const id = isEdit ? editId : res.id;
        let photoOk = true;
        try { await SC.uploadPhoto(`/students/${id}/photo`, form); } catch (pe) { photoOk = false; SC.toast(`Saved, but the photo was not uploaded: ${pe.message}`, 'warn'); }
        if (isEdit) { SC.toast('Student updated successfully.'); location.hash = `student/${id}`; return; }
        success(el, res, photoOk);
      } catch (err) {
        errBox.textContent = err.message; errBox.classList.add('show'); errBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
        btn.disabled = false; btn.innerHTML = label;
      }
    });
  };

  function success(el, res) {
    SC.toast('Student registered successfully.');
    el.querySelector('#formArea').innerHTML = `<div class="sc-card sc-center" style="max-width:560px;margin:2rem auto;padding:2.2rem 1.4rem"><div class="sc-empty" style="padding:0 0 1rem"><div class="ico" style="background:var(--sc-ok-bg);color:var(--sc-ok)"><i class="fa-solid fa-circle-check"></i></div><h4 style="font-size:1.35rem">Student registered successfully.</h4><p style="margin:0 auto">${esc(res.full_name)} has been added to the school.</p></div>
      <div style="background:var(--sc-primary-50);border-radius:16px;padding:1rem;margin:.4rem 0 1.4rem"><div class="sc-muted sc-small">Student ID</div><div style="font-family:var(--sc-font-display);font-size:1.7rem;font-weight:700;color:var(--sc-primary)">${esc(res.admission_no)}</div></div>
      <div class="sc-row" style="justify-content:center"><a class="sc-btn primary" href="#student/${res.id}"><i class="fa-solid fa-eye"></i> View Student</a><button class="sc-btn ghost" data-act="idc"><i class="fa-solid fa-id-card"></i> Print ID Card</button><a class="sc-btn ghost" href="#student/new" data-act="again"><i class="fa-solid fa-user-plus"></i> Register Another Student</a></div></div>`;
    SC.delegate(el, { idc: () => SC.idCardModal(res.id), again: () => { location.hash = 'student/new'; SC.route(); } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
})();
