const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const baseDir = __dirname;
const distDir = path.join(baseDir, "MVP", "dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const sendJson = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
};

const resolveSafePath = (rootDir, requestPath) => {
  const clean = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const finalPath = path.join(rootDir, clean);
  if (!finalPath.startsWith(rootDir)) return null;
  return finalPath;
};

const serveFile = (res, filePath) => {
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Caminho inválido");
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Arquivo não encontrado");
      }
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Erro interno do servidor");
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": mimeType,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000"
    });
    res.end(content);
  });
};

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split("?")[0];

  if (cleanUrl.startsWith("/api/status")) {
    return sendJson(res, 200, {
      ok: true,
      message: "Servidor ativo e pronto para o workspace",
      timestamp: new Date().toISOString()
    });
  }

  if (cleanUrl === "/duo-catalog" || cleanUrl === "/duo-catalog/") {
    const duoIndex = resolveSafePath(distDir, "index.html");
    return serveFile(res, duoIndex);
  }

  if (
    cleanUrl === "/vite.svg" ||
    cleanUrl.startsWith("/assets/") ||
    cleanUrl.startsWith("/pre_order_imagens/")
  ) {
    const distPath = resolveSafePath(distDir, cleanUrl.replace(/^\//, ""));
    return serveFile(res, distPath);
  }

  const requestPath = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const filePath = resolveSafePath(baseDir, requestPath);
  return serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
