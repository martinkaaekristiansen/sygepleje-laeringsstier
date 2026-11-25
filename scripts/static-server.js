import http from 'node:http';
import path from 'node:path';
import { readFile, realpath } from 'node:fs/promises';
const TYPES = {
  '.webp': 'image/webp',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};
export async function startStaticServer({ root, prefix = '/', port = 0, host = '127.0.0.1' }) {
  if (!/^\/(?:[\w.-]+\/)*$/.test(prefix)) throw Error('Invalid static prefix');
  const folder = await realpath(root);
  const server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end();
        return;
      }
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (!pathname.startsWith(prefix)) throw Error('Outside prefix');
      const name = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
      const file = await realpath(path.resolve(folder, name));
      if (!file.startsWith(folder + path.sep)) throw Error('Outside root');
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      if (!res.headersSent) res.writeHead(404);
      res.end('Ikke fundet');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  server.url = `http://127.0.0.1:${server.address().port}${prefix}`;
  return server;
}
