/* Smart21Brain — library.js
   A self-contained online book reader: page navigation, zoom, font size,
   bookmarking and search-within-book, all persisted to localStorage. */
(function () {
  const FONT_MIN = 14, FONT_MAX = 26, FONT_STEP = 2;
  const ZOOM_MIN = 80, ZOOM_MAX = 140, ZOOM_STEP = 10;

  const PAGES = [
    { heading: 'Chapter 1 — A New Discovery', text: 'The sun had barely risen over the savanna when Amara found the strange, glowing stone near the acacia tree. It was smooth, cool to the touch, and pulsed faintly like a heartbeat. She had never seen anything like it in all her nine years exploring these fields with her grandfather.' },
    { heading: 'Chapter 1 — A New Discovery', text: '"Babu, look what I found!" she called, running toward the old man sitting beneath the tree\'s wide shade. He took the stone carefully, turning it over in his weathered hands, and his eyes widened with something between wonder and worry.' },
    { heading: 'Chapter 2 — The Old Map', text: 'That evening, Babu pulled a rolled parchment from beneath his bed — a map older than the village itself, marked with symbols Amara had never seen. "This stone," he said slowly, "belongs to a story I have been waiting to tell you."' },
    { heading: 'Chapter 2 — The Old Map', text: 'He traced a path across the map with his finger, from the baobab forest to the river bend, ending at a symbol shaped like a rising sun. "Every twenty-one years, the brain-light appears to remind us that curiosity is the beginning of everything worth knowing."' },
    { heading: 'Chapter 3 — Into the Forest', text: 'The next morning, with her satchel packed and the stone wrapped safely in cloth, Amara set off along the path from the map. The forest was louder than she expected — birds calling, leaves rustling, and somewhere far off, the low rumble of the river.' },
    { heading: 'Chapter 3 — Into the Forest', text: 'She was not walking alone for long. A small, quick-footed dik-dik crossed her path and seemed to wait for her, glancing back every few steps as though it, too, knew exactly where they were going.' },
  ];

  let currentPage = 0;
  let fontSize = 18;
  let zoom = 100;
  const BOOK_ID = document.querySelector('.reader-shell')?.dataset.bookId || 'solar-system-storybook';
  const BOOKMARK_KEY = `s21-bookmark-${BOOK_ID}`;

  function $(id) { return document.getElementById(id); }

  function escapeRegExp(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function renderPage(highlight) {
    const page = PAGES[currentPage];
    const area = $('reader-page-area');
    let text = page.text;
    if (highlight) {
      const re = new RegExp(`(${escapeRegExp(highlight)})`, 'ig');
      text = text.replace(re, '<mark>$1</mark>');
    }
    area.innerHTML = `<h2>${page.heading}</h2><p>${text}</p>`;
    area.style.fontSize = fontSize + 'px';
    area.style.transform = `scale(${zoom / 100})`;
    area.style.transformOrigin = 'top left';

    $('reader-page-indicator').textContent = `Page ${currentPage + 1} of ${PAGES.length}`;
    $('reader-prev').disabled = currentPage === 0;
    $('reader-next').disabled = currentPage === PAGES.length - 1;

    const progressPct = Math.round(((currentPage + 1) / PAGES.length) * 100);
    const progressBar = $('reader-progress-bar');
    if (progressBar) progressBar.style.width = progressPct + '%';

    updateBookmarkButton();
  }

  function updateBookmarkButton() {
    const btn = $('reader-bookmark');
    if (!btn) return;
    const saved = localStorage.getItem(BOOKMARK_KEY);
    btn.classList.toggle('is-active', saved !== null && parseInt(saved, 10) === currentPage);
  }

  function goTo(pageIndex) {
    currentPage = Math.max(0, Math.min(PAGES.length - 1, pageIndex));
    renderPage();
    $('reader-page-area').scrollTop = 0;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('reader-page-area')) return; // not on a reader page

    // Resume from bookmark if present
    const saved = localStorage.getItem(BOOKMARK_KEY);
    if (saved !== null) currentPage = Math.max(0, Math.min(PAGES.length - 1, parseInt(saved, 10)));
    renderPage();

    $('reader-prev')?.addEventListener('click', () => goTo(currentPage - 1));
    $('reader-next')?.addEventListener('click', () => goTo(currentPage + 1));

    $('reader-font-up')?.addEventListener('click', () => {
      fontSize = Math.min(FONT_MAX, fontSize + FONT_STEP);
      renderPage();
    });
    $('reader-font-down')?.addEventListener('click', () => {
      fontSize = Math.max(FONT_MIN, fontSize - FONT_STEP);
      renderPage();
    });

    $('reader-zoom-in')?.addEventListener('click', () => {
      zoom = Math.min(ZOOM_MAX, zoom + ZOOM_STEP);
      renderPage();
    });
    $('reader-zoom-out')?.addEventListener('click', () => {
      zoom = Math.max(ZOOM_MIN, zoom - ZOOM_STEP);
      renderPage();
    });

    $('reader-bookmark')?.addEventListener('click', () => {
      const btn = $('reader-bookmark');
      const saved = localStorage.getItem(BOOKMARK_KEY);
      if (saved !== null && parseInt(saved, 10) === currentPage) {
        localStorage.removeItem(BOOKMARK_KEY);
      } else {
        localStorage.setItem(BOOKMARK_KEY, String(currentPage));
      }
      updateBookmarkButton();
    });

    $('reader-fullscreen')?.addEventListener('click', () => {
      const shell = document.querySelector('.reader-shell');
      if (!document.fullscreenElement) shell.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    $('reader-search-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const term = $('reader-search-input').value.trim();
      if (!term) { renderPage(); return; }
      const foundIndex = PAGES.findIndex((p) => p.text.toLowerCase().includes(term.toLowerCase()));
      if (foundIndex === -1) {
        $('reader-search-status').textContent = `No matches for "${term}".`;
        return;
      }
      currentPage = foundIndex;
      renderPage(term);
      $('reader-search-status').textContent = `Found on page ${foundIndex + 1}.`;
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!document.activeElement || document.activeElement.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') goTo(currentPage + 1);
      if (e.key === 'ArrowLeft') goTo(currentPage - 1);
    });
  });
})();
