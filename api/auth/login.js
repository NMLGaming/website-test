/**
 * /api/auth/login — REMOVED.
 * Login is now handled via Discord OAuth2.
 * See /api/auth/discord and /api/auth/callback.
 */
module.exports = function handler(req, res) {
  res.status(410).json({
    error: 'Username/password login đã bị xóa. Dùng /api/auth/discord để đăng nhập.',
    redirect: '/api/auth/discord',
  });
};
