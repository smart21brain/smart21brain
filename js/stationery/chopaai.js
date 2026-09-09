(function () {
  'use strict';
  const STN = window.STN;
  window.STN_MODULES = window.STN_MODULES || {};

  let log = [];
  let pendingMode = 'general';
  let pendingContext = {};

  const QUICK = [
    { mode: 'business', label: 'Business advice', icon: 'fa-chart-line', prompt: 'How is my shop doing today and what should I focus on?' },
    { mode: 'sales_summary', label: 'Sales summary', icon: 'fa-file-invoice-dollar', prompt: 'Give me a quick summary of this week\'s sales.' },
    { mode: 'photo', label: 'Passport photo help', icon: 'fa-camera-retro', prompt: 'Walk me through taking a compliant Tanzanian passport photo.' },
  ];

  window.STN_MODULES.chopaai = async function (root) {
    root.innerHTML = `
      <div class="stn-grid" style="grid-template-columns: 1fr 240px">
        <div class="stn-card">
          <div class="stn-card-head"><h3><i class="fa-solid fa-robot text-emerald me-1"></i>ChopaAI</h3></div>
          <div class="stn-chat-log" id="stnChatLog"></div>
          <div class="d-flex gap-2 mt-3">
            <input class="stn-input" id="stnChatInput" placeholder="Ask ChopaAI anything about your shop…">
            <button class="stn-btn stn-btn-primary" id="stnChatSend"><i class="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>
        <div class="stn-card">
          <div class="stn-card-head"><h3>Quick Ask</h3></div>
          ${QUICK.map((q) => `<button class="stn-btn stn-btn-outline w-100 mb-2 text-start" data-quick='${q.mode}'><i class="fa-solid ${q.icon} me-2"></i>${q.label}</button>`).join('')}
        </div>
      </div>
    `;
    renderLog();
    document.getElementById('stnChatSend').addEventListener('click', sendFromInput);
    document.getElementById('stnChatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendFromInput(); });
    document.querySelectorAll('[data-quick]').forEach((btn) => btn.addEventListener('click', () => {
      const q = QUICK.find((x) => x.mode === btn.dataset.quick);
      send(q.prompt, q.mode, {});
    }));

    if (pendingContext.prefillPrompt) {
      send(pendingContext.prefillPrompt, pendingMode, pendingContext);
      pendingContext = {};
    }
  };

  window.STN_chopaPrefill = function (mode, machineId, prompt) {
    pendingMode = mode;
    pendingContext = { machine_id: machineId, prefillPrompt: prompt };
  };

  function renderLog() {
    const box = document.getElementById('stnChatLog');
    if (!box) return;
    box.innerHTML = log.length ? log.map((m) => `<div class="stn-chat-msg ${m.role}">${STN.esc(m.text)}</div>`).join('') :
      '<div class="stn-empty"><i class="fa-solid fa-robot"></i>Ask about a machine fault, a passport photo, or today\'s numbers.</div>';
    box.scrollTop = box.scrollHeight;
  }

  function sendFromInput() {
    const input = document.getElementById('stnChatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    send(text, 'general', {});
  }

  async function send(text, mode, context) {
    log.push({ role: 'user', text });
    renderLog();
    log.push({ role: 'bot', text: '…' });
    renderLog();
    try {
      const { answer } = await STN.api.post('/chopaai', { prompt: text, mode, ...context });
      log[log.length - 1] = { role: 'bot', text: answer };
    } catch (err) {
      log[log.length - 1] = { role: 'bot', text: `Sorry, I hit an error: ${err.message}` };
    }
    renderLog();
  }
})();
