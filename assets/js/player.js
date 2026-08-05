/**
 * player.js — Player search on the /player page.
 * Calls GET /api/players?username=... which falls back to JSON if no DB.
 */

(function () {
  const form     = document.getElementById('search-form');
  const input    = document.getElementById('search-input');
  const result   = document.getElementById('player-result');
  const notFound = document.getElementById('not-found');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = input.value.trim();
    if (!username) return;

    result.classList.remove('visible');
    notFound.classList.remove('visible');

    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Đang tìm…';
    btn.disabled    = true;

    await new Promise(function (r) { setTimeout(r, 350); });

    let player;
    try {
      player = await API.searchPlayer(username);
    } catch (e) {
      showToast('Lỗi tải dữ liệu. Thử lại sau.', 'error');
      btn.textContent = 'Tìm kiếm';
      btn.disabled    = false;
      return;
    }

    btn.textContent = 'Tìm kiếm';
    btn.disabled    = false;

    if (!player) {
      notFound.classList.add('visible');
      return;
    }

    renderPlayer(player);
    result.classList.add('visible');
  });

  function renderPlayer(p) {
    const tagClass = (p.server || '').toUpperCase() === 'KINGMC' ? 'tag-kingmc' : 'tag-is7mc';
    const updated  = p.updated
      ? new Date(p.updated).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
      : 'N/A';

    const avatarEl = document.getElementById('p-avatar');
    avatarEl.src    = API.getAvatarUrl(p.username);
    avatarEl.onerror= function () { this.src = API.getFallbackAvatar(); };

    document.getElementById('p-username').textContent  = p.username;
    document.getElementById('p-server').innerHTML      =
      '<span class="server-tag ' + tagClass + '">' + (p.server || '') + '</span>';
    document.getElementById('p-pvp').textContent       = Number(p.pvp  || 0).toLocaleString('vi-VN');
    document.getElementById('p-king').textContent      = Number(p.king || 0).toLocaleString('vi-VN');
    document.getElementById('p-pvp-rank').textContent  = p.pvpRank  ? '#' + p.pvpRank  : 'N/A';
    document.getElementById('p-king-rank').textContent = p.kingRank ? '#' + p.kingRank : 'N/A';
    document.getElementById('p-updated').textContent   = updated;
  }
})();
