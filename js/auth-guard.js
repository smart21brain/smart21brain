(function (global) {
  const GUEST_BYPASS_PATTERNS = [
    /continue as guest/i,
    /continue as\s+(?:a\s+)?guest/i,
    /guest access/i,
    /browse the site now/i,
    /join any time later/i,
  ];

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isGuestBypassElement(el) {
    const candidate = el || {};
    const tag = candidate.tagName || candidate.nodeName || '';
    if (!tag || !['A', 'BUTTON', 'INPUT'].includes(tag.toUpperCase())) return false;

    const text = normalizeText(
      candidate.textContent ||
      candidate.value ||
      candidate.getAttribute?.('aria-label') ||
      candidate.getAttribute?.('title') || ''
    );

    if (!text) return false;
    return GUEST_BYPASS_PATTERNS.some((pattern) => pattern.test(text));
  }

  function shouldAllowGuestFlow() {
    return false;
  }

  function blockGuestBypass() {
    if (!global.document || !global.document.querySelectorAll) return;

    global.document.querySelectorAll('a, button, input[type="button"], input[type="submit"]').forEach((el) => {
      if (!isGuestBypassElement(el)) return;

      el.setAttribute('data-guest-bypass', 'blocked');
      el.setAttribute('aria-disabled', 'true');
      el.tabIndex = -1;
      if ('disabled' in el) el.disabled = true;
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.5';

      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (global.window && global.window.S21_toast) {
          global.window.S21_toast('Please sign in with a real account. Guest access is not allowed.');
        }
      }, { once: true });
    });
  }

  const api = {
    isGuestBypassElement,
    shouldAllowGuestFlow,
    blockGuestBypass,
  };

  global.S21AuthGuard = api;

  if (typeof global.document !== 'undefined') {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', blockGuestBypass, { once: true });
    } else {
      blockGuestBypass();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
