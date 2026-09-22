/* Examinations, marks entry, class results and student report cards. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const EXAM_TYPES = ['Monthly Test', 'Midterm Examination', 'Terminal Examination', 'Mock Examination', 'Annual Examination', 'Quiz'];
  const docColor = () => `--doc-color:${SC.state.school.primary_color || '#0B6E4F'}`;
  const clsOf = (e) => SC.classLabel({ name: e.class_name, stream: e.class_stream });

  async function examModal(ex, done) {
    const lk = await SC.lookups(); const isEdit = !!ex;
    let classes = SC.opts.classes(lk, true);
    if (SC.state.role === 'teacher') { const mine = await SC.api.get('/classes'); classes = mine.classes.filter((c) => c.status === 'active').map((c) => ({ v: c.id, l: SC.classLabel(c) })); }
    SC.formModal({
      title: isEdit ? 'Edit examination' : 'Create examination', size: 'wide', submit: isEdit ? 'Save changes' : 'Create examination',
      body: `<div class="cols">${SC.f.input('name', 'Examination name', { required: true, value: ex ? ex.name : '', placeholder: 'e.g. Midterm Examination — Term 1' })}${SC.f.input('exam_type', 'Type', { value: ex ? ex.exam_type : 'Monthly Test', attr: { list: 'examTypes' } })}<datalist id="examTypes">${EXAM_TYPES.map((t) => `<option value="${t}">`).join('')}</datalist></div>
        <div class="cols-3">${isEdit ? SC.f.input('cls', 'Class', { value: clsOf(ex), attr: { readonly: true } }) : SC.f.select('class_id', 'Class', classes, { required: true, placeholder: 'Choose a class' })}${SC.f.select('term_id', 'Term', SC.opts.terms(lk), { value: ex ? ex.term_id || '' : '', placeholder: 'No term' })}${SC.f.input('exam_date', 'Date', { type: 'date', value: ex ? ex.exam_date || '' : SC.today() })}</div>
        <div class="cols">${SC.f.input('max_marks', 'Maximum marks per subject', { type: 'number', required: true, value: ex ? ex.max_marks : 100, attr: { min: 1, max: 1000 }, hint: 'Grades are worked out as a percentage of this number.' })}${isEdit ? SC.f.input('yr', 'Academic year', { value: ex.year_name, attr: { readonly: true } }) : ''}</div>
        ${isEdit ? '' : '<p class="sc-small sc-muted" style="margin:0">Parents and teachers of the class are notified automatically when you create the examination.</p>'}`,
      onSubmit: async (f) => {
        const body = { name: f.name, exam_type: f.exam_type, class_id: isEdit ? ex.class_id : f.class_id, term_id: f.term_id || null, exam_date: f.exam_date || null, max_marks: Number(f.max_marks) };
        const r = isEdit ? await SC.api.put(`/exams/${ex.id}`, body) : await SC.api.post('/exams', body);
        SC.closeModal(); SC.toast(isEdit ? 'Examination updated successfully.' : 'Examination created successfully.'); done(r);
      },
    });
  }

  SC.modules.exams = async (el, args) => {
    const st = { class_id: '' }; const lk = await SC.lookups();
    async function load() {
      const { exams } = await SC.api.get('/exams' + SC.qs(st));
      el.innerHTML = `${SC.pageHead('Examinations', 'Create examinations and enter marks', SC.can('exams.manage') ? '<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> Create Examination</button>' : '')}
        <div class="sc-card"><div class="sc-toolbar"><select class="sc-select" id="eClass"><option value="">All classes</option>${SC.opts.classes(lk, false).map((o) => `<option value="${o.v}" ${String(o.v) === String(st.class_id) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select></div>
        ${SC.table([
          { label: 'Examination', render: (e) => `<a href="#exam/${e.id}"><b>${esc(e.name)}</b></a><div class="sc-small sc-muted">${esc(e.exam_type)}</div>` }, { label: 'Class', render: (e) => esc(clsOf(e)) },
          { label: 'Term', render: (e) => esc(e.term_name || '—') }, { label: 'Date', render: (e) => SC.date(e.exam_date) }, { label: 'Max marks', cls: 'end', render: (e) => e.max_marks },
          { label: 'Marks entered', render: (e) => e.results_count ? `<span class="sc-chip ok">${e.students_marked} student${e.students_marked === 1 ? '' : 's'}</span>` : '<span class="sc-chip">Not started</span>' },
          { label: '', cls: 'end', render: (e) => `<div class="sc-actions-cell"><a class="sc-btn soft sm" href="#exam/${e.id}"><i class="fa-solid fa-pen-to-square"></i> ${SC.can('results.enter') ? 'Enter marks' : 'Open'}</a>${SC.can('results.view') ? `<a class="sc-btn ghost sm" href="#results/${e.id}"><i class="fa-solid fa-ranking-star"></i> Results</a>` : ''}${SC.can('exams.manage') ? `<button class="sc-btn ghost sm" data-act="edit" data-id="${e.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="del" data-id="${e.id}" data-name="${esc(e.name)}"><i class="fa-solid fa-trash"></i></button>` : ''}</div>` },
        ], exams, { empty: SC.empty('fa-file-pen', 'No examinations yet', 'Create your first examination, then enter marks for each subject.', SC.can('exams.manage') ? '<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> Create Examination</button>' : '') })}</div>`;
      el._exams = exams;
      el.querySelector('#eClass').addEventListener('change', (e) => { st.class_id = e.target.value; load(); });
    }
    SC.delegate(el, {
      add: () => examModal(null, () => load()),
      edit: (b) => examModal(el._exams.find((e) => String(e.id) === b.dataset.id), () => load()),
      del: async (b) => { if (!(await SC.confirm({ title: 'Delete this examination?', message: `<b>${esc(b.dataset.name)}</b> and every mark entered for it will be deleted.`, confirmText: 'Yes, delete' }))) return; await SC.api.del(`/exams/${b.dataset.id}`); SC.toast('Examination deleted.'); load(); },
    });
    await load();
    if (args[0] === 'new' && SC.can('exams.manage')) { history.replaceState(null, '', '#exams'); SC.after(() => examModal(null, () => load())); }
  };

  // ------------------------------------------------------------ one exam: subjects & progress
  SC.modules.exam = async (el, args) => {
    const { exam: ex, subjects } = await SC.api.get(`/exams/${args[0]}`);
    SC.setTitle(ex.name, `${clsOf(ex)} · ${ex.exam_type}`);
    el.innerHTML = `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-spread"><div><h2 style="font-size:1.35rem">${esc(ex.name)}</h2><div class="sc-row" style="margin-top:.4rem"><span class="sc-chip"><i class="fa-solid fa-school"></i> ${esc(clsOf(ex))}</span><span class="sc-chip">${esc(ex.term_name || 'No term')}</span><span class="sc-chip">${SC.date(ex.exam_date)}</span><span class="sc-chip">Max ${ex.max_marks}</span></div></div>
      <div class="sc-row"><a class="sc-btn ghost sm" href="#exams"><i class="fa-solid fa-arrow-left"></i> Back</a>${SC.can('results.view') ? `<a class="sc-btn primary sm" href="#results/${ex.id}"><i class="fa-solid fa-ranking-star"></i> View class results</a>` : ''}</div></div></div>
      <div class="sc-card"><div class="sc-card-head"><h3>Subjects — enter marks for each</h3></div>${SC.table([
        { label: 'Subject', render: (s) => `<b>${esc(s.name)}</b> <span class="sc-muted sc-small">${esc(s.code)}</span>` }, { label: 'Teacher', render: (s) => esc(s.teacher_name || '—') },
        { label: 'Progress', render: (s) => { const p = s.students_expected ? Math.round(s.marks_entered / s.students_expected * 100) : 0; return `<div style="min-width:140px"><div class="sc-small">${s.marks_entered} of ${s.students_expected} students</div>${SC.progress(p, p >= 100 ? '' : p > 0 ? 'warn' : 'bad')}</div>`; } },
        { label: '', cls: 'end', render: (s) => s.can_enter ? `<a class="sc-btn primary sm" href="#marks/${ex.id}/${s.subject_id}"><i class="fa-solid fa-pen-to-square"></i> ${s.marks_entered ? 'Edit marks' : 'Enter marks'}</a>` : `<a class="sc-btn ghost sm" href="#marks/${ex.id}/${s.subject_id}">View marks</a>` },
      ], subjects, { empty: SC.empty('fa-book-open', 'This class has no subjects', 'Add subjects to the class in Classes, then enter marks.') })}</div>`;
  };

  // ------------------------------------------------------------ marks entry
  SC.modules.marks = async (el, args) => {
    const d = await SC.api.get(`/results/entry?exam_id=${args[0]}&subject_id=${args[1]}`);
    const ex = d.exam; const scale = [...((await SC.lookups()).grading_scale || [])].sort((a, b) => b.min - a.min);
    SC.setTitle(`Marks — ${d.subject.name}`, `${ex.name} · ${clsOf(ex)}`);
    const gradeOf = (m) => { if (m === '' || m == null || Number.isNaN(Number(m))) return ''; const pct = Number(m) / ex.max_marks * 100; const g = scale.find((x) => pct >= x.min) || scale[scale.length - 1]; return g ? g.grade : ''; };
    el.innerHTML = `${SC.pageHead(`${d.subject.name} marks`, `${ex.name} · ${clsOf(ex)} · out of ${ex.max_marks}`, `<a class="sc-btn ghost" href="#exam/${ex.id}"><i class="fa-solid fa-arrow-left"></i> Back</a>`)}
      <div class="sc-card">${d.students.length ? `${d.can_enter ? `<div class="sc-alert info" style="margin-bottom:1rem"><i class="fa-solid fa-keyboard"></i><div>Type each student's marks and press <b>Enter</b> to jump to the next one. Leave a box empty if the student was absent. Grades are worked out automatically.</div></div>` : '<div class="sc-alert" style="margin-bottom:1rem"><i class="fa-solid fa-eye"></i><div>You can view these marks but not change them.</div></div>'}
        ${SC.table([{ label: '#', render: (s) => d.students.indexOf(s) + 1 }, { label: 'Student', render: (s) => `<div class="sc-person">${SC.avatar('students', s.id, s.full_name, false)}<span><span class="nm">${esc(s.full_name)}</span><div class="sb sc-muted">${esc(s.admission_no)}</div></span></div>` },
          { label: `Marks (0–${ex.max_marks})`, render: (s) => d.can_enter ? `<input class="sc-input mk" type="number" min="0" max="${ex.max_marks}" step="0.5" inputmode="decimal" style="width:110px" data-sid="${s.id}" value="${s.marks == null ? '' : s.marks}" aria-label="Marks for ${esc(s.full_name)}">` : `<b>${s.marks == null ? '—' : s.marks}</b>` },
          { label: 'Grade', render: (s) => `<b class="gr" data-sid="${s.id}">${esc(gradeOf(s.marks))}</b>` }], d.students, { cls: 'compact' })}
        ${d.can_enter ? '<div class="sc-row" style="justify-content:flex-end;margin-top:1rem"><button class="sc-btn primary lg" data-act="save"><i class="fa-solid fa-floppy-disk"></i> Save marks</button></div>' : ''}` : SC.empty('fa-user-slash', 'No students take this subject', 'Students must be registered in this class with this subject.')}</div>`;
    const inputs = () => [...el.querySelectorAll('.mk')];
    el.addEventListener('input', (e) => {
      const i = e.target.closest('.mk'); if (!i) return;
      const v = i.value; const bad = v !== '' && (Number(v) < 0 || Number(v) > ex.max_marks);
      i.style.borderColor = bad ? 'var(--sc-danger)' : ''; el.querySelector(`.gr[data-sid="${i.dataset.sid}"]`).textContent = bad ? '!' : gradeOf(v);
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('mk')) { e.preventDefault(); const all = inputs(); const n = all[all.indexOf(e.target) + 1]; if (n) { n.focus(); n.select(); } } });
    SC.delegate(el, {
      save: async (b) => {
        const marks = inputs().map((i) => ({ student_id: Number(i.dataset.sid), marks: i.value }));
        const bad = inputs().find((i) => i.value !== '' && (Number(i.value) < 0 || Number(i.value) > ex.max_marks));
        if (bad) { bad.focus(); return SC.toast(`Marks must be between 0 and ${ex.max_marks}.`, 'error'); }
        b.disabled = true; b.innerHTML = '<span class="sc-spin"></span> Saving…';
        try { const r = await SC.api.post('/results', { exam_id: ex.id, subject_id: Number(args[1]), marks }); SC.toast(`Marks saved for ${r.saved} student${r.saved === 1 ? '' : 's'}.`); } catch (err) { SC.fail(err); }
        b.disabled = false; b.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save marks';
      },
    });
  };

  // ------------------------------------------------------------ results
  SC.modules.results = async (el, args) => {
    if (!args[0]) {
      const { exams } = await SC.api.get('/exams');
      el.innerHTML = `${SC.pageHead('Results', 'Choose an examination to see the class results and print report cards')}<div class="sc-grid" style="grid-template-columns:repeat(auto-fill,minmax(290px,1fr))">${exams.map((e) => `<a class="sc-card sc-stack" href="#results/${e.id}" style="gap:.5rem;color:var(--sc-text)"><div class="sc-spread"><b style="font-size:1.05rem">${esc(e.name)}</b>${e.results_count ? SC.chip('ok', 'Marks in') : SC.chip('pending', 'No marks')}</div><div class="sc-muted sc-small">${esc(clsOf(e))} · ${esc(e.exam_type)}</div><div class="sc-small">${SC.date(e.exam_date)} · ${e.students_marked} student${e.students_marked === 1 ? '' : 's'} marked</div></a>`).join('') || `<div class="sc-card" style="grid-column:1/-1">${SC.empty('fa-ranking-star', 'No examinations yet', 'Create an examination and enter marks first.')}</div>`}</div>`;
      return;
    }
    const d = await SC.api.get(`/exams/${args[0]}/sheet`); const ex = d.exam;
    SC.setTitle(`Results — ${ex.name}`, clsOf(ex));
    const cols = [{ key: 'position', label: 'Pos' }, { key: 'admission_no', label: 'Student ID' }, { key: 'name', label: 'Name' }, ...d.subjects.map((s) => ({ key: 's' + s.id, label: s.code || s.name, align: 'end' })), { key: 'total', label: 'Total', align: 'end' }, { key: 'average', label: 'Average %', align: 'end' }, { key: 'grade', label: 'Grade' }, { key: 'division', label: 'Division' }];
    const rowsData = d.rows.map((r) => { const o = { position: r.position || '—', admission_no: r.admission_no, name: r.full_name, total: r.total, average: r.average, grade: r.grade, division: r.division || '—' }; d.subjects.forEach((s) => { const m = r.subjects.find((x) => x.subject_id === s.id); o['s' + s.id] = m ? m.marks : '—'; }); return o; });
    el.innerHTML = `${SC.pageHead(ex.name, `${clsOf(ex)} · ${ex.exam_type} · ${d.out_of} student${d.out_of === 1 ? '' : 's'} ranked${d.class_average != null ? ' · Class average ' + d.class_average + '%' : ''}`, `<a class="sc-btn ghost" href="#results"><i class="fa-solid fa-arrow-left"></i> All results</a>${SC.can('results.enter') ? `<a class="sc-btn ghost" href="#exam/${ex.id}"><i class="fa-solid fa-pen-to-square"></i> Enter marks</a>` : ''}<button class="sc-btn ghost" data-act="xlsx"><i class="fa-solid fa-file-excel"></i> Excel</button><button class="sc-btn primary" data-act="print"><i class="fa-solid fa-print"></i> Print</button>`)}
      <div class="sc-card">${d.rows.some((r) => r.subject_count) ? SC.table([
        { label: 'Pos', render: (r) => `<b>${r.position || '—'}</b>` }, { label: 'Student', render: (r) => `<div class="sc-person">${SC.avatar('students', r.student_id, r.full_name, false)}<span><span class="nm">${esc(r.full_name)}</span><div class="sb sc-muted">${esc(r.admission_no)}</div></span></div>` },
        ...d.subjects.map((s) => ({ label: s.code || s.name, cls: 'end', render: (r) => { const m = r.subjects.find((x) => x.subject_id === s.id); return m ? `${m.marks} <span class="sc-muted sc-small">${esc(m.grade)}</span>` : '<span class="sc-muted">—</span>'; } })),
        { label: 'Total', cls: 'end', render: (r) => `<b>${SC.num(r.total)}</b>` }, { label: 'Average', cls: 'end', render: (r) => r.subject_count ? `${r.average}%` : '—' }, { label: 'Grade', render: (r) => r.subject_count ? `<span class="sc-chip ${r.grade === 'F' ? 'bad' : r.grade === 'A' ? 'ok' : 'info'}">${esc(r.grade)}</span>` : '—' },
        ...(SC.state.settings.division_enabled ? [{ label: 'Div', render: (r) => esc(r.division || '—') }] : []),
        { label: '', cls: 'end', render: (r) => r.subject_count ? `<a class="sc-btn soft sm" href="#reportcard/${ex.id}/${r.student_id}"><i class="fa-solid fa-file-lines"></i> Report card</a>` : '' },
      ], d.rows, { cls: 'compact' }) : SC.empty('fa-file-circle-question', 'No marks entered yet', 'Enter marks for at least one subject to see the ranking.', SC.can('results.enter') ? `<a class="sc-btn primary" href="#exam/${ex.id}">Enter marks</a>` : '')}</div>`;
    SC.delegate(el, {
      xlsx: () => SC.xlsx(cols, rowsData, `${ex.name}-${clsOf(ex)}.xlsx`.replace(/[\\/:*?"<>|]/g, '-'), 'Results'),
      print: () => SC.print(`<div class="sc-doc" style="${docColor()};padding:12px"><h2 style="color:#111">${esc(SC.state.school.name)}</h2><h3 style="color:#111;margin:4px 0 12px">${esc(ex.name)} — ${esc(clsOf(ex))}</h3><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${cols.map((c) => `<th style="border:1px solid #bbb;padding:5px;background:#eee;text-align:${c.align === 'end' ? 'right' : 'left'}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rowsData.map((r) => `<tr>${cols.map((c) => `<td style="border:1px solid #ddd;padding:5px;text-align:${c.align === 'end' ? 'right' : 'left'}">${esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`),
    });
  };

  // ------------------------------------------------------------ report card
  function reportHtml(r) {
    const s = r.school;
    return `<div class="sc-doc sc-report" style="${docColor()}"><div class="hd"><span class="lg">${esc(SC.schoolInitials(s))}${s.has_logo ? `<img src="${SC.logoUrl(s.id)}" alt="" onerror="this.remove()">` : ''}</span><div><h2 style="margin:0">${esc(s.name)}</h2><p>${esc([s.address, s.phone, s.email, s.website].filter(Boolean).join(' · '))}</p></div></div>
      <div class="ttl"><b>Student report card</b><span style="font-size:12px;color:#555">${esc(r.exam.name)} · ${esc(r.exam.term_name || '')} ${esc(r.exam.year_name || '')}</span></div>
      <div class="info"><div><span>Student</span><b>${esc(r.student.full_name)}</b></div><div><span>Student ID</span><b>${esc(r.student.admission_no)}</b></div><div><span>Class</span><b>${esc(r.exam.class_name)}</b></div><div><span>Examination</span><b>${esc(r.exam.exam_type)}</b></div><div><span>Gender</span><b>${esc(SC.cap(r.student.gender))}</b></div><div><span>Date</span><b>${SC.date(r.exam.exam_date)}</b></div></div>
      <table><thead><tr><th>Subject</th><th class="num">Marks</th><th class="num">Grade</th><th>Remarks</th></tr></thead><tbody>${r.subjects.map((x) => `<tr><td>${esc(x.subject)}</td><td class="num">${x.marks} / ${r.exam.max_marks}</td><td class="num"><b>${esc(x.grade)}</b></td><td>${esc(x.remarks)}</td></tr>`).join('')}</tbody></table>
      <div class="totals"><div><b>${SC.num(r.total)}</b><span>Total marks</span></div><div><b>${r.average}%</b><span>Average</span></div><div><b>${esc(r.grade)}</b><span>Grade</span></div><div><b>${esc(r.position_label)}</b><span>Position</span></div></div>
      ${r.division ? `<div style="font-size:13px;margin-bottom:6px"><b>Division ${esc(r.division)}</b> <span style="color:#666">(${r.division_points} points)</span></div>` : ''}${r.attendance_percent != null ? `<div style="font-size:12px;color:#555">Attendance: ${r.attendance_percent}% · Class average: ${r.class_average != null ? r.class_average + '%' : '—'}</div>` : ''}
      <div class="cm"><b>Teacher's comments</b>${esc(r.teacher_comment || r.suggested_comment || '')}</div><div class="cm" style="min-height:40px"><b>Academic remarks</b>${esc(r.academic_remarks || '')}</div>
      <div class="sign"><div>Class teacher</div><div>Head of school</div><div>Parent / guardian</div></div>
      <div class="scale">Grading: ${r.grading_scale.map((g) => `${esc(g.grade)} (${g.min}%+ ${esc(g.remark)})`).join(' · ')}</div></div>`;
  }

  SC.modules.reportcard = async (el, args) => {
    const d = await SC.api.get(`/report-card?exam_id=${args[0]}&student_id=${args[1]}`); const r = d.report;
    SC.setTitle('Report card', `${r.student.full_name} · ${r.exam.name}`);
    const canComment = SC.can('results.enter') && !SC.isParent();
    const back = SC.isParent() ? `#student/${r.student.id}` : `#results/${r.exam.id}`;
    el.innerHTML = `${SC.pageHead('Report card', `${r.student.full_name} · ${r.exam.name}`, `<a class="sc-btn ghost" href="${back}"><i class="fa-solid fa-arrow-left"></i> Back</a><button class="sc-btn ghost" data-act="pdf"><i class="fa-solid fa-file-pdf"></i> Download PDF</button><button class="sc-btn primary" data-act="print"><i class="fa-solid fa-print"></i> Print</button>`)}
      ${canComment ? `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-card-head"><h3>Teacher's comment & remarks</h3></div><form class="sc-form" id="cmForm" novalidate><div class="cols">${SC.f.textarea('teacher_comment', "Teacher's comment", { value: r.teacher_comment || r.suggested_comment || '', rows: 3, hint: 'We suggested a comment from the grade — edit it as you like.' })}${SC.f.textarea('remarks', 'Academic remarks', { value: r.academic_remarks || '', rows: 3 })}</div><div><button class="sc-btn primary sm" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save comments</button></div></form></div>` : ''}
      <div class="sc-card"><div class="sc-doc-stage" id="rcStage">${reportHtml(r)}</div></div>`;
    const stage = el.querySelector('#rcStage');
    const form = el.querySelector('#cmForm');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const v = SC.formData(form); await SC.api.put('/report-card/comment', { exam_id: r.exam.id, student_id: r.student.id, ...v }); r.teacher_comment = v.teacher_comment; r.academic_remarks = v.remarks; stage.innerHTML = reportHtml(r); SC.toast('Comments saved.'); } catch (err) { SC.fail(err); }
    });
    SC.delegate(el, {
      print: () => SC.print(`<div style="display:flex;justify-content:center">${reportHtml(r)}</div>`),
      pdf: async (b) => { b.disabled = true; try { await SC.pdf(stage.querySelector('.sc-report'), `Report-card-${r.student.admission_no}-${r.exam.name}.pdf`.replace(/[\\/:*?"<>|\s]+/g, '-'), { format: 'a4', margin: 8 }); SC.toast('Report card downloaded.'); } catch (err) { SC.fail(err); } b.disabled = false; },
    });
  };
})();
