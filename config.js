/*
 * Leave this empty when deploying the included Vercel API.
 * The API keeps the bot token in an HttpOnly cookie and talks to Discord
 * server-side, so the token is not stored in localStorage or exposed again
 * to the page after connection.
 *
 * If you already run the original always-on bot API, replace the empty
 * string with its public URL, for example:
 * window.__LAYOUTVIEW_API_URL__ = "https://bot-api.example.com";
 */
window.__LAYOUTVIEW_API_URL__ = "";

/*
 * The original minified UI intentionally showed the same message for every
 * failure. Keep the token private, but surface the HTTP/network reason so a
 * bad Vercel route is not mistaken for a bad token.
 */
(function exposeApiReason() {
  const nativeFetch = window.fetch.bind(window);
  window.__LAYOUTVIEW_LAST_API_ERROR__ = "";

  window.fetch = async function layoutViewFetch(input, init) {
    try {
      const response = await nativeFetch(input, init);
      if (!response.ok) {
        window.__LAYOUTVIEW_LAST_API_ERROR__ =
          `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
        response
          .clone()
          .text()
          .then((raw) => {
            try {
              const data = JSON.parse(raw);
              const detail = data.message || data.error;
              if (detail) {
                window.__LAYOUTVIEW_LAST_API_ERROR__ += ` — ${String(detail).slice(0, 180)}`;
                window.dispatchEvent(new Event("layoutview-api-error"));
              }
            } catch {
              /* Keep the useful HTTP status when the server returned HTML. */
            }
          })
          .catch(() => {});
      } else {
        window.__LAYOUTVIEW_LAST_API_ERROR__ = "";
      }
      return response;
    } catch (error) {
      window.__LAYOUTVIEW_LAST_API_ERROR__ =
        `Network error${error?.message ? ` — ${error.message}` : ""}`;
      throw error;
    }
  };

  const showReason = (node) => {
    const reason = window.__LAYOUTVIEW_LAST_API_ERROR__;
    if (!reason || node.dataset.reasonShown === reason) return;
    node.textContent = `Connection failed: ${reason}`;
    node.dataset.reasonShown = reason;
  };

  window.addEventListener("layoutview-api-error", () => {
    document.querySelectorAll(".error-note").forEach(showReason);
  });
  const observer = new MutationObserver(() => {
    document.querySelectorAll(".error-note").forEach(showReason);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();