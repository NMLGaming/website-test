/**
 * site-settings.js — Applies editable public settings to the Home page.
 * Database values are merged with local demo settings when available.
 */
(function () {
  'use strict';

  var fallback = {
    site_name: 'VIELIST',
    site_logo: 'VIELIST',
    logo_url: '',
    hero_logo_url: '',
    hero_title: 'Những người chơi',
    hero_highlight: 'được nhớ tên.',
    hero_lead: 'VIELIST lưu lại từng cuộc chiến, từng lần lên hạng và những cái tên làm nên lịch sử của cộng đồng Minecraft Việt Nam.',
    intro_title: 'Một mạng lưới dành cho những cái tên đáng nhớ.',
    intro_body: 'Theo dõi các server, khám phá những câu chuyện phía sau bảng xếp hạng và cùng xây dựng lịch sử Minecraft Việt Nam.',
    story_title: 'Mỗi trận đấu đều để lại dấu ấn.',
    story_body: 'Từ khoảnh khắc đầu tiên bước vào server đến ngày được xướng tên, VIELIST biến hành trình của người chơi thành một phần ký ức có thể tìm lại.',
    cta_title: 'Không chỉ là một con số.',
    cta_body: 'Tra cứu hồ sơ, xem thứ hạng và tìm hiểu câu chuyện phía sau mỗi player.',
    footer_text: '© 2026 VIELIST — Minecraft Leaderboard',
    primary_color: '#00d4ff',
    effects_enabled: 'true'
  };

  function text(id, value) {
    var el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  function imageUrl(value) {
    return typeof value === 'string' && /^(data:image\/|https?:\/\/|\/)/i.test(value) ? value : '';
  }

  function apply(settings) {
    settings = Object.assign({}, fallback, settings || {});
    var logo = imageUrl(settings.logo_url);
    var navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
      navLogo.textContent = '';
      if (logo) {
        var img = document.createElement('img');
        img.src = logo;
        img.alt = settings.site_name || 'VIELIST';
        img.className = 'nav-logo-image';
        navLogo.appendChild(img);
      } else {
        navLogo.textContent = settings.site_logo || settings.site_name || 'VIELIST';
      }
    }

    text('home-title-main', settings.hero_title);
    text('home-title-highlight', settings.hero_highlight);
    text('home-hero-lead', settings.hero_lead);
    text('home-intro-title', settings.intro_title);
    text('home-intro-body', settings.intro_body);
    text('home-story-title', settings.story_title);
    text('home-story-body', settings.story_body);
    text('home-cta-title', settings.cta_title);
    text('home-cta-body', settings.cta_body);
    text('site-footer-text', settings.footer_text);

    var heroLogo = imageUrl(settings.hero_logo_url);
    var sigil = document.getElementById('hero-logo-mark');
    if (sigil && heroLogo) {
      sigil.innerHTML = '<img class="hero-sigil-image" src="' + heroLogo.replace(/"/g, '&quot;') + '" alt="Logo VIELIST">';
      sigil.classList.add('has-image');
    }

    var customAvatar = imageUrl(settings.avatar_url);
    if (customAvatar) {
      document.querySelectorAll('.nav-avatar').forEach(function (avatar) {
        avatar.src = customAvatar;
      });
      document.querySelectorAll('.nav-avatar-fallback').forEach(function (fallbackEl) {
        var replacement = document.createElement('img');
        replacement.src = customAvatar;
        replacement.alt = '';
        replacement.className = 'nav-avatar';
        fallbackEl.replaceWith(replacement);
      });
    }

    if (settings.hero_banner_url && /^(https?:\/\/|\/|data:image\/)/i.test(settings.hero_banner_url)) {
      document.body.style.setProperty('--hero-banner', 'url("' + settings.hero_banner_url.replace(/"/g, '\\"') + '")');
      document.body.classList.add('has-hero-banner');
    }
    if (settings.primary_color) document.documentElement.style.setProperty('--cyan', settings.primary_color);
    if (settings.effects_enabled === 'false') document.body.classList.add('effects-disabled');
    document.dispatchEvent(new CustomEvent('vielist:settings', { detail: settings }));
  }

  fetch('/api/auth/data?resource=settings', { credentials: 'include' })
    .then(function (response) {
      if (!response.ok) return {};
      return response.text().then(function (raw) { return raw ? JSON.parse(raw) : {}; });
    })
    .catch(function () { return {}; })
    .then(function (remote) {
      var local = {};
      try { local = JSON.parse(localStorage.getItem('vielist_settings') || '{}'); } catch (_) {}
      apply(Object.assign({}, remote, local));
    });
})();