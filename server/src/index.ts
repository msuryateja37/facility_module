import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import * as db from './data/dbConnector';

import authRoutes from './routes/authRoutes';
import reviewRoutes from './routes/reviewRoutes';
import archiveRoutes from './routes/archiveRoutes';
import logRoutes from './routes/logRoutes';
import aiRoutes from './routes/aiRoutes';

const app = express();
const PORT = process.env.PORT || 5500;

// Ensure uploads folder exists in base server directory
const uploadsDir = process.env.HOME
  ? path.join(process.env.HOME, 'uploads')
  : path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Register MVC Routers
app.use('/api', authRoutes);
app.use('/api', reviewRoutes);
app.use('/api', archiveRoutes);
app.use('/api', logRoutes);
app.use('/api', aiRoutes);

// Serve health status
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// ─── Production: serve compiled Vite frontend ───────────────────────────────
// In Azure deployment the Vite build is placed at dist-server/public/
// (see the packaging step in the CI/CD workflow).
const clientBuildDir = path.join(__dirname, 'public');
if (fs.existsSync(clientBuildDir)) {
  app.use(express.static(clientBuildDir));
  // SPA fallback — all non-API GET requests return index.html
  app.use((req: Request, res: Response, next) => {
    const isApi = req.path.startsWith('/api');
    const isUploads = req.path.startsWith('/uploads');
    const hasExtension = path.extname(req.path) !== '';
    
    if (req.method === 'GET' && !isApi && !isUploads && !hasExtension) {
      res.sendFile(path.join(clientBuildDir, 'index.html'));
    } else {
      next();
    }
  });
}

// Initialize database connection & start server
const startServer = async () => {
  await db.initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch(err => {
  console.error("Critical error starting Express backend server", err);
});
