/* Customers: search & control page, profile, save/edit form, notes, statement, debt payments. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  function customerForm(c = {}) {
    return `${SP.f.input('full_name', 'Full name', { required: true, value: c.full_name, placeholder: 'e.g. Amina Juma' })}
      <div class="cols">${SP.f.input('phone', 'Phone number', { type: 'tel', value: c.phone, placeholder: '+255 712 345 678' })}${SP.f.input('alt_phone', 'Second phone (optional)', { type: 'tel', value: c.alt_phone })}</div>
      <div class="cols">${SP.f.input('email', 'Email (optional)', { type: 'email', value: c.email })}${SP.f.input('city', 'City / area', { value: c.city })}</div>
      <div class="cols">${SP.f.select('customer_type', 'Customer type', SP.opts.customerType, { value: c.customer_type || 'retail', noBlank: true })}${SP.f.select('gender', 'Gender (optional)', SP.opts.gender, { value: c.gender })}</div>
      <div class="cols">${SP.f.input('company', 'Company (optional)', { value: c.company })}${SP.f.input('credit_limit', 'Credit limit', { type: 'number', value: c.credit_limit || 0, hint: '0 = no limit on buying on credit', attr: { min: 0, step: '0.01' } })}</div>
      ${SP.f.textarea('address', 'Address (optional)', { value: c.address, rows: 2 })}
      ${SP.f.textarea('notes', 'Notes (optional)', { value: c.notes, rows: 2, hint: 'Visible to staff on the customer profile' })}`;
  }

  function openCustomerForm(existing, onSaved) {
    SP.formModal({
      title: existing ? 'Edit customer' : 'Save new customer', submit: existing ? 'Save changes' : 'Save customer', size: 'wide', body: customerForm(existing || {}),
      onSubmit: async (data) => {
        const r = existing ? await SP.api.put(`/customers/${existing.id}`, data) : await SP.api.post('/customers', data);
        SP.closeModal(); SP.toast(existing ? 'Customer updated.' : 'Customer saved.'); if (onSaved) onSaved(r);
      },
    });
  }
  SP.openCustomerForm = openCustomerForm;

  // =============================================================== list
  SP.modules.customers = async (el) => {
    const st = { page: 1, limit: 20, q: '', status: '', type: '', owing: '', sort: 'recent' };
    el.innerHTML = `${SP.pageHead('Customers', 'Search, save and manage every customer', SP.can('customers.create') ? '<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-user-plus"></i> Save Customer</button>' : '')}
      <div class="sp-grid stats" id="custSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card">
        <div class="sp-toolbar">
          <input class="sp-input grow" id="fQ" type="search" placeholder="Search by name, phone or customer number…" aria-label="Search customers">
          <select class="sp-select" id="fType" aria-label="Type"><option value="">Any type</option>${SP.opts.customerType.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <select class="sp-select" id="fStatus" aria-label="Status"><option value="">Any status</option>${SP.opts.status.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <select class="sp-select" id="fOwing" aria-label="Owing"><option value="">All customers</option><option value="1">Owing money</option></select>
          <select class="sp-select" id="fSort" aria-label="Sort by"><option value="recent">Most recent</option><option value="name">Name (A–Z)</option><option value="spent">Highest spender</option><option value="balance">Highest balance</option></select>
          <button class="sp-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> Clear</button>
        </div>
        <div id="custList">${SP.skeleton(6)}</div>
      </div>`;

    const listEl = el.querySelector('#custList');
    async function load() {
      listEl.style.opacity = '.6';
      try {
        const d = await SP.api.get('/customers' + SP.qs({ ...st }));
        el.querySelector('#custSummary').innerHTML = [
          SP.stat('fa-users', SP.num(d.summary.total), 'Customers', `${d.summary.new_30d} new in 30 days`),
          SP.stat('fa-user-check', SP.num(d.summary.active), 'Active', '', 'green'),
          SP.stat('fa-hand-holding-dollar', SP.num(d.summary.owing_count), 'Owe Money', SP.moneyHtml(d.summary.owing_total), d.summary.owing_count ? 'amber' : ''),
        ].join('');
        const cols = [
          { label: 'Customer', render: (c) => `<a href="#customer/${c.id}" class="sp-person"><span class="sp-avatar">${esc(SP.initials(c.full_name))}</span><span><span class="nm" style="color:var(--sp-text)">${esc(c.full_name)}</span><div class="sb">${esc(c.customer_no)}</div></span></a>` },
          { label: 'Phone', render: (c) => esc(c.phone || '—') },
          { label: 'Type', render: (c) => SP.chip(c.customer_type) },
          { label: 'Orders', cls: 'end', render: (c) => SP.num(c.orders) },
          { label: 'Total spent', cls: 'end', render: (c) => SP.money(c.spent) },
          { label: 'Owing', cls: 'end', render: (c) => c.balance > 0.004 ? `<b style="color:var(--sp-danger)">${SP.money(c.balance)}</b>` : '<span class="sp-muted">—</span>' },
          { label: 'Status', render: (c) => SP.chip(c.status) },
          { label: 'Actions', cls: 'end', render: (c) => `<div class="sp-actions-cell"><a class="sp-btn ghost sm" href="#customer/${c.id}" title="View profile"><i class="fa-solid fa-eye"></i></a><button class="sp-btn ghost sm" data-act="menu" data-id="${c.id}" title="More"><i class="fa-solid fa-ellipsis"></i></button></div>` },
        ];
        const empty = st.q || st.status || st.type || st.owing
          ? SP.empty('fa-magnifying-glass', 'No customers match your search', 'Try a different name or clear the filters.')
          : SP.empty('fa-users', 'No customers yet', 'Save your first customer to get started.', SP.can('customers.create') ? '<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-user-plus"></i> Save Customer</button>' : '');
        listEl._rows = d.customers;
        listEl.innerHTML = SP.table(cols, d.customers, { empty }) + SP.pager(d.page, d.limit, d.total);
      } catch (e) { listEl.innerHTML = SP.errorBox(e); }
      listEl.style.opacity = '1';
    }
    const bind = (id, key, ev = 'change') => el.querySelector(id).addEventListener(ev, (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fType', 'type'); bind('#fStatus', 'status'); bind('#fOwing', 'owing'); bind('#fSort', 'sort');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', status: '', type: '', owing: '', sort: 'recent', page: 1 }); el.querySelectorAll('.sp-toolbar input,.sp-toolbar select').forEach((i) => { i.value = ''; }); load(); });

    const toggle = async (row) => {
      const active = row.status === 'active';
      const ok = await SP.confirm({ title: active ? 'Deactivate this customer?' : 'Activate this customer?', message: active ? `<b>${esc(row.full_name)}</b> will be marked Inactive. Their history is kept, and you can activate them again any time.` : `<b>${esc(row.full_name)}</b> will be marked Active again.`, confirmText: active ? 'Yes, deactivate' : 'Yes, activate', danger: active });
      if (!ok) return;
      await SP.api.put(`/customers/${row.id}/status`, { status: active ? 'inactive' : 'active' });
      SP.toast(active ? 'Customer deactivated.' : 'Customer activated.'); load();
    };
    const remove = async (row) => {
      const ok = await SP.confirm({ title: 'Delete this customer?', message: `<b>${esc(row.full_name)}</b> will be permanently deleted. This cannot be undone.` });
      if (!ok) return;
      try { await SP.api.del(`/customers/${row.id}`); SP.toast('Customer deleted.'); load(); } catch (e) { SP.fail(e); }
    };
    SP.delegate(el, {
      new: () => openCustomerForm(null, () => load()),
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      menu: (b) => {
        const row = listEl._rows.find((x) => String(x.id) === b.dataset.id); if (!row) return;
        SP.popMenu(b, [
          { label: 'View profile', icon: 'fa-eye', fn: () => SP.go(`customer/${row.id}`) },
          ...(SP.can('customers.edit') ? [{ label: 'Edit', icon: 'fa-pen', fn: () => openCustomerForm(row, () => load()) }, { label: row.status === 'active' ? 'Deactivate' : 'Activate', icon: row.status === 'active' ? 'fa-user-slash' : 'fa-user-check', fn: () => toggle(row) }] : []),
          ...(SP.can('customers.delete') ? [{ label: 'Delete', icon: 'fa-trash', danger: true, fn: () => remove(row) }] : []),
        ]);
      },
    });
    await load();
  };

  // =============================================================== profile
  SP.modules.customer = async (el, parts) => {
    const id = parts[0];
    const d = await SP.api.get(`/customers/${id}`);
    const c = d.customer;
    const canEdit = SP.can('customers.edit'); const seeNotes = SP.can('customers.notes'); const seePay = SP.can('payments.record');

    el.innerHTML = `${SP.pageHead(c.full_name, `${c.customer_no} · ${SP.cap(c.customer_type)}${c.city ? ' · ' + esc(c.city) : ''}`,
      `${canEdit ? '<button class="sp-btn ghost" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>' : ''}${seePay && d.stats.balance > 0.004 ? '<button class="sp-btn primary" data-act="pay"><i class="fa-solid fa-hand-holding-dollar"></i> Receive Payment</button>' : ''}<a class="sp-btn ghost" href="#customers"><i class="fa-solid fa-arrow-left"></i> Back</a>`)}
      <div class="sp-grid stats" style="margin-bottom:1.1rem">
        ${SP.stat('fa-receipt', SP.num(d.stats.orders), 'Orders', d.stats.last_purchase ? `Last: ${SP.date(d.stats.last_purchase)}` : 'No purchases yet')}
        ${SP.stat('fa-sack-dollar', SP.moneyHtml(d.stats.spent), 'Total Spent', d.stats.orders ? `Avg. ${SP.money(d.stats.avg_order)}` : '', 'green')}
        ${SP.stat('fa-hand-holding-dollar', SP.moneyHtml(d.stats.balance), 'Currently Owes', c.credit_limit > 0 ? `Limit ${SP.money(c.credit_limit)}` : 'No credit limit', d.stats.balance > 0.004 ? 'amber' : '')}
        ${c.loyalty_points ? SP.stat('fa-star', SP.num(c.loyalty_points), 'Loyalty Points', '', 'blue') : SP.stat('fa-circle-check', SP.cap(c.status), 'Status', '', c.status === 'active' ? 'green' : '')}
      </div>
      <div class="sp-grid split">
        <div class="sp-stack">
          <div class="sp-card"><div class="sp-card-head"><h3>Recent sales</h3><div class="sp-actions"><a href="#customer/${c.id}/statement" class="sp-btn ghost sm">Full statement</a></div></div>
            <div id="custSales">${d.sales && d.sales.length ? SP.table([
              { label: 'Receipt', render: (s) => `<a href="#sale/${s.id}">${esc(s.receipt_no)}</a>` }, { label: 'Date', render: (s) => SP.date(s.created_at) },
              { label: 'Total', cls: 'end', render: (s) => SP.money(s.total) }, { label: 'Balance', cls: 'end', render: (s) => s.balance > 0.004 ? SP.money(s.balance) : '—' },
              { label: 'Status', render: (s) => SP.chip(s.status === 'void' ? 'void' : s.payment_status) },
            ], d.sales) : SP.empty('fa-receipt', 'No sales yet', 'Sales to this customer will show here.')}</div></div>
          ${d.top_products && d.top_products.length ? `<div class="sp-card"><div class="sp-card-head"><h3>Frequently bought</h3></div><div class="sp-list">${d.top_products.map((p) => `<div class="sp-spread"><b>${esc(p.name)}</b><span class="sp-muted sp-small">${SP.num(p.qty)} units · ${SP.money(p.amount)}</span></div>`).join('')}</div></div>` : ''}
          ${seeNotes ? `<div class="sp-card"><div class="sp-card-head"><h3>Notes</h3></div><div id="custNotes"><form class="sp-row" id="noteForm" style="margin-bottom:.8rem"><input class="sp-input grow" name="note" placeholder="Add a note about this customer…" maxlength="1000"><button class="sp-btn primary sm" type="submit">Add</button></form><div class="sp-list">${d.notes.length ? d.notes.map(noteRow).join('') : '<p class="sp-muted sp-small">No notes yet.</p>'}</div></div></div>` : ''}
        </div>
        <div class="sp-stack">
          <div class="sp-card"><div class="sp-card-head"><h3>Contact</h3></div><dl class="sp-kv">
            <dt>Phone</dt><dd>${esc(c.phone || '—')}</dd>${c.alt_phone ? `<dt>Second phone</dt><dd>${esc(c.alt_phone)}</dd>` : ''}
            <dt>Email</dt><dd>${esc(c.email || '—')}</dd><dt>Address</dt><dd>${esc(c.address || c.city || '—')}</dd>
            ${c.company ? `<dt>Company</dt><dd>${esc(c.company)}</dd>` : ''}<dt>Saved</dt><dd>${SP.date(c.created_at)}</dd></dl>${c.notes ? `<p class="sp-small sp-muted" style="margin:.6rem 0 0;border-top:1px solid var(--sp-border);padding-top:.6rem">${esc(c.notes)}</p>` : ''}</div>
          ${d.payments && d.payments.length ? `<div class="sp-card"><div class="sp-card-head"><h3>Recent payments</h3></div><div class="sp-list">${d.payments.map((p) => `<div class="sp-spread"><div><b>${SP.money(p.amount)}</b><div class="sp-small sp-muted">${esc(p.method)}${p.reference ? ' · ' + esc(p.reference) : ''}</div></div><span class="sp-small sp-muted">${SP.date(p.created_at)}</span></div>`).join('')}</div></div>` : ''}
        </div>
      </div>`;

    if (seeNotes) {
      el.querySelector('#noteForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const input = e.target.note; const note = input.value.trim(); if (!note) return;
        const btn = e.target.querySelector('button'); btn.disabled = true;
        try { await SP.api.post(`/customers/${c.id}/notes`, { note }); SP.go(`customer/${c.id}`); } catch (err) { SP.fail(err); btn.disabled = false; }
      });
    }
    SP.delegate(el, {
      edit: () => SP.openCustomerForm(c, () => SP.go(`customer/${c.id}`)),
      pay: () => openReceivePayment(c, d.stats.balance, () => SP.go(`customer/${c.id}`)),
      'note-del': async (b) => { const ok = await SP.confirm({ title: 'Delete this note?', danger: true }); if (!ok) return; await SP.api.del(`/customer-notes/${b.dataset.id}`); SP.go(`customer/${c.id}`); },
    });
  };

  function noteRow(n) {
    return `<div class="sp-spread"><div><span>${esc(n.note)}</span><div class="sp-small sp-muted">${esc(n.user_name || 'Staff')} · ${SP.dateTime(n.created_at)}</div></div>${SP.can('customers.notes') ? `<button class="sp-icon-btn" style="width:30px;height:30px" data-act="note-del" data-id="${n.id}" title="Delete"><i class="fa-solid fa-xmark"></i></button>` : ''}</div>`;
  }

  function openReceivePayment(c, owed, onDone) {
    SP.lookups().then((lk) => {
      SP.formModal({
        title: `Receive payment — ${c.full_name}`, submit: 'Record payment',
        body: `<div class="sp-alert info"><i class="fa-solid fa-circle-info"></i><div>Currently owes <b>${SP.money(owed)}</b>. The payment will be applied to the oldest unpaid sales first.</div></div>
          ${SP.f.input('amount', 'Amount received', { type: 'number', required: true, value: owed, attr: { min: 0.01, max: owed, step: '0.01' } })}
          ${SP.f.select('method', 'Payment method', SP.opts.paymentMethods(lk), { required: true })}
          ${SP.f.input('reference', 'Reference (optional)', { placeholder: 'Transaction ID, cheque no…' })}`,
        onSubmit: async (data) => { const r = await SP.api.post(`/customers/${c.id}/payments`, data); SP.closeModal(); SP.toast(`Payment recorded. ${r.remaining > 0.004 ? SP.money(r.remaining) + ' still owed.' : 'Fully paid.'}`); if (onDone) onDone(); },
      });
    });
  }
  SP.openReceivePayment = openReceivePayment;

  // =============================================================== statement
  // customer/:id/statement uses the same 'customer' route/module — branch on the extra segment.
  const origCustomer = SP.modules.customer;
  SP.modules.customer = async (el, parts, seg) => {
    if (parts[1] === 'statement') return renderStatement(el, parts[0]);
    return origCustomer(el, parts, seg);
  };

  async function renderStatement(el, id) {
    const d = await SP.api.get(`/customers/${id}/statement`);
    const c = d.customer;
    el.innerHTML = `${SP.pageHead(`Statement — ${c.full_name}`, c.customer_no, `<button class="sp-btn ghost" data-act="print"><i class="fa-solid fa-print"></i> Print</button><a class="sp-btn ghost" href="#customer/${c.id}"><i class="fa-solid fa-arrow-left"></i> Back</a>`)}
      <div class="sp-card" id="stmtCard">
        <div class="sp-spread" style="margin-bottom:1rem"><div><b>Balance owed</b></div><div style="font-size:1.3rem;font-weight:800;color:${d.balance > 0.004 ? 'var(--sp-danger)' : 'var(--sp-ok)'}">${SP.money(d.balance)}</div></div>
        ${d.entries.length ? SP.table([
          { label: 'Date', render: (r) => SP.date(r.date) }, { label: 'Reference', render: (r) => esc(r.ref) }, { label: 'Type', render: (r) => r.kind === 'sale' ? 'Sale' : `Payment (${esc(r.method || '')})` },
          { label: 'Sale amount', cls: 'end', render: (r) => r.debit ? SP.money(r.debit) : '' }, { label: 'Paid', cls: 'end', render: (r) => r.credit ? SP.money(r.credit) : '' }, { label: 'Balance', cls: 'end', render: (r) => SP.money(r.balance) },
        ], d.entries) : SP.empty('fa-file-invoice', 'Nothing yet', 'Sales and payments will appear here.')}
      </div>`;
    SP.delegate(el, { print: () => SP.print(`<div class="sp-doc"><h2>${esc(SP.state.shop.name)}</h2><h3>Statement — ${esc(c.full_name)}</h3>${el.querySelector('#stmtCard').innerHTML}</div>`) });
  }
})();
