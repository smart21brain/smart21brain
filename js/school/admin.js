/* Users, Settings (center info, academic, financial, roles & permissions, data) and Audit Logs. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;

  // =============================================================== users
  const ROLE_TEXT = { admin: 'Administrator', teacher: 'Teacher', receptionist: 'Receptionist', parent: 'Parent' };

  async function userModal(u, done) {
    const lk = await SC.lookups(); const isEdit = !!u;
    SC.formModal({
      title: isEdit ? `Edit ${u.name}` : 'Add user', submit: isEdit ? 'Save changes' : 'Add user',
      body: isEdit ? `<div class="sc-alert info"><i class="fa-solid fa-envelope"></i><div>${esc(u.email)}</div></div>
          ${u.role === 'parent' ? '' : SC.f.select('role', 'Role', ['admin', 'teacher', 'receptionist'].map((r) => [r, ROLE_TEXT[r]]), { value: u.role, required: true, noBlank: true })}
          ${SC.f.select('active', 'Account status', [[1, 'Active — can sign in'], [0, 'Inactive — cannot sign in']], { value: u.active ? 1 : 0, noBlank: true })}
          ${SC.f.input('new_password', 'Reset password (optional)', { placeholder: 'Leave empty to keep the current password', hint: 'At least 8 characters. The person will be signed out everywhere.' })}`
        : `<div class="cols">${SC.f.input('name', 'Full name', { required: true })}${SC.f.input('email', 'Email (username)', { type: 'email', required: true })}</div>
          <div class="cols">${SC.f.select('role', 'Role', ['admin', 'teacher', 'receptionist'].map((r) => [r, ROLE_TEXT[r]]), { value: 'receptionist', required: true, noBlank: true })}${SC.f.input('password', 'Temporary password', { placeholder: 'At least 8 characters', hint: 'Leave empty only if they already have a Smart21Brain account.' })}</div>
          <div id="tBox" class="sc-hide">${SC.f.select('teacher_id', 'Link to teacher record', SC.opts.teachers(lk), { placeholder: 'Create a new teacher record', hint: 'Teachers only see the classes they teach.' })}</div>
          <div class="sc-alert"><i class="fa-solid fa-circle-info"></i><div>Administrators can do everything. You can change what teachers and receptionists may do in <a href="#settings">Settings → Roles & Permissions</a>.</div></div>`,
      onOpen: (form) => { const r = form.querySelector('[name=role]'); const t = form.querySelector('#tBox'); if (r && t) r.addEventListener('change', () => t.classList.toggle('sc-hide', r.value !== 'teacher')); },
      onSubmit: async (f) => {
        if (isEdit) await SC.api.put(`/users/${u.id}`, { role: f.role, active: f.active === '1' || f.active === 1, new_password: f.new_password || undefined });
        else { const r = await SC.api.post('/users', f); if (r.linked) SC.toast('This person already had an account, so they were added to your school with their existing password.', 'warn'); }
        SC.closeModal(); SC.toast(isEdit ? 'User updated successfully.' : 'User added successfully.'); done();
      },
    });
  }

  SC.modules.users = async (el) => {
    let users = [];
    async function load() {
      users = (await SC.api.get('/users')).users;
      el.innerHTML = `${SC.pageHead('Users', 'People who can sign in to your school system', '<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-user-plus"></i> Add User</button>')}
        <div class="sc-card">${SC.table([
          { label: 'User', render: (u) => `<div class="sc-person"><span class="sc-avatar">${esc(SC.initials(u.name))}</span><span><span class="nm">${esc(u.name)}</span><div class="sb sc-muted">${esc(u.email)}</div></span></div>` },
          { label: 'Role', render: (u) => `<span class="sc-chip info">${esc(ROLE_TEXT[u.role])}</span>` },
          { label: 'Linked to', render: (u) => esc(u.teacher_name || u.parent_name || '—') },
          { label: 'Last sign in', render: (u) => (u.last_login ? SC.dateTime(u.last_login) : '<span class="sc-muted">Never</span>') },
          { label: 'Status', render: (u) => SC.chip(u.active ? 'active' : 'inactive') },
          { label: '', cls: 'end', render: (u) => `<button class="sc-btn ghost sm" data-act="edit" data-id="${u.id}"><i class="fa-solid fa-pen"></i> Edit</button>` },
        ], users)}</div>`;
    }
    SC.delegate(el, { add: () => userModal(null, load), edit: (b) => userModal(users.find((u) => String(u.id) === b.dataset.id), load) });
    await load();
  };

  // =============================================================== settings
  const TABS = [['center', 'Center information', 'fa-school'], ['academic', 'Academic', 'fa-graduation-cap'], ['financial', 'Financial', 'fa-coins'], ['roles', 'Roles & permissions', 'fa-user-shield'], ['data', 'Data & sample data', 'fa-database']];

  SC.modules.settings = async (el) => {
    let tab = 'center';
    el.innerHTML = `${SC.pageHead('Settings', 'Make the system fit your school')}<div class="sc-tabs" id="setTabs">${TABS.map(([k, l, i]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}"><i class="fa-solid ${i}"></i> ${l}</button>`).join('')}</div><div id="setBody">${SC.skeleton(6)}</div>`;
    const body = el.querySelector('#setBody');
    const views = { center: centerTab, academic: academicTab, financial: financialTab, roles: rolesTab, data: dataTab };
    async function open(k) { tab = k; el.querySelectorAll('#setTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === k)); body.innerHTML = SC.skeleton(6); try { await views[k](body); } catch (e) { body.innerHTML = SC.errorBox(e); } }
    el.querySelector('#setTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) open(b.dataset.tab); });
    SC.after(() => open('center'));
  };

  async function centerTab(body) {
    const { school: s } = await SC.api.get('/school-info'); const soc = s.social || {};
    body.innerHTML = `<form class="sc-stack" id="cForm" novalidate><div class="sc-form-error" role="alert"></div>
      <div class="sc-card sc-form">${SC.f.section('fa-school', 'Center information')}
        <div class="sc-photo-drop"><div class="preview" id="scPhotoPreview" style="width:96px;height:96px;position:relative"><i class="fa-solid fa-image"></i>${s.logo_key ? `<img src="${SC.logoUrl(s.id)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#fff" onerror="this.remove()">` : ''}</div><div><label class="sc-btn ghost sm" for="f_logo"><i class="fa-solid fa-upload"></i> ${'Change logo'}</label><input id="f_logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" class="sc-sr"><div class="sc-small sc-muted" style="margin-top:.35rem">Shown on the sidebar, receipts, ID cards and report cards. PNG / JPG, square works best.</div></div></div>
        <div class="cols">${SC.f.input('name', 'School / center name', { required: true, value: s.name })}${SC.f.input('short_name', 'Short name', { required: true, value: s.short_name, attr: { maxlength: 8 }, hint: 'Like CTC or S21 — used as a logo placeholder.' })}</div>
        <div class="cols-3">${SC.f.input('phone', 'Phone', { type: 'tel', value: s.phone || '' })}${SC.f.input('email', 'Email', { type: 'email', value: s.email || '' })}${SC.f.input('website', 'Website', { value: s.website || '', placeholder: 'https://…' })}</div>
        ${SC.f.input('address', 'Address', { value: s.address || '' })}
        <div class="cols-3">${SC.f.input('admission_prefix', 'Student ID prefix', { required: true, value: s.admission_prefix, attr: { maxlength: 8 }, hint: `Next student: ${s.admission_prefix}-${new Date().getFullYear()}-0001` })}${SC.f.input('currency', 'Currency code', { required: true, value: s.currency, attr: { maxlength: 6 }, hint: 'TZS, KES, UGX, USD…' })}<div class="sc-field"><label for="f_primary_color">Brand colour</label><input class="sc-input" style="padding:.2rem;height:42px" id="f_primary_color" type="color" name="primary_color" value="${esc(s.primary_color || '#0B6E4F')}"></div></div>
        ${SC.f.input('receipt_note', 'Receipt note', { value: s.receipt_note || '' })}</div>
      <div class="sc-card sc-form">${SC.f.section('fa-share-nodes', 'Social media')}<div class="cols-3">${['facebook', 'instagram', 'x', 'youtube', 'tiktok'].map((k) => SC.f.input(`social_${k}`, SC.cap(k === 'x' ? 'X (Twitter)' : k), { value: soc[k] || '', placeholder: 'Link or @handle' })).join('')}</div></div>
      <div class="sc-row" style="justify-content:flex-end"><button class="sc-btn primary lg" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save settings</button></div></form>`;
    const form = body.querySelector('#cForm');
    form.querySelector('[name=phone]').dataset.kind = 'phone';
    SC.wirePhotoField(form, 'logo');
    form.querySelector('[name=primary_color]').addEventListener('input', (e) => SC.setBrand(e.target.value));
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); const err = form.querySelector('.sc-form-error'); err.classList.remove('show');
      if (!SC.validate(form)) return;
      const f = SC.formData(form);
      try {
        await SC.api.put('/school-info', { name: f.name, short_name: f.short_name, admission_prefix: f.admission_prefix, phone: f.phone, email: f.email, address: f.address, website: f.website, currency: f.currency, primary_color: f.primary_color, receipt_note: f.receipt_note, social: Object.fromEntries(['facebook', 'instagram', 'x', 'youtube', 'tiktok'].map((k) => [k, f[`social_${k}`]])) });
        await SC.uploadPhoto('/school-info/logo', form, 'logo');
        SC.toast('Settings saved. Reloading…'); setTimeout(() => location.reload(), 700);
      } catch (ex) { err.textContent = ex.message; err.classList.add('show'); err.scrollIntoView({ block: 'center' }); }
    });
  }

  async function academicTab(body) {
    const [{ years, terms }, info] = await Promise.all([SC.api.get('/academic-years'), SC.api.get('/school-info')]);
    const st = info.settings; const div = st.division;
    const scale = st.grading_scale.map((g) => ({ ...g }));
    const draw = () => {
      body.innerHTML = `<div class="sc-grid cols-2">
        <div class="sc-card"><div class="sc-card-head"><h3>Academic years</h3><div class="sc-actions"><button class="sc-btn primary sm" data-act="addyear"><i class="fa-solid fa-plus"></i> Add year</button></div></div>${SC.table([{ label: 'Year', render: (y) => `<b>${esc(y.name)}</b> ${y.is_current ? SC.chip('active', 'Current') : ''}` }, { label: 'Dates', render: (y) => `${y.start_date ? SC.date(y.start_date) : '—'} → ${y.end_date ? SC.date(y.end_date) : '—'}` }, { label: '', cls: 'end', render: (y) => `<div class="sc-actions-cell">${y.is_current ? '' : `<button class="sc-btn soft sm" data-act="curyear" data-id="${y.id}">Make current</button>`}<button class="sc-btn ghost sm" data-act="edityear" data-id="${y.id}"><i class="fa-solid fa-pen"></i></button>${y.is_current ? '' : `<button class="sc-btn danger-ghost sm" data-act="delyear" data-id="${y.id}"><i class="fa-solid fa-trash"></i></button>`}</div>` }], years)}
          <p class="sc-small sc-muted" style="margin:.8rem 0 0">Create classes for a new year in <a href="#classes">Classes</a>, then register students into them.</p></div>
        <div class="sc-card"><div class="sc-card-head"><h3>Terms</h3><div class="sc-actions"><button class="sc-btn primary sm" data-act="addterm"><i class="fa-solid fa-plus"></i> Add term</button></div></div>${SC.table([{ label: 'Term', render: (t) => `<b>${esc(t.name)}</b>` }, { label: '', cls: 'end', render: (t) => `<div class="sc-actions-cell"><button class="sc-btn ghost sm" data-act="editterm" data-id="${t.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="delterm" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button></div>` }], terms, { empty: SC.empty('fa-calendar', 'No terms', 'Add Term 1, Term 2…') })}
          <div class="sc-row" style="margin-top:1rem"><a class="sc-btn ghost sm" href="#classes"><i class="fa-solid fa-school"></i> Manage classes</a><a class="sc-btn ghost sm" href="#subjects"><i class="fa-solid fa-book-open"></i> Manage subjects</a></div></div></div>
      <div class="sc-card" style="margin-top:1.1rem"><div class="sc-card-head"><h3>Grading scale</h3><div class="sc-actions"><button class="sc-btn ghost sm" data-act="addgrade"><i class="fa-solid fa-plus"></i> Add grade</button></div></div>
        <p class="sc-muted sc-small" style="margin-top:0">A mark is turned into a percentage and matched to the highest row whose minimum it reaches. Change this to match your school or country.</p>
        <div class="sc-table-wrap"><table class="sc-table compact" style="min-width:520px"><thead><tr><th>Minimum %</th><th>Grade</th><th>Points</th><th>Remark</th><th></th></tr></thead><tbody>${scale.map((g, i) => `<tr><td><input class="sc-input gs" data-i="${i}" data-k="min" type="number" min="0" max="100" value="${g.min}" style="width:90px"></td><td><input class="sc-input gs" data-i="${i}" data-k="grade" value="${esc(g.grade)}" maxlength="4" style="width:80px"></td><td><input class="sc-input gs" data-i="${i}" data-k="points" type="number" min="0" value="${g.points}" style="width:80px"></td><td><input class="sc-input gs" data-i="${i}" data-k="remark" value="${esc(g.remark || '')}"></td><td><button class="sc-btn danger-ghost sm" data-act="delgrade" data-i="${i}"><i class="fa-solid fa-xmark"></i></button></td></tr>`).join('')}</tbody></table></div>
        <div class="sc-card flat" style="background:var(--sc-surface-2);margin-top:1rem"><div class="sc-form">${SC.f.check('div_enabled', '<b>Show Division on results</b> (best subjects by points, common for O-Level)', div.enabled)}
          <div class="cols-3">${SC.f.input('div_best', 'Number of best subjects', { type: 'number', value: div.best_of, attr: { min: 1, max: 20 } })}${SC.f.input('div_bands', 'Division bands (max points → name)', { value: div.bands.map((b) => `${b.max}:${b.name}`).join(', '), hint: 'Example: 17:I, 21:II, 25:III, 33:IV' })}${SC.f.input('div_fallback', 'Otherwise', { value: div.fallback })}</div></div></div>
        <div class="sc-row" style="margin-top:1rem;justify-content:space-between"><div class="sc-field" style="flex-direction:row;align-items:center;gap:.7rem"><label style="margin:0" for="absThr">Alert admin after this many absences in a month:</label><input class="sc-input" id="absThr" type="number" min="1" max="31" value="${st.absence_alert_threshold}" style="width:80px"></div><button class="sc-btn primary" data-act="savegrade"><i class="fa-solid fa-floppy-disk"></i> Save grading & alerts</button></div></div>`;
    };
    draw();
    const yearModal = (y) => SC.formModal({ title: y ? 'Edit academic year' : 'Add academic year', submit: 'Save', body: `${SC.f.input('name', 'Name', { required: true, value: y ? y.name : '', placeholder: 'e.g. 2027 or 2026/2027' })}<div class="cols">${SC.f.input('start_date', 'Starts', { type: 'date', value: y ? y.start_date || '' : '' })}${SC.f.input('end_date', 'Ends', { type: 'date', value: y ? y.end_date || '' : '' })}</div>${y ? '' : SC.f.check('is_current', 'Make this the current academic year')}`,
      onSubmit: async (f) => { if (y) await SC.api.put(`/academic-years/${y.id}`, f); else await SC.api.post('/academic-years', f); SC.closeModal(); await SC.refreshLookups(); SC.toast('Academic year saved.'); await academicTab(body); } });
    const termModal = (t) => SC.formModal({ title: t ? 'Edit term' : 'Add term', submit: 'Save', body: `${SC.f.input('name', 'Term name', { required: true, value: t ? t.name : '', placeholder: 'e.g. Term 3' })}${SC.f.input('sort_order', 'Order', { type: 'number', value: t ? t.sort_order : terms.length + 1, attr: { min: 0 } })}`,
      onSubmit: async (f) => { const b = { name: f.name, sort_order: Number(f.sort_order) }; if (t) await SC.api.put(`/terms/${t.id}`, b); else await SC.api.post('/terms', b); SC.closeModal(); await SC.refreshLookups(); SC.toast('Term saved.'); await academicTab(body); } });
    const snap = () => body.querySelectorAll('.gs').forEach((i) => { scale[i.dataset.i][i.dataset.k] = i.dataset.k === 'grade' || i.dataset.k === 'remark' ? i.value : Number(i.value); });
    SC.delegate(body, {
      addyear: () => yearModal(null), edityear: (b) => yearModal(years.find((y) => String(y.id) === b.dataset.id)),
      curyear: async (b) => { const y = years.find((x) => String(x.id) === b.dataset.id); await SC.api.put(`/academic-years/${y.id}`, { name: y.name, start_date: y.start_date, end_date: y.end_date, is_current: true }); await SC.refreshLookups(); SC.toast(`${y.name} is now the current academic year.`); location.reload(); },
      delyear: async (b) => { if (!(await SC.confirm({ title: 'Delete this academic year?', message: 'Only years without classes, students or payments can be deleted.', confirmText: 'Yes, delete' }))) return; await SC.api.del(`/academic-years/${b.dataset.id}`); await SC.refreshLookups(); SC.toast('Academic year deleted.'); academicTab(body); },
      addterm: () => termModal(null), editterm: (b) => termModal(terms.find((t) => String(t.id) === b.dataset.id)),
      delterm: async (b) => { if (!(await SC.confirm({ title: 'Delete this term?', message: 'Examinations that used it will simply show no term.', confirmText: 'Yes, delete' }))) return; await SC.api.del(`/terms/${b.dataset.id}`); await SC.refreshLookups(); SC.toast('Term deleted.'); academicTab(body); },
      addgrade: () => { snap(); scale.push({ min: 0, grade: '', points: 0, remark: '' }); draw(); }, delgrade: (b) => { snap(); scale.splice(Number(b.dataset.i), 1); draw(); },
      savegrade: async () => {
        snap();
        const bands = body.querySelector('#f_div_bands').value.split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const [max, name] = x.split(':'); return { max: Number(max), name: (name || '').trim() }; });
        if (bands.some((x) => Number.isNaN(x.max) || !x.name)) throw new Error('Division bands must look like 17:I, 21:II, 25:III');
        await SC.api.put('/settings', { grading_scale: scale, division: { enabled: body.querySelector('[name=div_enabled]').checked, best_of: Number(body.querySelector('#f_div_best').value), bands, fallback: body.querySelector('#f_div_fallback').value }, absence_alert_threshold: Number(body.querySelector('#absThr').value) });
        await SC.refreshLookups(); SC.toast('Grading scale and alerts saved.'); setTimeout(() => location.reload(), 600);
      },
    });
  }

  async function financialTab(body) {
    const { settings: st } = await SC.api.get('/school-info');
    let methods = [...st.payment_methods];
    const draw = () => {
      body.innerHTML = `<div class="sc-grid cols-2"><div class="sc-card"><div class="sc-card-head"><h3>Payment methods</h3></div><div class="sc-row" style="gap:.5rem;margin-bottom:1rem">${methods.map((m, i) => `<span class="sc-chip info" style="font-size:.85rem;padding:.35rem .7rem">${esc(m)} <a href="#" data-act="delm" data-i="${i}" style="color:inherit" title="Remove"><i class="fa-solid fa-xmark"></i></a></span>`).join('')}</div>
          <div class="sc-row"><input class="sc-input" id="newMethod" placeholder="e.g. Cheque, M-Pesa, Tigo Pesa…" style="flex:1"><button class="sc-btn ghost" data-act="addm"><i class="fa-solid fa-plus"></i> Add</button></div>
          <p class="sc-small sc-muted">Reference numbers are required for every method except Cash and Other.</p></div>
        <div class="sc-card"><div class="sc-card-head"><h3>Receipts & ID cards</h3></div><form class="sc-form" id="rForm" novalidate>${SC.f.input('receipt_prefix', 'Receipt number prefix', { value: st.receipt_prefix, attr: { maxlength: 8 }, hint: `Example: ${st.receipt_prefix}-${new Date().getFullYear()}-000001` })}${SC.f.textarea('receipt_footer', 'Receipt footer message', { value: st.receipt_footer, rows: 2 })}${SC.f.textarea('id_card_note', 'Text on the back of the ID card', { value: st.id_card_note, rows: 2 })}</form></div></div>
        <div class="sc-row" style="margin-top:1.1rem;justify-content:space-between"><a class="sc-btn ghost" href="#fees"><i class="fa-solid fa-list-check"></i> Edit the fee structure</a><button class="sc-btn primary" data-act="savefin"><i class="fa-solid fa-floppy-disk"></i> Save financial settings</button></div>`;
    };
    draw();
    SC.delegate(body, {
      delm: (b) => { if (methods.length <= 1) return SC.toast('Keep at least one payment method.', 'warn'); methods.splice(Number(b.dataset.i), 1); draw(); },
      addm: () => { const v = body.querySelector('#newMethod').value.trim(); if (!v) return; if (methods.some((m) => m.toLowerCase() === v.toLowerCase())) return SC.toast('That method already exists.', 'warn'); methods.push(v); draw(); },
      savefin: async () => { const f = SC.formData(body.querySelector('#rForm')); await SC.api.put('/settings', { payment_methods: methods, receipt_prefix: f.receipt_prefix, receipt_footer: f.receipt_footer, id_card_note: f.id_card_note }); SC.state.settings.payment_methods = methods; SC.toast('Financial settings saved.'); },
    });
  }

  async function rolesTab(body) {
    const d = await SC.api.get('/permissions');
    const matrix = { teacher: new Set(d.matrix.teacher), receptionist: new Set(d.matrix.receptionist) };
    const groups = [...new Set(d.catalogue.map((p) => p.group))];
    body.innerHTML = `<div class="sc-card"><div class="sc-card-head"><h3>What can each role do?</h3><div class="sc-actions"><button class="sc-btn ghost sm" data-act="defaults"><i class="fa-solid fa-rotate-left"></i> Reset to defaults</button><button class="sc-btn primary sm" data-act="saveperms"><i class="fa-solid fa-floppy-disk"></i> Save permissions</button></div></div>
      <div class="sc-alert info" style="margin-bottom:1rem"><i class="fa-solid fa-circle-info"></i><div>Administrators always have every permission. Teachers only ever see students and classes they teach. Parents only see their own children.</div></div>
      <div class="sc-table-wrap"><table class="sc-table sc-perm-table" style="min-width:560px"><thead><tr><th>Permission</th><th>Administrator</th><th>Teacher</th><th>Receptionist</th></tr></thead><tbody>${groups.map((g) => `<tr><td colspan="4" style="background:var(--sc-primary-50);font-weight:800;color:var(--sc-primary)">${esc(g)}</td></tr>${d.catalogue.filter((p) => p.group === g).map((p) => `<tr><td>${esc(p.label)}</td><td><input type="checkbox" checked disabled aria-label="Administrator ${esc(p.label)}"></td>${['teacher', 'receptionist'].map((r) => `<td><input type="checkbox" data-role="${r}" data-perm="${p.key}" ${matrix[r].has(p.key) ? 'checked' : ''} aria-label="${r} ${esc(p.label)}"></td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div></div>`;
    body.addEventListener('change', (e) => { const c = e.target.closest('[data-perm]'); if (!c) return; matrix[c.dataset.role][c.checked ? 'add' : 'delete'](c.dataset.perm); });
    SC.delegate(body, {
      defaults: async () => { if (!(await SC.confirm({ title: 'Reset permissions?', message: 'Teacher and receptionist permissions go back to the recommended defaults.', confirmText: 'Yes, reset', danger: false, icon: 'fa-rotate-left' }))) return; for (const r of ['teacher', 'receptionist']) await SC.api.put('/permissions', { role: r, permissions: d.defaults[r] }); SC.toast('Permissions reset to defaults.'); rolesTab(body); },
      saveperms: async () => { for (const r of ['teacher', 'receptionist']) await SC.api.put('/permissions', { role: r, permissions: [...matrix[r]] }); SC.toast('Permissions saved. They apply the next time each person opens a page.'); },
    });
  }

  async function dataTab(body) {
    body.innerHTML = `<div class="sc-grid cols-2"><div class="sc-card sc-stack"><h3><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--sc-primary)"></i> Try it with sample data</h3><p class="sc-muted" style="margin:0">Fills an <b>empty</b> school with 24 students, 6 teachers, fees, payments, attendance, an examination with results, a timetable and announcements — so you can explore every screen and chart before entering your own data.</p><div><button class="sc-btn primary" data-act="demo"><i class="fa-solid fa-play"></i> Load sample data</button></div></div>
      <div class="sc-card sc-stack" style="border-color:var(--sc-danger-bg)"><h3 style="color:var(--sc-danger)"><i class="fa-solid fa-triangle-exclamation"></i> Erase all school data</h3><p class="sc-muted" style="margin:0">Removes every student, parent, teacher, payment, attendance record, examination, timetable entry and announcement so you can start fresh. Your school settings, classes, subjects, staff logins and permissions are kept. <b>This cannot be undone.</b></p><div><button class="sc-btn danger" data-act="reset"><i class="fa-solid fa-trash"></i> Erase all data…</button></div></div></div>`;
    SC.delegate(body, {
      demo: async (b) => { b.disabled = true; b.innerHTML = '<span class="sc-spin"></span> Loading sample data…'; try { await SC.api.post('/demo-data'); SC.toast('Sample data loaded. Explore the Dashboard!'); setTimeout(() => { location.hash = 'dashboard'; location.reload(); }, 700); } catch (e) { SC.fail(e); b.disabled = false; b.innerHTML = '<i class="fa-solid fa-play"></i> Load sample data'; } },
      reset: () => SC.formModal({ title: 'Erase all school data', danger: true, submit: 'Erase everything', body: `<div class="sc-alert bad"><i class="fa-solid fa-triangle-exclamation"></i><div>This permanently deletes all students, payments, results and attendance. Download any reports you need first.</div></div>${SC.f.input('confirm', `Type the school name to confirm: ${SC.state.school.name}`, { required: true })}`,
        onSubmit: async (f) => { await SC.api.post('/reset-data', { confirm: f.confirm }); SC.closeModal(); SC.toast('All school data erased.'); setTimeout(() => location.reload(), 700); } }),
    });
  }

  // =============================================================== audit log
  function device(ua) {
    if (!ua) return '';
    const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return [br, os].filter(Boolean).join(' on ') || ua.slice(0, 30);
  }
  SC.modules.audit = async (el) => {
    const st = { q: '', user_id: '', action: '', from: '', to: '', page: 1, limit: 30 };
    let users = [];
    async function load() {
      const d = await SC.api.get('/audit' + SC.qs(st)); users = d.users;
      const ACTIONS = ['user.login', 'student.', 'payment.', 'result.', 'attendance.', 'settings.', 'user.'];
      el.querySelector('#auBody').innerHTML = SC.table([
        { label: 'Date', render: (l) => SC.date(l.created_at) }, { label: 'Time', render: (l) => (l.created_at || '').slice(11, 16) },
        { label: 'User', render: (l) => `<b>${esc(l.user_name || 'System')}</b><div class="sc-small sc-muted">${esc(l.user_email || '')}</div>` },
        { label: 'Action', render: (l) => `<span class="sc-chip info">${esc(l.action)}</span>` }, { label: 'Details', render: (l) => `<span class="sc-small sc-wrap">${esc(l.details || '')}</span>` },
        { label: 'IP / device', render: (l) => `<span class="sc-small">${esc(l.ip || '—')}<br><span class="sc-muted">${esc(device(l.user_agent))}</span></span>` },
      ], d.logs, { cls: 'compact', empty: SC.empty('fa-shield-halved', 'No activity found', 'Try clearing the filters.') }) + SC.pager(d.page, d.limit, d.total);
      const sel = el.querySelector('#auUser'); if (sel && sel.options.length <= 1) sel.innerHTML += users.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
    }
    el.innerHTML = `${SC.pageHead('Audit logs', 'Who did what, and when — logins, registrations, payments, results and more')}<div class="sc-card"><div class="sc-toolbar"><input class="sc-input grow" id="auQ" type="search" placeholder="Search details or action…"><select class="sc-select" id="auUser"><option value="">All users</option></select>
      <select class="sc-select" id="auAct"><option value="">All actions</option>${[['user.login', 'Sign-ins'], ['student.create', 'Student registration'], ['student.update', 'Student updates'], ['student.delete', 'Student deletion'], ['payment.create', 'Payments created'], ['payment.update', 'Payments updated'], ['result.enter', 'Results entered'], ['attendance.save', 'Attendance'], ['settings.', 'Settings']].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <input class="sc-input" id="auF" type="date" aria-label="From"><input class="sc-input" id="auT" type="date" aria-label="To"></div><div id="auBody">${SC.skeleton(6)}</div></div>`;
    el.querySelector('#auQ').addEventListener('input', SC.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    [['#auUser', 'user_id'], ['#auAct', 'action'], ['#auF', 'from'], ['#auT', 'to']].forEach(([id, k]) => el.querySelector(id).addEventListener('change', (e) => { st[k] = e.target.value; st.page = 1; load(); }));
    SC.delegate(el, { page: (b) => { st.page = Number(b.dataset.p); load(); } });
    await load();
  };
})();
