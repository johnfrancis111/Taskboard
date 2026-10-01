import 'dotenv/config'; // must stay first so env vars exist before other modules read them
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const here = path.dirname(fileURLToPath(import.meta.url));

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again in a few minutes.' },
  }),
  authRoutes
);
app.use('/api/tasks', taskRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// In production, serve the built React app from the same server.
const clientDist = path.join(here, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Malformed JSON and unexpected failures end up here.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
