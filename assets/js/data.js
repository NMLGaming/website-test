/**
 * data.js — Public data layer.
 * Calls the backend API. API functions fall back to JSON files
 * automatically when no DATABASE_URL is configured on the server.
 */

'use strict';

const API = (function () {

  // ---- Announcements ----

  async function getAnnouncements() {
    const res = await fetch('/api/announcements');
    if (!res.ok) throw new Error('Failed to load announcements');
    return res.json();
  }

  // ---- Leaderboard ----

  async function getLeaderboard(server) {
    const res = await fetch('/api/leaderboard/' + server);
    if (!res.ok) throw new Error('Failed to load leaderboard');
    return res.json();
  }

  // ---- Players ----

  async function searchPlayer(username) {
    const res = await fetch('/api/players?username=' + encodeURIComponent(username.trim()));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to search player');
    return res.json();
  }

  // ---- Minecraft avatar ----

  function getAvatarUrl(username) {
    return 'https://crafatar.com/avatars/' + encodeURIComponent(username) + '?size=64&overlay=true&default=MHF_Steve';
  }

  function getFallbackAvatar() {
    return 'https://crafatar.com/avatars/MHF_Steve?size=64&overlay=true';
  }

  return { getAnnouncements, getLeaderboard, searchPlayer, getAvatarUrl, getFallbackAvatar };
})();
