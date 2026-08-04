/**
 * announcements.js — Renders the announcement cards on the Home page.
 */

(async function () {
  const grid = document.getElementById('announce-grid');
  if (!grid) return;

  // Show skeleton while loading
  grid.innerHTML = [1,2,3].map(function () {
    return '<div class="skeleton-card glass-card">' +
      '<div class="skeleton sk-title"></div>' +
      '<div class="skeleton sk-date"></div>' +
      '<div class="skeleton sk-line"></div>' +
      '<div class="skeleton sk-line-sm"></div>' +
    '</div>';
  }).join('');

  // Artificial delay so the skeleton is visible
  await new Promise(function (r) { setTimeout(r, 500); });

  var items;
  try {
    items = await API.getAnnouncements();
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Không thể tải thông báo</h3><p>Vui lòng thử lại sau.</p></div>';
    return;
  }

  if (!items || items.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Chưa có thông báo</h3><p>Quay lại sau nhé!</p></div>';
    return;
  }

  grid.innerHTML = items.map(function (item, i) {
    return renderCard(item, i);
  }).join('');
})();

function renderCard(item) {
  var type  = item.type || 'news';
  var badge = { update: 'Update', maintenance: 'Bảo trì', event: 'Sự kiện', news: 'Tin tức' }[type] || type;
  var date  = item.date ? new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  return '<div class="announce-card type-' + type + '">' +
    '<div class="announce-header">' +
      '<span class="announce-icon">' + (item.icon || '📢') + '</span>' +
      '<div class="announce-meta">' +
        '<div class="title">' + escapeHtml(item.title) + '</div>' +
        '<div class="date">' + date + '</div>' +
      '</div>' +
      '<span class="announce-badge badge-' + type + '">' + badge + '</span>' +
    '</div>' +
    '<p class="announce-content">' + escapeHtml(item.content) + '</p>' +
  '</div>';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
