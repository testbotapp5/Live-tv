import { setUserLanguage } from '../database/index.js';
import { cacheService } from '../services/cache.js';
import { t } from '../utils/i18n.js';
import { buildLanguageKeyboard } from '../utils/keyboard.js';
import analyticsService from '../services/analytics.js';
import logger from '../services/logger.js';

export async function handleLanguageCommand(ctx) {
  const lang = ctx.session?.language || ctx.from?.language_code || 'en';
  const kb = buildLanguageKeyboard(lang);
  await ctx.reply(t(lang, 'language.select'), { reply_markup: kb });
}

export async function handleSetLanguageCallback(ctx) {
  const newLang = ctx.match[1];
  const userId = ctx.from.id;

  ctx.session.language = newLang;
  setUserLanguage(userId, newLang);
  cacheService.del(cacheService.langKey(userId));
  analyticsService.trackLanguageSet(userId, newLang);

  logger.info('Language changed', { userId, lang: newLang });

  const kb = buildLanguageKeyboard(newLang);
  await ctx.editMessageText(t(newLang, 'language.changed'), { reply_markup: kb }).catch(() => {});
  await ctx.answerCallbackQuery(t(newLang, 'language.changed_notify'));
}

export default { handleLanguageCommand, handleSetLanguageCallback };
