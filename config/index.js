import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

export const config = {
  token: process.env.TOKEN,
  adminIds: (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),
  webAppUrl: process.env.WEB_APP_URL || 'https://famelack.com',
  botName: process.env.BOT_NAME || 'WATCH TV/RADIO',
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: resolve(ROOT, process.env.DB_PATH || './database/bot.db'),
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: resolve(ROOT, process.env.LOG_DIR || './logs'),
  cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  version: '1.0.0',
  startTime: Date.now(),
};

if (!config.token) {
  console.error('[FATAL] TOKEN is not set in environment variables');
  process.exit(1);
}

export default config;
