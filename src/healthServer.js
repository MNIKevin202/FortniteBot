const http = require("node:http");

function startHealthServer(port) {
  const server = http.createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, service: "FortniteBot" }));
      return;
    }

    response.writeHead(200, { "content-type": "text/plain" });
    response.end("FortniteBot is running.\n");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Health server listening on port ${port}`);
  });

  return server;
}

module.exports = {
  startHealthServer,
};
