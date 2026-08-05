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
    container.innerHTML =
      '<a href="/api/auth/discord" class="btn-discord">' +
        '<svg class="discord-icon" viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z"/>' +
        '</svg>' +
        'Login with Discord' +
      '</a>';
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
          '<a href="/player" class="nav-dd-item" role="menuitem">👤 Profile</a>' +
          (isOwner ? '<a href="/admin" class="nav-dd-item" role="menuitem">🛡️ Dashboard</a>' : '') +
          '<hr class="nav-dd-sep"/>' +
          '<button class="nav-dd-item nav-dd-logout" id="nav-logout-btn" role="menuitem">🚪 Đăng xuất</button>' +
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
