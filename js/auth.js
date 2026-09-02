/* Smart21Brain — Auth forms
   Login and registration now call the real /api/auth endpoints (Cloudflare
   Pages Functions + D1). Other demo forms below still show local-only
   feedback until wired to a backend. */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.needs-validation').forEach((form) => {
      form.addEventListener('submit', (e) => {
        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
        }
        form.classList.add('was-validated');
      }, false);
    });

    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.querySelector(btn.dataset.togglePassword);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.querySelector('i')?.classList.toggle('fa-eye');
        btn.querySelector('i')?.classList.toggle('fa-eye-slash');
      });
    });

    /* Demo-only submit flows. There is no real backend yet, so these just
       give honest, smooth feedback instead of the browser's default full
       page reload (which would otherwise happen on a valid form with no
       submit handler and no `action` attribute). */
    function withSpinner(btn, busyLabel) {
      const original = btn.innerHTML;
      btn.classList.add('is-loading');
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${busyLabel}`;
      return () => { btn.classList.remove('is-loading'); btn.innerHTML = original; };
    }
    function t(key, fallback) { return (window.S21_t ? window.S21_t(key) : null) || fallback; }

    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) { loginForm.classList.add('was-validated'); return; }
      const btn = loginForm.querySelector('button[type="submit"]');
      const restore = withSpinner(btn, t('runtime_logging_in', 'Logging in…'));
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Login failed.');
          const user = data.user || null;
          const role = String((user && user.role) || 'user').toLowerCase();
          const roleMap = {
            admin: 'admin.html',
            teacher: 'teachers.html',
            parent: 'parents.html',
            user: 'dashboard.html',
          };
          const targetPage = roleMap[role] || 'dashboard.html';
          restore();
          const welcomeMessage = role === 'admin'
            ? 'Welcome back, Admin! Redirecting to the admin dashboard…'
            : role === 'teacher'
              ? 'Welcome back, Teacher! Redirecting to your teacher dashboard…'
              : role === 'parent'
                ? 'Welcome back, Parent! Redirecting to your parent dashboard…'
                : 'Welcome back! Redirecting to your dashboard…';
          window.S21_toast?.(t('runtime_welcome_back_toast', welcomeMessage));
          setTimeout(() => { window.location.href = targetPage; }, 700);
        })
        .catch((err) => {
          restore();
          window.S21_toast?.(err.message || 'Something went wrong. Please try again.');
        });
    });

    const registerForm = document.getElementById('register-form');
    registerForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!registerForm.checkValidity()) { registerForm.classList.add('was-validated'); return; }
      const btn = registerForm.querySelector('button[type="submit"]');
      const restore = withSpinner(btn, t('runtime_creating_account', 'Creating account…'));
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Registration failed.');
          restore();
          window.S21_toast?.(t('runtime_account_created_toast', 'Account created! Let\'s set things up…'));
          setTimeout(() => { window.location.href = 'onboarding.html'; }, 700);
        })
        .catch((err) => {
          restore();
          window.S21_toast?.(err.message || 'Something went wrong. Please try again.');
        });
    });

    const accountDetailsForm = document.getElementById('account-details-form');
    if (accountDetailsForm) {
      fetch('/api/account/profile', { credentials: 'include' })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (!data?.user) return;
          document.getElementById('profile-name').value = data.user.name;
          document.getElementById('profile-email').value = data.user.email;
        })
        .catch(() => {});
    }
    accountDetailsForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!accountDetailsForm.checkValidity()) { accountDetailsForm.classList.add('was-validated'); return; }
      const btn = accountDetailsForm.querySelector('button[type="submit"]');
      const restore = withSpinner(btn, t('runtime_saving', 'Saving…'));
      try {
        const response = await fetch('/api/account/profile', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: document.getElementById('profile-name').value, email: document.getElementById('profile-email').value }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not save changes.');
        window.S21_toast?.(t('runtime_changes_saved_toast', 'Changes saved.'));
      } catch (error) { window.S21_toast?.(error.message); } finally { restore(); }
    });

    const updatePasswordForm = document.getElementById('update-password-form');
    updatePasswordForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!updatePasswordForm.checkValidity()) { updatePasswordForm.classList.add('was-validated'); return; }
      const btn = updatePasswordForm.querySelector('button[type="submit"]');
      const restore = withSpinner(btn, t('runtime_saving', 'Saving…'));
      try {
        const response = await fetch('/api/account/password', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: document.getElementById('profile-current-password').value, newPassword: document.getElementById('profile-new-password').value }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not update password.');
        window.S21_toast?.(t('runtime_password_updated_toast', 'Password updated.'));
        updatePasswordForm.reset();
      } catch (error) { window.S21_toast?.(error.message); } finally { restore(); }
    });
  });
})();
