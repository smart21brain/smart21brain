(function () {
  'use strict';
  const STN = window.STN;
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.settings = async function (root) {
    root.innerHTML = `
      <div class="stn-tabs">
        <div class="stn-tab active" data-tab="business">Business</div>
        <div class="stn-tab" data-tab="pricing">Pricing</div>
        <div class="stn-tab" data-tab="presets">Photo Presets</div>
      </div>
      <div id="stnSettingsPane"></div>
    `;
    document.querySelectorAll('#stnContent .stn-tab').forEach((t) => t.addEventListener('click', () => {
      document.querySelectorAll('#stnContent .stn-tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      renderPane(t.dataset.tab);
    }));
    renderPane('business');
  };

  function renderPane(tab) {
    const pane = document.getElementById('stnSettingsPane');
    if (tab === 'business') return renderBusiness(pane);
    if (tab === 'pricing') return renderPricing(pane);
    if (tab === 'presets') return renderPresets(pane);
  }

  function renderBusiness(pane) {
    const b = STN.state.business;
    const readOnly = !STN.can('manage_business');
    pane.innerHTML = `
      <div class="stn-card" style="max-width:520px">
        <div class="stn-field"><label class="stn-label">Business Name</label><input class="stn-input" id="stnBizName" value="${STN.esc(b.name)}" ${readOnly ? 'disabled' : ''}></div>
        <div class="stn-field"><label class="stn-label">Currency</label><input class="stn-input" id="stnBizCurrency" value="${STN.esc(b.currency)}" ${readOnly ? 'disabled' : ''}></div>
        <div class="stn-field"><label class="stn-label">Phone</label><input class="stn-input" id="stnBizPhone" value="${STN.esc(b.phone || '')}" ${readOnly ? 'disabled' : ''}></div>
        <div class="stn-field"><label class="stn-label">Address</label><input class="stn-input" id="stnBizAddress" value="${STN.esc(b.address || '')}" ${readOnly ? 'disabled' : ''}></div>
        <div class="stn-field"><label class="stn-label">Receipt Note</label><textarea class="stn-textarea" id="stnBizNote" rows="2" ${readOnly ? 'disabled' : ''}>${STN.esc(b.receipt_note || '')}</textarea></div>
        ${!readOnly ? `<button class="stn-btn stn-btn-primary" id="stnBizSave">Save</button>` : `<p class="text-soft mb-0" style="font-size:.8rem">Only the Owner can edit business settings.</p>`}
      </div>
    `;
    document.getElementById('stnBizSave')?.addEventListener('click', async () => {
      try {
        await STN.api.put('/business', {
          name: document.getElementById('stnBizName').value,
          currency: document.getElementById('stnBizCurrency').value,
          phone: document.getElementById('stnBizPhone').value,
          address: document.getElementById('stnBizAddress').value,
          receipt_note: document.getElementById('stnBizNote').value,
        });
        STN.toast('Saved. Reloading…');
        setTimeout(() => location.reload(), 700);
      } catch (err) { STN.toast(err.message, 'error'); }
    });
  }

  async function renderPricing(pane) {
    pane.innerHTML = '<div class="stn-loading"><div class="stn-spin"></div></div>';
    const { services } = await STN.api.get('/services?active=0');
    pane.innerHTML = `
      <div class="d-flex justify-content-end mb-3"><button class="stn-btn stn-btn-primary stn-btn-sm" id="stnSvcAdd" ${STN.can('manage_pricing') ? '' : 'disabled'}><i class="fa-solid fa-plus"></i> Add Service</button></div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>Service</th><th>Category</th><th>Unit</th><th>Price</th><th>Status</th><th></th></tr></thead>
        <tbody>${services.map((s) => `
          <tr><td>${STN.esc(s.name)}</td><td>${STN.esc(s.category)}</td><td>${STN.esc(s.unit)}</td><td>${STN.money(s.unit_price)}</td>
          <td><span class="stn-badge ${s.active ? 'ok' : 'danger'}">${s.active ? 'Active' : 'Inactive'}</span></td>
          <td class="text-end"><button class="stn-btn stn-btn-ghost stn-btn-sm" data-edit="${s.id}"><i class="fa-solid fa-pen"></i></button></td></tr>`).join('')}</tbody>
      </table></div></div>
    `;
    document.getElementById('stnSvcAdd').addEventListener('click', () => openServiceModal(null, services));
    pane.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openServiceModal(services.find((s) => s.id === Number(btn.dataset.edit)), services)));
  }

  function openServiceModal(service, allServices) {
    const editing = !!service;
    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${editing ? 'Edit' : 'Add'} Service</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <div class="stn-field"><label class="stn-label">Name</label><input class="stn-input" id="stnSvcName" value="${STN.esc(service?.name || '')}"></div>
        <div class="stn-grid stn-grid-2">
          <div class="stn-field"><label class="stn-label">Category</label><input class="stn-input" id="stnSvcCat" value="${STN.esc(service?.category || 'Printing')}"></div>
          <div class="stn-field"><label class="stn-label">Unit</label><input class="stn-input" id="stnSvcUnit" value="${STN.esc(service?.unit || 'page')}"></div>
        </div>
        <div class="stn-grid stn-grid-2">
          <div class="stn-field"><label class="stn-label">Sell Price</label><input class="stn-input" type="number" id="stnSvcPrice" value="${service?.unit_price ?? 0}"></div>
          <div class="stn-field"><label class="stn-label">Cost Price</label><input class="stn-input" type="number" id="stnSvcCost" value="${service?.cost_price ?? 0}"></div>
        </div>
        ${editing ? `<label class="d-flex align-items-center gap-2 text-soft"><input type="checkbox" id="stnSvcActive" ${service.active ? 'checked' : ''}> Active</label>` : ''}
      </div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnSvcSave">${editing ? 'Save' : 'Add'}</button></div>
    `);
    document.getElementById('stnSvcSave').addEventListener('click', async () => {
      const payload = {
        name: document.getElementById('stnSvcName').value.trim(),
        category: document.getElementById('stnSvcCat').value.trim(),
        unit: document.getElementById('stnSvcUnit').value.trim(),
        unit_price: Number(document.getElementById('stnSvcPrice').value),
        cost_price: Number(document.getElementById('stnSvcCost').value),
      };
      if (editing) payload.active = document.getElementById('stnSvcActive').checked;
      if (!payload.name) return STN.toast('Name is required.', 'error');
      try {
        if (editing) await STN.api.put(`/services/${service.id}`, payload);
        else await STN.api.post('/services', payload);
        STN.toast('Saved.'); STN.closeModal(); renderPane('pricing');
      } catch (err) { STN.toast(err.message, 'error'); }
    });
  }

  async function renderPresets(pane) {
    pane.innerHTML = '<div class="stn-loading"><div class="stn-spin"></div></div>';
    const { presets } = await STN.api.get('/photo-presets');
    pane.innerHTML = `
      <div class="d-flex justify-content-end mb-3"><button class="stn-btn stn-btn-primary stn-btn-sm" id="stnPresetAdd" ${STN.can('manage_pricing') ? '' : 'disabled'}><i class="fa-solid fa-plus"></i> Add Custom Preset</button></div>
      <div class="stn-grid stn-grid-3">
        ${presets.map((p) => `
        <div class="stn-card stn-card-tight">
          <div style="font-weight:800">${STN.esc(p.country)} — ${STN.esc(p.name)}</div>
          <div class="text-soft" style="font-size:.78rem">${p.width_mm}×${p.height_mm}mm · ${p.dpi}dpi</div>
          ${p.business_id ? `<button class="stn-btn stn-btn-ghost stn-btn-sm mt-2" data-del="${p.id}"><i class="fa-solid fa-trash"></i></button>` : '<span class="stn-badge mt-2">Global</span>'}
        </div>`).join('')}
      </div>
    `;
    document.getElementById('stnPresetAdd').addEventListener('click', () => {
      STN.openModal(`
        <div class="stn-modal-head"><h3 class="mb-0">Add Photo Preset</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="stn-modal-body">
          <div class="stn-grid stn-grid-2">
            <div class="stn-field"><label class="stn-label">Country/Label</label><input class="stn-input" id="stnPCountry" placeholder="e.g. Custom-ID"></div>
            <div class="stn-field"><label class="stn-label">Name</label><input class="stn-input" id="stnPName" placeholder="e.g. Staff ID Card"></div>
            <div class="stn-field"><label class="stn-label">Width (mm)</label><input class="stn-input" type="number" id="stnPWidth" value="35"></div>
            <div class="stn-field"><label class="stn-label">Height (mm)</label><input class="stn-input" type="number" id="stnPHeight" value="45"></div>
          </div>
        </div>
        <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnPSave">Add</button></div>
      `);
      document.getElementById('stnPSave').addEventListener('click', async () => {
        try {
          await STN.api.post('/photo-presets', {
            country: document.getElementById('stnPCountry').value.trim(),
            name: document.getElementById('stnPName').value.trim(),
            width_mm: Number(document.getElementById('stnPWidth').value),
            height_mm: Number(document.getElementById('stnPHeight').value),
          });
          STN.toast('Preset added.'); STN.closeModal(); renderPane('presets');
        } catch (err) { STN.toast(err.message, 'error'); }
      });
    });
    pane.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm('Delete this preset?')) return;
      await STN.api.del(`/photo-presets/${btn.dataset.del}`);
      renderPane('presets');
    }));
  }
})();
