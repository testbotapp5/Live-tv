import express from 'express';
import { getStats, getDbSize } from '../database/index.js';
import { cacheService } from './cache.js';
import config from '../config/index.js';
import logger from './logger.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  const uptime = Math.floor((Date.now() - config.startTime) / 1000);
  res.json({
    status: 'ok',
    uptime,
    version: config.version,
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

app.get('/stats', (_req, res) => {
  try {
    const stats = getStats();
    const cacheStats = cacheService.stats();
    const mem = process.memoryUsage();
    res.json({
      users: stats,
      cache: cacheStats,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024) + ' MB',
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
      },
      dbSize: Math.round(getDbSize() / 1024) + ' KB',
      uptime: Math.floor((Date.now() - config.startTime) / 1000) + 's',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/ping', (_req, res) => {
  res.send('pong');
});

export function startHealthServer() {
  app.listen(config.port, () => {
    logger.info(`Health server running on port ${config.port}`);
  });
}

export default app;
