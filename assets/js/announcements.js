/**
 * announcements.js — Renders announcement cards on the Home page.
 * Admins (OWNER role) get inline Create / Edit / Delete controls.
 */

(function () {
  'use strict';

  var grid    = document.getElementById('announce-grid');
  var adminBar = document.getElementById('admin-announce-bar');
  var btnCreate = document.getElementById('btn-create-announce');
  var annModal  = document.getElementById('ann-modal');
  var annCancel = document.getElementById('ann-modal-cancel');
  var annSave   = document.getElementById('ann-modal-save');

  if (!grid) return;

  var currentItems = [];
  var editingId    = null;   // null = creating, string = editing

  /* ── skeleton ── */
  grid.innerHTML = [1,2,3].map(function () {
    return '<div class="glass-card skeleton-card">' +
      '<div class="sk sk-title" style="height:18px;margin-bottom:10px;width:60%;"></div>' +
      '<div class="sk sk-line" style="height:13px;margin-bottom:6px;"></div>' +
      '<div class="sk sk-line" style="height:13px;width:80%;"></div>' +
    '</div>';
  }).join('');

  /* ── fetch announcements ── */
  function loadAnnouncements() {
    API.getAnnouncements().then(function (items) {
      currentItems = items || [];
      render();
    }).catch(function (e) {
      grid.innerHTML =
        '<div class="empty-state"><div class="icon">⚠️</div>' +
        '<h3>Không thể tải thông báo</h3><p>Vui lòng thử lại sau.</p></div>';
    });
  }

  loadAnnouncements();

  /* ── check auth: show admin controls if OWNER ── */
  (function pollAuth() {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(function (r) {
        return r.text().then(function (raw) {
          var data = {};
          try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
          if (!r.ok) throw new Error(data.error || raw || ('HTTP ' + r.status));
          return data;
        });
      })
      .then(function (d) {
        if (d && d.authenticated && d.role === 'OWNER') {
          if (adminBar) adminBar.style.display = 'block';
        }
      })
      .catch(function () {});
  })();

  /* ── render all cards ── */
  function render() {
    if (!currentItems.length) {
      grid.innerHTML =
        '<div class="empty-state"><div class="icon">📭</div>' +
        '<h3>Chưa có thông báo</h3><p>Quay lại sau nhé!</p></div>';
      return;
    }
    grid.innerHTML = currentItems.map(function (item) {
      return renderCard(item);
    }).join('');

    /* attach admin button events */
    grid.querySelectorAll('.ann-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        var item = currentItems.find(function (x) { return String(x.id) === id; });
        if (item) openModal(item);
      });
    });
    grid.querySelectorAll('.ann-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        if (!confirm('Xoá thông báo này?')) return;
        deleteAnnouncement(id);
      });
    });
    grid.querySelectorAll('.ann-pin-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id  = btn.dataset.id;
        var item = currentItems.find(function (x) { return String(x.id) === id; });
        if (item) togglePin(item);
      });
    });
  }

  function renderCard(item) {
    var type   = item.type || 'news';
    var icon   = item.icon || (type === 'update' ? '🔧' : type === 'maintenance' ? '⚙️' : type === 'event' ? '🎉' : '📢');
    var pinned = item.pinned ? '<span class="ann-pin-flag">📌 Ghim</span>' : '';
    var badge  = '<span class="announce-badge badge-' + esc(type) + '">' + esc(type) + '</span>';
    var adminBtns = (adminBar && adminBar.style.display !== 'none')
      ? '<div class="ann-admin-actions">' +
          '<button class="ann-pin-btn btn-icon" data-id="' + item.id + '" title="' + (item.pinned ? 'Bỏ ghim' : 'Ghim') + '">' + (item.pinned ? '📌' : '📍') + '</button>' +
          '<button class="ann-edit-btn btn-icon" data-id="' + item.id + '" title="Sửa">✏️</button>' +
          '<button class="ann-delete-btn btn-icon btn-icon-danger" data-id="' + item.id + '" title="Xoá">🗑️</button>' +
        '</div>'
      : '';

    return '<div class="glass-card announce-card' + (item.pinned ? ' pinned-card' : '') + '">' +
      '<div class="announce-header">' +
        '<div class="announce-title-row">' +
          '<span class="announce-icon">' + esc(icon) + '</span>' +
          '<div class="announce-meta">' +
            '<div class="title">' + esc(item.title) + '</div>' +
            '<div class="date">' + esc(item.date || '') + ' ' + pinned + ' ' + badge + '</div>' +
          '</div>' +
        '</div>' +
        adminBtns +
      '</div>' +
      '<div class="announce-content">' + esc(item.content) + '</div>' +
    '</div>';
  }

  /* ── Modal helpers ── */
  function openModal(item) {
    editingId = item ? item.id : null;
    document.getElementById('ann-modal-title').textContent = item ? 'Sửa thông báo' : 'Tạo thông báo';
    document.getElementById('ann-title').value   = item ? item.title   : '';
    document.getElementById('ann-content').value = item ? item.content : '';
    document.getElementById('ann-type').value    = item ? (item.type || 'news') : 'news';
    document.getElementById('ann-icon').value    = item ? (item.icon  || '') : '';
    document.getElementById('ann-date').value    = item ? (item.date  || today()) : today();
    document.getElementById('ann-pinned').checked = !!(item && item.pinned);
    if (annModal) annModal.style.display = 'flex';
  }

  function closeModal() {
    if (annModal) annModal.style.display = 'none';
    editingId = null;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ── API calls ── */
  function getPayload() {
    return {
      title:   document.getElementById('ann-title').value.trim(),
      content: document.getElementById('ann-content').value.trim(),
      type:    document.getElementById('ann-type').value,
      icon:    document.getElementById('ann-icon').value.trim() || null,
      date:    document.getElementById('ann-date').value,
      pinned:  document.getElementById('ann-pinned').checked,
    };
  }

  function saveAnnouncement() {
    var payload = getPayload();
    if (!payload.title || !payload.content || !payload.date) {
      alert('Cần điền Tiêu đề, Nội dung và Ngày.');
      return;
    }

    var url    = editingId ? '/api/auth/data?resource=announcements&id=' + editingId : '/api/auth/data?resource=announcements';
    var method = editingId ? 'PUT' : 'POST';

    fetch(url, {
      method:      method,
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify(payload),
    })
      .then(function (r) {
        return r.text().then(function (raw) {
          var d = {};
          try { d = raw ? JSON.parse(raw) : {}; } catch (_) {}
          if (!r.ok) throw new Error(d.error || raw || 'Lỗi lưu');
          return d;
        });
      })
      .then(function () {
        closeModal();
        showToast(editingId ? '✅ Đã cập nhật thông báo' : '✅ Đã tạo thông báo', 'success');
        loadAnnouncements();
      })
      .catch(function (e) { alert('Lỗi: ' + e.message); });
  }

  function deleteAnnouncement(id) {
    fetch('/api/auth/data?resource=announcements&id=' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) {
        return r.text().then(function (raw) {
          var d = {};
          try { d = raw ? JSON.parse(raw) : {}; } catch (_) {}
          if (!r.ok) throw new Error(d.error || raw || 'Lỗi xoá');
          return d;
        });
      })
      .then(function () {
        showToast('🗑️ Đã xoá thông báo', 'success');
        loadAnnouncements();
      })
      .catch(function (e) { alert('Lỗi: ' + e.message); });
  }

  function togglePin(item) {
    var payload = Object.assign({}, item, { pinned: !item.pinned });
    fetch('/api/auth/data?resource=announcements&id=' + item.id, {
      method:      'PUT',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify(payload),
    })
      .then(function (r) {
        return r.text().then(function (raw) {
          var d = {};
          try { d = raw ? JSON.parse(raw) : {}; } catch (_) {}
          if (!r.ok) throw new Error(d.error || raw || 'Lỗi cập nhật');
          return d;
        });
      })
      .then(function () {
        showToast(item.pinned ? '📍 Đã bỏ ghim' : '📌 Đã ghim thông báo', 'success');
        loadAnnouncements();
      })
      .catch(function (e) { alert('Lỗi: ' + e.message); });
  }

  /* ── Event bindings ── */
  if (btnCreate)  btnCreate.addEventListener('click',  function () { openModal(null); });
  if (annCancel)  annCancel.addEventListener('click',  closeModal);
  if (annSave)    annSave.addEventListener('click',    saveAnnouncement);
  if (annModal) {
    annModal.addEventListener('click', function (e) {
      if (e.target === annModal) closeModal();
    });
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
