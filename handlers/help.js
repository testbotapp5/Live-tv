import { t } from '../utils/i18n.js';
import analyticsService from '../services/analytics.js';
import logger from '../services/logger.js';

export async function handleHelp(ctx) {
  const lang = ctx.session?.language || ctx.from?.language_code || 'en';
  const userId = ctx.from?.id;
  analyticsService.trackHelp(userId);
  logger.info('Help requested', { userId });
  await ctx.reply(t(lang, 'help.text'), { parse_mode: 'HTML' });
}

export default handleHelp;
