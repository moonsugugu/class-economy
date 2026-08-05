import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import quotesHandler from './api/quotes.js';

function quotesApiPlugin() {
  const middleware = (req, res, next) => {
    const pathname = String(req.url || '').split('?')[0];
    if (pathname !== '/api/quotes') return next();

    const response = {
      setHeader(name, value) { res.setHeader(name, value); },
      status(code) { res.statusCode = code; return this; },
      json(payload) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
      },
      end() { res.end(); },
    };
    return quotesHandler(req, response);
  };

  return {
    name: 'quotes-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), quotesApiPlugin()],
  resolve: {
    alias: {
      'firebase/firestore': path.resolve(__dirname, 'src/lib/postgres-firestore.js'),
    },
  },
});
