import { t } from '../utils/i18n.js';
import analyticsService from '../services/analytics.js';
import logger from '../services/logger.js';
import config from '../config/index.js';

export async function handleAbout(ctx) {
  const lang = ctx.session?.language || ctx.from?.language_code || 'en';
  const userId = ctx.from?.id;
  analyticsService.trackAbout(userId);
  logger.info('About requested', { userId });
  await ctx.reply(
    t(lang, 'about.text', { botName: config.botName, version: config.version }),
    { parse_mode: 'HTML' },
  );
}

export default handleAbout;
