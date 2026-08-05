/**
 * admin-api.js — VIELIST Admin API client.
 * All calls use credentials:include so cookies (JWT) are sent automatically.
 * Credentials (username/password) are NEVER stored in this file.
 *
 * URL pattern sau khi gộp API:
 *   /api/auth/[action]               — auth
 *   /api/announcements               — list/create
 *   /api/announcements?id=<id>       — update/delete
 *   /api/leaderboard?server=<s>      — list/create
 *   /api/leaderboard?server=<s>&id=<i> — update/delete
 *   /api/players                     — list/create
 *   /api/players?id=<id>             — update/delete
 *   /api/settings                    — get/update
 *   /api/stats                       — get
 */

'use strict';

const AdminAPI = (function () {

  // ---- Shared fetch helpers ----

  async function _req(method, url, body) {
    const opts = {
      method: method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    let data;
    try { data = await res.json(); } catch (_) { data = {}; }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  const _get  = (url)       => _req('GET',    url, null);
  const _post = (url, body) => _req('POST',   url, body);
  const _put  = (url, body) => _req('PUT',    url, body);
  const _del  = (url)       => _req('DELETE', url, null);

  return {
    // ---- Auth ----
    login(username, password) { return _post('/api/auth/login', { username, password }); },
    logout()                  { return _post('/api/auth/logout', {}); },
    me()                      { return _get('/api/auth/me'); },

    // ---- Announcements ----
    getAnnouncements()          { return _get('/api/announcements'); },
    createAnnouncement(d)       { return _post('/api/announcements', d); },
    updateAnnouncement(id, d)   { return _put('/api/announcements?id=' + id, d); },
    deleteAnnouncement(id)      { return _del('/api/announcements?id=' + id); },

    // ---- Leaderboard ----
    getLeaderboard(server)         { return _get('/api/leaderboard?server=' + server); },
    addLbEntry(server, d)          { return _post('/api/leaderboard?server=' + server, d); },
    updateLbEntry(server, id, d)   { return _put('/api/leaderboard?server=' + server + '&id=' + id, d); },
    deleteLbEntry(server, id)      { return _del('/api/leaderboard?server=' + server + '&id=' + id); },

    // ---- Players ----
    getPlayers()        { return _get('/api/players'); },
    createPlayer(d)     { return _post('/api/players', d); },
    updatePlayer(id, d) { return _put('/api/players?id=' + id, d); },
    deletePlayer(id)    { return _del('/api/players?id=' + id); },

    // ---- Settings ----
    async getSettings() {
      const remote = await _get('/api/settings');
      try {
        return Object.assign({}, remote, JSON.parse(localStorage.getItem('vielist_settings') || '{}'));
      } catch (_) {
        return remote;
      }
    },
    async updateSettings(d) {
      try {
        const saved = await _put('/api/settings', d);
        localStorage.removeItem('vielist_settings');
        return saved;
      } catch (e) {
        // Keep the admin panel useful in the ZIP/demo version without a database.
        if (e.message === 'Database not configured' || e.message.indexOf('HTTP 503') === 0) {
          const current = JSON.parse(localStorage.getItem('vielist_settings') || '{}');
          const saved = Object.assign({}, current, d);
          localStorage.setItem('vielist_settings', JSON.stringify(saved));
          return saved;
        }
        throw e;
      }
    },

    // ---- Stats ----
    getStats() { return _get('/api/stats'); },
  };
})();
