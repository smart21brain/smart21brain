/* Sales: list of receipts, sale detail/receipt, add payment, void, customer debts list. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  SP.modules.sales = async (el) => {
    const q0 = new URLSearchParams(location.hash.split('?')[1] || '');
    const st = { page: 1, limit: 20, q: '', status: '', payment_status: q0.get('payment_status') || '', from: '', to: '', owing: q0.get('owing') || '' };
    el.innerHTML = `${SP.pageHead('Sales', 'Every receipt, credit sale and cancellation', SP.can('sales.create') ? '<a href="#pos" class="sp-btn primary"><i class="fa-solid fa-cash-register"></i> New Sale</a>' : '')}
      <div class="sp-grid stats" id="saleSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card">
        <div class="sp-toolbar">
          <input class="sp-input grow" id="fQ" type="search" placeholder="Search receipt no. or customer…">
          <input class="sp-input" id="fFrom" type="date" aria-label="From date"><input class="sp-input" id="fTo" type="date" aria-label="To date">
          <select class="sp-select" id="fPay" aria-label="Payment status"><option value="">Any payment</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="unpaid">Unpaid</option></select>
          <select class="sp-select" id="fStatus" aria-label="Status"><option value="">Any status</option><option value="completed">Completed</option><option value="void">Cancelled</option></select>
          <button class="sp-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> Clear</button>
        </div>
        <div id="saleList">${SP.skeleton(6)}</div>
      </div>`;
    if (st.payment_status) el.querySelector('#fPay').value = st.payment_status;

    const listEl = el.querySelector('#saleList');
    async function load() {
      listEl.style.opacity = '.6';
      try {
        const d = await SP.api.get('/sales' + SP.qs(st));
        el.querySelector('#saleSummary').innerHTML = [
          SP.stat('fa-receipt', SP.num(d.summary.count), 'Sales', ''),
          SP.stat('fa-sack-dollar', SP.moneyHtml(d.summary.total), 'Total', '', 'blue'),
          SP.stat('fa-money-bill-wave', SP.moneyHtml(d.summary.paid), 'Received', '', 'green'),
          SP.stat('fa-hand-holding-dollar', SP.moneyHtml(d.summary.balance), 'Owing', '', d.summary.balance > 0 ? 'amber' : ''),
        ].join('');
        const cols = [
          { label: 'Receipt', render: (s) => `<a href="#sale/${s.id}"><b>${esc(s.receipt_no)}</b></a>` },
          { label: 'Customer', render: (s) => esc(s.customer_name || 'Walk-in customer') },
          { label: 'Date', render: (s) => SP.dateTime(s.created_at) },
          { label: 'Items', cls: 'end', render: (s) => s.item_count },
          { label: 'Total', cls: 'end', render: (s) => SP.money(s.total) },
          { label: 'Balance', cls: 'end', render: (s) => s.balance > 0.004 ? `<b style="color:var(--sp-danger)">${SP.money(s.balance)}</b>` : '—' },
          { label: 'Status', render: (s) => s.status === 'void' ? SP.chip('void') : SP.chip(s.payment_status) },
          { label: '', cls: 'end', render: (s) => `<a class="sp-btn ghost sm" href="#sale/${s.id}"><i class="fa-solid fa-eye"></i></a>` },
        ];
        listEl.innerHTML = SP.table(cols, d.sales, { empty: SP.empty('fa-receipt', 'No sales found', 'Try different filters, or make your first sale.') }) + SP.pager(d.page, d.limit, d.total);
      } catch (e) { listEl.innerHTML = SP.errorBox(e); }
      listEl.style.opacity = '1';
    }
    const bind = (id, key, ev = 'change') => el.querySelector(id).addEventListener(ev, (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fFrom', 'from'); bind('#fTo', 'to'); bind('#fPay', 'payment_status'); bind('#fStatus', 'status');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', status: '', payment_status: '', from: '', to: '', owing: '', page: 1 }); el.querySelectorAll('.sp-toolbar input,.sp-toolbar select').forEach((i) => { i.value = ''; }); load(); });
    SP.delegate(el, { page: (b) => { st.page = Number(b.dataset.p); load(); } });
    await load();
  };

  // =============================================================== detail
  SP.modules.sale = async (el, parts) => {
    const d = await SP.api.get(`/sales/${parts[0]}`);
    render(el, d);
  };
  function render(el, d) {
    const { sale, items, payments, customer, shop } = d;
    const canPay = SP.can('payments.record') && sale.status === 'completed' && sale.balance > 0.004;
    const canVoid = SP.can('sales.void') && sale.status === 'completed';
    el.innerHTML = `${SP.pageHead(sale.receipt_no, `${SP.dateTime(sale.created_at)} · Sold by ${esc(sale.sold_by_name || '—')}`,
      `<button class="sp-btn ghost" data-act="print"><i class="fa-solid fa-print"></i> Print</button>${canPay ? '<button class="sp-btn primary" data-act="pay"><i class="fa-solid fa-hand-holding-dollar"></i> Add Payment</button>' : ''}${canVoid ? '<button class="sp-btn danger-ghost" data-act="void"><i class="fa-solid fa-ban"></i> Cancel Sale</button>' : ''}<a class="sp-btn ghost" href="#sales"><i class="fa-solid fa-arrow-left"></i> Back</a>`)}
      ${sale.status === 'void' ? `<div class="sp-alert bad"><i class="fa-solid fa-ban"></i><div><b>This sale was cancelled.</b> ${esc(sale.void_reason || '')} ${sale.voided_by_name ? `— by ${esc(sale.voided_by_name)}` : ''}</div></div>` : ''}
      <div class="sp-grid split">
        <div class="sp-stack">
          <div class="sp-card"><div class="sp-card-head"><h3>Items</h3></div>${SP.table([
            { label: 'Item' }, { label: 'Qty', cls: 'end' }, { label: 'Unit price', cls: 'end' }, { label: 'Amount', cls: 'end' },
          ].map((c, i) => ({ ...c, render: [(x) => esc(x.name), (x) => SP.num(x.qty) + ' ' + esc(x.unit || ''), (x) => SP.money(x.unit_price), (x) => SP.money(x.line_total)][i] })), items)}
            <div class="sp-cart-row total" style="border-top:1px solid var(--sp-border);padding-top:.6rem;margin-top:.4rem"><span>Subtotal</span><span>${SP.money(sale.subtotal)}</span></div>
            ${sale.discount ? `<div class="sp-cart-row"><span>Discount</span><span>-${SP.money(sale.discount)}</span></div>` : ''}
            ${sale.tax ? `<div class="sp-cart-row"><span>VAT</span><span>${SP.money(sale.tax)}</span></div>` : ''}
            <div class="sp-cart-row total"><span>Total</span><span>${SP.money(sale.total)}</span></div>
            <div class="sp-cart-row"><span>Paid</span><span>${SP.money(sale.paid)}</span></div>
            ${sale.balance > 0.004 ? `<div class="sp-cart-row"><span>Balance</span><span style="color:var(--sp-danger);font-weight:800">${SP.money(sale.balance)}</span></div>` : ''}
          </div>
          <div class="sp-card"><div class="sp-card-head"><h3>Payments</h3></div><div class="sp-list">${payments.length ? payments.map((p) => `<div class="sp-spread"><div><b>${SP.money(p.amount)}</b><div class="sp-small sp-muted">${esc(p.method)}${p.reference ? ' · ' + esc(p.reference) : ''} · ${esc(p.user_name || '')}</div></div><span class="sp-small sp-muted">${SP.dateTime(p.created_at)}</span></div>`).join('') : SP.empty('fa-money-bill', 'No payments recorded', '')}</div></div>
        </div>
        <div class="sp-stack">
          <div class="sp-card"><h3 style="margin-bottom:.6rem">Customer</h3>${customer ? `<a href="#customer/${customer.id}" class="sp-person" style="color:inherit"><span class="sp-avatar">${esc(SP.initials(customer.full_name))}</span><span><span class="nm" style="color:var(--sp-text)">${esc(customer.full_name)}</span><div class="sb">${esc(customer.customer_no)}${customer.phone ? ' · ' + esc(customer.phone) : ''}</div></span></a>` : `<p class="sp-muted" style="margin:0">${esc(sale.customer_name || 'Walk-in customer')}</p>`}</div>
          ${sale.note ? `<div class="sp-card"><h3 style="margin-bottom:.5rem">Note</h3><p style="margin:0">${esc(sale.note)}</p></div>` : ''}
          <div class="sp-doc-stage" style="--doc-color:${shop.primary_color}">${SP.receiptHtml(d)}</div>
        </div>
      </div>`;
    SP.delegate(el, {
      print: () => SP.print(`<div style="--doc-color:${shop.primary_color}">${SP.receiptHtml(d)}</div>`),
      pay: () => {
        SP.lookups().then((lk) => SP.formModal({
          title: 'Add payment', submit: 'Record payment',
          body: `<p class="sp-muted sp-small" style="margin-top:0">Balance owed: <b>${SP.money(sale.balance)}</b></p>${SP.f.input('amount', 'Amount', { type: 'number', required: true, value: sale.balance, attr: { min: 0.01, max: sale.balance, step: '0.01' } })}${SP.f.select('method', 'Payment method', SP.opts.paymentMethods(lk), { required: true })}${SP.f.input('reference', 'Reference (optional)', {})}`,
          onSubmit: async (data) => { await SP.api.post(`/sales/${sale.id}/payments`, data); SP.closeModal(); SP.toast('Payment recorded.'); SP.go(`sale/${sale.id}`); },
        }));
      },
      void: () => {
        SP.formModal({ title: 'Cancel this sale?', submit: 'Cancel Sale', danger: true,
          body: `<div class="sp-alert bad"><i class="fa-solid fa-triangle-exclamation"></i><div>This will restore any stock taken and remove the amount from the customer's balance. This cannot be undone.</div></div>${SP.f.textarea('reason', 'Reason', { required: true, rows: 2, placeholder: 'e.g. Customer changed their mind' })}`,
          onSubmit: async (data) => { await SP.api.post(`/sales/${sale.id}/void`, data); SP.closeModal(); SP.toast('Sale cancelled.'); SP.go(`sale/${sale.id}`); },
        });
      },
    });
  }

  // =============================================================== debts
  SP.modules.debts = async (el) => {
    const st = { page: 1, limit: 20, sort: 'balance', owing: '1' };
    el.innerHTML = `${SP.pageHead('Customer Debts', 'Everyone who currently owes your shop money')}
      <div class="sp-grid stats" id="debtSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card"><div class="sp-toolbar"><input class="sp-input grow" id="fQ" type="search" placeholder="Search customer…"></div><div id="debtList">${SP.skeleton(6)}</div></div>`;
    const listEl = el.querySelector('#debtList');
    async function load() {
      const d = await SP.api.get('/customers' + SP.qs(st));
      el.querySelector('#debtSummary').innerHTML = [
        SP.stat('fa-users', SP.num(d.summary.owing_count), 'Customers Owing', ''),
        SP.stat('fa-hand-holding-dollar', SP.moneyHtml(d.summary.owing_total), 'Total Owed', '', 'amber'),
      ].join('');
      listEl.innerHTML = SP.table([
        { label: 'Customer', render: (c) => `<a href="#customer/${c.id}" class="sp-person" style="color:inherit"><span class="sp-avatar">${esc(SP.initials(c.full_name))}</span><span><span class="nm" style="color:var(--sp-text)">${esc(c.full_name)}</span><div class="sb">${esc(c.phone || '')}</div></span></a>` },
        { label: 'Owes', cls: 'end', render: (c) => `<b style="color:var(--sp-danger)">${SP.money(c.balance)}</b>` },
        { label: 'Last purchase', render: (c) => SP.date(c.last_purchase) },
        { label: '', cls: 'end', render: (c) => SP.can('payments.record') ? `<button class="sp-btn primary sm" data-act="pay" data-id="${c.id}" data-bal="${c.balance}" data-name="${esc(c.full_name)}">Receive Payment</button>` : `<a class="sp-btn ghost sm" href="#customer/${c.id}">View</a>` },
      ], d.customers, { empty: SP.empty('fa-face-smile', 'No one owes you anything', 'All customer balances are settled.') }) + SP.pager(d.page, d.limit, d.total);
    }
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    SP.delegate(el, { page: (b) => { st.page = Number(b.dataset.p); load(); }, pay: (b) => SP.openReceivePayment({ id: b.dataset.id, full_name: b.dataset.name }, Number(b.dataset.bal), load) });
    await load();
  };
})();
