/**
 * leaderboard.js — Renders leaderboard tables.
 * Expects: window.LB_SERVER = 'is7mc' | 'kingmc'
 */

(async function () {
  const server = window.LB_SERVER;
  if (!server) return;

  const pvpWrap  = document.getElementById('lb-pvp');
  const kingWrap = document.getElementById('lb-king');

  const skHtml = buildSkeleton();
  if (pvpWrap)  pvpWrap.innerHTML  = skHtml;
  if (kingWrap) kingWrap.innerHTML = skHtml;

  await new Promise(function (r) { setTimeout(r, 600); });

  let data;
  try {
    data = await API.getLeaderboard(server);
  } catch (e) {
    const err = '<div class="empty-state"><div class="icon">⚠️</div><h3>Lỗi tải dữ liệu</h3><p>' + e.message + '</p></div>';
    if (pvpWrap)  pvpWrap.innerHTML  = err;
    if (kingWrap) kingWrap.innerHTML = err;
    return;
  }

  if (pvpWrap)  pvpWrap.innerHTML  = buildTable(data.pvp  || [], 'Điểm PvP');
  if (kingWrap) kingWrap.innerHTML = buildTable(data.king || [], 'Điểm King');
})();

function buildTable(rows, scoreLabel) {
  if (!rows.length) {
    return '<div class="empty-state"><div class="icon">🏆</div><h3>Chưa có dữ liệu</h3></div>';
  }

  const thead = '<thead><tr><th>#</th><th>Người chơi</th><th>' + scoreLabel + '</th></tr></thead>';

  const tbody = '<tbody>' + rows.map(function (p) {
    const rankClass  = p.rank <= 3 ? ' rank-' + p.rank : '';
    const badgeClass = p.rank <= 3 ? 'r' + p.rank : 'rn';
    const avatar     = API.getAvatarUrl(p.username);
    return '<tr class="' + rankClass + '">' +
      '<td><span class="rank-badge ' + badgeClass + '">' + p.rank + '</span></td>' +
      '<td><div class="player-cell">' +
        '<img class="player-avatar" src="' + avatar + '" alt="" ' +
             'onerror="this.src=\'' + API.getFallbackAvatar() + '\'">' +
        '<span class="player-name">' + esc(p.username) + '</span>' +
      '</div></td>' +
      '<td class="score-cell">' + Number(p.score).toLocaleString('vi-VN') + '</td>' +
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

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
