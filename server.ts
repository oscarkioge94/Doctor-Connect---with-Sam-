import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn } from 'child_process';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cookieParser());

// Start Python FastAPI backend as child process on port 8000
const backendPath = path.join(process.cwd(), 'backend');
console.log(`[Server] Spawning FastAPI backend process in ${backendPath}...`);

const pythonProcess = spawn('python3', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: backendPath,
  env: { ...process.env, PYTHONPATH: backendPath },
  stdio: 'inherit'
});

pythonProcess.on('error', (err) => {
  console.error('[Server] Failed to launch Python FastAPI backend:', err);
});

process.on('exit', () => {
  pythonProcess.kill();
});

// Proxy all /api requests to FastAPI server running on http://127.0.0.1:8000
app.use(
  '/api',
  createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    ws: false
  })
);

// Serve Vite Frontend in development / static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] MedFlow System Gateway running on http://localhost:${PORT} (Proxying /api -> FastAPI on :8000)`);
  });
}

startServer();
