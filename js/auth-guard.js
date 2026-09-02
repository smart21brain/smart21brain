(function (global) {
  const GUEST_BYPASS_PATTERNS = [
    /continue as guest/i,
    /continue as\s+(?:a\s+)?guest/i,
    /guest access/i,
    /browse the site now/i,
    /join any time later/i,
  ];

  // Role shortcuts shown under "Or continue as" on the login screen
  // must never create a session or open a protected dashboard.
  const LOGIN_ROLE_PATTERNS = [
    /^student$/i,
    /^teacher$/i,
    /^parent$/i,
    /^admin$/i,
    /continue as\s+(?:a\s+)?(?:student|teacher|parent|admin)/i,
  ];

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function elementText(el) {
    return normalizeText(
      el?.textContent || el?.value ||
      el?.getAttribute?.('aria-label') || el?.getAttribute?.('title') || ''
    );
  }

  function isGuestBypassElement(el) {
    const tag = el?.tagName || el?.nodeName || '';
    if (!['A', 'BUTTON', 'INPUT'].includes(String(tag).toUpperCase())) return false;
    const text = elementText(el);
    return !!text && GUEST_BYPASS_PATTERNS.some((pattern) => pattern.test(text));
  }

  function isLoginRoleShortcut(el) {
    if (!el) return false;
    const tag = el.tagName || el.nodeName || '';
    if (!['A', 'BUTTON', 'INPUT'].includes(String(tag).toUpperCase())) return false;
    if (!global.document?.getElementById?.('login-form')) return false;

    const text = elementText(el);
    const dataRole = normalizeText(
      el.getAttribute?.('data-role') ||
      el.getAttribute?.('data-account-type') ||
      el.getAttribute?.('data-login-as') || ''
    );

    return LOGIN_ROLE_PATTERNS.some((pattern) => pattern.test(text)) ||
      /^(student|teacher|parent|admin)$/i.test(dataRole);
  }

  function shouldAllowGuestFlow() {
    return false;
  }

  function blockElement(el, message) {
    if (!el || el.getAttribute?.('data-auth-bypass-blocked') === '1') return;

    el.setAttribute('data-auth-bypass-blocked', '1');
    el.setAttribute('aria-disabled', 'true');
    el.tabIndex = -1;
    if ('disabled' in el) el.disabled = true;
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.5';

    el.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      global.window?.S21_toast?.(message);
    }, true);
  }

  function blockGuestBypass() {
    if (!global.document?.querySelectorAll) return;

    global.document.querySelectorAll('a, button, input[type="button"], input[type="submit"]').forEach((el) => {
      if (isGuestBypassElement(el)) {
        blockElement(el, 'Please sign in with a real account. Guest access is not allowed.');
      }
      if (isLoginRoleShortcut(el)) {
        blockElement(el, 'Please enter your email and password and log in first. Role shortcuts cannot bypass authentication.');
      }
    });
  }

  const api = {
    isGuestBypassElement,
    isLoginRoleShortcut,
    shouldAllowGuestFlow,
    blockGuestBypass,
  };

  global.S21AuthGuard = api;

  if (typeof global.document !== 'undefined') {
    const run = () => {
      blockGuestBypass();
      if (global.MutationObserver) {
        const observer = new MutationObserver(blockGuestBypass);
        observer.observe(global.document.body, { childList: true, subtree: true });
      }
    };

    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
