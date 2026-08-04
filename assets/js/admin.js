/**
 * admin.js — Admin panel: auth + CRUD announcements.
 * Credentials are client-side only (demo).
 * Replace with a real API auth flow for production.
 */

// ---- Config ----
var ADMIN_USER = 'admin';
var ADMIN_PASS = 'vielist2026';
var SESSION_KEY = 'vielist_admin_session';

// ---- State ----
var editingId = null;

// ---- DOM refs ----
var loginSection  = document.getElementById('login-section');
var adminPanel    = document.getElementById('admin-panel');
var loginForm     = document.getElementById('login-form');
var loginError    = document.getElementById('login-error');
var adminList     = document.getElementById('admin-announce-list');
var modal         = document.getElementById('modal-overlay');
var modalForm     = document.getElementById('modal-form');
var modalTitle    = document.getElementById('modal-title');
var logoutBtn     = document.getElementById('logout-btn');
var addBtn        = document.getElementById('add-btn');

// ---- Init ----
(function init() {
  if (!loginSection) return;

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    showPanel();
  }

  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  addBtn.addEventListener('click', function () { openModal(null); });
  modalForm.addEventListener('submit', handleModalSave);

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
})();

function handleLogin(e) {
  e.preventDefault();
  var u = document.getElementById('login-user').value.trim();
  var p = document.getElementById('login-pass').value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, '1');
    loginError.classList.remove('visible');
    showPanel();
  } else {
    loginError.textContent = 'Sai tên đăng nhập hoặc mật khẩu.';
    loginError.classList.add('visible');
    document.getElementById('login-pass').value = '';
  }
}

function handleLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  adminPanel.classList.remove('visible');
  loginSection.style.display = '';
}

async function showPanel() {
  loginSection.style.display = 'none';
  adminPanel.classList.add('visible');
  await renderAdminList();
}

async function renderAdminList() {
  adminList.innerHTML = '<div style="color:var(--text-xs);padding:1rem;">Đang tải…</div>';
  var items;
  try { items = await API.getAnnouncements(); }
  catch (e) { adminList.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Lỗi tải dữ liệu</h3></div>'; return; }

  if (!items || items.length === 0) {
    adminList.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>Chưa có thông báo nào</h3><p>Nhấn "+ Đăng thông báo" để tạo mới.</p></div>';
    return;
  }

  var badge = { update: 'Update', maintenance: 'Bảo trì', event: 'Sự kiện', news: 'Tin tức' };

  adminList.innerHTML = items.map(function (item) {
    var dateStr = item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '';
    return '<div class="admin-item" data-id="' + item.id + '">' +
      '<span style="font-size:1.4rem;">' + (item.icon || '📢') + '</span>' +
      '<div class="admin-item-info">' +
        '<div class="title">' + escHtml(item.title) + '</div>' +
        '<div class="meta">' + (badge[item.type] || item.type) + ' &bull; ' + dateStr + '</div>' +
      '</div>' +
      '<div class="admin-item-actions">' +
        '<button class="btn btn-edit btn-sm" onclick="openModal(\'' + item.id + '\')">✏️ Sửa</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteAnnounce(\'' + item.id + '\')">🗑️ Xóa</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function openModal(id) {
  editingId = id;
  modalForm.reset();

  if (id) {
    // Edit mode — pre-fill form
    modalTitle.textContent = '✏️ Sửa thông báo';
    API.getAnnouncements().then(function (items) {
      var item = items.find(function (i) { return i.id === id; });
      if (!item) return;
      modalForm.elements['m-type'].value    = item.type;
      modalForm.elements['m-icon'].value    = item.icon || '';
      modalForm.elements['m-title'].value   = item.title;
      modalForm.elements['m-date'].value    = item.date;
      modalForm.elements['m-content'].value = item.content;
    });
  } else {
    modalTitle.textContent = '➕ Đăng thông báo mới';
    // Default today's date
    modalForm.elements['m-date'].value = new Date().toISOString().slice(0, 10);
  }

  modal.classList.add('open');
}

function closeModal() {
  modal.classList.remove('open');
  editingId = null;
}

async function handleModalSave(e) {
  e.preventDefault();
  var items = await API.getAnnouncements();

  var newItem = {
    id:      editingId || String(Date.now()),
    type:    modalForm.elements['m-type'].value,
    icon:    modalForm.elements['m-icon'].value.trim() || '📢',
    title:   modalForm.elements['m-title'].value.trim(),
    date:    modalForm.elements['m-date'].value,
    content: modalForm.elements['m-content'].value.trim()
  };

  if (editingId) {
    var idx = items.findIndex(function (i) { return i.id === editingId; });
    if (idx > -1) items[idx] = newItem;
  } else {
    items.unshift(newItem);
  }

  API.saveAnnouncements(items);
  closeModal();
  await renderAdminList();
  showToast(editingId ? 'Đã cập nhật thông báo.' : 'Đã đăng thông báo mới!');
}

async function deleteAnnounce(id) {
  if (!confirm('Xóa thông báo này?')) return;
  var items = await API.getAnnouncements();
  var filtered = items.filter(function (i) { return i.id !== id; });
  API.saveAnnouncements(filtered);
  await renderAdminList();
  showToast('Đã xóa thông báo.', 'error');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
