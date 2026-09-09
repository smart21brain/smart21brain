(function () {
  'use strict';
  const STN = window.STN;
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.finance = async function (root) {
    root.innerHTML = `
      <div class="stn-tabs">
        <div class="stn-tab active" data-tab="cashbook">Cashbook</div>
        <div class="stn-tab" data-tab="expenses">Expenses</div>
        <div class="stn-tab" data-tab="debts">Debts / Credit</div>
      </div>
      <div id="stnFinancePane"></div>
    `;
    document.querySelectorAll('#stnContent .stn-tab').forEach((t) => t.addEventListener('click', () => {
      document.querySelectorAll('#stnContent .stn-tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      renderPane(t.dataset.tab);
    }));
    renderPane('cashbook');
  };

  async function renderPane(tab) {
    const pane = document.getElementById('stnFinancePane');
    pane.innerHTML = '<div class="stn-loading"><div class="stn-spin"></div></div>';
    if (tab === 'cashbook') return renderCashbook(pane);
    if (tab === 'expenses') return renderExpenses(pane);
    if (tab === 'debts') return renderDebts(pane);
  }

  async function renderCashbook(pane) {
    const { entries, totalIn, totalOut, balance } = await STN.api.get('/finance/cashbook');
    pane.innerHTML = `
      <div class="stn-grid stn-grid-3 mb-3">
        <div class="stn-stat"><div class="label">Money In</div><div class="value text-emerald">${STN.money(totalIn)}</div></div>
        <div class="stn-stat"><div class="label">Money Out</div><div class="value text-red">${STN.money(totalOut)}</div></div>
        <div class="stn-stat"><div class="label">Balance</div><div class="value text-cyan">${STN.money(balance)}</div></div>
      </div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>Date</th><th>Description</th><th class="text-end">Amount</th></tr></thead>
        <tbody>${entries.length ? entries.map((e) => `
          <tr><td class="text-soft">${STN.dt(e.date)}</td><td>${STN.esc(e.label)}</td>
          <td class="text-end ${e.type === 'in' ? 'text-emerald' : 'text-red'}">${e.type === 'in' ? '+' : '-'}${STN.money(e.amount)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-soft text-center py-3">No transactions yet.</td></tr>'}</tbody>
      </table></div></div>
    `;
  }

  async function renderExpenses(pane) {
    const { expenses } = await STN.api.get('/finance/expenses');
    pane.innerHTML = `
      <div class="d-flex justify-content-end mb-3">
        <button class="stn-btn stn-btn-primary stn-btn-sm" id="stnExpAdd" ${STN.can('manage_finance') ? '' : 'disabled'}><i class="fa-solid fa-plus"></i> Add Expense</button>
      </div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="text-end">Amount</th><th></th></tr></thead>
        <tbody>${expenses.length ? expenses.map((e) => `
          <tr><td class="text-soft">${STN.dt(e.created_at)}</td><td><span class="stn-badge">${STN.esc(e.category)}</span></td><td>${STN.esc(e.description || '—')}</td>
          <td class="text-end text-red">${STN.money(e.amount)}</td>
          <td class="text-end"><button class="stn-btn stn-btn-ghost stn-btn-sm" data-del="${e.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="5" class="text-soft text-center py-3">No expenses recorded yet.</td></tr>'}</tbody>
      </table></div></div>
    `;
    document.getElementById('stnExpAdd').addEventListener('click', () => {
      STN.openModal(`
        <div class="stn-modal-head"><h3 class="mb-0">Add Expense</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="stn-modal-body">
          <div class="stn-field"><label class="stn-label">Category</label><input class="stn-input" id="stnExpCat" value="General"></div>
          <div class="stn-field"><label class="stn-label">Description</label><input class="stn-input" id="stnExpDesc"></div>
          <div class="stn-field"><label class="stn-label">Amount</label><input class="stn-input" type="number" id="stnExpAmt"></div>
        </div>
        <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnExpSave">Save</button></div>
      `);
      document.getElementById('stnExpSave').addEventListener('click', async () => {
        const amount = Number(document.getElementById('stnExpAmt').value);
        if (!amount || amount <= 0) return STN.toast('Enter a valid amount.', 'error');
        try {
          await STN.api.post('/finance/expenses', { category: document.getElementById('stnExpCat').value, description: document.getElementById('stnExpDesc').value, amount });
          STN.toast('Expense added.'); STN.closeModal(); renderPane('expenses');
        } catch (err) { STN.toast(err.message, 'error'); }
      });
    });
    pane.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm('Delete this expense?')) return;
      await STN.api.del(`/finance/expenses/${btn.dataset.del}`);
      renderPane('expenses');
    }));
  }

  async function renderDebts(pane) {
    const { debts, totalOwed } = await STN.api.get('/finance/debts');
    pane.innerHTML = `
      <div class="stn-stat mb-3" style="max-width:260px"><div class="label">Total Owed by Customers</div><div class="value text-amber">${STN.money(totalOwed)}</div></div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Paid</th><th class="text-end">Balance</th></tr></thead>
        <tbody>${debts.length ? debts.map((d) => `
          <tr><td>${STN.esc(d.order_no)}</td><td>${STN.esc(d.customer_name || 'Walk-in')} ${d.customer_phone ? `<div class="text-soft" style="font-size:.74rem">${STN.esc(d.customer_phone)}</div>` : ''}</td>
          <td>${STN.money(d.total_amount)}</td><td>${STN.money(d.paid_amount)}</td>
          <td class="text-end text-amber">${STN.money(d.balance)}</td></tr>`).join('') : '<tr><td colspan="5" class="text-soft text-center py-3">No outstanding balances — nice!</td></tr>'}</tbody>
      </table></div></div>
    `;
  }
})();
