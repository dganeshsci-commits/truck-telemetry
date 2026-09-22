import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', environment: process.env.NODE_ENV });
  });

  app.post('/api/inference/frame', async (req, res) => {
    console.log('Received inference request');
    try {
      const { image, driverId, vehicleId } = req.body;
      if (!image) {
        console.warn('No image in request');
        return res.status(400).json({ error: 'No image provided' });
      }

      console.log('Proxying to Python backend...');
      // Proxy request to the local Python backend
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python backend error: ${errorText}`);
      }
      
      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error('Inference error:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
