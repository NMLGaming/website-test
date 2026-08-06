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
    .then(function (r) {
      return r.text().then(function (raw) {
        var data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
        if (!r.ok) throw new Error(data.error || raw || ('HTTP ' + r.status));
        return data;
      });
    })
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
           (isOwner ? '<a href="/admin" class="nav-dd-item" role="menuitem">ADMIN Dashboard</a>' : '') +
          '<a href="https://discord.com" target="_blank" rel="noopener" class="nav-dd-item nav-dd-discord" data-nav-discord hidden role="menuitem"><span class="nav-dd-discord-copy"><strong>Bạn chưa tham gia Discord</strong><small>Join Discord</small></span></a>' +
          '<hr class="nav-dd-sep"/>' +
          '<button class="nav-dd-item nav-dd-logout" id="nav-logout-btn" role="menuitem">Đăng xuất</button>' +
        '</div>' +
      '</div>';

    // An Owner can optionally set a custom site avatar from Admin > Settings.
    // Discord remains the default source when no custom avatar was uploaded.
    var customAvatar = '';
    var localSettings = {};
    try {
      localSettings = JSON.parse(localStorage.getItem('vielist_settings') || '{}');
      customAvatar = localSettings.avatar_url || '';
    } catch (_) {}
    if (customAvatar && /^(data:image\/|https?:\/\/|\/)/i.test(customAvatar)) {
      var custom = document.querySelector('#nav-user-btn .nav-avatar, #nav-user-btn .nav-avatar-fallback');
      if (custom) {
        if (custom.tagName === 'IMG') custom.src = customAvatar;
        else custom.outerHTML = '<img src="' + esc(customAvatar) + '" alt="" class="nav-avatar">';
      }
    }
    var discordItem = document.querySelector('[data-nav-discord]');
    if (discordItem) {
      discordItem.href = localSettings.discord_link || 'https://discord.com';
      discordItem.hidden = localSettings.join_discord_enabled === 'false';
    }

    document.addEventListener('vielist:settings', function (event) {
      var value = event.detail && event.detail.avatar_url;
      if (!value || !/^(data:image\/|https?:\/\/|\/)/i.test(value)) return;
      document.querySelectorAll('#nav-user-btn .nav-avatar').forEach(function (avatar) {
        avatar.src = value;
      });
      document.querySelectorAll('#nav-user-btn .nav-avatar-fallback').forEach(function (fallbackEl) {
        fallbackEl.outerHTML = '<img src="' + esc(value) + '" alt="" class="nav-avatar">';
      });
      var discord = document.querySelector('[data-nav-discord]');
      if (discord) {
        discord.href = event.detail.discord_link || 'https://discord.com';
        discord.hidden = event.detail.join_discord_enabled === 'false';
      }
    });

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
