# LayoutView Sender — Vercel

This is a small Vercel deployment that includes the web UI and a serverless
Discord API bridge. The previous export only contained the UI, so requests to
`/api/bot/connect` were rewritten to `index.html`; even a valid token then
looked like a failed connection.

## Deploy

1. Upload the contents of this folder to a GitHub repository or set this folder
   as the Vercel project root.
2. Deploy normally. Keep `config.js` empty to use the included `/api` function.
3. Paste a Discord **bot token** in the app. The token is validated by Discord
   server-side and kept in an HttpOnly cookie; it is not written to
   localStorage.

If you already run the original always-on bot API, set its public URL in
`config.js` instead:

```js
window.__LAYOUTVIEW_API_URL__ = "https://your-public-api-server.example.com";
```

The included bridge supports token validation, server/channel discovery, and
sending Components V2 messages. Scheduled delivery still requires the
always-on API because Vercel functions are not a persistent worker.