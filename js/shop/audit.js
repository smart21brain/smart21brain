/* Activity Log — a plain-English trail of who did what, for accountability. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;
  const LABELS = { 'user.login': 'signed in', 'sale.create': 'made a sale', 'sale.void': 'cancelled a sale', 'payment.create': 'recorded a sale payment', 'payment.customer': 'received a customer payment',
    'customer.create': 'saved a new customer', 'customer.update': 'updated a customer', 'customer.status': 'changed a customer\'s status', 'customer.delete': 'deleted a customer',
    'product.create': 'added a product', 'product.update': 'updated a product', 'product.delete': 'deleted a product', 'stock.adjust': 'adjusted stock', 'category.create': 'added a category', 'category.delete': 'deleted a category',
    'expense.create': 'recorded an expense', 'expense.delete': 'deleted an expense', 'shop.create': 'created the shop', 'shop.reset': 'reset the shop\'s data', 'demo.load': 'loaded sample data',
    'settings.shop': 'updated shop information', 'settings.logo': 'changed the logo', 'settings.update': 'changed shop settings', 'settings.permissions': 'updated role permissions',
    'user.create': 'added a staff member', 'user.update': 'updated a staff member', 'report.run': 'viewed a report' };

  SP.modules.audit = async (el) => {
    const st = { page: 1, limit: 30, q: '' };
    el.innerHTML = `${SP.pageHead('Activity Log', 'Every important action taken in your shop, for accountability')}
      <div class="sp-card"><div class="sp-toolbar"><input class="sp-input grow" id="fQ" type="search" placeholder="Search by person or action…"></div><div id="logList">${SP.skeleton(8)}</div></div>`;
    const list = el.querySelector('#logList');
    async function load() {
      const d = await SP.api.get('/audit' + SP.qs(st));
      list.innerHTML = d.logs.length ? `<div class="sp-timeline">${d.logs.map((l) => `<div class="sp-tl-row"><div class="sp-tl-dot"></div><div class="sp-tl-body"><b>${esc(l.user_name || 'System')}</b> ${esc(LABELS[l.action] || l.action.replace('.', ' → '))}${l.details ? ` — <span class="sp-muted">${esc(l.details)}</span>` : ''}<div class="sp-small sp-muted">${SP.dateTime(l.created_at)}</div></div></div>`).join('')}</div>` : SP.empty('fa-shield-halved', 'No activity yet', '');
      list.insertAdjacentHTML('beforeend', SP.pager(d.page, d.limit, d.total));
    }
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    SP.delegate(el, { page: (b) => { st.page = Number(b.dataset.p); load(); } });
    await load();
  };
})();
