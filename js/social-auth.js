/* Smart21Brain — Social sign-in (Google / Apple)
   ---------------------------------------------------------------------
   This is a static demo site with no backend, so real OAuth cannot be
   completed here yet. This file IS wired to work for real as soon as
   you plug in your own credentials below:

   1. GOOGLE — create an OAuth Client ID (type: "Web application") at
      https://console.cloud.google.com/apis/credentials
      Add your real domain under "Authorized JavaScript origins".
      Paste the Client ID into GOOGLE_CLIENT_ID below.

   2. APPLE — create a Services ID at
      https://developer.apple.com/account/resources/identifiers/list/serviceId
      Enable "Sign in with Apple", register your domain + a redirect URL
      that points at an endpoint on YOUR backend (Apple posts the result
      there). Paste the Services ID into APPLE_CLIENT_ID and the redirect
      URL into APPLE_REDIRECT_URI below.

   In both cases, the token/credential Google or Apple hands back must be
   verified on your SERVER before you trust it or create a session —
   never accept it as proof of identity purely in the browser.

   Until real credentials are added, clicking either button shows a short
   notice and — for demo purposes only — signs the visitor into the
   dashboard the same way the "Continue as Student/Teacher/Parent/Admin"
   shortcuts on the login page already do. */
(function () {
  const GOOGLE_CLIENT_ID = ''; // e.g. '1234567890-abc123.apps.googleusercontent.com'
  const APPLE_CLIENT_ID = '';  // e.g. 'com.smart21brain.web'
  const APPLE_REDIRECT_URI = ''; // e.g. 'https://smart21brain.com/auth/apple/callback'

  function t(key, fallback) {
    return (window.S21_t ? window.S21_t(key) : null) || fallback;
  }

  function showNotice(btn, key, fallback) {
    const holder = btn.closest('.social-auth-group') || btn.parentElement;
    let note = holder.querySelector('.social-auth-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'social-auth-note text-soft text-center';
      note.style.cssText = 'font-size:.75rem;margin:.6rem 0 0';
      holder.appendChild(note);
    }
    note.textContent = t(key, fallback);
  }

  function demoContinue() {
    showNotice(btn, 'login_google_not_connected', "Google sign-in isn't connected yet — please log in with your real account.");
  }

  function initGoogle(btn) {
    const ready = GOOGLE_CLIENT_ID && window.google && window.google.accounts && window.google.accounts.id;
    if (!ready) {
      btn.addEventListener('click', () => {
        showNotice(btn, 'login_google_not_connected', "Google sign-in isn't connected yet — please log in with your real account.");
      });
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        // response.credential is a signed JWT from Google. Send it to
        // YOUR backend to verify the signature and create a real session —
        // this demo only logs it.
        console.log('Google credential received — verify this server-side before trusting it', response);
        showNotice(btn, 'login_google_not_connected', 'Google sign-in is configured, but the backend session must be created server-side before access is allowed.');
      },
    });
    btn.addEventListener('click', () => window.google.accounts.id.prompt());
  }

  function initApple(btn) {
    const ready = APPLE_CLIENT_ID && APPLE_REDIRECT_URI && window.AppleID;
    if (!ready) {
      btn.addEventListener('click', () => {
        showNotice(btn, 'login_apple_not_connected', "Apple sign-in isn't connected yet — please log in with your real account.");
      });
      return;
    }
    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: 'name email',
      redirectURI: APPLE_REDIRECT_URI,
      usePopup: true,
    });
    btn.addEventListener('click', async () => {
      try {
        const res = await window.AppleID.auth.signIn();
        // res.authorization.id_token is signed by Apple. Send it to YOUR
        // backend to verify before creating a session.
        console.log('Apple credential received — verify this server-side before trusting it', res);
        showNotice(btn, 'login_apple_not_connected', 'Apple sign-in is configured, but the backend session must be created server-side before access is allowed.');
      } catch (e) {
        console.warn('Apple sign-in was cancelled or failed', e);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-social-auth="google"]').forEach(initGoogle);
    document.querySelectorAll('[data-social-auth="apple"]').forEach(initApple);
  });
})();
