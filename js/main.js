/* Smart21Brain — Main JS
   Global behaviours shared across every page. */
(function () {
  document.addEventListener('DOMContentLoaded', () => {

    /* AOS animations */
    if (window.AOS) {
      AOS.init({ duration: 650, once: true, offset: 60, easing: 'ease-out-cubic' });
    }

    /* Sticky navbar shadow on scroll */
    const navbar = document.querySelector('.s21-navbar');
    const backToTop = document.querySelector('.fab.top');
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (navbar) navbar.style.boxShadow = y > 12 ? '0 6px 20px rgba(0,0,0,.08)' : 'none';
      if (backToTop) backToTop.classList.toggle('show', y > 480);
    }, { passive: true });

    backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* Animated counters (data-count="1200") */
    const counters = document.querySelectorAll('[data-count]');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const duration = 1200;
        const start = performance.now();
        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          el.textContent = Math.floor(progress * target).toLocaleString();
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target.toLocaleString() + (el.dataset.suffix || '');
        }
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => counterObserver.observe(c));

    /* Favorites (heart buttons) — persisted to localStorage */
    const FAV_KEY = 's21-favorites';
    const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; } };
    function favToast(added) {
      const key = added ? 'runtime_added_to_favorites_toast' : 'runtime_removed_from_favorites_toast';
      const fallback = added ? 'Added to favourites.' : 'Removed from favourites.';
      window.S21_toast?.(window.S21_t ? window.S21_t(key) : fallback, { icon: added ? 'fa-heart' : 'fa-heart-crack' });
    }
    document.querySelectorAll('[data-fav-id]').forEach((btn) => {
      const id = btn.dataset.favId;
      if (getFavs().includes(id)) btn.classList.add('is-fav');
      btn.addEventListener('click', () => {
        let favs = getFavs();
        let added;
        if (favs.includes(id)) { favs = favs.filter((f) => f !== id); btn.classList.remove('is-fav'); added = false; }
        else { favs.push(id); btn.classList.add('is-fav'); added = true; }
        localStorage.setItem(FAV_KEY, JSON.stringify(favs));
        btn.classList.remove('is-popping');
        void btn.offsetWidth; // restart the pop animation even on rapid re-clicks
        btn.classList.add('is-popping');
        favToast(added);
      });
    });

    /* Scroll-to-reader button (book.html) */
    document.getElementById('reader-scroll-btn')?.addEventListener('click', () => {
      document.getElementById('reader-scroll-target')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* Contact form — EmailJS-ready placeholder.
       Swap the setTimeout below for a real emailjs.sendForm() call once
       EmailJS is initialized with your own Public Key on the page. */
    document.getElementById('contact-form')?.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!this.checkValidity()) { this.classList.add('was-validated'); return; }
      const status = document.getElementById('contact-form-status');
      const btn = this.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = original;
        status.textContent = window.S21_t ? window.S21_t('runtime_demo_form_notice') : "Thanks — this demo form doesn't send yet. Connect EmailJS to go live.";
        this.reset();
        this.classList.remove('was-validated');
      }, 900);
    });

    /* Newsletter form (placeholder — wire to real ESP later) */
    document.querySelectorAll('.newsletter-form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { btn.innerHTML = original; form.reset(); }, 1800);
      });
    });

  });
})();
