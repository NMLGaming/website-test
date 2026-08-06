/**
 * data.js — Public data layer.
 * Calls the single grouped content API. The server falls back to JSON files
 * automatically when no DATABASE_URL is configured.
 */

'use strict';

const API = (function () {

  // ---- Announcements ----

  async function getAnnouncements() {
    const res = await fetch('/api/auth/data?resource=announcements');
    const raw = await res.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!res.ok) throw new Error(payload.error || raw || 'Failed to load announcements');
    return Array.isArray(payload) ? payload : (payload.data || []);
  }

  async function getAnnouncementComments(id) {
    const res = await fetch('/api/auth/data?resource=announcement-comments&announcement_id=' + encodeURIComponent(id), { credentials: 'include' });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Không thể tải bình luận');
    return payload.data || [];
  }

  async function addAnnouncementComment(id, content) {
    const res = await fetch('/api/auth/data?resource=announcement-comments&announcement_id=' + encodeURIComponent(id), {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content })
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Không thể gửi bình luận');
    return payload;
  }

  // ---- Leaderboard ----

  async function getLeaderboard(server) {
    const res = await fetch('/api/auth/data?resource=leaderboard&server=' + encodeURIComponent(server));
    const raw = await res.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!res.ok) throw new Error(payload.error || raw || 'Failed to load leaderboard');
    return payload.data || payload;
  }

  // ---- Minecraft avatar ----

  function getAvatarUrl(username) {
    return 'https://crafatar.com/avatars/' + encodeURIComponent(username) + '?size=64&overlay=true&default=MHF_Steve';
  }

  function getFallbackAvatar() {
    return 'https://crafatar.com/avatars/MHF_Steve?size=64&overlay=true';
  }

  return { getAnnouncements, getAnnouncementComments, addAnnouncementComment, getLeaderboard, getAvatarUrl, getFallbackAvatar };
})();
