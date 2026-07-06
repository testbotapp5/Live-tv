import { isUserBanned, upsertUser } from '../database/index.js';
import { t } from '../utils/i18n.js';
import logger from '../services/logger.js';
import { isAdmin } from '../utils/helpers.js';

export async function authMiddleware(ctx, next) {
  const user = ctx.from;
  if (!user) return next();

  try {
    upsertUser(user);
  } catch (err) {
    logger.error('authMiddleware upsertUser error', { userId: user.id, err: err.message });
  }

  if (isUserBanned(user.id)) {
    const lang = ctx.session?.language || ctx.from?.language_code || 'en';
    await ctx.reply(t(lang, 'errors.banned')).catch(() => {});
    logger.warn(`Banned user attempted access: ${user.id}`);
    return;
  }

  return next();
}

export function requireAdmin(ctx, next) {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) {
    const lang = ctx.session?.language || 'en';
    return ctx.reply(t(lang, 'errors.not_admin')).catch(() => {});
  }
  return next();
}

export default authMiddleware;
