/**
 * admin-api.js — VIELIST Admin API client.
 * All calls use credentials:include so cookies (JWT) are sent automatically.
 * Credentials (username/password) are NEVER stored in this file.
 *
 * All content operations use the grouped /api/auth/data function.
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
    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!res.ok) {
      throw new Error(data.error || raw || ('HTTP ' + res.status));
    }
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
    async getAnnouncements() {
      const payload = await _get('/api/auth/data?resource=announcements');
      return Array.isArray(payload) ? payload : (payload.data || []);
    },
    createAnnouncement(d)       { return _post('/api/auth/data?resource=announcements', d); },
    updateAnnouncement(id, d)   { return _put('/api/auth/data?resource=announcements&id=' + id, d); },
    deleteAnnouncement(id)      { return _del('/api/auth/data?resource=announcements&id=' + id); },

    // ---- King, campaigns and history ----
    getKing(server) { return _get('/api/auth/data?resource=king&server=' + server); },
    addKing(server, d) { return _post('/api/auth/data?resource=king&server=' + server, d); },
    updateKing(server, d) { return _put('/api/auth/data?resource=king&server=' + server, d); },
    getHistory(server) { return _get('/api/auth/data?resource=history&server=' + server); },
    endKing(server, d) { return _post('/api/auth/data?resource=history&server=' + server, d); },
    deleteHistory(server, d) { return _req('DELETE', '/api/auth/data?resource=history&server=' + server, d); },
    getCampaigns(server) { return _get('/api/auth/data?resource=campaigns&server=' + server); },
    createCampaign(server, d) { return _post('/api/auth/data?resource=campaigns&server=' + server, d); },
    updateCampaign(server, d) { return _put('/api/auth/data?resource=campaigns&server=' + server, d); },
    deleteCampaign(server, d) { return _req('DELETE', '/api/auth/data?resource=campaigns&server=' + server, d); },
    addCandidate(campaignId, d) { return _post('/api/auth/data?resource=candidates&campaign_id=' + campaignId, d); },
    updateCandidate(campaignId, d) { return _put('/api/auth/data?resource=candidates&campaign_id=' + campaignId, d); },
    deleteCandidate(campaignId, d) { return _req('DELETE', '/api/auth/data?resource=candidates&campaign_id=' + campaignId, d); },

    // ---- Settings ----
    async getSettings() {
      const remote = await _get('/api/auth/data?resource=settings');
      try {
        return Object.assign({}, remote, JSON.parse(localStorage.getItem('vielist_settings') || '{}'));
      } catch (_) {
        return remote;
      }
    },
    async updateSettings(d) {
      try {
        const saved = await _put('/api/auth/data?resource=settings', d);
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
    getStats() { return _get('/api/auth/data?resource=stats'); },
  };
})();
