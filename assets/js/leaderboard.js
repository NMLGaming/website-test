/**
 * leaderboard.js — King leaderboard for IS7MC and KINGMC.
 * Player search and the old PvP board were intentionally removed from the product.
 */
(function () {
  'use strict';

  var server = window.LB_SERVER;
  if (!server) return;

  var kingWrap = document.getElementById('tab-king');
  if (!kingWrap) kingWrap = document.getElementById('king-board');
  if (!kingWrap) return;
  var isRoyalPage = server === 'kingmc' && document.getElementById('king-crown');

  var kingBoard = document.getElementById('board-king');
  if (!kingBoard) kingBoard = document.getElementById('king-board');
  var skHtml = buildSkeleton();
  if (kingBoard) kingBoard.innerHTML = skHtml;

  API.getLeaderboard(server).then(function (data) {
    var king = data.king || [];

    if (kingBoard) kingBoard.innerHTML = king.length ? buildBoard(king, 'Điểm King') : emptyState();
    if (isRoyalPage) renderCrown(king[0]);

    enableSearch('search-king', kingBoard, king, 'Điểm King');

  }).catch(function (e) {
    var errHtml = '<div class="empty-state"><div class="icon">⚠️</div><h3>Lỗi tải dữ liệu</h3><p>' + esc(e.message) + '</p></div>';
    if (kingBoard) kingBoard.innerHTML = errHtml;
  });

  /* ── Search / filter ── */
  function enableSearch(inputId, container, rows, scoreLabel) {
    var inp = document.getElementById(inputId);
    if (!inp) return;
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase();
      if (!q) {
        container.innerHTML = rows.length ? buildBoard(rows, scoreLabel) : emptyState();
        return;
      }
      var filtered = rows.filter(function (r) {
        return r.username && r.username.toLowerCase().indexOf(q) >= 0;
      });
      container.innerHTML = filtered.length ? buildBoard(filtered, scoreLabel) : noResult(q);
    });
  }

  /* ── Build leaderboard HTML ── */
  function buildBoard(rows, scoreLabel) {
    var html = '<div class="lb-board">';
    rows.forEach(function (p, i) {
      html += buildRow(p, scoreLabel);
    });
    html += '</div>';
    return html;
  }

  function buildRow(p, scoreLabel) {
    var rank       = p.rank || (p.id ? p.id : 0);
    var badgeCls   = rank === 1 ? 'badge-gold' : rank === 2 ? 'badge-silver' : rank === 3 ? 'badge-bronze' : 'badge-normal';
    var avatarUrl  = API.getAvatarUrl(p.username);
    var fallback   = API.getFallbackAvatar();
    var score      = Number(p.score || 0).toLocaleString('vi-VN');

    return '<div class="lb-row ' + (rank <= 3 ? 'lb-row--top' + rank : '') + '">' +
      '<div class="lb-badge ' + badgeCls + '">' +
        '<span class="lb-rank-num">' + rank + '</span>' +
        '<img class="lb-avatar" src="' + avatarUrl + '" alt="" onerror="this.src=\'' + fallback + '\'" />' +
      '</div>' +
      '<div class="lb-player">' +
        '<span class="lb-name">' + esc(p.username) + '</span>' +
      '</div>' +
      '<div class="lb-score">' +
        '<span class="lb-score-val">' + score + '</span>' +
        '<span class="lb-score-lbl">' + esc(scoreLabel) + '</span>' +
      '</div>' +
    '</div>';
  }

  function emptyState() {
    return '<div class="empty-state"><div class="icon">🏆</div><h3>Chưa có dữ liệu</h3><p>Chưa có người chơi nào.</p></div>';
  }

  function noResult(q) {
    return '<div class="empty-state"><div class="icon">🔍</div><h3>Không tìm thấy</h3><p>Không có player tên "<strong>' + esc(q) + '</strong>".</p></div>';
  }

  function buildSkeleton() {
    var rows = '';
    for (var i = 0; i < 5; i++) {
      rows += '<div class="lb-row skeleton-row">' +
        '<div class="lb-badge badge-normal"><div class="sk sk-rank"></div><div class="sk sk-av"></div></div>' +
        '<div class="lb-player"><div class="sk sk-name"></div></div>' +
        '<div class="lb-score"><div class="sk sk-score"></div></div>' +
      '</div>';
    }
    return '<div class="lb-board">' + rows + '</div>';
  }

  function renderCrown(king) {
    var nameEl = document.getElementById('king-name');
    var scoreEl = document.getElementById('king-score');
    var avatarEl = document.getElementById('king-avatar');
    if (!nameEl || !king) return;
    nameEl.textContent = king.username || 'Chưa có nhà vua';
    scoreEl.textContent = Number(king.score || 0).toLocaleString('vi-VN') + ' KING POINTS';
    avatarEl.src = API.getAvatarUrl(king.username);
    avatarEl.onerror = function () { this.src = API.getFallbackAvatar(); };
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
