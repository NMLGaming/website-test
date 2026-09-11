# LayoutView Sender — Vercel Web

This folder is the minimal static frontend export for Vercel.

## Deploy

1. Upload only the contents of this folder to a new GitHub repository, or set this folder as the Vercel project root.
2. Before deploying, edit `config.js` and set:

```js
window.__LAYOUTVIEW_API_URL__ = "https://your-public-api-server.example.com";
```

3. Deploy the folder as a Vercel static site.

The Discord bot API must run separately on an always-on server. Vercel hosts this web frontend only.