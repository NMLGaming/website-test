/**
 * admin.js — VIELIST Admin SPA.
 * Auth via Discord OAuth2 — credentials/owner ID never in this file.
 * Role is returned from the server via /api/auth/me.
 */

'use strict';

/* ============================================================
   Utilities
============================================================ */
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtNum(n)  { return Number(n || 0).toLocaleString('vi-VN'); }
function fmtDate(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric'}); }
  catch (_) { return s; }
}

function setContent(html) { document.getElementById('a-section-root').innerHTML = html; }

function loading() {
  setContent('<div class="a-loading"><div class="a-spinner"></div> Đang tải…</div>');
}

/* ============================================================
   Toast
============================================================ */
function toast(msg, type) { showToast(msg, type || 'success'); }

/* ============================================================
   Modal
============================================================ */
const Modal = (function () {
  const overlay   = document.getElementById('a-modal');
  const titleEl   = document.getElementById('a-modal-title');
  const bodyEl    = document.getElementById('a-modal-body');
  const saveBtn   = document.getElementById('a-modal-save');
  const cancelBtn = document.getElementById('a-modal-cancel');
  let _onSave = null;

  function show(title, html, onSave, saveLbl) {
    titleEl.textContent   = title;
    bodyEl.innerHTML      = html;
    saveBtn.textContent   = saveLbl || 'Lưu';
    _onSave               = onSave;
    overlay.style.display = 'flex';
    overlay.classList.add('open');
    var first = bodyEl.querySelector('input, textarea, select');
    if (first) setTimeout(function () { first.focus(); }, 100);
  }

  function hide() {
    overlay.classList.remove('open');
    overlay.style.display = 'none';
    _onSave = null;
  }

  saveBtn.addEventListener('click', async function () {
    if (!_onSave) return;
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Đang lưu…';
    try { await _onSave(); }
    catch (e) { toast(e.message, 'error'); }
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Lưu';
  });

  cancelBtn.addEventListener('click', hide);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) hide(); });

  return { show, hide };
})();

/* ============================================================
   Confirm Dialog
============================================================ */
const Confirm = (function () {
  const overlay   = document.getElementById('a-confirm');
  const titleEl   = document.getElementById('a-confirm-title');
  const msgEl     = document.getElementById('a-confirm-msg');
  const okBtn     = document.getElementById('a-confirm-ok');
  const cancelBtn = document.getElementById('a-confirm-cancel');

  function show(title, msg) {
    return new Promise(function (resolve) {
      titleEl.textContent   = title || 'Xác nhận xóa?';
      msgEl.textContent     = msg   || '';
      overlay.style.display = 'flex';
      overlay.classList.add('open');
      function done(val) {
        overlay.classList.remove('open');
        overlay.style.display = 'none';
        okBtn.onclick     = null;
        cancelBtn.onclick = null;
        resolve(val);
      }
      okBtn.onclick     = function () { done(true);  };
      cancelBtn.onclick = function () { done(false); };
    });
  }

  return { show };
})();

/* ============================================================
   State & Navigation
============================================================ */
var G = { user: null, section: 'dashboard' };

function setupSidebarToggle() {
  document.getElementById('a-sidebar-toggle').addEventListener('click', function () {
    document.getElementById('a-sidebar').classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    var sidebar = document.getElementById('a-sidebar');
    var toggle  = document.getElementById('a-sidebar-toggle');
    if (window.innerWidth < 768 && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

function navigate(section) {
  G.section = section;
  document.querySelectorAll('.a-nav-item[data-section]').forEach(function (b) {
    b.classList.toggle('active', b.dataset.section === section);
  });
  Modal.hide();
  switch (section) {
    case 'dashboard':     return Dashboard.load();
    case 'announcements': return Announcements.load();
    case 'is7mc':         return Leaderboard.load('is7mc');
    case 'kingmc':        return Leaderboard.load('kingmc');
    case 'settings':      return Settings.load();
  }
}

function setupNav() {
  document.querySelectorAll('.a-nav-item[data-section]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      navigate(this.dataset.section);
      if (window.innerWidth < 768) document.getElementById('a-sidebar').classList.remove('open');
    });
  });
}

/* ============================================================
   Auth
============================================================ */
function showAuthScreen(icon, title, desc, actionHtml) {
  document.getElementById('auth-icon').textContent  = icon;
  document.getElementById('auth-title').textContent = title;
  document.getElementById('auth-desc').textContent  = desc;
  document.getElementById('auth-action').innerHTML  = actionHtml || '';
  document.getElementById('auth-screen').removeAttribute('hidden');
  document.getElementById('admin-shell').setAttribute('hidden', '');
}

function showAdminShell(user) {
  document.getElementById('auth-screen').setAttribute('hidden', '');
  document.getElementById('admin-shell').removeAttribute('hidden');

  var topbar = document.getElementById('a-user-topbar');
  var avatar = user.avatar
    ? '<img src="' + esc(user.avatar) + '" class="nav-avatar" style="width:28px;height:28px;border-radius:50%;margin-right:6px" onerror="this.remove()">'
    : '';
  topbar.innerHTML = avatar + '<span class="a-username-badge">' + esc(user.username) + ' · OWNER</span>';
}

function setupLogout() {
  document.getElementById('a-logout-btn').addEventListener('click', async function () {
    try { await AdminAPI.logout(); } catch (_) {}
    window.location.href = '/';
  });
}

/* ============================================================
   Dashboard
============================================================ */
const Dashboard = {
  async load() {
    loading();
    try {
      var s = await AdminAPI.getStats();
      var dbClass = s.db_connected ? 'connected' : 'disconnected';
      var dbText  = s.db_connected
        ? '● Database đã kết nối'
        : '● Chế độ Demo — cài DATABASE_URL để lưu dữ liệu thật';
      setContent(
        '<div class="a-page-header"><h1>📊 Dashboard</h1>' +
        '<span class="a-db-status ' + dbClass + '">' + dbText + '</span></div>' +
        '<div class="a-stats-grid">' +
          stat('📣', fmtNum(s.announcements), 'Thông báo') +
          stat('🏆', fmtNum(s.leaderboard),   'Leaderboard entries') +
          stat('🕐', new Date(s.updated_at).toLocaleTimeString('vi-VN'), 'Cập nhật lúc') +
        '</div>' +
        '<div class="glass-card" style="margin-top:1.5rem">' +
          '<h3 style="font-size:.95rem;color:var(--text-sm);margin-bottom:1rem">⚡ Thao tác nhanh</h3>' +
          '<div class="btn-group">' +
            '<button class="btn btn-primary" onclick="navigate(\'announcements\')">📣 Thông báo</button>' +
            '<button class="btn btn-ghost"   onclick="navigate(\'is7mc\')">🌐 IS7MC</button>' +
            '<button class="btn btn-ghost"   onclick="navigate(\'kingmc\')">🏰 KINGMC</button>' +
            '<button class="btn btn-ghost"   onclick="navigate(\'settings\')">⚙️ Settings</button>' +
          '</div>' +
        '</div>'
      );
    } catch (e) {
      setContent('<div class="empty-state"><div class="icon">⚠️</div><h3>Không tải được stats</h3><p>' + esc(e.message) + '</p></div>');
    }
  }
};

function stat(icon, val, label) {
  return '<div class="a-stat-card glass-card">' +
    '<div class="a-stat-icon">' + icon + '</div>' +
    '<div class="a-stat-val">' + val + '</div>' +
    '<div class="a-stat-label">' + label + '</div>' +
  '</div>';
}

/* ============================================================
   Announcements CRUD
============================================================ */
const Announcements = {
  data: [],

  async load() {
    loading();
    try {
      this.data = await AdminAPI.getAnnouncements();
      this.render();
    } catch (e) {
      setContent('<div class="empty-state"><div class="icon">⚠️</div><h3>' + esc(e.message) + '</h3></div>');
    }
  },

  render() {
    var self = this;
    var rows = self.data.map(function (a) {
      var badge = { news:'Tin tức', update:'Update', maintenance:'Bảo trì', event:'Sự kiện' }[a.type] || a.type;
      var pin   = a.pinned ? '<span class="pin-badge">📌 Ghim</span>' : '';
      return '<tr>' +
        '<td>' + esc(a.icon || '📢') + ' ' + esc(a.title) + ' ' + pin + '</td>' +
        '<td><span class="announce-badge badge-' + esc(a.type) + '">' + badge + '</span></td>' +
        '<td>' + fmtDate(a.date) + '</td>' +
        '<td class="cell-actions">' +
          '<button class="btn btn-edit btn-sm" onclick="Announcements.edit(\'' + esc(a.id) + '\')">✏️ Sửa</button>' +
          '<button class="btn btn-danger btn-sm" onclick="Announcements.del(\'' + esc(a.id) + '\')">🗑️ Xóa</button>' +
        '</td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-xs)">Chưa có thông báo</td></tr>';

    setContent(
      '<div class="a-page-header"><h1>📣 Thông báo</h1><p>Quản lý thông báo trên trang Home.</p></div>' +
      '<div class="a-toolbar">' +
        '<h2>Danh sách (' + self.data.length + ')</h2>' +
        '<button class="btn btn-primary" onclick="Announcements.create()">➕ Đăng thông báo</button>' +
      '</div>' +
      '<div class="a-table-wrap"><table class="a-table">' +
        '<thead><tr><th>Tiêu đề</th><th>Loại</th><th>Ngày</th><th>Hành động</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>'
    );
  },

  _form(a) {
    a = a || {};
    var today = new Date().toISOString().slice(0, 10);
    var opts = ['news','update','maintenance','event'].map(function (t) {
      var labels = { news:'📢 Tin tức', update:'🚀 Update', maintenance:'🔧 Bảo trì', event:'⚡ Sự kiện' };
      return '<option value="' + t + '"' + (a.type === t ? ' selected' : '') + '>' + labels[t] + '</option>';
    }).join('');
    return '<div class="form-group"><label>Loại</label><select name="type">' + opts + '</select></div>' +
      '<div class="form-group"><label>Icon (emoji)</label><input name="icon" value="' + esc(a.icon||'📢') + '" maxlength="4"/></div>' +
      '<div class="form-group"><label>Tiêu đề *</label><input name="title" value="' + esc(a.title||'') + '" required placeholder="Tiêu đề thông báo…"/></div>' +
      '<div class="form-group"><label>Ngày đăng *</label><input type="date" name="date" value="' + esc(a.date||today) + '" required/></div>' +
      '<div class="form-group"><label>Đặt lịch (để trống = đăng ngay)</label><input type="datetime-local" name="scheduled_at" value="' + esc(a.scheduled_at||'') + '"/></div>' +
      '<div class="form-group"><label>Nội dung *</label><textarea name="content" required rows="4" placeholder="Nội dung chi tiết…">' + esc(a.content||'') + '</textarea></div>' +
      '<div class="form-group"><label style="display:flex;align-items:center;gap:.5rem;cursor:pointer">' +
        '<input type="checkbox" name="pinned"' + (a.pinned ? ' checked' : '') + ' style="width:auto"/> 📌 Ghim thông báo này lên đầu' +
      '</label></div>';
  },

  create() {
    var self = this;
    Modal.show('➕ Đăng thông báo mới', self._form(), async function () {
      var f = getFormData('a-modal-body');
      if (!f.title || !f.content || !f.date) throw new Error('Điền đủ các trường bắt buộc (*)');
      f.pinned = document.querySelector('#a-modal-body [name=pinned]').checked;
      await AdminAPI.createAnnouncement(f);
      Modal.hide();
      toast('Đã đăng thông báo!');
      await self.load();
    });
  },

  edit(id) {
    var self = this;
    var item = self.data.find(function (a) { return a.id === id; });
    if (!item) return;
    Modal.show('✏️ Sửa thông báo', self._form(item), async function () {
      var f = getFormData('a-modal-body');
      if (!f.title || !f.content || !f.date) throw new Error('Điền đủ các trường bắt buộc (*)');
      f.pinned = document.querySelector('#a-modal-body [name=pinned]').checked;
      await AdminAPI.updateAnnouncement(id, f);
      Modal.hide();
      toast('Đã cập nhật thông báo.');
      await self.load();
    });
  },

  async del(id) {
    var item = this.data.find(function (a) { return a.id === id; });
    var ok   = await Confirm.show('Xóa thông báo?', '"' + (item ? item.title : id) + '"');
    if (!ok) return;
    try { await AdminAPI.deleteAnnouncement(id); toast('Đã xóa.', 'error'); await this.load(); }
    catch (e) { toast(e.message, 'error'); }
  }
};

/* ============================================================
   King leaderboard CRUD (IS7MC & KINGMC)
============================================================ */
const Leaderboard = {
  server: 'is7mc',
  category: 'king',
  data: { king: [] },

  async load(server) {
    this.server   = server;
    this.category = 'king';
    loading();
    try {
      this.data = await AdminAPI.getLeaderboard(server);
      this.render();
    } catch (e) {
      setContent('<div class="empty-state"><div class="icon">⚠️</div><h3>' + esc(e.message) + '</h3></div>');
    }
  },

  render() {
    var self  = this;
    var label = self.server === 'is7mc' ? '🌐 IS7MC.NET' : '🏰 KINGMC.VN';
    var rows  = (self.data[self.category] || []);

    var tableHtml = rows.map(function (p) {
      var rc = p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : '#' + p.rank;
      return '<tr>' +
        '<td>' + rc + '</td>' +
        '<td><img src="https://crafatar.com/avatars/' + encodeURIComponent(p.username) + '?size=32&overlay=true" ' +
             'width="28" height="28" style="border-radius:4px;vertical-align:middle;margin-right:8px;image-rendering:pixelated">' +
             esc(p.username) + '</td>' +
        '<td class="score-cell">' + fmtNum(p.score) + '</td>' +
        '<td class="cell-actions">' +
          '<button class="btn btn-edit btn-sm" onclick="Leaderboard.edit(\'' + esc(p.id) + '\')">✏️</button>' +
          '<button class="btn btn-danger btn-sm" onclick="Leaderboard.del(\'' + esc(p.id) + '\')">🗑️</button>' +
        '</td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-xs)">Chưa có dữ liệu</td></tr>';

    setContent(
      '<div class="a-page-header"><h1>' + label + '</h1><p>Quản lý bảng xếp hạng King.</p></div>' +
      '<div class="a-toolbar">' +
        '<h2>' + self.category.toUpperCase() + ' — ' + rows.length + ' người</h2>' +
        '<button class="btn btn-primary" onclick="Leaderboard.create()">➕ Thêm Player</button>' +
      '</div>' +
      '<div class="a-table-wrap"><table class="a-table">' +
        '<thead><tr><th>#</th><th>Người chơi</th><th>Điểm</th><th>Hành động</th></tr></thead>' +
        '<tbody>' + tableHtml + '</tbody>' +
      '</table></div>'
    );
  },

  switchTab(cat) { this.category = cat; this.render(); },

  _form(entry) {
    entry = entry || {};
    return '<div class="form-group"><label>Tên Minecraft *</label><input name="username" value="' + esc(entry.username||'') + '" required/></div>' +
      '<div class="form-group"><label>Điểm *</label><input type="number" name="score" value="' + esc(entry.score||0) + '" min="0" required/></div>' +
      (entry.id ? '<div class="form-group"><label>Rank (để trống = tự tính)</label><input type="number" name="rank" value="' + esc(entry.rank||'') + '" min="1"/></div>' : '');
  },

  create() {
    var self = this;
    Modal.show('➕ Thêm nhà vua vào ' + self.server.toUpperCase(), self._form({ category: 'king' }), async function () {
      var f = getFormData('a-modal-body');
      if (!f.username) throw new Error('Điền Username và Điểm');
      f.category = 'king';
      await AdminAPI.addLbEntry(self.server, f);
      Modal.hide(); toast('Đã thêm player!'); await self.load(self.server);
    });
  },

  edit(id) {
    var self  = this;
    var entry = (self.data[self.category] || []).find(function (p) { return p.id === id; });
    if (!entry) return;
    Modal.show('✏️ Sửa ' + esc(entry.username), self._form(entry), async function () {
      var f = getFormData('a-modal-body');
      await AdminAPI.updateLbEntry(self.server, id, f);
      Modal.hide(); toast('Đã cập nhật.'); await self.load(self.server);
    });
  },

  async del(id) {
    var entry = (this.data[this.category] || []).find(function (p) { return p.id === id; });
    var ok    = await Confirm.show('Xóa khỏi bảng?', entry ? entry.username : id);
    if (!ok) return;
    try { await AdminAPI.deleteLbEntry(this.server, id); toast('Đã xóa.', 'error'); await this.load(this.server); }
    catch (e) { toast(e.message, 'error'); }
  }
};

/* ============================================================
   Settings
============================================================ */
const Settings = {
  async load() {
    loading();
    try { var s = await AdminAPI.getSettings(); this.render(s); }
    catch (e) { setContent('<div class="empty-state"><div class="icon">⚠️</div><h3>' + esc(e.message) + '</h3></div>'); }
  },

  render(s) {
    setContent(
      '<div class="a-page-header"><h1>⚙️ Settings</h1><p>Chỉnh nội dung, logo, ảnh đại diện và hiệu ứng mà không cần sửa code.</p></div>' +
      '<div class="settings-grid">' +
      '<div class="glass-card settings-card">' +
        '<div class="settings-card-heading"><div><span class="section-kicker">BRAND ASSETS</span><h2>Logo & hình ảnh</h2></div><span class="settings-note">Tối đa 1.5MB / ảnh</span></div>' +
        '<div class="upload-row"><div class="upload-copy"><label>Logo chữ V ở Home</label><small>Ảnh sẽ nằm trong vòng tròn phát sáng.</small></div><div class="upload-control"><input type="file" id="cfg-hero-logo-file" accept="image/*"/><img id="cfg-hero-logo-preview" class="upload-preview upload-preview-mark" src="' + esc(s.hero_logo_url||'') + '" alt=""/></div></div>' +
        '<div class="upload-row"><div class="upload-copy"><label>Logo trên thanh menu</label><small>PNG nền trong suốt sẽ đẹp nhất.</small></div><div class="upload-control"><input type="file" id="cfg-logo-file" accept="image/*"/><img id="cfg-logo-preview" class="upload-preview" src="' + esc(s.logo_url||'') + '" alt=""/></div></div>' +
        '<div class="upload-row"><div class="upload-copy"><label>Avatar tuỳ chỉnh</label><small>Tự động bo tròn và có hiệu ứng khi di chuột.</small></div><div class="upload-control"><input type="file" id="cfg-avatar-file" accept="image/*"/><img id="cfg-avatar-preview" class="upload-preview upload-preview-avatar" src="' + esc(s.avatar_url||'') + '" alt=""/></div></div>' +
        '<div class="form-group"><label>Ảnh nền Hero (URL)</label><input id="cfg-banner" value="' + esc(s.hero_banner_url||'') + '" placeholder="https://…"/></div>' +
      '</div>' +
      '<div class="glass-card settings-card">' +
        '<div class="settings-card-heading"><div><span class="section-kicker">HOME CONTENT</span><h2>Nội dung trang chủ</h2></div></div>' +
        '<div class="form-group"><label>Tên website</label><input id="cfg-site-name" value="' + esc(s.site_name||'') + '" placeholder="VIELIST"/></div>' +
        '<div class="form-group"><label>Logo chữ (khi chưa tải ảnh)</label><input id="cfg-site-logo" value="' + esc(s.site_logo||'') + '" placeholder="VIELIST"/></div>' +
        '<div class="form-group"><label>Tiêu đề lớn</label><input id="cfg-hero-title" value="' + esc(s.hero_title||'') + '"/></div>' +
        '<div class="form-group"><label>Dòng tiêu đề nổi bật</label><input id="cfg-hero-highlight" value="' + esc(s.hero_highlight||'') + '"/></div>' +
        '<div class="form-group"><label>Mô tả Hero</label><textarea id="cfg-hero-lead" rows="3">' + esc(s.hero_lead||'') + '</textarea></div>' +
        '<div class="form-group"><label>Tiêu đề giới thiệu</label><input id="cfg-intro-title" value="' + esc(s.intro_title||'') + '"/></div>' +
        '<div class="form-group"><label>Nội dung giới thiệu</label><textarea id="cfg-intro-body" rows="3">' + esc(s.intro_body||'') + '</textarea></div>' +
        '<div class="form-group"><label>Tiêu đề câu chuyện</label><input id="cfg-story-title" value="' + esc(s.story_title||'') + '"/></div>' +
        '<div class="form-group"><label>Nội dung câu chuyện</label><textarea id="cfg-story-body" rows="3">' + esc(s.story_body||'') + '</textarea></div>' +
        '<div class="form-group"><label>Tiêu đề cuối trang</label><input id="cfg-cta-title" value="' + esc(s.cta_title||'') + '"/></div>' +
        '<div class="form-group"><label>Nội dung cuối trang</label><textarea id="cfg-cta-body" rows="3">' + esc(s.cta_body||'') + '</textarea></div>' +
        '<div class="form-group"><label>Text Footer</label><input id="cfg-footer" value="' + esc(s.footer_text||'') + '"/></div>' +
      '</div>' +
      '<div class="glass-card settings-card settings-card-compact">' +
        '<div class="settings-card-heading"><div><span class="section-kicker">APPEARANCE</span><h2>Màu & hiệu ứng</h2></div></div>' +
        '<div class="form-group"><label>Màu chủ đạo</label>' +
          '<div class="color-preview-row">' +
            '<input type="color" id="cfg-color" value="' + esc(s.primary_color||'#00d4ff') + '" style="width:48px;height:38px;border:none;background:transparent;cursor:pointer"/>' +
            '<span id="cfg-color-val" style="color:var(--text-sm);font-family:monospace">' + esc(s.primary_color||'#00d4ff') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="form-group"><label style="display:flex;align-items:center;gap:.5rem;cursor:pointer">' +
          '<input type="checkbox" id="cfg-effects"' + (s.effects_enabled !== 'false' ? ' checked' : '') + ' style="width:auto"/> Bật hiệu ứng animation' +
        '</label></div>' +
        '<button class="btn btn-primary" onclick="Settings.save()" style="margin-top:.5rem">💾 Lưu toàn bộ cài đặt</button>' +
        '<p class="settings-help">Ảnh tải lên được nén nhẹ và lưu cùng cài đặt. Nếu đang chạy bản demo không có database, cài đặt vẫn được giữ trên trình duyệt này.</p>' +
      '</div></div>'
    );
    ['logo', 'hero-logo', 'avatar'].forEach(function (name) {
      var input = document.getElementById('cfg-' + name + '-file');
      if (input) input.addEventListener('change', function () {
        var file = this.files && this.files[0];
        if (!file) return;
        if (file.size > 1500000) { toast('Ảnh quá lớn. Hãy chọn ảnh dưới 1.5MB.', 'error'); this.value = ''; return; }
        readImage(file).then(function (data) {
          var preview = document.getElementById('cfg-' + name + '-preview');
          if (preview) { preview.src = data; preview.classList.add('has-preview'); }
          input.dataset.value = data;
        }).catch(function () { toast('Không đọc được ảnh này.', 'error'); });
      });
    });
    document.getElementById('cfg-color').addEventListener('input', function () {
      document.getElementById('cfg-color-val').textContent = this.value;
    });
  },

  async save() {
    try {
      var readUpload = function (id, fallback) {
        var input = document.getElementById(id);
        return input && input.dataset.value ? input.dataset.value : fallback;
      };
      await AdminAPI.updateSettings({
        site_name:       document.getElementById('cfg-site-name').value.trim(),
        site_logo:       document.getElementById('cfg-site-logo').value.trim(),
        logo_url:        readUpload('cfg-logo-file', document.getElementById('cfg-logo-preview').getAttribute('src') || ''),
        hero_logo_url:   readUpload('cfg-hero-logo-file', document.getElementById('cfg-hero-logo-preview').getAttribute('src') || ''),
        avatar_url:      readUpload('cfg-avatar-file', document.getElementById('cfg-avatar-preview').getAttribute('src') || ''),
        hero_banner_url: document.getElementById('cfg-banner').value.trim(),
        hero_title:      document.getElementById('cfg-hero-title').value.trim(),
        hero_highlight:  document.getElementById('cfg-hero-highlight').value.trim(),
        hero_lead:       document.getElementById('cfg-hero-lead').value.trim(),
        intro_title:     document.getElementById('cfg-intro-title').value.trim(),
        intro_body:      document.getElementById('cfg-intro-body').value.trim(),
        story_title:     document.getElementById('cfg-story-title').value.trim(),
        story_body:      document.getElementById('cfg-story-body').value.trim(),
        cta_title:       document.getElementById('cfg-cta-title').value.trim(),
        cta_body:        document.getElementById('cfg-cta-body').value.trim(),
        footer_text:     document.getElementById('cfg-footer').value.trim(),
        primary_color:   document.getElementById('cfg-color').value,
        effects_enabled: document.getElementById('cfg-effects').checked ? 'true' : 'false',
      });
      toast('Đã lưu cài đặt!');
    } catch (e) { toast(e.message, 'error'); }
  }
};

function readImage(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onerror = reject;
    reader.onload = function () {
      var image = new Image();
      image.onerror = reject;
      image.onload = function () {
        var max = 720, scale = Math.min(1, max / Math.max(image.width, image.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   Form data helper
============================================================ */
function getFormData(containerId) {
  var container = document.getElementById(containerId);
  var data = {};
  container.querySelectorAll('input[name], textarea[name], select[name]').forEach(function (el) {
    if (el.type === 'checkbox') return;
    var val = el.value.trim();
    data[el.name] = el.type === 'number' ? (val === '' ? undefined : Number(val)) : val;
  });
  return data;
}

/* ============================================================
   Init — Discord OAuth2 auth check
============================================================ */
(async function init() {
  setupLogout();
  setupNav();
  setupSidebarToggle();

  try {
    var me = await AdminAPI.me();

    if (!me.authenticated) {
      showAuthScreen(
        '🔐', 'Yêu cầu đăng nhập',
        'Chỉ Owner mới có thể truy cập Admin Dashboard.',
        '<a href="/api/auth/discord?redirect=/admin" class="btn btn-discord btn-full">' +
          '<svg class="discord-icon" viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;flex-shrink:0">' +
            '<path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z"/>' +
          '</svg>' +
          'Đăng nhập với Discord' +
        '</a>'
      );
      return;
    }

    if (me.role !== 'OWNER') {
      showAuthScreen(
        '🚫', '403 — Không có quyền',
        'Tài khoản Discord của bạn (' + esc(me.username) + ') không phải Owner.',
        '<a href="/" class="btn btn-primary btn-full">← Về trang chủ</a>'
      );
      return;
    }

    G.user = me;
    showAdminShell(me);
    navigate('dashboard');

  } catch (e) {
    showAuthScreen(
      '⚠️', 'Lỗi kết nối',
      'Không thể kiểm tra xác thực: ' + e.message,
      '<button class="btn btn-primary btn-full" onclick="location.reload()">🔄 Thử lại</button>'
    );
  }
})();
