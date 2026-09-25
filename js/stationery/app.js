/* smart21brain Stationery OS — app shell: sidebar, routing, top bar. */
(function () {
  'use strict';
  const STN = window.STN;

  const NAV = [
    { group: 'Overview', items: [
      { route: 'dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
    ]},
    { group: 'Business', items: [
      { route: 'pos', icon: 'fa-cash-register', label: 'POS / New Order' },
      { route: 'orders', icon: 'fa-receipt', label: 'Orders' },
      { route: 'customers', icon: 'fa-address-book', label: 'Customers' },
      { route: 'inventory', icon: 'fa-boxes-stacked', label: 'Inventory' },
      { route: 'finance', icon: 'fa-sack-dollar', label: 'Finance' },
      { route: 'reports', icon: 'fa-chart-line', label: 'Reports' },
    ]},
    { group: 'Print & Design', items: [
      { route: 'photostudio', icon: 'fa-camera-retro', label: 'Photo Studio' },
      { route: 'pdftools', icon: 'fa-file-pdf', label: 'PDF & Image Tools' },
    ]},
    { group: 'Services', items: [
      { route: 'onlineservices', icon: 'fa-passport', label: 'Online Services' },
      { route: 'machines', icon: 'fa-print', label: 'Machine Center' },
      { route: 'academy', icon: 'fa-graduation-cap', label: 'Academy' },
      { route: 'chopaai', icon: 'fa-robot', label: 'Smart21brain AI' },
    ]},
    { group: 'Admin', items: [
      { route: 'employees', icon: 'fa-users-gear', label: 'Employees' },
      { route: 'settings', icon: 'fa-sliders', label: 'Settings & Pricing' },
      { route: 'security', icon: 'fa-shield-halved', label: 'Security & Backup' },
    ]},
  ];

  function sidebarHtml() {
    const groups = NAV.map((g) => `
      <div class="stn-nav-group">
        <div class="stn-nav-label">${g.group}</div>
        ${g.items.map((item) => `
          <div class="stn-nav-link" data-route="${item.route}">
            <i class="fa-solid ${item.icon}"></i> <span>${item.label}</span>
            ${item.route === 'inventory' ? '<span class="badge-dot" id="stnLowStockBadge" style="display:none">0</span>' : ''}
          </div>`).join('')}
      </div>`).join('');

    return `
      <div class="stn-sidebar-brand">
        <div class="mark">S21</div>
        <div class="name">Stationery OS<small>smart21brain</small></div>
      </div>
      <div class="stn-nav">${groups}</div>
      <div class="stn-sidebar-foot">
        <div class="d-flex align-items-center gap-2 mb-2">
          <span class="stn-role-pill" id="stnRolePill">owner</span>
        </div>
        <select class="stn-select" id="stnBusinessSwitcher" style="font-size:.78rem"></select>
        <a href="stationery.html" class="stn-btn stn-btn-ghost stn-btn-sm w-100 mt-2"><i class="fa-solid fa-arrow-left"></i> Back to site</a>
      </div>`;
  }

  function topbarHtml() {
    return `
      <button class="stn-icon-btn stn-menu-toggle" id="stnMenuToggle"><i class="fa-solid fa-bars"></i></button>
      <div>
        <h1 id="stnPageTitle">Dashboard</h1>
        <div class="stn-sub" id="stnBusinessName">—</div>
      </div>
      <div class="ms-auto d-flex align-items-center gap-2">
        <button class="stn-icon-btn" id="stnNotifBtn" title="Notifications">
          <i class="fa-solid fa-bell"></i>
          <span class="badge-dot" id="stnNotifBadge" style="display:none;position:absolute;top:-4px;right:-4px"></span>
        </button>
        <button class="stn-icon-btn" id="stnChopaBtn" title="Ask Smart21brain AI"><i class="fa-solid fa-robot"></i></button>
      </div>`;
  }

  function buildShell() {
    document.body.classList.add('stn-app');
    document.body.innerHTML = `
      <div class="stn-shell">
        <div class="stn-sidebar-backdrop" id="stnSidebarBackdrop"></div>
        <aside class="stn-sidebar" id="stnSidebar">${sidebarHtml()}</aside>
        <div class="stn-main">
          <header class="stn-topbar">${topbarHtml()}</header>
          <main class="stn-content" id="stnContent">
            <div class="stn-loading"><div class="stn-spin"></div></div>
          </main>
        </div>
      </div>`;

    document.getElementById('stnMenuToggle').addEventListener('click', () => {
      document.getElementById('stnSidebar').classList.toggle('open');
      document.getElementById('stnSidebarBackdrop').classList.toggle('show');
    });
    document.getElementById('stnSidebarBackdrop').addEventListener('click', () => {
      document.getElementById('stnSidebar').classList.remove('open');
      document.getElementById('stnSidebarBackdrop').classList.remove('show');
    });
    document.querySelectorAll('.stn-nav-link').forEach((el) => {
      el.addEventListener('click', () => { location.hash = '#' + el.dataset.route; });
    });
    document.getElementById('stnNotifBtn').addEventListener('click', showNotifications);
    document.getElementById('stnChopaBtn').addEventListener('click', () => { location.hash = '#chopaai'; });
    document.getElementById('stnBusinessSwitcher').addEventListener('change', async (e) => {
      const id = Number(e.target.value);
      const membership = STN.state.memberships.find((m) => m.id === id);
      if (!membership) return;
      STN.state.business = { ...STN.state.business, id: membership.id, name: membership.name };
      STN.state.role = membership.role;
      await loadContext(id);
      route();
    });
  }

  const ROUTE_TITLES = {
    dashboard: 'Dashboard', pos: 'Point of Sale', orders: 'Orders', customers: 'Customers',
    inventory: 'Inventory', finance: 'Finance', reports: 'Reports', photostudio: 'Photo Studio',
    pdftools: 'PDF & Image Tools', onlineservices: 'Online Services (TRA / BRELA / NIDA / Passport / Visa / TIN)',
    machines: 'Machine Center', academy: 'Academy', chopaai: 'Smart21brain AI', employees: 'Employees',
    settings: 'Settings & Pricing', security: 'Security & Backup',
  };

  async function route() {
    const hash = (location.hash || '#dashboard').replace('#', '');
    document.querySelectorAll('.stn-nav-link').forEach((el) => el.classList.toggle('active', el.dataset.route === hash));
    document.getElementById('stnPageTitle').textContent = ROUTE_TITLES[hash] || 'Stationery OS';

    const content = document.getElementById('stnContent');
    content.innerHTML = '<div class="stn-loading"><div class="stn-spin"></div></div>';

    const renderer = window.STN_MODULES && window.STN_MODULES[hash];
    if (!renderer) { content.innerHTML = `<div class="stn-empty"><i class="fa-solid fa-triangle-exclamation"></i>Module not found.</div>`; return; }
    try {
      await renderer(content);
    } catch (err) {
      content.innerHTML = `<div class="stn-card"><p class="text-red mb-0"><i class="fa-solid fa-circle-exclamation me-2"></i>${STN.esc(err.message)}</p></div>`;
    }
  }

  async function loadContext(businessId) {
    const ctx = await STN.api.get(businessId ? `/context?business_id=${businessId}` : '/context');
    STN.state.user = ctx.user;
    STN.state.business = ctx.business;
    STN.state.role = ctx.role;
    STN.state.branchId = ctx.branch_id;
    STN.state.memberships = ctx.memberships;

    document.getElementById('stnBusinessName').textContent = ctx.business.name;
    document.getElementById('stnRolePill').innerHTML = `<i class="fa-solid fa-user-shield"></i> ${ctx.role}`;
    const switcher = document.getElementById('stnBusinessSwitcher');
    switcher.innerHTML = ctx.memberships.map((m) => `<option value="${m.id}" ${m.id === ctx.business.id ? 'selected' : ''}>${STN.esc(m.name)} (${m.role})</option>`).join('');

    applyRoleVisibility();
    refreshNotifBadge();
    refreshLowStockBadge();
  }

  function applyRoleVisibility() {
    const restricted = { employees: 'manage_staff', settings: 'manage_pricing', security: 'manage_backup' };
    document.querySelectorAll('.stn-nav-link').forEach((el) => {
      const perm = restricted[el.dataset.route];
      el.style.display = (!perm || STN.can(perm)) ? '' : 'none';
    });
  }

  async function refreshNotifBadge() {
    try {
      const { notifications } = await STN.api.get('/notifications?unread=1');
      const badge = document.getElementById('stnNotifBadge');
      if (notifications.length) { badge.style.display = 'flex'; badge.textContent = notifications.length; }
      else badge.style.display = 'none';
    } catch (e) { /* ignore */ }
  }

  async function refreshLowStockBadge() {
    try {
      const { items } = await STN.api.get('/inventory?low=1');
      const badge = document.getElementById('stnLowStockBadge');
      if (badge) {
        if (items.length) { badge.style.display = 'flex'; badge.textContent = items.length; }
        else badge.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }
  STN.refreshLowStockBadge = refreshLowStockBadge;
  STN.refreshNotifBadge = refreshNotifBadge;

  async function showNotifications() {
    const { notifications } = await STN.api.get('/notifications');
    const rows = notifications.length ? notifications.map((n) => `
      <div class="stn-checklist-item ${n.is_read ? 'done' : ''}">
        <i class="fa-solid ${n.level === 'warning' ? 'fa-triangle-exclamation text-amber' : n.level === 'danger' ? 'fa-circle-exclamation text-red' : 'fa-circle-info text-cyan'}"></i>
        <div><div class="label">${STN.esc(n.title)}</div><div class="text-soft" style="font-size:.78rem">${STN.esc(n.message)}</div></div>
      </div>`).join('') : '<div class="stn-empty"><i class="fa-solid fa-bell-slash"></i>No notifications yet.</div>';

    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">Notifications</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">${rows}</div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-outline stn-btn-sm" id="stnMarkAllRead">Mark all read</button></div>
    `);
    document.getElementById('stnMarkAllRead')?.addEventListener('click', async () => {
      await STN.api.put('/notifications/read-all');
      refreshNotifBadge();
      STN.closeModal();
    });
  }

  async function init() {
    buildShell();
    try {
      await loadContext();
    } catch (err) {
      document.getElementById('stnContent').innerHTML = `<div class="stn-card"><p class="text-red mb-0">${STN.esc(err.message)}</p></div>`;
      return;
    }
    window.addEventListener('hashchange', route);
    route();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
