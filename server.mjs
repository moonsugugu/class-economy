import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import quotesHandler from './api/quotes.js';

const root = resolve(process.cwd(), 'dist');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : null;
  return value && !value.startsWith('--') ? value : fallback;
};
const host = option('--host', process.env.HOST || '127.0.0.1');
const port = Number(option('--port', process.env.PORT || 4173));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const isInsideRoot = (filePath) => {
  const rel = relative(root, filePath);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith('\\'));
};

async function serveStatic(req, res, pathname) {
  let requested;
  try {
    requested = resolve(root, decodeURIComponent(pathname).replace(/^\/+/, ''));
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('잘못된 경로입니다.');
    return;
  }

  let filePath = requested;
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(root, 'index.html');
  }
  if (!isInsideRoot(filePath)) filePath = join(root, 'index.html');

  try {
    const info = await stat(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': extname(filePath).toLowerCase() === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Length': info.size,
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('앱을 준비하는 중입니다. 잠시 후 다시 시도해 주세요.');
  }
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  // 자동 배포 환경에 따라 뒤에 슬래시가 붙어도 정적 SPA 폴백보다 먼저 API를 처리합니다.
  if (pathname.replace(/\/+$/, '') === '/api/quotes') {
    const apiRes = {
      setHeader(name, value) { res.setHeader(name, value); },
      status(code) { res.statusCode = code; return apiRes; },
      json(payload) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
      },
      end(body) { res.end(body); },
    };
    try {
      await quotesHandler(req, apiRes);
    } catch (error) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: '시세 API를 처리하지 못했어요.' }));
      console.error('[quotes]', error?.message || error);
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, OPTIONS' });
    res.end();
    return;
  }
  await serveStatic(req, res, pathname);
});

server.listen(port, host, () => {
  console.log(`class-economy listening on http://${host}:${port}`);
});
