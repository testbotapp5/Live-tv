import { cacheService } from '../services/cache.js';
import { t } from '../utils/i18n.js';
import config from '../config/index.js';
import logger from '../services/logger.js';
import { isAdmin } from '../utils/helpers.js';

const FLOOD_THRESHOLD = 5;
const FLOOD_WINDOW = 3; // seconds

export async function rateLimitMiddleware(ctx, next) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // Admins are exempt
  if (isAdmin(userId)) return next();

  const now = Date.now();
  const floodKey = `flood:${userId}`;
  const limitKey = `rl:${userId}`;

  // ─── Flood protection (burst within 3s) ───────────────────────────────────
  const floodData = cacheService.get(floodKey) || { count: 0, start: now };
  if (now - floodData.start < FLOOD_WINDOW * 1000) {
    floodData.count += 1;
    cacheService.set(floodKey, floodData, FLOOD_WINDOW);
    if (floodData.count > FLOOD_THRESHOLD) {
      logger.warn(`Flood detected for user ${userId}`);
      const lang = ctx.session?.language || ctx.from?.language_code || 'en';
      await ctx.reply(t(lang, 'errors.flood_wait')).catch(() => {});
      return;
    }
  } else {
    cacheService.set(floodKey, { count: 1, start: now }, FLOOD_WINDOW);
  }

  // ─── Rate limit (requests per window) ─────────────────────────────────────
  const rl = cacheService.get(limitKey) || { count: 0, reset: now + config.rateLimitWindow * 1000 };
  if (now > rl.reset) {
    cacheService.set(limitKey, { count: 1, reset: now + config.rateLimitWindow * 1000 }, config.rateLimitWindow);
  } else {
    rl.count += 1;
    if (rl.count > config.rateLimitMax) {
      const remaining = Math.ceil((rl.reset - now) / 1000);
      logger.warn(`Rate limit exceeded for user ${userId}`);
      const lang = ctx.session?.language || ctx.from?.language_code || 'en';
      await ctx.reply(t(lang, 'errors.rate_limit', { seconds: remaining })).catch(() => {});
      return;
    }
    cacheService.set(limitKey, rl, Math.ceil((rl.reset - now) / 1000));
  }

  return next();
}

export default rateLimitMiddleware;
