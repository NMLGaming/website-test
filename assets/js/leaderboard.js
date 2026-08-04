/**
 * leaderboard.js — Renders PvP and King leaderboard tables.
 * Expects: window.LB_SERVER = 'is7mc' | 'kingmc'
 */

(async function () {
  var server = window.LB_SERVER;
  if (!server) return;

  var pvpWrap  = document.getElementById('lb-pvp');
  var kingWrap = document.getElementById('lb-king');

  // Skeleton
  var skeletonHtml = buildSkeleton();
  if (pvpWrap)  pvpWrap.innerHTML  = skeletonHtml;
  if (kingWrap) kingWrap.innerHTML = skeletonHtml;

  await new Promise(function (r) { setTimeout(r, 600); });

  var data;
  try {
    data = await API.getLeaderboard(server);
  } catch (e) {
    var err = '<div class="empty-state"><div class="icon">⚠️</div><h3>Lỗi tải dữ liệu</h3></div>';
    if (pvpWrap)  pvpWrap.innerHTML  = err;
    if (kingWrap) kingWrap.innerHTML = err;
    return;
  }

  if (pvpWrap)  pvpWrap.innerHTML  = buildTable(data.pvp,  'Điểm PvP');
  if (kingWrap) kingWrap.innerHTML = buildTable(data.king, 'Điểm King');
})();

function buildTable(rows, scoreLabel) {
  if (!rows || rows.length === 0) {
    return '<div class="empty-state"><div class="icon">🏆</div><h3>Chưa có dữ liệu</h3></div>';
  }

  var thead = '<thead><tr>' +
    '<th>#</th><th>Người chơi</th><th>' + scoreLabel + '</th>' +
  '</tr></thead>';

  var tbody = '<tbody>' + rows.map(function (p) {
    var rankClass = p.rank <= 3 ? ' rank-' + p.rank : '';
    var badgeClass = p.rank <= 3 ? 'r' + p.rank : 'rn';
    var avatar = API.getAvatarUrl(p.username);

    return '<tr class="' + rankClass + '">' +
      '<td><span class="rank-badge ' + badgeClass + '">' + p.rank + '</span></td>' +
      '<td>' +
        '<div class="player-cell">' +
          '<img class="player-avatar" src="' + avatar + '" alt="' + p.username + '" ' +
               'onerror="this.src=\'' + API.getFallbackAvatar() + '\'">' +
          '<span class="player-name">' + escapeHtml(p.username) + '</span>' +
        '</div>' +
      '</td>' +
      '<td class="score-cell">' + p.score.toLocaleString('vi-VN') + '</td>' +
    '</tr>';
  }).join('') + '</tbody>';

  return '<div class="lb-table-wrap"><table class="lb-table">' + thead + tbody + '</table></div>';
}

function buildSkeleton() {
  return '<div class="lb-table-wrap">' +
    [1,2,3,4,5].map(function () {
      return '<div class="skeleton-row">' +
        '<div class="skeleton sk-rank"></div>' +
        '<div class="skeleton sk-avatar"></div>' +
        '<div class="skeleton sk-name"></div>' +
        '<div class="skeleton sk-score"></div>' +
      '</div>';
    }).join('') +
  '</div>';
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
