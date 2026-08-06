/**
 * Public King page: exactly one current King, nomination campaign and history.
 */
'use strict';
(function () {
  var server = window.KING_SERVER || 'is7mc';
  var name = server === 'kingmc' ? 'KINGMC.VN' : 'IS7MC.NET';
  var root = document.getElementById('king-app');
  if (!root) return;

  var state = { king: null, campaign: null, history: [], tab: 'king' };
  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function date(value, withTime) {
    if (!value) return '—';
    var d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN', withTime
      ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function avatar(item) {
    return item && item.avatar_url ? '<img src="' + esc(item.avatar_url) + '" alt="" onerror="this.style.display=\'none\'">' : '<span class="avatar-placeholder">V</span>';
  }
  function tabs() {
    return '<div class="king-tabs" role="tablist">' +
      ['king:King', 'nomination:Đề cử', 'history:Lịch sử vua'].map(function (part) {
        var pair = part.split(':');
        return '<button class="king-tab ' + (state.tab === pair[0] ? 'active' : '') + '" data-tab="' + pair[0] + '">' + pair[1] + '</button>';
      }).join('') + '</div>';
  }
  function renderKing() {
    var k = state.king;
    return '<section class="king-showcase">' +
      (k && k.banner_url ? '<div class="king-banner" style="background-image:url(\'' + esc(k.banner_url).replace(/'/g, '%27') + '\')"></div>' : '') +
      '<div class="king-showcase-inner">' +
      '<div class="king-avatar-large">' + avatar(k) + '</div>' +
      '<div class="king-copy"><span class="section-kicker">CURRENT KING · ' + name + '</span>' +
      (k ? '<h2>' + esc(k.display_name) + '</h2><p class="king-reign">' + esc(k.reign_title) + '</p><p>' + esc(k.description || 'Người đang nắm giữ ngai vàng của ' + name + '.') + '</p>' +
        '<div class="king-meta"><span>Ngày lên ngôi</span><strong>' + date(k.crowned_at) + '</strong></div>' +
        (k.logo_url ? '<img class="king-logo" src="' + esc(k.logo_url) + '" alt="Logo triều đại" onerror="this.style.display=\'none\'">' : '') :
        '<h2>Chưa có ai làm vua</h2><p>Hãy tham gia đề cử để chọn ra vị vua đầu tiên của ' + name + '.</p><button class="btn btn-primary" data-tab="nomination">Tham gia đề cử ↗</button>') +
      '</div><div class="king-crown-mark">KING</div></div></section>';
  }
  function renderNomination() {
    var c = state.campaign;
    if (!c) return '<section class="empty-king"><span class="section-kicker">NOMINATION</span><h2>Chưa có đợt đề cử</h2><p>Admin chưa mở một đợt đề cử cho ' + name + '. Hãy quay lại sau.</p></section>';
    var cards = (c.candidates || []).map(function (candidate) {
      var mine = c.my_vote === candidate.id;
      return '<article class="candidate-card ' + (mine ? 'is-mine' : '') + '">' +
        '<div class="candidate-avatar">' + avatar(candidate) + '</div><div class="candidate-info"><h3>' + esc(candidate.display_name) + '</h3><p>' + esc(candidate.description) + '</p>' +
        '<div class="candidate-footer"><span>' + candidate.votes + ' đề cử</span>' +
        (mine ? '<button class="btn btn-danger btn-sm" data-cancel="' + esc(candidate.id) + '">Hủy đề cử</button>' : '<button class="btn btn-primary btn-sm" data-vote="' + esc(candidate.id) + '">Đề cử</button>') +
        '</div></div></article>';
    }).join('');
    return '<section class="nomination-panel"><div class="nomination-heading"><div><span class="section-kicker">OPEN CAMPAIGN</span><h2>' + esc(c.title) + '</h2><p>' + esc(c.description) + '</p></div><div class="campaign-deadline"><span>Kết thúc lúc</span><strong>' + date(c.ends_at, true) + '</strong></div></div><div class="candidate-grid">' + (cards || '<p>Chưa có ứng viên.</p>') + '</div></section>';
  }
  function renderHistory() {
    var rows = state.history.map(function (k) {
      return '<article class="history-row"><div class="history-avatar">' + avatar(k) + '</div><div class="history-main"><span class="section-kicker">' + esc(k.reign_title) + '</span><h3>' + esc(k.display_name) + '</h3><p>' + date(k.crowned_at) + ' — ' + (k.ended_at ? date(k.ended_at) : 'Đang trị vì') + '</p></div><div class="history-reason">' + (k.end_reason ? '<span>Lý do kết thúc</span>' + esc(k.end_reason) : '<strong>Vị vua hiện tại</strong>') + '</div></article>';
    }).join('');
    return '<section class="history-panel"><span class="section-kicker">ROYAL ARCHIVE</span><h2>Lịch sử vua ' + name + '</h2><div class="history-list">' + (rows || '<p class="empty-copy">Chưa có triều đại nào được lưu.</p>') + '</div></section>';
  }
  async function load() {
    root.innerHTML = '<div class="loading-state">Đang tải dữ liệu ngai vàng…</div>';
    try {
      var results = await Promise.all([API.getKing(server), API.getNomination(server), API.getHistory(server)]);
      state.king = results[0].king; state.campaign = results[1]; state.history = results[2]; render();
    } catch (e) { root.innerHTML = '<div class="empty-king"><h2>Không thể tải dữ liệu</h2><p>' + esc(e.message) + '</p></div>'; }
  }
  function render() {
    root.innerHTML = tabs() + (state.tab === 'king' ? renderKing() : state.tab === 'nomination' ? renderNomination() : renderHistory());
    root.querySelectorAll('[data-tab]').forEach(function (button) {
      button.addEventListener('click', function () { state.tab = button.dataset.tab; render(); });
    });
    root.querySelectorAll('[data-vote]').forEach(function (button) {
      button.addEventListener('click', async function () {
        try { await API.vote(server, button.dataset.vote); showToast('Đã ghi nhận đề cử của bạn.'); await load(); state.tab = 'nomination'; render(); }
        catch (e) { showToast(e.message, 'error'); if (e.message.indexOf('Đăng nhập') >= 0) location.href = '/api/auth/discord?redirect=' + encodeURIComponent(location.pathname); }
      });
    });
    root.querySelectorAll('[data-cancel]').forEach(function (button) {
      button.addEventListener('click', async function () {
        try { await API.cancelVote(server, button.dataset.cancel); showToast('Đã hủy đề cử.'); await load(); state.tab = 'nomination'; render(); }
        catch (e) { showToast(e.message, 'error'); }
      });
    });
  }
  load();
})();