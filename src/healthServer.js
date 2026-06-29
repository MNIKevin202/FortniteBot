const http = require("node:http");

const callbackPaths = new Set([
  "/auth/discord/callback",
  "/oauth/discord/callback",
  "/discord/callback",
]);

function startHealthServer(port) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, service: "FortniteBot" }));
      return;
    }

    if (callbackPaths.has(url.pathname)) {
      sendDiscordCallbackPage(response, url);
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderPage({
      title: "FortniteBot",
      heading: "FortniteBot is running.",
      body: "<p>The Discord bot service is online.</p>",
    }));
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Health server listening on port ${port}`);
  });

  return server;
}

function sendDiscordCallbackPage(response, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
    response.end(renderPage({
      title: "Discord Authorization Failed",
      heading: "Discord authorization failed.",
      body: `
        <p>${escapeHtml(errorDescription || error)}</p>
        <p>You can close this tab and try again.</p>
      `,
    }));
    return;
  }

  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(renderPage({
    title: "Discord Authorization Complete",
    heading: code ? "Discord authorization received." : "Discord callback is ready.",
    body: code
      ? `
        <p>Your Discord authorization code was received by FortniteBot.</p>
        ${state ? `<p class="meta">State: ${escapeHtml(state)}</p>` : ""}
        <p>You can close this tab.</p>
      `
      : "<p>This is the public Discord OAuth redirect URI for FortniteBot.</p>",
  }));
}

function renderPage({ title, heading, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #101318;
        color: #f3f6fb;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      main {
        width: min(100%, 560px);
        border: 1px solid #28313d;
        border-radius: 8px;
        background: #171c23;
        padding: 28px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.15;
      }
      p {
        margin: 10px 0 0;
        color: #bfccdc;
        line-height: 1.5;
      }
      .meta {
        overflow-wrap: anywhere;
        color: #8fa1b7;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(heading)}</h1>
      ${body}
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

module.exports = {
  startHealthServer,
};
