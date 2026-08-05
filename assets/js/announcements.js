/**
 * announcements.js — Renders announcement cards on the Home page.
 * Reads from /api/announcements (API falls back to JSON if no DB).
 */

(async function () {
  const grid = document.getElementById('announce-grid');
  if (!grid) return;

  // Skeleton
  grid.innerHTML = [1,2,3].map(function () {
    return '<div class="skeleton-card glass-card">' +
      '<div class="skeleton sk-title"></div>' +
      '<div class="skeleton sk-date"></div>' +
      '<div class="skeleton sk-line"></div>' +
      '<div class="skeleton sk-line-sm"></div>' +
    '</div>';
  }).join('');

  await new Promise(function (r) { setTimeout(r, 500); });

  let items;
  try {
    items = await API.getAnnouncements();
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div>' +
      '<h3>Không thể tải thông báo</h3><p>Vui lòng thử lại sau.</p></div>';
    return;
  }

  if (!items || !items.length) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">📭</div>' +
      '<h3>Chưa có thông báo</h3><p>Quay lại sau nhé!</p></div>';
    return;
  }

  grid.innerHTML = items.map(function (item, i) {
    return renderCard(item);
  }).join('');
})();

function renderCard(item) {
  const type  = item.type || 'news';
  const badge = { update:'Update', maintenance:'Bảo trì', event:'Sự kiện', news:'Tin tức' }[type] || type;
  const date  = item.date
    ? new Date(item.date).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '';
  const pin   = item.pinned ? '<span style="margin-left:4px">📌</span>' : '';

  return '<div class="announce-card type-' + type + '">' +
    '<div class="announce-header">' +
      '<span class="announce-icon">' + esc(item.icon || '📢') + '</span>' +
      '<div class="announce-meta">' +
        '<div class="title">' + esc(item.title) + pin + '</div>' +
        '<div class="date">' + date + '</div>' +
      '</div>' +
      '<span class="announce-badge badge-' + type + '">' + badge + '</span>' +
    '</div>' +
    '<p class="announce-content">' + esc(item.content) + '</p>' +
  '</div>';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
