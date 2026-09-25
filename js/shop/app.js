/* Smart21Shop — app shell, navigation and router. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  // route segment -> { module, nav (sidebar item to highlight), title }
  const ROUTES = {
    dashboard: { mod: 'dashboard', nav: 'dashboard', title: 'Dashboard' },
    pos: { mod: 'pos', nav: 'pos', title: 'New Sale' },
    sales: { mod: 'sales', nav: 'sales', title: 'Sales' },
    sale: { mod: 'sale', nav: 'sales', title: 'Sale' },
    debts: { mod: 'debts', nav: 'debts', title: 'Customer Debts' },
    customers: { mod: 'customers', nav: 'customers', title: 'Customers' },
    customer: { mod: 'customer', nav: 'customers', title: 'Customer' },
    products: { mod: 'products', nav: 'products', title: 'Products' },
    product: { mod: 'product', nav: 'products', title: 'Product' },
    categories: { mod: 'categories', nav: 'products', title: 'Categories' },
    expenses: { mod: 'expenses', nav: 'expenses', title: 'Expenses' },
    reports: { mod: 'reports', nav: 'reports', title: 'Reports' },
    users: { mod: 'users', nav: 'users', title: 'Staff' },
    settings: { mod: 'settings', nav: 'settings', title: 'Settings' },
    audit: { mod: 'audit', nav: 'audit', title: 'Activity Log' },
  };

  function navItems() {
    const c = SP.can;
    return [
      { group: 'Overview', items: [
        { r: 'dashboard', i: 'fa-gauge-high', l: 'Dashboard', show: true },
        { r: 'pos', i: 'fa-cash-register', l: 'New Sale', show: c('sales.create') },
      ] },
      { group: 'Sales', items: [
        { r: 'sales', i: 'fa-receipt', l: 'Sales', show: c('sales.view') },
        { r: 'debts', i: 'fa-hand-holding-dollar', l: 'Customer Debts', show: c('customers.view') },
      ] },
      { group: 'Customers & Stock', items: [
        { r: 'customers', i: 'fa-users', l: 'Customers', show: c('customers.view') },
        { r: 'products', i: 'fa-boxes-stacked', l: 'Products', show: c('products.view') },
      ] },
      { group: 'Finance', items: [
        { r: 'expenses', i: 'fa-money-bill-wave', l: 'Expenses', show: c('expenses.manage') },
      ] },
      { group: 'System', items: [
        { r: 'reports', i: 'fa-chart-pie', l: 'Reports', show: c('reports.view') },
        { r: 'users', i: 'fa-user-gear', l: 'Staff', show: c('users.manage') },
        { r: 'settings', i: 'fa-sliders', l: 'Settings', show: c('settings.manage') },
        { r: 'audit', i: 'fa-shield-halved', l: 'Activity Log', show: c('audit.view') },
      ] },
    ].map((g) => ({ ...g, items: g.items.filter((i) => i.show) })).filter((g) => g.items.length);
  }

  SP.setTitle = (title, sub) => {
    const t = document.getElementById('spTitle'); if (t) t.textContent = title;
    const s = document.getElementById('spSub'); if (s) s.textContent = sub || (SP.state.shop ? SP.state.shop.name : '');
    document.title = `${title} · ${SP.state.shop ? SP.state.shop.name : 'Smart21Shop'}`;
  };
  // Modules call SP.after(fn) to run code once their HTML is on the page (charts…).
  SP.after = (fn) => { if (SP._building) (SP._after = SP._after || []).push(fn); else setTimeout(fn, 0); };
  SP.go = (hash) => { if (location.hash === '#' + hash) route(); else location.hash = hash; };

  function shell() {
    const s = SP.state.shop;
    document.body.classList.add('sp-body');
    document.body.innerHTML = `
      <div class="sp-shell">
        <div class="sp-backdrop" id="spBackdrop"></div>
        <aside class="sp-sidebar" id="spSidebar" aria-label="Main navigation">
          <div class="sp-brand">${SP.shopLogo()}<div><div class="sp-brand-name">${esc(s.name)}</div><div class="sp-brand-sub">Smart21Shop</div></div></div>
          <nav class="sp-nav" id="spNav">${navItems().map((g) => `<div class="sp-nav-group">${g.group}</div>${g.items.map((i) => `<a href="#${i.r}" data-nav="${i.r}"><i class="fa-solid ${i.i}"></i><span>${i.l}</span>${i.badge ? '<span class="sp-badge-dot sp-hide" id="spNavBadge">0</span>' : ''}</a>`).join('')}`).join('')}</nav>
          <div class="sp-sidebar-foot">
            <div class="sp-me">${SP.avatar('x', 0, SP.state.user.name, false)}<div style="min-width:0"><div class="sp-me-name">${esc(SP.state.user.name)}</div><span class="sp-role-pill">${esc(SP.state.role)}</span></div></div>
            ${SP.state.memberships.length > 1 ? `<select class="sp-select" id="spSwitch" aria-label="Switch shop">${SP.state.memberships.map((m) => `<option value="${m.id}" ${m.id === s.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>` : ''}
            <button class="sp-btn ghost sm block" id="spLogout"><i class="fa-solid fa-right-from-bracket"></i> Sign out</button>
          </div>
        </aside>
        <div class="sp-main">
          <header class="sp-topbar">
            <button class="sp-icon-btn sp-menu-btn" id="spMenu" aria-label="Open menu"><i class="fa-solid fa-bars"></i></button>
            <div><div class="sp-title" id="spTitle">Dashboard</div><div class="sp-sub" id="spSub">${esc(s.name)}</div></div>
            <div class="sp-search"><i class="fa-solid fa-magnifying-glass"></i>
              <input type="search" id="spSearch" placeholder="Search customers, products, receipts…" autocomplete="off" aria-label="Global search"><div class="sp-search-panel" id="spSearchPanel"></div></div>
            <div class="sp-top-actions" style="position:relative">
              <button class="sp-icon-btn" id="spTheme" aria-label="Toggle dark mode" title="Dark / light mode"><i class="fa-solid fa-moon"></i></button>
              <button class="sp-icon-btn" id="spBell" aria-label="Alerts"><i class="fa-solid fa-bell"></i><span class="sp-badge-dot sp-hide" id="spBellBadge">0</span></button>
              <div class="sp-search-panel" id="spBellPanel" style="left:auto;right:0;width:min(380px,92vw);top:calc(100% + 8px)"></div>
            </div>
            ${SP.can('sales.create') ? '<a href="#pos" class="sp-btn primary" style="margin-left:.4rem"><i class="fa-solid fa-cash-register"></i> <span class="sp-hide-sm">New sale</span></a>' : ''}
          </header>
          <main class="sp-content" id="spContent" tabindex="-1"></main>
        </div>
      </div>`;

    const side = document.getElementById('spSidebar'); const back = document.getElementById('spBackdrop');
    const toggle = (open) => { side.classList.toggle('open', open); back.classList.toggle('show', open); };
    document.getElementById('spMenu').addEventListener('click', () => toggle(!side.classList.contains('open')));
    back.addEventListener('click', () => toggle(false));
    document.getElementById('spNav').addEventListener('click', () => toggle(false));
    document.getElementById('spLogout').addEventListener('click', async () => { await SP.api.post('/logout').catch(() => {}); localStorage.removeItem('sp-shop-id'); location.href = 'shop-login.html'; });
    const sw = document.getElementById('spSwitch');
    if (sw) sw.addEventListener('change', () => { localStorage.setItem('sp-shop-id', sw.value); location.hash = 'dashboard'; location.reload(); });
    document.getElementById('spTheme').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme !== 'dark';
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('sp-theme', dark ? 'dark' : 'light');
      document.dispatchEvent(new Event('sp-theme'));
    });
    wireSearch(); wireBell();
  }

  // ---------------------------------------------------------- global search
  function wireSearch() {
    const input = document.getElementById('spSearch'); if (!input) return;
    const panel = document.getElementById('spSearchPanel');
    const GROUPS = { customers: 'Customers', products: 'Products', sales: 'Sales' };
    const run = SP.debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { panel.classList.remove('open'); return; }
      panel.innerHTML = '<div class="sp-search-group">Searching…</div>'; panel.classList.add('open');
      try {
        const { results } = await SP.api.get('/search' + SP.qs({ q }));
        const html = Object.entries(GROUPS).filter(([k]) => results[k] && results[k].length).map(([k, label]) =>
          `<div class="sp-search-group">${label}</div>${results[k].map((r) => `<a class="sp-search-item" href="#${r.route}" tabindex="0"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></a>`).join('')}`).join('');
        panel.innerHTML = html || `<div class="sp-search-group" style="text-transform:none;letter-spacing:0;font-size:.85rem">No results for "${esc(q)}".</div>`;
      } catch (e) { panel.innerHTML = `<div class="sp-search-group">${esc(e.message)}</div>`; }
    }, 250);
    input.addEventListener('input', run);
    input.addEventListener('focus', () => { if (panel.innerHTML) panel.classList.add('open'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.sp-search')) panel.classList.remove('open'); });
    panel.addEventListener('click', (e) => { if (e.target.closest('.sp-search-item')) { panel.classList.remove('open'); input.value = ''; } });
    document.addEventListener('keydown', (e) => { if ((e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { e.preventDefault(); input.focus(); } });
  }

  // ---------------------------------------------------------- alerts bell
  async function refreshBadge() {
    try {
      const { count } = await SP.api.get('/alerts');
      SP.state.alertCount = count;
      [['spBellBadge'], ['spNavBadge']].forEach(([id]) => { const b = document.getElementById(id); if (b) { b.textContent = count > 99 ? '99+' : count; b.classList.toggle('sp-hide', !count); } });
    } catch (e) { /* silent */ }
  }
  SP.refreshBadge = refreshBadge;
  function wireBell() {
    const bell = document.getElementById('spBell'); const panel = document.getElementById('spBellPanel');
    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
      panel.innerHTML = '<div class="sp-search-group">Loading…</div>'; panel.classList.add('open');
      try {
        const { alerts } = await SP.api.get('/alerts');
        panel.innerHTML = `<div class="sp-search-group">Alerts</div>${alerts.length ? alerts.map((a) => `<a class="sp-search-item" href="#${a.route}"><b><i class="fa-solid ${a.icon}" style="color:var(--sp-${a.tone === 'bad' ? 'danger' : a.tone === 'warn' ? 'warn' : 'info'})"></i> ${esc(a.title)}</b><small>${esc(a.message)}</small></a>`).join('') : '<div class="sp-search-item sp-muted">You are all caught up.</div>'}`;
      } catch (err) { panel.innerHTML = `<div class="sp-search-group">${esc(err.message)}</div>`; }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#spBellPanel') && !e.target.closest('#spBell')) panel.classList.remove('open'); });
    panel.addEventListener('click', () => panel.classList.remove('open'));
  }

  // ---------------------------------------------------------- router
  async function route() {
    const parts = (location.hash || '#dashboard').replace(/^#\/?/, '').split('/').filter(Boolean);
    let seg = parts[0] || 'dashboard';
    let def = ROUTES[seg];
    if (!def) { seg = 'dashboard'; def = ROUTES[seg]; }
    document.querySelectorAll('#spNav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === def.nav));
    SP.setTitle(def.title);
    const el = document.getElementById('spContent');
    const mod = SP.modules[def.mod];
    if (SP.destroyCharts) SP.destroyCharts();
    el.innerHTML = SP.skeletonPage();
    window.scrollTo({ top: 0 });
    if (!mod) { el.innerHTML = SP.errorBox(new Error('This screen is not available.')); return; }
    const token = (route.token = (route.token || 0) + 1);
    try {
      const fresh = document.createElement('div');
      SP._after = []; SP._building = true;
      try { await mod(fresh, parts.slice(1), seg); } finally { SP._building = false; }
      if (token !== route.token) return; // user already navigated elsewhere
      el.replaceChildren(fresh);
      el.focus({ preventScroll: true });
      const jobs = SP._after; SP._after = [];
      jobs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    } catch (err) {
      if (token === route.token) el.innerHTML = SP.errorBox(err);
    }
  }
  SP.route = route;

  // ---------------------------------------------------------- start
  function onboarding(ctx) {
    document.body.classList.add('sp-body');
    document.body.innerHTML = `<div class="sp-auth"><div class="sp-auth-art"><div class="sp-row"><span class="sp-logo"><i class="fa-solid fa-shop"></i></span><b style="font-family:var(--sp-font-display);font-size:1.2rem">Smart21Shop</b></div>
      <div><h1>Welcome, ${esc(ctx.user.name.split(' ')[0])} 👋</h1><p>Set up your shop in less than a minute. You will get a ready-made starter with categories and roles that you can change any time.</p></div><div></div></div>
      <div class="sp-auth-form"><div class="sp-auth-box"><div class="sp-card">
      <h3 style="margin-bottom:.3rem">Create your shop</h3><p class="sp-muted" style="margin-top:0">This becomes the shop you manage. Staff you add will only see this shop.</p>
      <form class="sp-form" id="spSetup" novalidate><div class="sp-form-error" role="alert"></div>
      ${SP.f.input('shop_name', 'Shop name', { required: true, placeholder: 'e.g. Mama Neema Store' })}
      ${SP.f.input('phone', 'Shop phone (optional)', { type: 'tel', placeholder: '+255 712 345 678' })}
      <button class="sp-btn primary block lg" type="submit">Create my shop</button></form>
      <p class="sp-small" style="margin:.4rem 0 0"><a href="#" id="spOut">Sign out</a></p></div></div></div></div>`;
    document.querySelector('#spSetup [name=phone]').dataset.kind = 'phone';
    document.getElementById('spOut').addEventListener('click', async (e) => { e.preventDefault(); await SP.api.post('/logout').catch(() => {}); location.href = 'shop-login.html'; });
    const form = document.getElementById('spSetup');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (!SP.validate(form)) return;
      const btn = form.querySelector('button'); btn.disabled = true; btn.innerHTML = '<span class="sp-spin"></span> Setting up…';
      try { const d = await SP.api.post('/shops', SP.formData(form)); localStorage.setItem('sp-shop-id', d.shop_id); location.reload(); }
      catch (err) { const b = form.querySelector('.sp-form-error'); b.textContent = err.message; b.classList.add('show'); btn.disabled = false; btn.textContent = 'Create my shop'; }
    });
  }

  async function start() {
    document.body.classList.add('sp-body');
    document.body.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center"><span class="sp-spin" style="width:36px;height:36px"></span></div>';
    const saved = Number(localStorage.getItem('sp-shop-id') || 0);
    if (saved) SP.state.shop = { id: saved };
    let ctx;
    try { ctx = await SP.api.get('/context'); } catch (e) { document.body.innerHTML = `<div class="sp-verify-box sp-card">${SP.errorBox(e)}</div>`; return; }
    SP.state.shop = null;
    if (!ctx.shop) return onboarding(ctx);
    Object.assign(SP.state, { user: ctx.user, shop: ctx.shop, role: ctx.role, perms: ctx.permissions, settings: ctx.settings, memberships: ctx.memberships });
    localStorage.setItem('sp-shop-id', ctx.shop.id);
    SP.setBrand(ctx.shop.primary_color);
    shell();
    SP.lookups().catch(() => {});
    refreshBadge(); setInterval(refreshBadge, 90000);
    window.addEventListener('hashchange', route);
    route();
  }
  document.addEventListener('DOMContentLoaded', start);
})();
