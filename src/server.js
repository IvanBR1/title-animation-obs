const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PUBLIC_ROOT = path.resolve(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function resolvePublicPath(pathname) {
  const routes = {
    '/': 'index.html',
    '/panel': 'panel/index.html',
    '/panel/': 'panel/index.html',
    '/visualizador': 'visualizador/index.html',
    '/visualizador/': 'visualizador/index.html'
  };
  const relativePath = routes[pathname] || pathname.replace(/^\/+/u, '');
  const filePath = path.resolve(PUBLIC_ROOT, relativePath);
  if (filePath !== PUBLIC_ROOT && !filePath.startsWith(`${PUBLIC_ROOT}${path.sep}`)) return null;
  return filePath;
}

function createServer() {
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname);
    } catch {
      response.writeHead(400).end('Solicitud inválida');
      return;
    }
    const filePath = resolvePublicPath(pathname);
    if (!filePath) {
      response.writeHead(403).end('Acceso denegado');
      return;
    }
    fs.stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) {
        response.writeHead(404).end('No encontrado');
        return;
      }
      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stats.size,
        'Cache-Control': 'no-cache'
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(filePath).pipe(response);
    });
  });
}

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`Panel: http://localhost:${PORT}/panel/`);
    console.log(`Visualizador OBS: http://localhost:${PORT}/visualizador/`);
  });
}

module.exports = { PUBLIC_ROOT, createServer, resolvePublicPath };
