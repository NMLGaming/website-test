/**
 * data.js — Data layer.
 * All data access goes through this object.
 * To connect a real API, replace the fetch calls below.
 * The localStorage layer lets the admin panel write data
 * that the home page immediately reads back.
 */

const API = (function () {
  const BASE = '/assets/data';

  // ---- Announcements ----

  async function getAnnouncements() {
    // Admin writes go to localStorage first
    const stored = localStorage.getItem('vielist_announcements');
    if (stored) {
      try { return JSON.parse(stored); } catch (_) { /* fall through */ }
    }
    const res = await fetch(BASE + '/announcements.json');
    if (!res.ok) throw new Error('Failed to load announcements');
    return res.json();
  }

  function saveAnnouncements(list) {
    localStorage.setItem('vielist_announcements', JSON.stringify(list));
  }

  // ---- Leaderboard ----

  async function getLeaderboard(server) {
    // server: 'is7mc' | 'kingmc'
    const res = await fetch(BASE + '/leaderboard.json');
    if (!res.ok) throw new Error('Failed to load leaderboard');
    const data = await res.json();
    return data[server] || { pvp: [], king: [] };
  }

  // ---- Players ----

  async function getAllPlayers() {
    const res = await fetch(BASE + '/players.json');
    if (!res.ok) throw new Error('Failed to load players');
    return res.json();
  }

  async function searchPlayer(username) {
    const players = await getAllPlayers();
    return players.find(function (p) {
      return p.username.toLowerCase() === username.toLowerCase().trim();
    }) || null;
  }

  // ---- Minecraft avatar helper ----

  function getAvatarUrl(username) {
    // Crafatar public API — returns pixel-perfect Minecraft heads
    return 'https://crafatar.com/avatars/' + encodeURIComponent(username) + '?size=64&overlay=true&default=MHF_Steve';
  }

  function getFallbackAvatar() {
    return 'https://crafatar.com/avatars/MHF_Steve?size=64&overlay=true';
  }

  return { getAnnouncements, saveAnnouncements, getLeaderboard, searchPlayer, getAllPlayers, getAvatarUrl, getFallbackAvatar };
})();
