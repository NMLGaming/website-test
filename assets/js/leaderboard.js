/**
 * leaderboard.js — Bảng xếp hạng phong cách Royal Domain
 * Yêu cầu: window.LB_SERVER = 'is7mc' | 'kingmc'
 *
 * Tính năng:
 *  - Tabs: Top PvP / King
 *  - Ô tìm kiếm lọc real-time
 *  - Badge nổi bật cho top 3 (gold/silver/bronze)
 *  - Avatar Minecraft từ Crafatar
 */
(function () {
  'use strict';

  var server = window.LB_SERVER;
  if (!server) return;

  var pvpWrap  = document.getElementById('tab-pvp');
  var kingWrap = document.getElementById('tab-king');
  if (!pvpWrap && !kingWrap) return; // old layout, skip
  var isRoyalPage = server === 'kingmc' && document.getElementById('king-crown');

  /* ── render skeleton ── */
  var skHtml = buildSkeleton();
  var pvpBoard  = document.getElementById('board-pvp');
  var kingBoard = document.getElementById('board-king');
  if (pvpBoard)  pvpBoard.innerHTML  = skHtml;
  if (kingBoard) kingBoard.innerHTML = skHtml;

  /* ── fetch data ── */
  API.getLeaderboard(server).then(function (data) {
    var pvp  = data.pvp  || [];
    var king = data.king || [];

    if (pvpBoard)  pvpBoard.innerHTML  = pvp.length  ? buildBoard(pvp,  'Điểm PvP')  : emptyState();
    if (kingBoard) kingBoard.innerHTML = king.length ? buildBoard(king, 'Điểm King') : emptyState();
    if (isRoyalPage) renderCrown(king[0]);

    /* enable search */
    enableSearch('search-pvp',  pvpBoard,  pvp,  'Điểm PvP');
    if (!isRoyalPage) enableSearch('search-king', kingBoard, king, 'Điểm King');

  }).catch(function (e) {
    var errHtml = '<div class="empty-state"><div class="icon">⚠️</div><h3>Lỗi tải dữ liệu</h3><p>' + esc(e.message) + '</p></div>';
    if (pvpBoard)  pvpBoard.innerHTML  = errHtml;
    if (kingBoard) kingBoard.innerHTML = errHtml;
  });

  /* ── Tab switching ── */
  document.querySelectorAll('.lb-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.tab;
      document.querySelectorAll('.lb-tab').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      var panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.add('active');
    });
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
