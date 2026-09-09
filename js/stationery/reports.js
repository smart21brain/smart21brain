(function () {
  'use strict';
  const STN = window.STN;
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.reports = async function (root) {
    root.innerHTML = `
      <div class="stn-tabs">
        <div class="stn-tab active" data-range="daily">Daily</div>
        <div class="stn-tab" data-range="weekly">Weekly</div>
        <div class="stn-tab" data-range="monthly">Monthly</div>
      </div>
      <div id="stnReportPane"></div>
    `;
    document.querySelectorAll('#stnContent .stn-tab').forEach((t) => t.addEventListener('click', () => {
      document.querySelectorAll('#stnContent .stn-tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      load(t.dataset.range);
    }));
    load('daily');
  };

  async function load(range) {
    const pane = document.getElementById('stnReportPane');
    pane.innerHTML = '<div class="stn-loading"><div class="stn-spin"></div></div>';
    const r = await STN.api.get(`/reports?range=${range}`);
    pane.innerHTML = `
      <div class="stn-grid stn-grid-4 mb-3">
        <div class="stn-stat"><div class="label">Income</div><div class="value text-emerald">${STN.money(r.income)}</div></div>
        <div class="stn-stat"><div class="label">Expenses</div><div class="value text-red">${STN.money(r.expenses)}</div></div>
        <div class="stn-stat"><div class="label">Profit</div><div class="value text-cyan">${STN.money(r.profit)}</div></div>
        <div class="stn-stat"><div class="label">Orders</div><div class="value">${r.orders_count}</div></div>
      </div>
      <div class="stn-grid" style="grid-template-columns: 1.3fr 1fr">
        <div class="stn-card">
          <div class="stn-card-head"><h3>Top Services</h3></div>
          <div class="stn-table-wrap"><table class="stn-table">
            <thead><tr><th>Service</th><th>Qty Sold</th><th class="text-end">Revenue</th></tr></thead>
            <tbody>${r.top_services.length ? r.top_services.map((s) => `<tr><td>${STN.esc(s.description)}</td><td>${s.total_qty}</td><td class="text-end">${STN.money(s.revenue)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-soft text-center py-3">No sales in this period.</td></tr>'}</tbody>
          </table></div>
        </div>
        <div class="stn-card">
          <div class="stn-card-head"><h3>By Payment Method</h3></div>
          ${r.by_method.length ? r.by_method.map((m) => `
            <div class="d-flex justify-content-between mb-2"><span class="text-soft text-capitalize">${STN.esc(m.method)}</span><strong>${STN.money(m.total)}</strong></div>`).join('') : '<div class="stn-empty"><i class="fa-solid fa-wallet"></i>No payments yet.</div>'}
          <div class="stn-card-head mt-3"><h3>By Operator</h3></div>
          ${r.by_operator.length ? r.by_operator.map((o) => `
            <div class="d-flex justify-content-between mb-2"><span class="text-soft">${STN.esc(o.operator_name || 'Unassigned')}</span><span>${o.orders_handled} orders · ${STN.money(o.revenue)}</span></div>`).join('') : ''}
        </div>
      </div>
    `;
  }
})();
