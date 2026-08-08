// ============ ACCORDION ============
function toggleAccordion(btn) {
  const body = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');
  btn.classList.toggle('open');
  if (isOpen) {
    body.classList.remove('open');
  } else {
    body.classList.add('open');
  }
}

// ============ PATTERN FILTER ============
const filterBtns = document.querySelectorAll('.filter-btn');
const patternCards = document.querySelectorAll('.pattern-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    patternCards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = 'block';
        card.style.animation = 'fadeIn 0.2s ease';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

// ============ THEME TOGGLE ============
// (initial theme is set synchronously in an inline <head> script to avoid a flash;
// this just wires up the switch + persists the choice)
const themeToggle = document.querySelector('.theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeToggle.setAttribute('aria-pressed', String(next === 'light'));
  });
  themeToggle.setAttribute('aria-pressed', String(document.documentElement.getAttribute('data-theme') === 'light'));
}

// ============ MOBILE NAV ============
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// ============ SCROLL REVEAL ============
const reveals = document.querySelectorAll('.section-header, .page-header, .pattern-card, .company-card, .week-card, .accordion, .spring-topic, .final-res-card, .nav-card, .res-card');
reveals.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.07 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ============ FADE-IN KEYFRAME ============
const style = document.createElement('style');
style.textContent = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);

// ============ GLOBAL SEARCH (always-visible nav bar) ============
(function () {
  if (typeof SEARCH_INDEX === 'undefined') return; // search-data.js not loaded on this page

  const CURRENT_PAGE = (location.pathname.split('/').pop() || 'index.html');
  const TYPE_LABEL = { page: 'Page', topic: 'Topic', resource: 'Resource' };
  let activeIndex = -1;
  let currentResults = [];

  const navEl = document.querySelector('.nav');
  if (!navEl) return;

  // --- inject the always-visible search bar as its own row below the
  //     logo/links row, so it never competes with nav-links for space ---
  const row = document.createElement('div');
  row.className = 'nav-search-row';
  row.innerHTML = `
    <div class="nav-search-bar">
      <span class="nav-search-icon">🔍</span>
      <input type="text" class="nav-search-input" placeholder="Search patterns, topics, problems, resources…" autocomplete="off" spellcheck="false" aria-label="Search this site">
      <span class="nav-search-key">/</span>
      <div class="nav-search-dropdown"><div class="search-results"></div></div>
    </div>
  `;
  navEl.appendChild(row);
  const bar = row.querySelector('.nav-search-bar');
  const input = row.querySelector('.nav-search-input');
  const resultsEl = row.querySelector('.search-results');

  function openDropdown() { bar.classList.add('open'); }
  function closeDropdown() { bar.classList.remove('open'); activeIndex = -1; }

  input.addEventListener('focus', () => { if (input.value.trim()) openDropdown(); });
  document.addEventListener('click', (e) => {
    if (!bar.contains(e.target)) closeDropdown();
  });
  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === '/' && !typing) {
      e.preventDefault();
      input.focus();
      input.select();
    } else if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      closeDropdown();
      input.blur();
    } else if (bar.classList.contains('open') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      if (!currentResults.length) return;
      activeIndex = e.key === 'ArrowDown'
        ? Math.min(activeIndex + 1, currentResults.length - 1)
        : Math.max(activeIndex - 1, 0);
      highlightActive();
    } else if (bar.classList.contains('open') && e.key === 'Enter') {
      if (activeIndex >= 0 && currentResults[activeIndex]) goToResult(currentResults[activeIndex]);
      else if (currentResults[0]) goToResult(currentResults[0]);
    }
  });

  function highlightActive() {
    resultsEl.querySelectorAll('.search-result').forEach((el, i) => {
      el.classList.toggle('active', i === activeIndex);
    });
    const activeEl = resultsEl.querySelector('.search-result.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function scoreEntry(q, e) {
    const t = e.t.toLowerCase();
    const s = (e.s || '').toLowerCase();
    if (t === q) return 100;
    if (t.startsWith(q)) return 90;
    if (t.includes(q)) return 70;
    if (s.includes(q)) return 40;
    return 0;
  }

  function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX
      .map((e) => ({ e, score: scoreEntry(q, e) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.t.length - b.e.t.length)
      .slice(0, 9)
      .map((x) => x.e);
  }

  function pageTitle(p) {
    return p.replace('.html', '');
  }

  function renderResults(results) {
    currentResults = results;
    activeIndex = -1;
    if (!input.value.trim()) {
      resultsEl.innerHTML = '<div class="search-empty">Type to search patterns, LLD/HLD topics, problems, and curated resources across the whole site.</div>';
      closeDropdown();
      return;
    }
    openDropdown();
    if (!results.length) {
      resultsEl.innerHTML = '<div class="search-empty">No matches. Try a shorter or different term.</div>';
      return;
    }
    resultsEl.innerHTML = '';
    results.forEach((r) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'search-result';
      const sub = r.ty === 'resource'
        ? `Found in ${r.s}`
        : (r.ty === 'page' ? r.s : `${r.s} · ${pageTitle(r.p)}`);
      row.innerHTML = `
        <span class="search-result-badge ${r.ty}">${TYPE_LABEL[r.ty]}</span>
        <span class="search-result-body">
          <span class="search-result-title">${r.t}</span>
          <span class="search-result-sub">${sub}</span>
        </span>
        <span class="search-result-go">↵</span>
      `;
      row.addEventListener('click', () => goToResult(r));
      resultsEl.appendChild(row);
    });
  }

  function scrollToAndHighlight(id) {
    const el = document.getElementById(id);
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('search-target-highlight');
      setTimeout(() => el.classList.remove('search-target-highlight'), 3300);
    }, 60);
  }

  function goToResult(entry) {
    closeDropdown();
    input.blur();
    if (entry.p === CURRENT_PAGE) {
      if (entry.id) {
        history.pushState(null, '', '#' + entry.id);
        scrollToAndHighlight(entry.id);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      window.location.href = entry.p + (entry.id ? '#' + entry.id : '');
    }
  }

  input.addEventListener('input', () => renderResults(search(input.value)));

  // land-and-highlight when arriving via a search link (#id in the URL)
  if (location.hash) {
    scrollToAndHighlight(location.hash.slice(1));
  }
})();
