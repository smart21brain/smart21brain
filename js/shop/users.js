/* Staff — who can sign in to this shop, their role, active/inactive, password reset. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;
  const ROLES = [['owner', 'Owner'], ['manager', 'Manager'], ['cashier', 'Cashier']];

  SP.modules.users = async (el) => {
    el.innerHTML = `${SP.pageHead('Staff', 'Who can sign in to this shop, and what they can do', '<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-user-plus"></i> Add Staff</button>')}<div id="userList">${SP.skeleton(5)}</div>`;
    const list = el.querySelector('#userList');
    async function load() {
      const { users } = await SP.api.get('/users');
      list.innerHTML = SP.table([
        { label: 'Name', render: (u) => `<span class="sp-person"><span class="sp-avatar">${esc(SP.initials(u.name))}</span><span><span class="nm" style="color:var(--sp-text)">${esc(u.name)}</span><div class="sb">${esc(u.email)}</div></span></span>` },
        { label: 'Role', render: (u) => SP.chip(u.role === 'owner' ? 'ok' : u.role === 'manager' ? 'info' : '', SP.cap(u.role)) },
        { label: 'Status', render: (u) => SP.chip(u.active ? 'active' : 'inactive') },
        { label: 'Last sign-in', render: (u) => u.last_login ? SP.dateTime(u.last_login) : 'Never' },
        { label: '', cls: 'end', render: (u) => `<button class="sp-btn ghost sm" data-act="menu" data-id="${u.id}"><i class="fa-solid fa-ellipsis"></i></button>` },
      ], users, { empty: SP.empty('fa-users', 'No staff yet', '') });
      list._rows = users;
    }
    SP.delegate(el, {
      new: () => SP.formModal({ title: 'Add staff member', submit: 'Add staff',
        body: `${SP.f.input('name', 'Full name', { required: true })}${SP.f.input('email', 'Email', { type: 'email', required: true, hint: 'If they already have a Smart21 account, it will be linked — no password needed.' })}${SP.f.select('role', 'Role', ROLES, { required: true, value: 'cashier', noBlank: true })}${SP.f.input('password', 'Temporary password', { type: 'text', placeholder: 'Only needed for a brand-new account', hint: 'Leave blank if this person already has an account' })}`,
        onSubmit: async (data) => { await SP.api.post('/users', data); SP.closeModal(); SP.toast('Staff member added.'); load(); } }),
      menu: (b) => {
        const u = list._rows.find((x) => String(x.user_id) === b.dataset.id); if (!u) return;
        SP.popMenu(b, [
          { label: 'Change role', icon: 'fa-user-gear', fn: () => SP.formModal({ title: `Change role — ${u.name}`, submit: 'Save', body: SP.f.select('role', 'Role', ROLES, { required: true, value: u.role, noBlank: true }), onSubmit: async (d) => { await SP.api.put(`/users/${u.id}`, d); SP.closeModal(); SP.toast('Role updated.'); load(); } }) },
          { label: u.active ? 'Deactivate' : 'Activate', icon: u.active ? 'fa-user-slash' : 'fa-user-check', fn: async () => { const ok = await SP.confirm({ title: u.active ? `Deactivate ${u.name}?` : `Activate ${u.name}?`, danger: u.active }); if (!ok) return; await SP.api.put(`/users/${u.id}`, { active: !u.active }); SP.toast('Updated.'); load(); } },
          { label: 'Reset password', icon: 'fa-key', fn: () => SP.formModal({ title: `Reset password — ${u.name}`, submit: 'Reset', body: SP.f.input('new_password', 'New password', { type: 'text', required: true, hint: 'Share this with them directly.' }), onSubmit: async (d) => { await SP.api.put(`/users/${u.id}`, d); SP.closeModal(); SP.toast('Password reset.'); } }) },
        ]);
      },
    });
    await load();
  };
})();
