/* Teachers and parents / guardians. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const EMP = [['full_time', 'Full-time'], ['part_time', 'Part-time'], ['contract', 'Contract'], ['on_leave', 'On leave'], ['resigned', 'Resigned']];
  const empChip = (v) => SC.chip(v === 'resigned' ? 'inactive' : v === 'on_leave' ? 'warn' : 'active', (EMP.find((x) => x[0] === v) || [0, v])[1]);

  // =============================================================== teachers
  function teacherModal(t, done) {
    const isEdit = !!t;
    SC.formModal({
      title: isEdit ? 'Edit teacher' : 'Add teacher', size: 'wide', submit: isEdit ? 'Save changes' : 'Add teacher',
      body: `<div class="cols">${SC.f.input('full_name', 'Full name', { required: true, value: t ? t.full_name : '', placeholder: 'e.g. Mr. John Mushi' })}${SC.f.select('gender', 'Gender', SC.opts.gender, { value: t ? t.gender || '' : '' })}</div>
        <div class="cols">${SC.f.input('phone', 'Phone number', { type: 'tel', value: t ? t.phone || '' : '', placeholder: '+255 …' })}${SC.f.input('email', 'Email', { type: 'email', value: t ? t.email || '' : '' })}</div>
        <div class="cols">${SC.f.input('address', 'Address', { value: t ? t.address || '' : '' })}${SC.f.select('employment_status', 'Employment status', EMP, { value: t ? t.employment_status : 'full_time', noBlank: true })}</div>
        <div class="sc-field"><label>Photo</label>${SC.photoField('photo', t && t.has_photo ? SC.photoUrl('teachers', t.id) : '')}</div>
        ${isEdit ? '' : `<div class="sc-card flat" style="background:var(--sc-primary-50)">${SC.f.check('create_login', '<b>Give this teacher a login</b> so they can take attendance and enter marks')}
          <div id="loginBox" class="sc-hide" style="margin-top:.8rem">${SC.f.input('password', 'Temporary password', { type: 'text', placeholder: 'At least 8 characters', hint: 'Share it with the teacher. If they already have a Smart21Brain account, leave this empty and they keep their own password. The email above is their username.' })}</div></div>`}`,
      onOpen: (form) => {
        SC.wirePhotoField(form);
        const cb = form.querySelector('[name=create_login]');
        if (cb) cb.addEventListener('change', () => form.querySelector('#loginBox').classList.toggle('sc-hide', !cb.checked));
      },
      onSubmit: async (f, form) => {
        if (f.create_login && !f.email) throw new Error('An email address is needed to create a login for the teacher.');
        const body = { full_name: f.full_name, gender: f.gender, phone: f.phone, email: f.email, address: f.address, employment_status: f.employment_status, create_login: !!f.create_login, password: f.password };
        const r = isEdit ? await SC.api.put(`/teachers/${t.id}`, body) : await SC.api.post('/teachers', body);
        try { await SC.uploadPhoto(`/teachers/${isEdit ? t.id : r.id}/photo`, form); } catch (e) { SC.toast(`Saved, but the photo was not uploaded: ${e.message}`, 'warn'); }
        SC.closeModal(); await SC.refreshLookups(); SC.toast(isEdit ? 'Teacher updated successfully.' : 'Teacher added successfully.'); done(r);
      },
    });
  }

  SC.modules.teachers = async (el, args) => {
    const st = { q: '' };
    el.innerHTML = `${SC.pageHead('Teachers', 'Your teaching staff, their classes and subjects', SC.can('teachers.manage') ? '<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> Add Teacher</button>' : '')}
      <div class="sc-card"><div class="sc-toolbar"><input class="sc-input grow" id="tQ" type="search" placeholder="Search by name, phone or email…"></div><div id="tList">${SC.skeleton(5)}</div></div>`;
    const box = el.querySelector('#tList');
    async function load() {
      const { teachers } = await SC.api.get('/teachers' + SC.qs(st));
      box.innerHTML = SC.table([
        { label: 'Teacher', render: (t) => `<a href="#teacher/${t.id}" class="sc-person">${SC.avatar('teachers', t.id, t.full_name, t.has_photo)}<span class="nm" style="color:var(--sc-text)">${esc(t.full_name)}</span></a>` },
        { label: 'Contact', render: (t) => `${esc(t.phone || '—')}<div class="sc-small sc-muted">${esc(t.email || '')}</div>` },
        { label: 'Subjects', render: (t) => `<span class="sc-small sc-wrap">${esc(t.subjects ? t.subjects.split(',').slice(0, 3).join(', ') + (t.subjects.split(',').length > 3 ? '…' : '') : '—')}</span>` },
        { label: 'Classes', render: (t) => t.class_count },
        { label: 'Status', render: (t) => empChip(t.employment_status) },
        { label: 'Login', render: (t) => (t.user_id ? SC.chip('active', 'Has login') : '<span class="sc-muted sc-small">No login</span>') },
        { label: '', cls: 'end', render: (t) => `<div class="sc-actions-cell"><a class="sc-btn ghost sm" href="#teacher/${t.id}"><i class="fa-solid fa-eye"></i></a>${SC.can('teachers.manage') ? `<button class="sc-btn ghost sm" data-act="edit" data-id="${t.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="del" data-id="${t.id}" data-name="${esc(t.full_name)}"><i class="fa-solid fa-trash"></i></button>` : ''}</div>` },
      ], teachers, { empty: SC.empty('fa-chalkboard-user', st.q ? 'No teacher found' : 'No teachers yet', st.q ? 'Try a different name.' : 'Add your first teacher to assign classes and subjects.', !st.q && SC.can('teachers.manage') ? '<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> Add Teacher</button>' : '') });
      box._data = teachers;
    }
    el.querySelector('#tQ').addEventListener('input', SC.debounce((e) => { st.q = e.target.value.trim(); load().catch(SC.fail); }, 250));
    SC.delegate(el, {
      add: () => teacherModal(null, () => load()),
      edit: async (b) => { const { teacher } = await SC.api.get(`/teachers/${b.dataset.id}`); teacherModal(teacher, () => load()); },
      del: async (b) => {
        if (!(await SC.confirm({ title: 'Delete this teacher?', message: `<b>${esc(b.dataset.name)}</b> will be removed and their login switched off. Classes and subjects they taught will have no teacher until you assign a new one.`, confirmText: 'Yes, delete teacher' }))) return;
        await SC.api.del(`/teachers/${b.dataset.id}`); await SC.refreshLookups(); SC.toast('Teacher deleted.'); load();
      },
    });
    await load();
    if (args[0] === 'new' && SC.can('teachers.manage')) { history.replaceState(null, '', '#teachers'); SC.after(() => teacherModal(null, () => load())); }
  };

  SC.modules.teacher = async (el, args) => {
    const d = await SC.api.get(`/teachers/${args[0]}`); const t = d.teacher;
    SC.setTitle(t.full_name, 'Teacher profile');
    el.innerHTML = `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-spread"><div class="sc-row" style="gap:1.2rem">${SC.avatar('teachers', t.id, t.full_name, t.has_photo, 'lg')}<div><h2 style="font-size:1.4rem">${esc(t.full_name)}</h2><div class="sc-row" style="margin:.4rem 0">${empChip(t.employment_status)}${t.has_login ? SC.chip('active', 'Has login') : SC.chip('inactive', 'No login')}</div><div class="sc-muted sc-small">${esc([t.phone, t.email].filter(Boolean).join(' · ') || 'No contact details')}</div></div></div>
      <div class="sc-row"><a class="sc-btn ghost sm" href="#teachers"><i class="fa-solid fa-arrow-left"></i> Back</a>${SC.can('teachers.manage') ? `${t.has_login ? '' : '<button class="sc-btn soft sm" data-act="login"><i class="fa-solid fa-key"></i> Give login</button>'}<button class="sc-btn primary sm" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>` : ''}</div></div></div>
      <div class="sc-grid stats" style="margin-bottom:1.1rem">${SC.stat('fa-school', new Set([...d.classes.map((c) => c.id), ...d.subjects.map((x) => x.class_id)]).size, 'Assigned classes')}${SC.stat('fa-book-open', new Set(d.subjects.map((x) => x.subject)).size, 'Assigned subjects', '', 'blue')}${SC.stat('fa-clipboard-user', d.attendance.sessions || 0, 'Attendance sessions taken', d.attendance.last_date ? 'Last: ' + SC.date(d.attendance.last_date) : 'None yet', 'green')}${SC.stat('fa-file-pen', d.exams.results_entered || 0, 'Marks entered', `${d.exams.exams_created || 0} examinations created`, 'amber')}</div>
      <div class="sc-grid cols-2"><div class="sc-card"><div class="sc-card-head"><h3>Class teacher of</h3></div>${SC.table([{ label: 'Class', render: (c) => `<b>${esc(SC.classLabel(c))}</b>` }, { label: 'Year', render: (c) => esc(c.year_name) }], d.classes, { empty: SC.empty('fa-school', 'Not a class teacher', 'Assign a class teacher in Classes.') })}</div>
      <div class="sc-card"><div class="sc-card-head"><h3>Subjects taught</h3></div>${SC.table([{ label: 'Subject', render: (x) => `<b>${esc(x.subject)}</b>` }, { label: 'Class', render: (x) => esc(SC.classLabel({ name: x.class_name, stream: x.stream })) }], d.subjects, { empty: SC.empty('fa-book-open', 'No subjects assigned', 'Assign this teacher to subjects in Classes.') })}</div></div>`;
    SC.delegate(el, {
      edit: () => teacherModal({ ...t, id: t.id }, () => SC.route()),
      login: () => SC.formModal({ title: `Give ${t.full_name} a login`, submit: 'Create login', body: `${SC.f.input('email', 'Email (username)', { type: 'email', required: true, value: t.email || '' })}${SC.f.input('password', 'Temporary password', { placeholder: 'At least 8 characters', hint: 'Leave empty only if they already have a Smart21Brain account.' })}`,
        onSubmit: async (f) => { await SC.api.post(`/teachers/${t.id}/login`, f); SC.closeModal(); SC.toast('Login created. Share the email and password with the teacher.'); SC.route(); } }),
    });
  };

  // =============================================================== parents
  function parentModal(p, done) {
    const isEdit = !!p;
    SC.formModal({
      title: isEdit ? 'Edit parent / guardian' : 'Register parent / guardian', size: 'wide', submit: isEdit ? 'Save changes' : 'Register parent',
      body: `<div class="cols">${SC.f.input('full_name', 'Full name', { required: true, value: p ? p.full_name : '' })}${SC.f.input('occupation', 'Occupation', { value: p ? p.occupation || '' : '' })}</div>
        <div class="cols">${SC.f.input('phone', 'Phone number', { type: 'tel', required: true, value: p ? p.phone : '', placeholder: '+255 …' })}${SC.f.input('alt_phone', 'Alternative phone', { type: 'tel', value: p ? p.alt_phone || '' : '' })}</div>
        <div class="cols">${SC.f.input('email', 'Email', { type: 'email', value: p ? p.email || '' : '' })}${SC.f.input('address', 'Address', { value: p ? p.address || '' : '' })}</div>
        ${isEdit ? '' : `<div class="sc-card flat" style="background:var(--sc-primary-50)">${SC.f.check('create_login', '<b>Give this parent portal access</b> to see attendance, fees and results')}<div id="loginBox" class="sc-hide" style="margin-top:.8rem">${SC.f.input('password', 'Temporary password', { placeholder: 'At least 8 characters', hint: 'The email above is their username. Leave empty if they already have a Smart21Brain account.' })}</div></div>`}
        <p class="sc-small sc-muted" style="margin:0">Link this parent to their children by choosing them when you register or edit a student.</p>`,
      onOpen: (form) => { const cb = form.querySelector('[name=create_login]'); if (cb) cb.addEventListener('change', () => form.querySelector('#loginBox').classList.toggle('sc-hide', !cb.checked)); },
      onSubmit: async (f) => {
        if (f.create_login && !f.email) throw new Error('An email address is needed to give portal access.');
        const body = { ...f, create_login: !!f.create_login };
        const r = isEdit ? await SC.api.put(`/parents/${p.id}`, body) : await SC.api.post('/parents', body);
        SC.closeModal(); SC.toast(isEdit ? 'Parent updated successfully.' : 'Parent registered successfully.'); done(r);
      },
    });
  }

  SC.modules.parents = async (el, args) => {
    const st = { q: '', page: 1, limit: 20 };
    el.innerHTML = `${SC.pageHead('Parents & Guardians', 'Every parent and the children linked to them', SC.can('parents.manage') ? '<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> Register Parent</button>' : '')}
      <div class="sc-card"><div class="sc-toolbar"><input class="sc-input grow" id="pQ" type="search" placeholder="Search by name, phone or email…"></div><div id="pList">${SC.skeleton(5)}</div></div>`;
    const box = el.querySelector('#pList');
    async function load() {
      const d = await SC.api.get('/parents' + SC.qs(st));
      box.innerHTML = SC.table([
        { label: 'Parent / guardian', render: (p) => `<a href="#parent/${p.id}" class="sc-person"><span class="sc-avatar">${esc(SC.initials(p.full_name))}</span><span><span class="nm" style="color:var(--sc-text)">${esc(p.full_name)}</span><div class="sb sc-muted">${esc(p.occupation || '')}</div></span></a>` },
        { label: 'Phone', render: (p) => `${esc(p.phone)}<div class="sc-small sc-muted">${esc(p.alt_phone || '')}</div>` },
        { label: 'Email', render: (p) => esc(p.email || '—') },
        { label: 'Children', render: (p) => p.children_count ? `<b>${p.children_count}</b> <span class="sc-small sc-muted">${esc((p.children || '').slice(0, 60))}</span>` : '<span class="sc-muted">None</span>' },
        { label: 'Portal', render: (p) => (p.user_id ? SC.chip('active', 'Has access') : '<span class="sc-muted sc-small">No access</span>') },
        { label: '', cls: 'end', render: (p) => `<div class="sc-actions-cell"><a class="sc-btn ghost sm" href="#parent/${p.id}"><i class="fa-solid fa-eye"></i></a>${SC.can('parents.manage') ? `<button class="sc-btn ghost sm" data-act="edit" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="del" data-id="${p.id}" data-name="${esc(p.full_name)}"><i class="fa-solid fa-trash"></i></button>` : ''}</div>` },
      ], d.parents, { empty: SC.empty('fa-people-roof', st.q ? 'No parent found' : 'No parents yet', st.q ? 'Try a different name or phone number.' : 'Parents are added automatically when you register a student, or you can add one here.') }) + SC.pager(d.page, d.limit, d.total);
      box._rows = d.parents;
    }
    el.querySelector('#pQ').addEventListener('input', SC.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load().catch(SC.fail); }, 250));
    SC.delegate(el, {
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      add: () => parentModal(null, () => load()),
      edit: (b) => parentModal(box._rows.find((x) => String(x.id) === b.dataset.id), () => load()),
      del: async (b) => {
        if (!(await SC.confirm({ title: 'Delete this parent?', message: `<b>${esc(b.dataset.name)}</b> will be removed. A parent who still has children linked cannot be deleted.`, confirmText: 'Yes, delete' }))) return;
        await SC.api.del(`/parents/${b.dataset.id}`); SC.toast('Parent deleted.'); load();
      },
    });
    await load();
    if (args[0] === 'new' && SC.can('parents.manage')) { history.replaceState(null, '', '#parents'); SC.after(() => parentModal(null, () => load())); }
  };

  SC.modules.parent = async (el, args) => {
    const { parent: p, children } = await SC.api.get(`/parents/${args[0]}`);
    SC.setTitle(p.full_name, 'Parent / guardian');
    el.innerHTML = `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-spread"><div class="sc-row" style="gap:1.2rem"><span class="sc-avatar lg">${esc(SC.initials(p.full_name))}</span><div><h2 style="font-size:1.4rem">${esc(p.full_name)}</h2><div class="sc-row" style="margin:.4rem 0">${p.user_id ? SC.chip('active', 'Portal access') : SC.chip('inactive', 'No portal access')}</div><div class="sc-muted sc-small">${esc(p.occupation || '')}</div></div></div>
      <div class="sc-row"><a class="sc-btn ghost sm" href="#parents"><i class="fa-solid fa-arrow-left"></i> Back</a>${SC.can('parents.manage') ? `${p.user_id ? '' : '<button class="sc-btn soft sm" data-act="portal"><i class="fa-solid fa-key"></i> Give portal access</button>'}<button class="sc-btn primary sm" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>` : ''}</div></div></div>
      <div class="sc-grid cols-2"><div class="sc-card"><div class="sc-card-head"><h3>Contact details</h3></div><dl class="sc-kv"><dt>Phone</dt><dd><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></dd><dt>Alternative</dt><dd>${esc(p.alt_phone || '—')}</dd><dt>Email</dt><dd>${esc(p.email || '—')}</dd><dt>Address</dt><dd>${esc(p.address || '—')}</dd></dl></div>
      <div class="sc-card"><div class="sc-card-head"><h3>Children (${children.length})</h3></div>${children.length ? `<div class="sc-list">${children.map((c) => `<a href="#student/${c.id}" class="sc-spread" style="color:var(--sc-text)"><div class="sc-person">${SC.avatar('students', c.id, c.full_name, false)}<div><div class="nm">${esc(c.full_name)}</div><div class="sb sc-muted">${esc(c.class_name || 'No class')} · ${esc(c.relationship)}</div></div></div>${SC.chip(c.status)}</a>`).join('')}</div>` : SC.empty('fa-child', 'No children linked', 'Choose this parent when registering a student.')}</div></div>`;
    SC.delegate(el, {
      edit: () => parentModal(p, () => SC.route()),
      portal: () => SC.formModal({ title: `Portal access for ${p.full_name}`, submit: 'Give access', body: `${SC.f.input('email', 'Email (username)', { type: 'email', required: true, value: p.email || '' })}${SC.f.input('password', 'Temporary password', { placeholder: 'At least 8 characters', hint: 'Leave empty only if they already have a Smart21Brain account.' })}`,
        onSubmit: async (f) => { await SC.api.post(`/parents/${p.id}/portal`, f); SC.closeModal(); SC.toast('Portal access created. Share the email and password with the parent.'); SC.route(); } }),
    });
  };
})();
