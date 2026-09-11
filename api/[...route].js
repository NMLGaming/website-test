/*
 * Minimal same-origin Discord bridge for the Vercel export.
 *
 * The browser sends the token once to /api/bot/connect. We validate it with
 * Discord and keep it in an HttpOnly cookie. Every later request reads that
 * cookie server-side, so the token never needs to be placed in a query string,
 * localStorage, or a client-side Authorization header.
 */

const DISCORD_API = "https://discord.com/api/v10";
const TOKEN_COOKIE = "layoutview_bot_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function json(res, status, payload, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index < 0) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

async function bodyFrom(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function normaliseToken(token) {
  const value = String(token || "").trim();
  return value.replace(/^Bot\s+/i, "").trim();
}

function discordHeaders(token, extra = {}) {
  return {
    Authorization: `Bot ${token}`,
    Accept: "application/json",
    ...extra,
  };
}

async function discord(token, path, options = {}) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: discordHeaders(token, options.headers),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.detail ||
      (response.status === 401
        ? "Discord rejected this bot token."
        : `Discord returned HTTP ${response.status}.`);
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function routeName(req) {
  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  return url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
}

function tokenFrom(req) {
  return normaliseToken(parseCookies(req.headers.cookie)[TOKEN_COOKIE]);
}

function authError(res) {
  return json(res, 401, {
    error: "not_connected",
    message: "Connect a Discord bot before using this workspace.",
  });
}

function cookieFor(token) {
  return `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie() {
  return `${TOKEN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function handle(req, res) {
  const route = routeName(req);
  const method = (req.method || "GET").toUpperCase();

  if (route === "bot/connect" && method === "POST") {
    const input = await bodyFrom(req);
    const token = normaliseToken(input.token);
    if (token.length < 20) {
      return json(res, 400, {
        error: "invalid_token",
        message: "Paste a valid Discord bot token.",
      });
    }

    try {
      const bot = await discord(token, "/users/@me");
      if (bot?.bot === false) {
        return json(res, 400, {
          error: "not_a_bot",
          message: "This credential belongs to a user, not a Discord bot.",
        });
      }
      return json(
        res,
        200,
        {
          connected: true,
          bot: {
            id: bot.id,
            username: bot.username,
            globalName: bot.global_name || null,
          },
        },
        { "Set-Cookie": cookieFor(token) },
      );
    } catch (error) {
      return json(res, error.status === 401 ? 401 : 502, {
        error: "discord_auth_failed",
        message: error.message,
      });
    }
  }

  if (route === "bot/disconnect" && method === "POST") {
    return json(res, 200, { connected: false }, { "Set-Cookie": clearCookie() });
  }

  const token = tokenFrom(req);
  if (!token) return authError(res);

  try {
    if (route === "bot/status" && method === "GET") {
      const bot = await discord(token, "/users/@me");
      return json(res, 200, {
        connected: true,
        bot: { id: bot.id, username: bot.username, globalName: bot.global_name || null },
      });
    }

    if (route === "bot/guilds" && method === "GET") {
      const guilds = await discord(token, "/users/@me/guilds");
      return json(res, 200, guilds);
    }

    const channelsMatch = route.match(/^bot\/guilds\/([^/]+)\/channels$/);
    if (channelsMatch && method === "GET") {
      const guildId = encodeURIComponent(channelsMatch[1]);
      const channels = await discord(token, `/guilds/${guildId}/channels`);
      return json(
        res,
        200,
        channels.filter((channel) => channel.type === 0 || channel.type === 5),
      );
    }

    if (route === "messages/send" && method === "POST") {
      const input = await bodyFrom(req);
      if (!input.channelId || !input.layout?.components) {
        return json(res, 400, {
          error: "invalid_message",
          message: "A channel and a valid LayoutView object are required.",
        });
      }

      const message = await discord(
        token,
        `/channels/${encodeURIComponent(input.channelId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flags: 1 << 15,
            components: input.layout.components,
          }),
        },
      );

      return json(res, 200, {
        id: message.id,
        status: "sent",
        guildId: input.guildId || null,
        channelId: input.channelId,
        channelName: null,
        createdAt: new Date().toISOString(),
      });
    }

    /*
     * Vercel functions do not stay alive as a scheduler. Keep the endpoint
     * explicit so the UI can still load safely, while the README points
     * scheduled delivery to the original always-on API.
     */
    if (route === "messages/schedules") {
      return json(res, 501, {
        error: "scheduler_requires_worker",
        message: "Scheduled delivery requires the always-on bot API.",
      });
    }

    return json(res, 404, { error: "not_found", message: "API route not found." });
  } catch (error) {
    return json(res, error.status || 502, {
      error: "discord_request_failed",
      message: error.message || "Discord request failed.",
    });
  }
}

module.exports = handle;