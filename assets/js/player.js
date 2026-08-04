/**
 * player.js — Player search and profile display.
 */

(function () {
  var form    = document.getElementById('search-form');
  var input   = document.getElementById('search-input');
  var result  = document.getElementById('player-result');
  var notFound= document.getElementById('not-found');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var username = input.value.trim();
    if (!username) return;

    // Loading state
    result.classList.remove('visible');
    notFound.classList.remove('visible');

    var btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Đang tìm…';
    btn.disabled = true;

    await new Promise(function (r) { setTimeout(r, 400); });

    var player;
    try {
      player = await API.searchPlayer(username);
    } catch (e) {
      showToast('Lỗi tải dữ liệu. Thử lại sau.', 'error');
      btn.textContent = 'Tìm kiếm';
      btn.disabled = false;
      return;
    }

    btn.textContent = 'Tìm kiếm';
    btn.disabled = false;

    if (!player) {
      notFound.classList.add('visible');
      return;
    }

    renderPlayer(player);
    result.classList.add('visible');
  });

  function renderPlayer(p) {
    var serverTag  = p.server === 'IS7MC' ? 'tag-is7mc' : 'tag-kingmc';
    var updatedStr = p.updated ? new Date(p.updated).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

    document.getElementById('p-avatar').src    = API.getAvatarUrl(p.username);
    document.getElementById('p-avatar').onerror= function () { this.src = API.getFallbackAvatar(); };
    document.getElementById('p-username').textContent  = p.username;
    document.getElementById('p-server').innerHTML      = '<span class="server-tag ' + serverTag + '">' + p.server + '</span>';
    document.getElementById('p-pvp').textContent       = p.pvp.toLocaleString('vi-VN');
    document.getElementById('p-king').textContent      = p.king.toLocaleString('vi-VN');
    document.getElementById('p-pvp-rank').textContent  = '#' + p.pvpRank;
    document.getElementById('p-king-rank').textContent = '#' + p.kingRank;
    document.getElementById('p-updated').textContent   = updatedStr;
  }
})();
