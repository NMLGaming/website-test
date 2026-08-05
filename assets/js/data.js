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
    if (!res.ok) throw new Error('Failed to load announcements');
    return res.json();
  }

  // ---- Leaderboard ----

  async function getLeaderboard(server) {
    const res = await fetch('/api/auth/data?resource=leaderboard&server=' + encodeURIComponent(server));
    if (!res.ok) throw new Error('Failed to load leaderboard');
    return res.json();
  }

  // ---- Minecraft avatar ----

  function getAvatarUrl(username) {
    return 'https://crafatar.com/avatars/' + encodeURIComponent(username) + '?size=64&overlay=true&default=MHF_Steve';
  }

  function getFallbackAvatar() {
    return 'https://crafatar.com/avatars/MHF_Steve?size=64&overlay=true';
  }

  return { getAnnouncements, getLeaderboard, getAvatarUrl, getFallbackAvatar };
})();
