(function () {
  'use strict';
  const STN = window.STN;
  window.STN_MODULES = window.STN_MODULES || {};

  const ROLE_DESC = {
    owner: 'Full control — business settings, staff, pricing, finance, backups.',
    manager: 'Runs day-to-day operations — staff, pricing, inventory, finance, orders.',
    operator: 'Front counter — POS, orders, inventory adjustments.',
    designer: 'Photo Studio, PDF/Image tools, and order fulfilment.',
    accountant: 'Finance, cashbook, expenses and reports — read-only elsewhere.',
  };

  window.STN_MODULES.employees = async function (root) {
    if (!STN.can('manage_staff')) {
      root.innerHTML = `<div class="stn-empty"><i class="fa-solid fa-lock"></i>Only the Owner or a Manager can manage employees.</div>`;
      return;
    }
    root.innerHTML = `
      <div class="stn-card mb-3">
        <div class="stn-card-head"><h3>Add Employee</h3></div>
        <div class="d-flex flex-wrap gap-2">
          <input class="stn-input" style="max-width:260px" id="stnEmpEmail" placeholder="Existing smart21brain account email">
          <select class="stn-select" style="max-width:180px" id="stnEmpRole">
            <option value="manager">Manager</option><option value="operator" selected>Operator</option>
            <option value="designer">Designer</option><option value="accountant">Accountant</option>
          </select>
          <button class="stn-btn stn-btn-primary" id="stnEmpAdd"><i class="fa-solid fa-user-plus"></i> Add</button>
        </div>
        <p class="text-soft mt-2 mb-0" style="font-size:.78rem">They must already have a smart21brain account (register.html) — this links their existing login to your shop with a role.</p>
      </div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody id="stnEmpBody"></tbody>
      </table></div></div>
    `;
    document.getElementById('stnEmpAdd').addEventListener('click', addEmployee);
    await loadStaff();
  };

  async function loadStaff() {
    const { staff } = await STN.api.get('/staff');
    const body = document.getElementById('stnEmpBody');
    body.innerHTML = staff.map((s) => `
      <tr>
        <td>${STN.esc(s.name)}</td>
        <td class="text-soft">${STN.esc(s.email)}</td>
        <td>
          <select class="stn-select" style="width:150px" data-role="${s.id}" ${s.role === 'owner' ? 'disabled' : ''}>
            ${['owner', 'manager', 'operator', 'designer', 'accountant'].map((r) => `<option value="${r}" ${r === s.role ? 'selected' : ''} ${r === 'owner' ? 'disabled' : ''}>${r}</option>`).join('')}
          </select>
          <div class="text-soft" style="font-size:.7rem;max-width:220px">${ROLE_DESC[s.role] || ''}</div>
        </td>
        <td><span class="stn-badge ${s.active ? 'ok' : 'danger'}">${s.active ? 'Active' : 'Disabled'}</span></td>
        <td class="text-end">${s.role !== 'owner' ? `<button class="stn-btn stn-btn-ghost stn-btn-sm" data-toggle="${s.id}" data-active="${s.active}"><i class="fa-solid ${s.active ? 'fa-user-slash' : 'fa-user-check'}"></i></button>` : ''}</td>
      </tr>`).join('');

    body.querySelectorAll('[data-role]').forEach((sel) => sel.addEventListener('change', async () => {
      try {
        await STN.api.put(`/staff/${sel.dataset.role}`, { role: sel.value });
        STN.toast('Role updated.');
        loadStaff();
      } catch (err) { STN.toast(err.message, 'error'); }
    }));
    body.querySelectorAll('[data-toggle]').forEach((btn) => btn.addEventListener('click', async () => {
      const active = btn.dataset.active === '1' || btn.dataset.active === 'true';
      await STN.api.put(`/staff/${btn.dataset.toggle}`, { active: !active });
      loadStaff();
    }));
  }

  async function addEmployee() {
    const email = document.getElementById('stnEmpEmail').value.trim();
    const role = document.getElementById('stnEmpRole').value;
    if (!email) return STN.toast('Enter their account email.', 'error');
    try {
      await STN.api.post('/staff', { email, role });
      STN.toast('Employee added.');
      document.getElementById('stnEmpEmail').value = '';
      loadStaff();
    } catch (err) { STN.toast(err.message, 'error'); }
  }
})();
