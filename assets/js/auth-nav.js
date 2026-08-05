/**
 * auth-nav.js — Discord auth state in the shared navbar.
 * Loaded on every public page. Calls /api/auth/me and renders:
 *   - "Login with Discord" button (if not authenticated)
 *   - Avatar + username + dropdown menu (if authenticated)
 *
 * Dashboard link in dropdown only shows for OWNER (role check from server).
 * Discord ID / Owner ID are NEVER in this file — role comes from the server.
 */

(function () {
  'use strict';

  var container = document.getElementById('nav-auth');
  if (!container) return;

  // Show skeleton while loading
  container.innerHTML = '<div class="nav-auth-ghost"></div>';

  fetch('/api/auth/me', { credentials: 'include' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.authenticated) {
        renderLogin();
      } else {
        renderUser(data);
      }
    })
    .catch(function () {
      renderLogin();
    });

  function renderLogin() {
    container.innerHTML = '<a href="/api/auth/discord" class="btn-discord">Đăng nhập Discord <span aria-hidden="true">↗</span></a>';
  }

  function renderUser(user) {
    var isOwner = user.role === 'OWNER';
    var name    = esc(user.username);
    var avatar  = user.avatar
      ? '<img src="' + esc(user.avatar) + '" alt="" class="nav-avatar" onerror="this.style.display=\'none\'">'
      : '<div class="nav-avatar-fallback">' + name.charAt(0).toUpperCase() + '</div>';

    container.innerHTML =
      '<div class="nav-user" id="nav-user-wrap">' +
        '<button class="nav-user-btn" id="nav-user-btn" aria-expanded="false" aria-haspopup="true">' +
          avatar +
          '<span class="nav-username">' + name + '</span>' +
          '<svg class="nav-caret" viewBox="0 0 10 6" aria-hidden="true">' +
            '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="nav-dropdown" id="nav-dropdown" role="menu">' +
          '<a href="/player" class="nav-dd-item" role="menuitem">Hồ sơ player</a>' +
          (isOwner ? '<a href="/admin" class="nav-dd-item" role="menuitem">Admin Dashboard</a>' : '') +
          '<hr class="nav-dd-sep"/>' +
          '<button class="nav-dd-item nav-dd-logout" id="nav-logout-btn" role="menuitem">Đăng xuất</button>' +
        '</div>' +
      '</div>';

    // Toggle dropdown
    var btn      = document.getElementById('nav-user-btn');
    var dropdown = document.getElementById('nav-dropdown');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dropdown.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function () {
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });

    // Logout
    document.getElementById('nav-logout-btn').addEventListener('click', function () {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .then(function () { window.location.href = '/'; })
        .catch(function () { window.location.href = '/'; });
    });
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
