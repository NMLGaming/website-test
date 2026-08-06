/**
 * Public announcement renderer.
 * The editor lives in Admin; this page is intentionally read-only for visitors.
 */
(function () {
  'use strict';
  var grid = document.getElementById('announce-grid');
  if (!grid || typeof API === 'undefined') return;
  var count = document.getElementById('announcement-count');

  grid.innerHTML = [1, 2, 3].map(function () {
    return '<div class="glass-card skeleton-card"><div class="sk sk-title"></div><div class="sk sk-line"></div><div class="sk sk-line sk-line-sm"></div></div>';
  }).join('');

  API.getAnnouncements().then(function (items) {
    items = items || [];
    if (count) count.textContent = items.length + ' bài đăng trong kho lưu trữ';
    grid.innerHTML = items.length ? items.map(renderCard).join('') :
      '<div class="empty-state"><div class="empty-mark">—</div><h3>Chưa có thông báo</h3><p>Quay lại sau nhé.</p></div>';
    bindComments();
  }).catch(function (error) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-mark">!</div><h3>Không thể tải thông báo</h3><p>' + esc(error.message) + '</p></div>';
  });

  function renderCard(item) {
    var author = item.author || {};
    var border = safeColor(item.border_color, '#00d4ff');
    var background = safeColor(item.background_color, '#101827');
    var accent = safeColor(item.accent_color, '#00d4ff');
    var avatar = author.avatar && /^(https?:\/\/|\/|data:image\/)/i.test(author.avatar)
      ? '<img class="announce-author-avatar" src="' + esc(author.avatar) + '" alt="">'
      : '<span class="announce-author-avatar announce-author-fallback">' + esc((author.username || 'A').charAt(0).toUpperCase()) + '</span>';
    return '<article class="glass-card announce-card announce-card-rich" style="--announce-border:' + border + ';--announce-bg:' + background + ';--announce-accent:' + accent + '">' +
      '<header class="announce-card-header">' +
        '<div class="announce-author">' + avatar + '<div><strong>' + esc(author.username || 'VIELIST Admin') + '</strong><span>' + esc(author.role || 'Admin') + '</span></div></div>' +
        '<time datetime="' + esc(item.date || '') + '">' + esc(formatDate(item.date)) + '</time>' +
      '</header>' +
      '<div class="announce-card-title-row"><span class="announce-type-mark">' + esc(item.icon || '•') + '</span><div><span class="announce-badge badge-' + esc(item.type || 'news') + '">' + esc(typeLabel(item.type)) + '</span><h2>' + esc(item.title || '') + '</h2></div></div>' +
      '<div class="announce-rich-content">' + sanitizeHtml(item.content || '') + '</div>' +
      '<footer class="announce-card-footer"><span class="announce-accent-line"></span><button class="comment-toggle" data-id="' + esc(item.id) + '">Bình luận <span class="comment-count" data-count-for="' + esc(item.id) + '">0</span></button></footer>' +
      '<div class="comment-panel" data-comments-for="' + esc(item.id) + '" hidden><div class="comment-list"></div><form class="comment-form" data-id="' + esc(item.id) + '"><input name="content" maxlength="2000" placeholder="Viết bình luận…" required><button class="btn btn-primary btn-sm" type="submit">Gửi</button></form><p class="comment-login-note">Bạn cần đăng nhập Discord để bình luận.</p></div>' +
    '</article>';
  }

  function bindComments() {
    grid.querySelectorAll('.comment-toggle').forEach(function (button) {
      button.addEventListener('click', function () {
        var panel = grid.querySelector('[data-comments-for="' + cssEscape(button.dataset.id) + '"]');
        if (!panel) return;
        panel.hidden = !panel.hidden;
        if (!panel.hidden && !panel.dataset.loaded) loadComments(button.dataset.id, panel);
      });
    });
    grid.querySelectorAll('.comment-form').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var input = form.querySelector('input[name=content]');
        API.addAnnouncementComment(form.dataset.id, input.value).then(function () {
          input.value = '';
          var panel = form.closest('.comment-panel');
          loadComments(form.dataset.id, panel);
        }).catch(function (error) { window.showToast ? showToast(error.message, 'error') : alert(error.message); });
      });
    });
  }

  function loadComments(id, panel) {
    API.getAnnouncementComments(id).then(function (comments) {
      panel.dataset.loaded = 'true';
      var list = panel.querySelector('.comment-list');
      var countEl = grid.querySelector('[data-count-for="' + cssEscape(id) + '"]');
      if (countEl) countEl.textContent = comments.length;
      list.innerHTML = comments.length ? comments.map(function (comment) {
        return '<div class="comment-row"><span class="comment-avatar">' + esc((comment.username || 'D').charAt(0).toUpperCase()) + '</span><div><strong>' + esc(comment.username) + '</strong><p>' + esc(comment.content) + '</p></div></div>';
      }).join('') : '<p class="comment-empty">Chưa có bình luận nào.</p>';
    }).catch(function () {});
  }

  function typeLabel(type) { return ({ news: 'Tin tức', update: 'Update', maintenance: 'Bảo trì', event: 'Sự kiện' })[type] || 'Thông báo'; }
  function formatDate(value) {
    if (!value) return '';
    var date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function safeColor(value, fallback) { return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback; }
  function cssEscape(value) { return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
  function esc(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function sanitizeHtml(value) {
    var template = document.createElement('template');
    template.innerHTML = value;
    template.content.querySelectorAll('script,style,object,embed,form').forEach(function (node) { node.remove(); });
    template.content.querySelectorAll('*').forEach(function (node) {
      if (node.tagName === 'IFRAME') {
        var frameSrc = node.getAttribute('src') || '';
        if (!/^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/[A-Za-z0-9_-]+/i.test(frameSrc)) {
          node.replaceWith(document.createTextNode(''));
          return;
        }
        Array.from(node.attributes).forEach(function (attribute) { node.removeAttribute(attribute.name); });
        node.setAttribute('src', frameSrc);
        node.setAttribute('title', 'YouTube video');
        node.setAttribute('loading', 'lazy');
        node.setAttribute('allowfullscreen', '');
        return;
      }
      Array.from(node.attributes).forEach(function (attribute) {
        if (/^on/i.test(attribute.name) || (attribute.name === 'href' && !/^(https?:|mailto:|#)/i.test(attribute.value)) || (attribute.name === 'src' && !/^(https?:|data:image\/|data:image\/gif;|\/)/i.test(attribute.value))) node.removeAttribute(attribute.name);
      });
      if (node.tagName === 'A') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
    });
    return template.innerHTML;
  }
})();