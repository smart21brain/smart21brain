/* Smart21Brain — dashboard.js
   Loads the signed-in user's session info and applies it to the
   welcome banner: their uploaded profile photo (falling back to the
   placeholder image if they haven't set one) and their real name. */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const avatarImg = document.getElementById('dash-avatar-img');
    const heading = document.getElementById('dash-welcome-heading');

    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        const user = data && data.user;
        if (!user) return;
        if (avatarImg && user.avatar_key) {
          avatarImg.src = `/api/avatar/${encodeURIComponent(user.id)}`;
        }
        if (avatarImg && user.name) {
          avatarImg.alt = `${user.name}'s profile picture`;
        }
        if (heading && user.name) {
          heading.textContent = `Welcome back, ${user.name}! 👋`;
        }
      })
      .catch(() => { /* not signed in, or offline — keep the defaults */ });
  });
})();
