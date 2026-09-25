/* Settings — shop info & logo, payment methods & receipt, roles & permissions, sample data. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  const TABS = [
    { k: 'info', l: 'Shop Information', i: 'fa-store' },
    { k: 'payments', l: 'Payments & Receipts', i: 'fa-receipt' },
    { k: 'roles', l: 'Roles & Permissions', i: 'fa-user-shield' },
    { k: 'data', l: 'Sample Data', i: 'fa-database' },
  ];

  SP.modules.settings = async (el, parts) => {
    const tab = parts[0] && TABS.some((t) => t.k === parts[0]) ? parts[0] : 'info';
    el.innerHTML = `${SP.pageHead('Settings', 'Shop information, payments, roles and starter data')}
      <div class="sp-tabs" id="setTabs">${TABS.map((t) => `<button type="button" class="${t.k === tab ? 'on' : ''}" data-t="${t.k}"><i class="fa-solid ${t.i}"></i> ${t.l}</button>`).join('')}</div>
      <div id="setBody">${SP.skeletonPage()}</div>`;
    el.querySelector('#setTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; history.replaceState(null, '', `#settings/${b.dataset.t}`); el.querySelectorAll('#setTabs button').forEach((x) => x.classList.toggle('on', x === b)); renderTab(el.querySelector('#setBody'), b.dataset.t); });
    await renderTab(el.querySelector('#setBody'), tab);
  };

  async function renderTab(box, tab) {
    box.innerHTML = SP.skeletonPage();
    try {
      if (tab === 'info') return renderInfo(box);
      if (tab === 'payments') return renderPayments(box);
      if (tab === 'roles') return renderRoles(box);
      if (tab === 'data') return renderData(box);
    } catch (e) { box.innerHTML = SP.errorBox(e); }
  }

  // ---------------------------------------------------------- shop info
  async function renderInfo(box) {
    const { shop } = await SP.api.get('/shop-info');
    box.innerHTML = `<div class="sp-grid split">
      <div class="sp-card"><h3 style="margin-bottom:.8rem">Logo</h3>
        <div class="sp-row" style="align-items:flex-start;gap:1rem"><div style="width:84px;height:84px;border-radius:18px;overflow:hidden;background:var(--sp-primary-50);display:grid;place-items:center;color:var(--sp-primary);font-weight:800;font-size:1.4rem">${shop.has_logo ? `<img src="${SP.logoUrl(shop.id)}" alt="" style="width:100%;height:100%;object-fit:cover">` : esc((shop.short_name || 'S').slice(0, 2))}</div>
        <div><label class="sp-btn ghost sm" for="fLogo"><i class="fa-solid fa-upload"></i> Change logo</label><input type="file" id="fLogo" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="sp-sr"><p class="sp-small sp-muted" style="margin:.4rem 0 0">Shown on receipts, reports and the sidebar.</p></div></div></div>
      <div class="sp-card"><form class="sp-form" id="infoForm" novalidate><div class="sp-form-error" role="alert"></div>
        <div class="cols">${SP.f.input('name', 'Shop name', { required: true, value: shop.name })}${SP.f.input('short_name', 'Short name', { required: true, value: shop.short_name, hint: 'Shown on the logo badge, up to 8 letters', attr: { maxlength: 8 } })}</div>
        <div class="cols">${SP.f.input('phone', 'Phone', { type: 'tel', value: shop.phone })}${SP.f.input('email', 'Email', { type: 'email', value: shop.email })}</div>
        ${SP.f.input('address', 'Address', { value: shop.address })}
        <div class="cols">${SP.f.input('website', 'Website (optional)', { value: shop.website })}${SP.f.input('tax_no', 'Tax / TIN number (optional)', { value: shop.tax_no })}</div>
        <div class="cols-3">${SP.f.input('currency', 'Currency code', { required: true, value: shop.currency, attr: { maxlength: 6 } })}${SP.f.input('tax_rate', 'VAT rate %', { type: 'number', value: shop.tax_rate, hint: '0 = no VAT added at the till', attr: { min: 0, max: 100, step: '0.01' } })}<div class="sp-field"><label>Brand colour</label><input type="color" class="sp-input" name="primary_color" value="${shop.primary_color}" style="height:42px;padding:3px"></div></div>
        ${SP.f.textarea('receipt_note', 'Extra note on receipts (optional)', { value: shop.receipt_note, rows: 2 })}
        <button class="sp-btn primary" type="submit">Save changes</button></form></div></div>`;
    box.querySelector('#fLogo').addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      try { const fd = new FormData(); fd.append('logo', await SP.resizeImage(e.target.files[0], 400)); await SP.api.upload('/shop-info/logo', fd); SP.state.photoV = Date.now(); SP.toast('Logo updated.'); SP.go('settings/info'); } catch (err) { SP.fail(err); }
    });
    const form = box.querySelector('#infoForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (!SP.validate(form)) return;
      const btn = form.querySelector('button'); btn.disabled = true; btn.innerHTML = '<span class="sp-spin"></span> Saving…';
      try { await SP.api.put('/shop-info', SP.formData(form)); SP.state.shop = { ...SP.state.shop, ...SP.formData(form) }; SP.setBrand(SP.formData(form).primary_color); SP.toast('Shop information saved.'); }
      catch (err) { const b = form.querySelector('.sp-form-error'); b.textContent = err.message; b.classList.add('show'); }
      finally { btn.disabled = false; btn.textContent = 'Save changes'; }
    });
  }

  // ---------------------------------------------------------- payments & receipts
  async function renderPayments(box) {
    const { shop, settings } = await SP.api.get('/shop-info');
    box.innerHTML = `<div class="sp-grid split">
      <div class="sp-card"><h3 style="margin-bottom:.7rem">Payment methods</h3><p class="sp-small sp-muted" style="margin-top:0">Shown at the till and when receiving customer payments.</p>
        <div class="sp-list" id="methodList">${settings.payment_methods.map((m, i) => `<div class="sp-spread"><input class="sp-input" data-i="${i}" value="${esc(m)}" style="max-width:220px"><button class="sp-icon-btn" style="width:30px;height:30px" data-rm="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}</div>
        <button class="sp-btn ghost sm" id="addMethod" style="margin-top:.6rem"><i class="fa-solid fa-plus"></i> Add method</button>
        <button class="sp-btn primary" id="saveMethods" style="margin-top:1rem;display:block">Save payment methods</button></div>
      <div class="sp-stack">
        <div class="sp-card"><h3 style="margin-bottom:.7rem">Numbering & receipt</h3><form class="sp-form" id="numForm">
          <div class="cols">${SP.f.input('receipt_prefix', 'Receipt prefix', { value: settings.receipt_prefix, hint: 'e.g. RCT → RCT-000123' })}${SP.f.input('customer_prefix', 'Customer number prefix', { value: settings.customer_prefix, hint: 'e.g. C → C-0001' })}</div>
          ${SP.f.textarea('receipt_footer', 'Receipt footer message', { value: settings.receipt_footer, rows: 2 })}
          ${SP.f.input('loyalty_rate', 'Loyalty: currency spent per point', { type: 'number', value: settings.loyalty_rate, hint: '0 turns loyalty points off', attr: { min: 0, step: '1' } })}
          ${SP.f.check('allow_negative_stock', 'Allow selling when stock would go below zero', settings.allow_negative_stock)}
          <button class="sp-btn primary" type="submit">Save</button></form></div>
        <div class="sp-card"><h3 style="margin-bottom:.7rem">Expense categories</h3>
          <div class="sp-list" id="catExpList">${settings.expense_categories.map((c, i) => `<div class="sp-spread"><input class="sp-input" data-i="${i}" value="${esc(c)}" style="max-width:220px"><button class="sp-icon-btn" style="width:30px;height:30px" data-rm="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}</div>
          <button class="sp-btn ghost sm" id="addExpCat" style="margin-top:.6rem"><i class="fa-solid fa-plus"></i> Add category</button>
          <button class="sp-btn primary" id="saveExpCats" style="margin-top:1rem;display:block">Save expense categories</button></div>
      </div></div>`;

    function wireList(listId, addId, saveId, key, label) {
      const list = box.querySelector(listId);
      const render = (items) => { list.innerHTML = items.map((m, i) => `<div class="sp-spread"><input class="sp-input" data-i="${i}" value="${esc(m)}" style="max-width:220px"><button class="sp-icon-btn" style="width:30px;height:30px" data-rm="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join(''); };
      const read = () => Array.from(list.querySelectorAll('input')).map((i) => i.value.trim()).filter(Boolean);
      list.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; const items = read(); items.splice(Number(b.dataset.rm), 1); render(items); });
      box.querySelector(addId).addEventListener('click', () => { const items = read(); items.push(''); render(items); list.lastElementChild.querySelector('input').focus(); });
      box.querySelector(saveId).addEventListener('click', async () => {
        const items = read(); if (!items.length) { SP.toast(`Add at least one ${label}.`, 'warn'); return; }
        try { await SP.api.put('/settings', { [key]: items }); SP.state.settings[key] = items; SP.toast('Saved.'); } catch (e) { SP.fail(e); }
      });
    }
    wireList('#methodList', '#addMethod', '#saveMethods', 'payment_methods', 'payment method');
    wireList('#catExpList', '#addExpCat', '#saveExpCats', 'expense_categories', 'category');

    const numForm = box.querySelector('#numForm');
    numForm.addEventListener('submit', async (e) => {
      e.preventDefault(); const btn = numForm.querySelector('button'); btn.disabled = true;
      try { const r = await SP.api.put('/settings', SP.formData(numForm)); SP.state.settings = { ...SP.state.settings, ...r.settings }; SP.toast('Saved.'); } catch (err) { SP.fail(err); } finally { btn.disabled = false; }
    });
  }

  // ---------------------------------------------------------- roles & permissions
  async function renderRoles(box) {
    if (!SP.can('settings.manage')) { box.innerHTML = SP.empty('fa-lock', 'Owners only', 'Ask the shop owner to change roles and permissions.'); return; }
    const { catalogue, matrix } = await SP.api.get('/permissions');
    const groups = [...new Set(catalogue.map((p) => p.group))];
    box.innerHTML = `<div class="sp-card"><p class="sp-small sp-muted" style="margin-top:0">Owners can always do everything. Choose what <b>Managers</b> and <b>Cashiers</b> may do — changes apply the next time they open a page.</p>
      <div class="sp-tabs" id="roleTabs"><button class="on" data-r="manager">Manager</button><button data-r="cashier">Cashier</button></div>
      <div id="permBody"></div><button class="sp-btn primary" id="savePerms" style="margin-top:1rem">Save permissions</button></div>`;
    let role = 'manager'; let selected = new Set(matrix[role]);
    function draw() {
      box.querySelector('#permBody').innerHTML = groups.map((g) => `<div class="sp-section-title" style="margin-top:1rem"><i class="fa-solid fa-layer-group"></i> ${esc(g)}</div><div class="sp-perm-grid">${catalogue.filter((p) => p.group === g).map((p) => `<label class="sp-check"><input type="checkbox" value="${p.key}" ${selected.has(p.key) ? 'checked' : ''}> ${esc(p.label)}</label>`).join('')}</div>`).join('');
    }
    draw();
    box.querySelector('#roleTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; role = b.dataset.r; selected = new Set(matrix[role]); box.querySelectorAll('#roleTabs button').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    box.querySelector('#permBody').addEventListener('change', (e) => { if (e.target.type !== 'checkbox') return; if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value); matrix[role] = [...selected]; });
    box.querySelector('#savePerms').addEventListener('click', async () => {
      const btn = box.querySelector('#savePerms'); btn.disabled = true; btn.innerHTML = '<span class="sp-spin"></span> Saving…';
      try { await SP.api.put('/permissions', { role, permissions: [...selected] }); SP.toast(`${SP.cap(role)} permissions saved.`); } catch (e) { SP.fail(e); } finally { btn.disabled = false; btn.innerHTML = 'Save permissions'; }
    });
  }

  // ---------------------------------------------------------- sample data
  async function renderData(box) {
    if (!SP.can('settings.manage')) { box.innerHTML = SP.empty('fa-lock', 'Owners only', ''); return; }
    box.innerHTML = `<div class="sp-grid split">
      <div class="sp-card"><h3 style="margin-bottom:.5rem"><i class="fa-solid fa-database"></i> Load sample data</h3><p class="sp-muted">Adds sample customers, products and 30 days of sales so you can explore Smart21Shop before entering your real data. Only works on an empty shop.</p><button class="sp-btn primary" id="loadDemo"><i class="fa-solid fa-wand-magic-sparkles"></i> Load sample data</button></div>
      <div class="sp-card"><h3 style="margin-bottom:.5rem;color:var(--sp-danger)"><i class="fa-solid fa-triangle-exclamation"></i> Reset shop data</h3><p class="sp-muted">Permanently deletes every customer, product, sale and expense in this shop. Your shop settings and staff logins are kept.</p><button class="sp-btn danger-ghost" id="resetShop"><i class="fa-solid fa-eraser"></i> Reset shop data</button></div>
    </div>`;
    box.querySelector('#loadDemo').addEventListener('click', async () => {
      const ok = await SP.confirm({ title: 'Load sample data?', danger: false, message: 'This adds sample customers, products and sales to explore the app.' });
      if (!ok) return;
      const btn = box.querySelector('#loadDemo'); btn.disabled = true; btn.innerHTML = '<span class="sp-spin"></span> Loading…';
      try { const r = await SP.api.post('/demo-data'); SP.toast(`Sample data loaded: ${r.customers} customers, ${r.products} products, ${r.sales} sales.`); SP.refreshLookups(); }
      catch (e) { SP.fail(e); } finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Load sample data'; }
    });
    box.querySelector('#resetShop').addEventListener('click', () => {
      SP.formModal({ title: 'Reset shop data', submit: 'Delete everything', danger: true,
        body: `<div class="sp-alert bad"><i class="fa-solid fa-triangle-exclamation"></i><div>This deletes every customer, product, sale and expense. This <b>cannot be undone</b>.</div></div>${SP.f.input('confirm', 'Type RESET to confirm', { required: true, placeholder: 'RESET' })}`,
        onSubmit: async (data) => { await SP.api.post('/reset-data', data); SP.closeModal(); SP.toast('Shop data has been reset.'); SP.refreshLookups(); },
      });
    });
  }
})();
