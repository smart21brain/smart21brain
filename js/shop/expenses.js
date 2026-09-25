/* Expenses — rent, transport, salaries… feeds the profit & loss report. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  SP.modules.expenses = async (el) => {
    const st = { page: 1, limit: 20, q: '', from: '', to: '', category: '' };
    const settings = SP.state.settings;
    el.innerHTML = `${SP.pageHead('Expenses', 'Rent, transport, salaries and everything else it costs to run the shop', SP.can('expenses.manage') ? '<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> Add Expense</button>' : '')}
      <div class="sp-grid stats" id="expSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card"><div class="sp-toolbar">
        <input class="sp-input grow" id="fQ" type="search" placeholder="Search description or category…">
        <input class="sp-input" id="fFrom" type="date" aria-label="From"><input class="sp-input" id="fTo" type="date" aria-label="To">
        <select class="sp-select" id="fCat" aria-label="Category"><option value="">All categories</option>${(settings.expense_categories || []).map((c) => `<option>${esc(c)}</option>`).join('')}</select>
        <button class="sp-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> Clear</button>
      </div><div id="expList">${SP.skeleton(6)}</div></div>`;

    const listEl = el.querySelector('#expList');
    async function load() {
      const d = await SP.api.get('/expenses' + SP.qs(st));
      el.querySelector('#expSummary').innerHTML = [
        SP.stat('fa-money-bill-wave', SP.moneyHtml(d.summary.total), 'Total', `${d.summary.count} expenses`, 'amber'),
        ...(d.summary.by_category || []).slice(0, 3).map((c) => SP.stat('fa-tag', SP.moneyHtml(c.total), c.category)),
      ].join('');
      listEl.innerHTML = SP.table([
        { label: 'Date', render: (e) => SP.date(e.expense_date) }, { label: 'Category', render: (e) => SP.chip('info', e.category) },
        { label: 'Description', render: (e) => esc(e.description || '—') }, { label: 'Paid with', render: (e) => esc(e.method || '—') },
        { label: 'Amount', cls: 'end', render: (e) => SP.money(e.amount) },
        { label: '', cls: 'end', render: (e) => SP.can('expenses.manage') ? `<button class="sp-icon-btn" style="width:30px;height:30px" data-act="del" data-id="${e.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>` : '' },
      ], d.expenses, { empty: SP.empty('fa-money-bill-wave', 'No expenses recorded', 'Add rent, transport, salaries and other costs to see your real profit.') }) + SP.pager(d.page, d.limit, d.total);
    }
    const bind = (id, key) => el.querySelector(id).addEventListener('change', (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fFrom', 'from'); bind('#fTo', 'to'); bind('#fCat', 'category');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', from: '', to: '', category: '', page: 1 }); el.querySelectorAll('.sp-toolbar input,.sp-toolbar select').forEach((i) => { i.value = ''; }); load(); });

    SP.delegate(el, {
      new: () => SP.formModal({ title: 'Add expense', submit: 'Save expense',
        body: `<div class="cols">${SP.f.select('category', 'Category', (settings.expense_categories || []).map((c) => [c, c]), { required: true })}${SP.f.input('amount', 'Amount', { type: 'number', required: true, attr: { min: 0.01, step: '0.01' } })}</div>
          <div class="cols">${SP.f.input('expense_date', 'Date', { type: 'date', value: SP.today() })}${SP.f.select('method', 'Paid with (optional)', SP.opts.paymentMethods({ payment_methods: settings.payment_methods }), {})}</div>
          ${SP.f.textarea('description', 'Description (optional)', { rows: 2 })}`,
        onSubmit: async (data) => { await SP.api.post('/expenses', data); SP.closeModal(); SP.toast('Expense recorded.'); load(); } }),
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      del: async (b) => { const ok = await SP.confirm({ title: 'Delete this expense?' }); if (!ok) return; await SP.api.del(`/expenses/${b.dataset.id}`); SP.toast('Expense deleted.'); load(); },
    });
    await load();
  };
})();
