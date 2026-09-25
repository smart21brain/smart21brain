/* Point of Sale — the till: pick products, build a cart, choose a customer, take payment. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  SP.modules.pos = async (el) => {
    const [lk, prodData] = await Promise.all([SP.lookups(), SP.api.get('/products?all=1&status=active')]);
    const canDiscount = SP.can('sales.discount');
    const products = prodData.products;
    const cart = []; let customer = null; let discount = 0; let activeCat = '';
    const paySel = {};

    el.innerHTML = `<div class="sp-pos">
      <div>
        <div class="sp-pos-cats" id="posCats"><button class="on" data-c="">All</button>${lk.categories.map((c) => `<button data-c="${c.id}">${esc(c.name)}</button>`).join('')}</div>
        <input class="sp-input" id="posSearch" type="search" placeholder="Search products or scan a barcode…" style="margin-bottom:.9rem" autocomplete="off">
        <div class="sp-pos-grid" id="posGrid"></div>
      </div>
      <div class="sp-cart">
        <div class="sp-cart-head">
          <div class="sp-cart-cust" id="custPicker"><span class="ico"><i class="fa-solid fa-user"></i></span><div style="flex:1"><b>Walk-in customer</b><div class="sp-small sp-muted">Tap to choose a customer</div></div><i class="fa-solid fa-chevron-right sp-muted"></i></div>
        </div>
        <div class="sp-cart-lines" id="cartLines"><p class="sp-muted sp-small" style="text-align:center;padding:2rem 0">Cart is empty — tap a product to add it.</p></div>
        <div class="sp-cart-foot">
          <div class="sp-cart-row"><span>Subtotal</span><span id="sSub">0</span></div>
          ${canDiscount ? `<div class="sp-cart-row"><span>Discount</span><span><input class="sp-input" id="sDisc" type="number" min="0" step="0.01" value="0" style="width:110px;text-align:right;padding:.3rem .5rem;min-height:30px"></span></div>` : ''}
          ${Number(SP.state.shop.tax_rate) > 0 ? `<div class="sp-cart-row"><span>VAT (${SP.state.shop.tax_rate}%)</span><span id="sTax">0</span></div>` : ''}
          <div class="sp-cart-row total"><span>Total</span><span id="sTot">0</span></div>
          <div class="sp-pay-methods" id="payMethods">${lk.payment_methods.map((m) => `<button type="button" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div>
          <input class="sp-input" id="sPaidAmt" type="number" min="0" step="0.01" placeholder="Amount paid">
          <div class="sp-cart-row" id="sBalRow" style="display:none"><span>Balance owed</span><span id="sBal">0</span></div>
          <button class="sp-btn primary lg block" id="btnCharge" disabled><i class="fa-solid fa-check"></i> Complete Sale</button>
        </div>
      </div>
    </div>`;

    const grid = el.querySelector('#posGrid');
    function renderGrid(list) {
      grid.innerHTML = list.length ? list.map((p) => {
        const inCart = cart.find((l) => l.product_id === p.id);
        const avail = p.track_stock ? p.stock_qty - (inCart ? inCart.qty : 0) : Infinity;
        const disabled = p.track_stock && avail <= 0;
        return `<button type="button" class="sp-pos-item" data-id="${p.id}" ${disabled ? 'disabled' : ''}>
          ${p.track_stock ? (p.stock_state === 'out' ? '<span class="st out">Out</span>' : p.stock_state === 'low' ? '<span class="st">Low</span>' : '') : ''}
          <div class="th">${p.has_image ? `<img src="/api/shop/products/${p.id}/image?v=${SP.state.photoV}" alt="">` : '<i class="fa-solid fa-box"></i>'}</div>
          <div class="nm">${esc(p.name)}</div><div class="pr">${SP.money(p.sell_price)}</div></button>`;
      }).join('') : SP.empty('fa-magnifying-glass', 'No products', 'Try a different search or category.');
    }
    function filtered() {
      const q = el.querySelector('#posSearch').value.trim().toLowerCase();
      return products.filter((p) => (!activeCat || String(p.category_id) === activeCat) && (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.barcode || '') === el.querySelector('#posSearch').value.trim()));
    }
    renderGrid(filtered());
    el.querySelector('#posSearch').addEventListener('input', SP.debounce(() => renderGrid(filtered()), 120));
    el.querySelector('#posCats').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; activeCat = b.dataset.c; el.querySelectorAll('#posCats button').forEach((x) => x.classList.toggle('on', x === b)); renderGrid(filtered()); });
    grid.addEventListener('click', (e) => { const b = e.target.closest('.sp-pos-item'); if (!b || b.disabled) return; addToCart(Number(b.dataset.id)); });

    function addToCart(id) {
      const p = products.find((x) => x.id === id); if (!p) return;
      const line = cart.find((l) => l.product_id === id);
      if (line) { line.qty += 1; } else cart.push({ product_id: id, name: p.name, unit: p.unit, price: p.sell_price, qty: 1, track: p.track_stock, stock: p.stock_qty });
      renderCart(); renderGrid(filtered());
    }
    function renderCart() {
      const lines = el.querySelector('#cartLines');
      lines.innerHTML = cart.length ? cart.map((l, i) => `<div class="sp-cart-line" data-i="${i}">
          <div style="flex:1"><div class="nm">${esc(l.name)}</div><div class="px">${SP.money(l.price)} ${canDiscount ? `<button class="sp-icon-btn" data-act="editprice" data-i="${i}" style="width:22px;height:22px;display:inline-grid;vertical-align:middle" title="Change price"><i class="fa-solid fa-pen" style="font-size:.6rem"></i></button>` : ''}</div></div>
          <div class="sp-qty"><button type="button" data-act="dec" data-i="${i}">−</button><input value="${l.qty}" data-i="${i}" data-act="qty" inputmode="decimal"><button type="button" data-act="inc" data-i="${i}">+</button></div>
          <button class="sp-icon-btn" data-act="rm" data-i="${i}" style="width:30px;height:30px" title="Remove"><i class="fa-solid fa-trash"></i></button>
        </div>`).join('') : '<p class="sp-muted sp-small" style="text-align:center;padding:2rem 0">Cart is empty — tap a product to add it.</p>';
      recalc();
    }
    lines_events: {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const i = Number(b.dataset.i);
        if (b.dataset.act === 'inc') { cart[i].qty += 1; renderCart(); }
        else if (b.dataset.act === 'dec') { cart[i].qty -= 1; if (cart[i].qty <= 0) cart.splice(i, 1); renderCart(); renderGrid(filtered()); }
        else if (b.dataset.act === 'rm') { cart.splice(i, 1); renderCart(); renderGrid(filtered()); }
        else if (b.dataset.act === 'editprice') {
          const l = cart[i]; const np = prompt(`New price for ${l.name}`, l.price); if (np === null) return;
          const n = Number(np); if (Number.isFinite(n) && n >= 0) { l.price = n; renderCart(); }
        }
      });
      el.addEventListener('change', (e) => {
        if (e.target.dataset.act === 'qty') { const i = Number(e.target.dataset.i); const n = Number(e.target.value); if (Number.isFinite(n) && n > 0) cart[i].qty = n; else e.target.value = cart[i].qty; renderCart(); }
      });
    }

    function recalc() {
      const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
      const discEl = el.querySelector('#sDisc'); discount = canDiscount && discEl ? Math.min(Number(discEl.value) || 0, subtotal) : 0;
      const taxable = Math.max(0, subtotal - discount);
      const rate = Number(SP.state.shop.tax_rate) || 0;
      const tax = rate > 0 ? taxable * rate / 100 : 0;
      const total = taxable + tax;
      el.querySelector('#sSub').textContent = SP.money(subtotal);
      const taxEl = el.querySelector('#sTax'); if (taxEl) taxEl.textContent = SP.money(tax);
      el.querySelector('#sTot').textContent = SP.money(total);
      const paidInput = el.querySelector('#sPaidAmt');
      if (paidInput.dataset.touched !== '1') paidInput.value = total ? total.toFixed(2) : '';
      const paid = Number(paidInput.value) || 0;
      const bal = Math.max(0, total - paid);
      el.querySelector('#sBalRow').style.display = bal > 0.004 ? 'flex' : 'none';
      el.querySelector('#sBal').textContent = SP.money(bal);
      el.querySelector('#btnCharge').disabled = cart.length === 0 || total <= 0;
      return { subtotal, discount, tax, total, paid, bal };
    }
    const discEl = el.querySelector('#sDisc'); if (discEl) discEl.addEventListener('input', recalc);
    const paidInput = el.querySelector('#sPaidAmt');
    paidInput.addEventListener('input', () => { paidInput.dataset.touched = '1'; recalc(); });
    el.querySelector('#payMethods').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('#payMethods button').forEach((x) => x.classList.toggle('on', x === b)); paySel.method = b.dataset.m; });
    if (lk.payment_methods.length) { el.querySelector('#payMethods button').classList.add('on'); paySel.method = lk.payment_methods[0]; }

    // ---- customer picker
    el.querySelector('#custPicker').addEventListener('click', () => {
      if (!SP.can('customers.view')) return;
      openCustomerPicker((c) => { customer = c; renderCustPicker(); });
    });
    function renderCustPicker() {
      const box = el.querySelector('#custPicker');
      box.innerHTML = customer
        ? `<span class="ico"><i class="fa-solid fa-user-check"></i></span><div style="flex:1"><b>${esc(customer.full_name)}</b><div class="sp-small sp-muted">${esc(customer.customer_no)}${customer.phone ? ' · ' + esc(customer.phone) : ''}</div></div><button class="sp-icon-btn" id="custClear" style="width:30px;height:30px" title="Remove"><i class="fa-solid fa-xmark"></i></button>`
        : `<span class="ico"><i class="fa-solid fa-user"></i></span><div style="flex:1"><b>Walk-in customer</b><div class="sp-small sp-muted">Tap to choose a customer</div></div><i class="fa-solid fa-chevron-right sp-muted"></i></div>`;
      const clear = box.querySelector('#custClear'); if (clear) clear.addEventListener('click', (e) => { e.stopPropagation(); customer = null; renderCustPicker(); });
    }

    el.querySelector('#btnCharge').addEventListener('click', async () => {
      const { subtotal, discount: disc, total, paid, bal } = recalc();
      if (bal > 0.004 && !customer) { SP.toast('Choose a customer before selling on credit.', 'warn'); return; }
      const btn = el.querySelector('#btnCharge'); btn.disabled = true; btn.innerHTML = '<span class="sp-spin"></span> Charging…';
      const payload = { customer_id: customer ? customer.id : undefined, items: cart.map((l) => ({ product_id: l.product_id, qty: l.qty, unit_price: l.price })), discount: disc,
        payments: paid > 0 ? [{ method: paySel.method || (lk.payment_methods[0] || 'Cash'), amount: Math.min(paid, total) }] : [] };
      try {
        const r = await SP.api.post('/sales', payload);
        showReceipt(r);
        cart.length = 0; customer = null; renderCart(); renderCustPicker(); renderGrid(filtered());
        paidInput.dataset.touched = ''; if (discEl) discEl.value = 0;
        SP.refreshBadge();
      } catch (e) { SP.fail(e); btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Complete Sale'; }
    });
  };

  // ---------------------------------------------------------- customer picker
  function openCustomerPicker(onPick) {
    const back = SP.modal('Choose customer', `<input class="sp-input" id="custSearch" type="search" placeholder="Search name or phone…" autocomplete="off" style="margin-bottom:.8rem"><div id="custResults"><p class="sp-muted sp-small">Type to search, or add a new customer.</p></div>`, {
      footer: SP.can('customers.create') ? '<button class="sp-btn ghost" data-act="newcust"><i class="fa-solid fa-user-plus"></i> New customer</button>' : '',
    });
    const input = back.querySelector('#custSearch'); const results = back.querySelector('#custResults');
    const run = SP.debounce(async () => {
      const q = input.value.trim(); if (q.length < 2) { results.innerHTML = '<p class="sp-muted sp-small">Type at least 2 letters.</p>'; return; }
      results.innerHTML = '<p class="sp-muted sp-small">Searching…</p>';
      try { const d = await SP.api.get('/customers' + SP.qs({ q, limit: 8 })); results.innerHTML = d.customers.length ? `<div class="sp-list">${d.customers.map((c) => `<button type="button" class="sp-spread" data-id="${c.id}" style="width:100%;text-align:left;border:0;background:none;padding:.5rem 0;cursor:pointer;color:inherit"><span><b>${esc(c.full_name)}</b><div class="sp-small sp-muted">${esc(c.customer_no)}${c.phone ? ' · ' + esc(c.phone) : ''}</div></span>${c.balance > 0.004 ? SP.chip('unpaid', SP.money(c.balance) + ' owed') : ''}</button>`).join('')}</div>` : '<p class="sp-muted sp-small">No customer found.</p>'; }
      catch (e) { results.innerHTML = `<p class="sp-muted sp-small">${esc(e.message)}</p>`; }
    }, 250);
    input.addEventListener('input', run); setTimeout(() => input.focus(), 60);
    results.addEventListener('click', async (e) => { const b = e.target.closest('[data-id]'); if (!b) return; const c = await SP.api.get(`/customers/${b.dataset.id}`); SP.closeModal(); onPick(c.customer); });
    const newBtn = back.querySelector('[data-act=newcust]');
    if (newBtn) newBtn.addEventListener('click', () => { SP.closeModal(); SP.openCustomerForm(null, (r) => onPick(r.customer)); });
  }

  // ---------------------------------------------------------- receipt
  function showReceipt(data) {
    const { sale, items, shop } = data;
    const html = receiptHtml(data);
    const back = SP.modal('Sale complete', `<div class="sp-doc-stage" style="--doc-color:${shop.primary_color}">${html}</div>`, {
      footer: '<button class="sp-btn ghost" data-close2>Close</button><button class="sp-btn ghost" data-print><i class="fa-solid fa-print"></i> Print</button><button class="sp-btn primary" data-new><i class="fa-solid fa-plus"></i> New Sale</button>',
    });
    back.querySelector('[data-close2]').addEventListener('click', () => SP.closeModal());
    back.querySelector('[data-print]').addEventListener('click', () => SP.print(`<div style="--doc-color:${shop.primary_color}">${html}</div>`));
    back.querySelector('[data-new]').addEventListener('click', () => SP.closeModal());
  }
  function receiptHtml(data) {
    const { sale, items, shop, customer, receipt_footer } = data; const esc2 = SP.esc;
    return `<div class="sp-doc sp-receipt">
      <div class="hd"><span class="lg">${esc2((shop.short_name || shop.name || 'S').slice(0, 2))}${shop.has_logo ? `<img src="${SP.logoUrl(shop.id)}" alt="">` : ''}</span><h4>${esc2(shop.name)}</h4><div class="meta">${esc2(shop.address || '')}${shop.phone ? (shop.address ? ' · ' : '') + esc2(shop.phone) : ''}${shop.tax_no ? `<br>TIN: ${esc2(shop.tax_no)}` : ''}</div></div>
      <div class="title">SALES RECEIPT</div>
      <div class="meta" style="text-align:center">${esc2(sale.receipt_no)} · ${SP.dateTime(sale.created_at)}</div>
      <div class="meta" style="margin-top:4px">Customer: ${esc2(customer ? customer.full_name : sale.customer_name || 'Walk-in customer')}</div>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Amt</th></tr></thead><tbody>${items.map((i) => `<tr><td>${esc2(i.name)}</td><td>${SP.num(i.qty)}</td><td>${SP.num(i.line_total)}</td></tr>`).join('')}</tbody></table>
      <div class="tot"><table>
        <tr><td>Subtotal</td><td>${SP.num(sale.subtotal)}</td></tr>
        ${sale.discount ? `<tr><td>Discount</td><td>-${SP.num(sale.discount)}</td></tr>` : ''}
        ${sale.tax ? `<tr><td>VAT</td><td>${SP.num(sale.tax)}</td></tr>` : ''}
        <tr class="grand"><td>Total</td><td>${SP.num(sale.total)} ${esc2(shop.currency)}</td></tr>
        <tr><td>Paid</td><td>${SP.num(sale.paid)}</td></tr>
      </table></div>
      ${sale.balance > 0.004 ? `<div class="bal">Balance owed: ${SP.num(sale.balance)} ${esc2(shop.currency)}</div>` : ''}
      <div class="foot">${esc2(receipt_footer || '')}</div>
    </div>`;
  }
  SP.receiptHtml = receiptHtml;
})();
