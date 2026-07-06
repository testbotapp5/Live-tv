import { t } from '../utils/i18n.js';
import { getSystemInfo, formatUptime } from '../utils/helpers.js';
import analyticsService from '../services/analytics.js';
import logger from '../services/logger.js';

export async function handlePing(ctx) {
  const lang = ctx.session?.language || ctx.from?.language_code || 'en';
  const userId = ctx.from?.id;
  analyticsService.trackPing(userId);
  logger.info('Ping', { userId });

  const start = Date.now();
  const msg = await ctx.reply(t(lang, 'ping.measuring'));
  const latency = Date.now() - start;
  const info = getSystemInfo();

  await ctx.api.editMessageText(
    ctx.chat.id,
    msg.message_id,
    t(lang, 'ping.result', {
      latency,
      uptime: info.uptime,
      ram: info.ram,
      cpu: info.cpu,
      version: info.version,
    }),
    { parse_mode: 'HTML' },
  );
}

export default handlePing;
