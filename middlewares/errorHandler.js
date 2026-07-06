import logger from '../services/logger.js';
import { t } from '../utils/i18n.js';
import analyticsService from '../services/analytics.js';

/**
 * grammY error handler — receives a BotError instance.
 * ctx lives at err.ctx; the original error at err.error.
 */
export async function errorHandler(botErr) {
  const err = botErr?.error ?? botErr;
  const ctx = botErr?.ctx;

  const userId = ctx?.from?.id;
  const lang   = ctx?.session?.language ?? ctx?.from?.language_code ?? 'en';

  logger.error('Bot error', {
    userId,
    error: err?.message,
    stack: err?.stack,
    update: ctx?.update ? JSON.stringify(ctx.update).slice(0, 200) : undefined,
  });

  if (userId) {
    try { analyticsService.trackError(userId, err?.message); } catch { /* swallow */ }
  }

  // Suppress noisy Telegram API errors that don't need a user reply
  const msg = err?.message ?? '';
  if (
    msg.includes('message is not modified') ||
    msg.includes('query is too old') ||
    msg.includes('MESSAGE_ID_INVALID') ||
    msg.includes('bot was blocked') ||
    msg.includes('user is deactivated')
  ) {
    return;
  }

  if (ctx) {
    try {
      await ctx.reply(t(lang, 'errors.generic')).catch(() => {});
    } catch {
      // swallow — never let the error handler itself throw
    }
  }
}

export default errorHandler;
