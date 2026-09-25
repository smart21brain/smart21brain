/* Products: catalogue, categories, save/edit form, photo, stock adjustments & history. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  function productForm(p = {}, lk) {
    return `<div class="cols">${SP.f.input('name', 'Product name', { required: true, value: p.name, placeholder: 'e.g. Rice 1kg' })}${SP.f.select('category_id', 'Category', SP.opts.categories(lk), { value: p.category_id })}</div>
      <div class="cols-3">${SP.f.input('sku', 'Code / SKU (optional)', { value: p.sku })}${SP.f.input('barcode', 'Barcode (optional)', { value: p.barcode })}${SP.f.select('unit', 'Unit', SP.opts.units(lk), { value: p.unit || 'pcs', noBlank: true })}</div>
      <div class="cols-3">${SP.can('profit.view') ? SP.f.input('cost_price', 'Cost price', { type: 'number', value: p.cost_price ?? 0, attr: { min: 0, step: '0.01' } }) : ''}${SP.f.input('sell_price', 'Selling price', { type: 'number', required: true, value: p.sell_price ?? '', attr: { min: 0, step: '0.01' } })}${SP.f.input('reorder_level', 'Low-stock level', { type: 'number', value: p.reorder_level ?? 0, hint: 'Get warned below this', attr: { min: 0, step: '0.01' } })}</div>
      ${!p.id ? `<div class="cols">${SP.f.check('track_stock', 'Track stock for this item', p.track_stock !== 0, '1')}${SP.f.input('opening_stock', 'Opening stock', { type: 'number', value: 0, attr: { min: 0, step: '0.01' } })}</div>` : SP.f.check('track_stock', 'Track stock for this item', !!p.track_stock, '1')}
      ${SP.f.select('status', 'Status', SP.opts.status, { value: p.status || 'active', noBlank: true })}
      ${SP.f.textarea('description', 'Description (optional)', { value: p.description, rows: 2 })}`;
  }

  function openProductForm(existing, onSaved) {
    SP.lookups().then((lk) => {
      SP.formModal({
        title: existing ? 'Edit product' : 'Add product', submit: existing ? 'Save changes' : 'Add product', size: 'wide', body: productForm(existing || {}, lk),
        onSubmit: async (data) => {
          const r = existing ? await SP.api.put(`/products/${existing.id}`, data) : await SP.api.post('/products', data);
          SP.closeModal(); SP.toast(existing ? 'Product updated.' : 'Product added.'); if (onSaved) onSaved(r);
        },
      });
    });
  }
  SP.openProductForm = openProductForm;

  function openStockAdjust(p, onDone) {
    const back = SP.modal(`Adjust stock — ${p.name}`, `<div class="sp-seg" id="adjType" style="margin-bottom:1rem"><button class="on" data-t="purchase">Receive stock</button><button data-t="count">Stock count</button><button data-t="damage">Damaged / lost</button></div>
      <form class="sp-form" id="adjForm" novalidate><div class="sp-form-error" role="alert"></div>
      <p class="sp-small sp-muted" style="margin:0">Currently in stock: <b>${p.stock_qty} ${esc(p.unit)}</b></p>
      ${SP.f.input('qty', 'Quantity', { type: 'number', required: true, attr: { min: 0, step: '0.01' } })}
      ${SP.can('profit.view') ? SP.f.input('cost_price', 'New cost price (optional)', { type: 'number', placeholder: String(p.cost_price), attr: { min: 0, step: '0.01' } }) : ''}
      ${SP.f.input('note', 'Note (optional)', { placeholder: 'e.g. delivery from supplier' })}
      </form>`, { footer: '<button class="sp-btn ghost" data-close2>Cancel</button><button class="sp-btn primary" form="adjForm" type="submit">Save</button>' });
    back.querySelector('[data-close2]').addEventListener('click', () => SP.closeModal());
    let type = 'purchase';
    back.querySelector('#adjType').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; type = b.dataset.t; back.querySelectorAll('#adjType button').forEach((x) => x.classList.toggle('on', x === b)); const qtyLabel = back.querySelector('label[for=f_qty]'); qtyLabel.innerHTML = (type === 'count' ? 'Counted quantity (new total)' : 'Quantity') + '<span class="req">*</span>'; });
    const form = back.querySelector('#adjForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (!SP.validate(form)) return;
      const btn = form.querySelector('button[type=submit]') || back.querySelector('[form=adjForm]');
      const errBox = form.querySelector('.sp-form-error'); errBox.classList.remove('show');
      try { const r = await SP.api.post(`/products/${p.id}/stock`, { ...SP.formData(form), type }); SP.closeModal(); SP.toast(`Stock updated — now ${r.stock_qty} ${p.unit}.`); if (onDone) onDone(); }
      catch (err) { errBox.textContent = err.message; errBox.classList.add('show'); }
    });
  }

  // =============================================================== list
  SP.modules.products = async (el, parts, seg) => {
    const q0 = new URLSearchParams(location.hash.split('?')[1] || '');
    const lk = await SP.lookups();
    const showCost = SP.can('profit.view');
    const st = { page: 1, limit: 24, q: '', category_id: '', status: '', stock: q0.get('stock') || '', sort: 'name' };
    el.innerHTML = `${SP.pageHead('Products', 'Catalogue, pricing and stock', `${SP.can('products.manage') ? '<button class="sp-btn ghost" data-act="cats"><i class="fa-solid fa-tags"></i> Categories</button><button class="sp-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> Add Product</button>' : ''}`)}
      <div class="sp-grid stats" id="prodSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card">
        <div class="sp-toolbar">
          <input class="sp-input grow" id="fQ" type="search" placeholder="Search by name, code or barcode…" aria-label="Search products">
          <select class="sp-select" id="fCat" aria-label="Category"><option value="">All categories</option>${SP.opts.categories(lk).map((o) => `<option value="${o.v}">${esc(o.l)}</option>`).join('')}</select>
          <select class="sp-select" id="fStock" aria-label="Stock"><option value="">Any stock</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
          <select class="sp-select" id="fStatus" aria-label="Status"><option value="">Any status</option>${SP.opts.status.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <select class="sp-select" id="fSort" aria-label="Sort"><option value="name">Name (A–Z)</option><option value="recent">Most recent</option><option value="stock">Lowest stock</option><option value="price">Highest price</option></select>
          <button class="sp-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> Clear</button>
        </div>
        <div id="prodList">${SP.skeleton(6)}</div>
      </div>`;
    if (st.stock) el.querySelector('#fStock').value = st.stock;

    const listEl = el.querySelector('#prodList');
    async function load() {
      listEl.style.opacity = '.6';
      try {
        const d = await SP.api.get('/products' + SP.qs({ ...st }));
        const s = d.summary;
        el.querySelector('#prodSummary').innerHTML = [
          SP.stat('fa-boxes-stacked', SP.num(s.total), 'Products', `${s.active} active`),
          SP.stat('fa-box-open', SP.num(s.out_count), 'Out of Stock', '', s.out_count ? 'red' : 'green'),
          SP.stat('fa-triangle-exclamation', SP.num(s.low_count), 'Low Stock', '', s.low_count ? 'amber' : 'green'),
          showCost ? SP.stat('fa-warehouse', SP.moneyHtml(s.stock_cost), 'Stock Value (Cost)', '', 'blue') : SP.stat('fa-tags', SP.moneyHtml(s.stock_retail), 'Stock Value (Retail)', '', 'blue'),
        ].join('');
        const cols = [
          { label: 'Product', render: (p) => `<a href="#product/${p.id}" class="sp-person" style="color:inherit"><span class="sp-avatar">${p.has_image ? `<img src="/api/shop/products/${p.id}/image?v=${SP.state.photoV}" alt="" onerror="this.remove()">` : '<i class="fa-solid fa-box"></i>'}</span><span><span class="nm" style="color:var(--sp-text)">${esc(p.name)}</span><div class="sb">${esc(p.sku || p.category_name || '')}</div></span></a>` },
          { label: 'Category', render: (p) => p.category_name ? SP.chip('info', p.category_name) : '—' },
          ...(showCost ? [{ label: 'Cost', cls: 'end', render: (p) => SP.money(p.cost_price) }] : []),
          { label: 'Price', cls: 'end', render: (p) => SP.money(p.sell_price) },
          { label: 'Stock', cls: 'end', render: (p) => p.track_stock ? `<b>${SP.num(p.stock_qty)}</b> ${esc(p.unit)}` : '<span class="sp-muted">Service</span>' },
          { label: 'State', render: (p) => SP.chip(p.stock_state) },
          { label: 'Actions', cls: 'end', render: (p) => `<div class="sp-actions-cell"><a class="sp-btn ghost sm" href="#product/${p.id}" title="View"><i class="fa-solid fa-eye"></i></a><button class="sp-btn ghost sm" data-act="menu" data-id="${p.id}" title="More"><i class="fa-solid fa-ellipsis"></i></button></div>` },
        ];
        const empty = st.q || st.category_id || st.stock || st.status
          ? SP.empty('fa-magnifying-glass', 'No products match your search', 'Try a different name or clear the filters.')
          : SP.empty('fa-boxes-stacked', 'No products yet', 'Add your first product to start selling.', SP.can('products.manage') ? '<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> Add Product</button>' : '');
        listEl._rows = d.products;
        listEl.innerHTML = SP.table(cols, d.products, { empty }) + SP.pager(d.page, d.limit, d.total);
      } catch (e) { listEl.innerHTML = SP.errorBox(e); }
      listEl.style.opacity = '1';
    }
    const bind = (id, key) => el.querySelector(id).addEventListener('change', (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fCat', 'category_id'); bind('#fStock', 'stock'); bind('#fStatus', 'status'); bind('#fSort', 'sort');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', category_id: '', status: '', stock: '', sort: 'name', page: 1 }); el.querySelectorAll('.sp-toolbar input,.sp-toolbar select').forEach((i) => { i.value = ''; }); load(); });

    const remove = async (row) => {
      const ok = await SP.confirm({ title: 'Delete this product?', message: `<b>${esc(row.name)}</b> will be permanently deleted.` });
      if (!ok) return;
      try { await SP.api.del(`/products/${row.id}`); SP.toast('Product deleted.'); load(); } catch (e) { SP.fail(e); }
    };
    SP.delegate(el, {
      new: () => openProductForm(null, () => load()),
      cats: () => openCategoriesModal(() => { SP.refreshLookups(); load(); }),
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      menu: (b) => {
        const row = listEl._rows.find((x) => String(x.id) === b.dataset.id); if (!row) return;
        SP.popMenu(b, [
          { label: 'View', icon: 'fa-eye', fn: () => SP.go(`product/${row.id}`) },
          ...(SP.can('products.manage') ? [{ label: 'Edit', icon: 'fa-pen', fn: () => openProductForm(row, () => load()) }] : []),
          ...(SP.can('stock.adjust') && row.track_stock ? [{ label: 'Adjust stock', icon: 'fa-boxes-packing', fn: () => openStockAdjust(row, () => load()) }] : []),
          ...(SP.can('products.manage') ? [{ label: 'Delete', icon: 'fa-trash', danger: true, fn: () => remove(row) }] : []),
        ]);
      },
    });
    await load();
  };

  // =============================================================== categories
  function openCategoriesModal(onChange) {
    SP.lookups().then(async (lk) => {
      const { categories } = await SP.api.get('/categories');
      const back = SP.modal('Categories', `<form class="sp-row" id="catForm" style="margin-bottom:1rem"><input class="sp-input grow" name="name" placeholder="New category name" maxlength="60" required><input type="color" name="color" value="#4F46E5" style="width:44px;height:42px;border:1px solid var(--sp-border);border-radius:10px;padding:2px"><button class="sp-btn primary" type="submit">Add</button></form><div class="sp-list" id="catList">${categories.map(catRow).join('') || '<p class="sp-muted sp-small">No categories yet.</p>'}</div>`, { size: 'wide', footer: '<button class="sp-btn ghost" data-close2>Done</button>' });
      back.querySelector('[data-close2]').addEventListener('click', () => { SP.closeModal(); if (onChange) onChange(); });
      back.querySelector('#catForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const data = SP.formData(e.target); if (!data.name || !data.name.trim()) return;
        try { await SP.api.post('/categories', data); e.target.reset(); e.target.querySelector('[name=color]').value = '#4F46E5'; refresh(); } catch (err) { SP.fail(err); }
      });
      async function refresh() { const r = await SP.api.get('/categories'); back.querySelector('#catList').innerHTML = r.categories.map(catRow).join('') || '<p class="sp-muted sp-small">No categories yet.</p>'; wire(); }
      function wire() {
        back.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
          const ok = await SP.confirm({ title: 'Delete this category?', message: b.dataset.n > 0 ? `${b.dataset.n} product(s) use this category and will become uncategorised.` : '' });
          if (!ok) return; await SP.api.del(`/categories/${b.dataset.id}`); refresh();
        }));
      }
      wire();
    });
  }
  function catRow(c) { return `<div class="sp-spread"><span class="sp-row"><span style="width:14px;height:14px;border-radius:4px;background:${esc(c.color || '#999')};display:inline-block"></span><b>${esc(c.name)}</b><span class="sp-muted sp-small">(${c.products})</span></span><button class="sp-icon-btn" style="width:30px;height:30px" data-del data-id="${c.id}" data-n="${c.products}" title="Delete"><i class="fa-solid fa-trash"></i></button></div>`; }

  // =============================================================== profile
  SP.modules.product = async (el, parts) => {
    const id = parts[0];
    const d = await SP.api.get(`/products/${id}`);
    const p = d.product;
    el.innerHTML = `${SP.pageHead(p.name, `${p.sku || 'No code'}${p.category_name ? ' · ' + p.category_name : ''}`, `${SP.can('products.manage') ? '<button class="sp-btn ghost" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>' : ''}${SP.can('stock.adjust') && p.track_stock ? '<button class="sp-btn primary" data-act="adjust"><i class="fa-solid fa-boxes-packing"></i> Adjust Stock</button>' : ''}<a class="sp-btn ghost" href="#products"><i class="fa-solid fa-arrow-left"></i> Back</a>`)}
      <div class="sp-grid stats" style="margin-bottom:1.1rem">
        ${p.track_stock ? SP.stat('fa-boxes-stacked', SP.num(p.stock_qty), 'In Stock', esc(p.unit), p.stock_state === 'out' ? 'red' : p.stock_state === 'low' ? 'amber' : 'green') : SP.stat('fa-bell-concierge', 'Service', 'Type')}
        ${SP.stat('fa-tag', SP.moneyHtml(p.sell_price), 'Selling Price')}
        ${p.cost_price !== undefined ? SP.stat('fa-receipt', SP.moneyHtml(p.cost_price), 'Cost Price', '', 'blue') : SP.stat('fa-circle-check', SP.cap(p.status), 'Status')}
        ${SP.stat('fa-chart-simple', SP.num(d.sold.qty), 'Total Sold', SP.moneyHtml(d.sold.revenue))}
      </div>
      <div class="sp-grid split">
        <div class="sp-stack">
          ${p.description ? `<div class="sp-card"><h3 style="margin-bottom:.6rem">Description</h3><p style="margin:0">${esc(p.description)}</p></div>` : ''}
          ${d.sold.profit !== undefined ? `<div class="sp-card"><h3 style="margin-bottom:.6rem">Profit so far</h3><div class="sp-stat" style="border:0;box-shadow:none;padding:0"><div class="ico green"><i class="fa-solid fa-chart-line"></i></div><div><div class="val">${SP.moneyHtml(d.sold.profit)}</div><div class="lbl">From ${SP.num(d.sold.qty)} units sold</div></div></div></div>` : ''}
        </div>
        <div class="sp-stack">
          <div class="sp-card"><div class="th" style="width:100%;aspect-ratio:1.6/1;border-radius:14px;background:var(--sp-primary-50);display:grid;place-items:center;overflow:hidden;color:var(--sp-primary);font-size:2rem;margin-bottom:.8rem">${p.has_image ? `<img src="/api/shop/products/${p.id}/image?v=${SP.state.photoV}" alt="" style="width:100%;height:100%;object-fit:cover">` : '<i class="fa-solid fa-box"></i>'}</div>${SP.can('products.manage') ? `<label class="sp-btn ghost sm block" for="fPhoto"><i class="fa-solid fa-camera"></i> ${p.has_image ? 'Change photo' : 'Add photo'}</label><input type="file" id="fPhoto" accept="image/png,image/jpeg,image/webp" class="sp-sr">` : ''}</div>
          ${p.track_stock ? `<div class="sp-card"><div class="sp-card-head"><h3>Stock history</h3></div><div id="stockHist">${SP.skeleton(4)}</div></div>` : ''}
        </div>
      </div>`;

    if (SP.can('products.manage')) {
      const input = el.querySelector('#fPhoto');
      if (input) input.addEventListener('change', async () => {
        if (!input.files[0]) return;
        try { const fd = new FormData(); fd.append('photo', await SP.resizeImage(input.files[0])); await SP.api.upload(`/products/${p.id}/image`, fd); SP.state.photoV = Date.now(); SP.toast('Photo updated.'); SP.go(`product/${p.id}`); } catch (e) { SP.fail(e); }
      });
    }
    if (p.track_stock) {
      SP.api.get(`/products/${p.id}/history`).then((h) => {
        el.querySelector('#stockHist').innerHTML = h.moves.length ? SP.table([
          { label: 'Date', render: (m) => SP.dateTime(m.created_at) }, { label: 'Type', render: (m) => SP.cap(m.type) },
          { label: 'Change', cls: 'end', render: (m) => `<span style="color:${m.qty_change < 0 ? 'var(--sp-danger)' : 'var(--sp-ok)'}">${m.qty_change > 0 ? '+' : ''}${SP.num(m.qty_change)}</span>` },
          { label: 'Balance', cls: 'end', render: (m) => SP.num(m.balance_after) }, { label: 'By', render: (m) => esc(m.user_name || '—') },
        ], h.moves, { cls: 'compact' }) : SP.empty('fa-clock-rotate-left', 'No movements yet', '');
      }).catch((e) => { el.querySelector('#stockHist').innerHTML = SP.errorBox(e); });
    }
    SP.delegate(el, { edit: () => openProductForm(p, () => SP.go(`product/${p.id}`)), adjust: () => openStockAdjust(p, () => SP.go(`product/${p.id}`)) });
  };
})();
