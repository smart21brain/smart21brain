(function () {
  'use strict';
  const STN = window.STN;
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.security = async function (root) {
    if (!STN.can('manage_backup')) {
      root.innerHTML = `<div class="stn-empty"><i class="fa-solid fa-lock"></i>Only the Owner can access Security & Backup.</div>`;
      return;
    }
    root.innerHTML = `
      <div class="stn-grid" style="grid-template-columns: 1fr 1fr">
        <div class="stn-card">
          <div class="stn-card-head"><h3><i class="fa-solid fa-shield-halved text-emerald me-1"></i>Encrypted Backup</h3></div>
          <p class="text-soft" style="font-size:.85rem">Your data lives on Cloudflare D1, which is encrypted at rest and backed up automatically. This export gives you your own offline copy, encrypted in your browser with a passphrase only you know — smart21brain never sees it.</p>
          <div class="stn-field"><label class="stn-label">Passphrase</label><input class="stn-input" type="password" id="stnBackupPass" placeholder="Choose a strong passphrase"></div>
          <button class="stn-btn stn-btn-primary w-100 mb-2" id="stnBackupExport"><i class="fa-solid fa-download"></i> Export Encrypted Backup</button>
          <hr style="border-color:var(--stn-border)">
          <div class="stn-field"><label class="stn-label">Restore from file</label><input class="stn-input" type="file" id="stnBackupFile" accept=".s21b,.json"></div>
          <div class="stn-field"><label class="stn-label">Passphrase</label><input class="stn-input" type="password" id="stnRestorePass"></div>
          <button class="stn-btn stn-btn-outline w-100" id="stnBackupRestore"><i class="fa-solid fa-upload"></i> Restore Customers/Services/Inventory</button>
          <p class="text-soft mt-2 mb-0" style="font-size:.72rem">Restoring never touches orders, payments or financial history — only customers, pricing and inventory are re-imported.</p>
        </div>
        <div class="stn-card">
          <div class="stn-card-head"><h3>Audit Log</h3></div>
          <div class="stn-table-wrap" style="max-height:420px;overflow-y:auto"><table class="stn-table" id="stnAuditTable">
            <thead><tr><th>When</th><th>Who</th><th>Action</th></tr></thead>
            <tbody><tr><td colspan="3" class="text-center py-3"><div class="stn-spin" style="margin:0 auto"></div></td></tr></tbody>
          </table></div>
        </div>
      </div>
    `;
    document.getElementById('stnBackupExport').addEventListener('click', exportBackup);
    document.getElementById('stnBackupRestore').addEventListener('click', restoreBackup);
    loadAudit();
  };

  async function loadAudit() {
    const { log } = await STN.api.get('/audit-log');
    document.querySelector('#stnAuditTable tbody').innerHTML = log.length ? log.map((l) => `
      <tr><td class="text-soft">${STN.dt(l.created_at)}</td><td>${STN.esc(l.user_name || 'System')}</td><td>${STN.esc(l.action)}${l.details ? ` — <span class="text-soft">${STN.esc(l.details)}</span>` : ''}</td></tr>`).join('') :
      '<tr><td colspan="3" class="text-soft text-center py-3">No activity logged yet.</td></tr>';
  }

  // ---- Web Crypto AES-GCM helpers ----
  async function deriveKey(passphrase, salt) {
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }
  function toBase64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
  function fromBase64(b64) { return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }

  async function exportBackup() {
    const pass = document.getElementById('stnBackupPass').value;
    if (!pass || pass.length < 6) return STN.toast('Choose a passphrase of at least 6 characters.', 'error');
    try {
      const data = await STN.api.get('/backup/export');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(pass, salt);
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      const envelope = { v: 1, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(cipher) };
      const blob = new Blob([JSON.stringify(envelope)], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `stationery-backup-${new Date().toISOString().slice(0, 10)}.s21b`;
      a.click();
      STN.toast('Encrypted backup downloaded. Keep the passphrase safe — it cannot be recovered.');
    } catch (err) { STN.toast(err.message, 'error'); }
  }

  async function restoreBackup() {
    const file = document.getElementById('stnBackupFile').files[0];
    const pass = document.getElementById('stnRestorePass').value;
    if (!file || !pass) return STN.toast('Choose a backup file and enter its passphrase.', 'error');
    try {
      const envelope = JSON.parse(await file.text());
      const key = await deriveKey(pass, fromBase64(envelope.salt));
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.data));
      const data = JSON.parse(new TextDecoder().decode(plain));
      const result = await STN.api.post('/backup/restore', data);
      STN.toast(`Restored ${result.restoredCustomers} customers, ${result.restoredServices} services, ${result.restoredInventory} inventory items.`);
      loadAudit();
    } catch (err) {
      STN.toast('Could not decrypt — check the passphrase and file.', 'error');
    }
  }
})();
