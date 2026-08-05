/**
 * script.js — Shared logic across all pages.
 */

// ============================================================
// Nav: Mobile toggle
// ============================================================
(function () {
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', function () {
    const open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target)) {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  const nav = document.querySelector('nav');
})();

// ============================================================
// Scroll reveal — Home sections appear as the visitor discovers them.
// ============================================================
(function () {
  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (item) { item.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.13, rootMargin: '0px 0px -50px' });
  items.forEach(function (item) { observer.observe(item); });
})();

// ============================================================
// Nav: Highlight active link
// ============================================================
(function () {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('#nav-links a').forEach(function (a) {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === path) a.classList.add('active');
  });
})();

// ============================================================
// Page transition (fade out → navigate)
// ============================================================
(function () {
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('javascript')) return;
    if (a.target === '_blank') return;
    e.preventDefault();
    document.body.style.transition = 'opacity 0.18s ease';
    document.body.style.opacity = '0';
    setTimeout(function () { window.location.href = href; }, 190);
  });
})();

// ============================================================
// Back to top button
// ============================================================
(function () {
  const btn = document.getElementById('back-top');
  if (!btn) return;
  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// ============================================================
// Toast notification utility (global)
// ============================================================
window.showToast = function (msg, type) {
  type = type || 'success';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(function () {
    toast.style.transition = 'opacity 0.3s ease';
    toast.style.opacity = '0';
    setTimeout(function () { toast.remove(); }, 320);
  }, 3000);
};
