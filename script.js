/**
 * script.js — Logic dùng chung cho tất cả các trang.
 */

// ============================================================
// Hamburger menu (mobile)
// ============================================================
(function initMobileMenu() {
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', function () {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen.toString());
  });

  // Đóng menu khi bấm ra ngoài
  document.addEventListener('click', function (e) {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

// ============================================================
// Đánh dấu link đang active dựa trên URL hiện tại
// ============================================================
(function highlightActiveNav() {
  const path   = window.location.pathname.replace(/\/$/, '') || '/';
  const anchors = document.querySelectorAll('#nav-links a');

  anchors.forEach(function (a) {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === path) {
      a.classList.add('active');
    }
  });
})();

// ============================================================
// Chuyển trang mượt (fade-out trước khi navigate)
// ============================================================
(function smoothPageTransition() {
  document.querySelectorAll('a[href]').forEach(function (a) {
    const href = a.getAttribute('href');
    // Bỏ qua các liên kết ngoài hoặc anchor
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;

    a.addEventListener('click', function (e) {
      e.preventDefault();
      document.body.style.transition = 'opacity 0.2s ease';
      document.body.style.opacity   = '0';
      setTimeout(function () {
        window.location.href = href;
      }, 200);
    });
  });
})();
