(function () {
  'use strict';
  const STN = window.STN;
  window.STN_MODULES = window.STN_MODULES || {};

  const STATUS_BADGE = { 'In Progress': 'info', 'Awaiting Customer': 'warn', 'Submitted': 'ok', 'Done': 'ok' };

  window.STN_MODULES.onlineservices = async function (root) {
    const [{ requests }, { types, templates }] = await Promise.all([
      STN.api.get('/online-services'),
      STN.api.get('/online-services/templates'),
    ]);

    root.innerHTML = `
      <div class="stn-card mb-3">
        <p class="text-soft mb-3" style="font-size:.85rem"><i class="fa-solid fa-circle-info text-cyan me-1"></i>This centre tracks the customer's paperwork step by step. It never submits anything to a government system directly — the operator still visits TRA/BRELA/NIDA/Immigration in person or via their official portal.</p>
        <button class="stn-btn stn-btn-primary stn-btn-sm" id="stnOsAdd"><i class="fa-solid fa-plus"></i> New Request</button>
      </div>
      <div class="stn-grid stn-grid-3" id="stnOsGrid"></div>
    `;
    renderGrid(requests);
    document.getElementById('stnOsAdd').addEventListener('click', () => openNewModal(types, templates));
  };

  function renderGrid(requests) {
    const grid = document.getElementById('stnOsGrid');
    grid.innerHTML = requests.length ? requests.map((r) => {
      const done = r.checklist.filter((c) => c.done).length;
      return `
      <div class="stn-card stn-card-tight" style="cursor:pointer" data-open="${r.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div><div style="font-weight:800">${STN.esc(r.service_type)}</div><div class="text-soft" style="font-size:.78rem">${STN.esc(r.customer_name || 'Walk-in')}</div></div>
          <span class="stn-badge ${STATUS_BADGE[r.status] || ''}">${STN.esc(r.status)}</span>
        </div>
        <div class="text-soft mt-2" style="font-size:.78rem">${done}/${r.checklist.length} requirements ready</div>
      </div>`;
    }).join('') : '<div class="stn-empty"><i class="fa-solid fa-passport"></i>No requests yet.</div>';

    grid.querySelectorAll('[data-open]').forEach((card) => card.addEventListener('click', () => openDetail(Number(card.dataset.open))));
  }

  async function reload() {
    const { requests } = await STN.api.get('/online-services');
    renderGrid(requests);
  }

  function openNewModal(types, templates) {
    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">New Online Service Request</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <div class="stn-field"><label class="stn-label">Service Type</label>
          <select class="stn-select" id="stnOsType">${types.map((t) => `<option value="${t}">${t}</option>`).join('')}</select>
        </div>
        <div class="stn-field"><label class="stn-label">Customer Name</label><input class="stn-input" id="stnOsCustomer"></div>
        <div class="stn-field"><label class="stn-label">Phone</label><input class="stn-input" id="stnOsPhone"></div>
        <div class="stn-field"><label class="stn-label">Service Fee</label><input class="stn-input" type="number" id="stnOsFee" value="0"></div>
        <div id="stnOsChecklistPreview" class="text-soft" style="font-size:.8rem"></div>
      </div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnOsSave">Create</button></div>
    `);
    function updatePreview() {
      const type = document.getElementById('stnOsType').value;
      document.getElementById('stnOsChecklistPreview').innerHTML = `Default checklist:<ul class="mt-1">${(templates[type] || []).map((l) => `<li>${STN.esc(l)}</li>`).join('')}</ul>`;
    }
    document.getElementById('stnOsType').addEventListener('change', updatePreview);
    updatePreview();

    document.getElementById('stnOsSave').addEventListener('click', async () => {
      try {
        await STN.api.post('/online-services', {
          service_type: document.getElementById('stnOsType').value,
          customer_name: document.getElementById('stnOsCustomer').value.trim() || undefined,
          customer_phone: document.getElementById('stnOsPhone').value.trim() || undefined,
          fee: Number(document.getElementById('stnOsFee').value) || 0,
        });
        STN.toast('Request created.'); STN.closeModal(); reload();
      } catch (err) { STN.toast(err.message, 'error'); }
    });
  }

  async function openDetail(id) {
    const { requests } = await STN.api.get('/online-services');
    const r = requests.find((x) => x.id === id);
    if (!r) return;
    const statuses = ['In Progress', 'Awaiting Customer', 'Submitted', 'Done'];

    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${STN.esc(r.service_type)} — ${STN.esc(r.customer_name || 'Walk-in')}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <div class="d-flex flex-wrap gap-2 mb-3">${statuses.map((s) => `<button class="stn-btn stn-btn-sm ${s === r.status ? 'stn-btn-primary' : 'stn-btn-outline'}" data-status="${s}">${s}</button>`).join('')}</div>
        <div id="stnOsChecklist">${r.checklist.map((c, i) => `
          <div class="stn-checklist-item ${c.done ? 'done' : ''}">
            <input type="checkbox" data-idx="${i}" ${c.done ? 'checked' : ''}>
            <div class="label">${STN.esc(c.label)}</div>
          </div>`).join('')}</div>
        <div class="stn-field mt-3"><label class="stn-label">Notes</label><textarea class="stn-textarea" id="stnOsNotes" rows="3">${STN.esc(r.notes || '')}</textarea></div>
      </div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnOsSaveDetail">Save</button></div>
    `, { wide: true });

    let checklist = JSON.parse(JSON.stringify(r.checklist));
    let status = r.status;
    document.querySelectorAll('[data-status]').forEach((btn) => btn.addEventListener('click', () => {
      status = btn.dataset.status;
      document.querySelectorAll('[data-status]').forEach((b) => b.classList.remove('stn-btn-primary'));
      btn.classList.add('stn-btn-primary');
    }));
    document.querySelectorAll('#stnOsChecklist input[type=checkbox]').forEach((cb) => cb.addEventListener('change', () => {
      checklist[Number(cb.dataset.idx)].done = cb.checked;
    }));
    document.getElementById('stnOsSaveDetail').addEventListener('click', async () => {
      await STN.api.put(`/online-services/${r.id}`, { checklist, status, notes: document.getElementById('stnOsNotes').value });
      STN.toast('Saved.'); STN.closeModal(); reload();
    });
  }
})();
