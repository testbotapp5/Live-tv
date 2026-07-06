import { getUser, setUserLanguage, setUserCountry } from '../database/index.js';
import { cacheService } from '../services/cache.js';
import { t } from '../utils/i18n.js';
import {
  buildCountryKeyboard,
  buildSearchResultsKeyboard,
  buildMainMenuKeyboard,
  buildMainMenuKeyboardFallback,
} from '../utils/keyboard.js';
import { findCountry, searchCountries, getTotalPages } from '../utils/countries.js';
import analyticsService from '../services/analytics.js';
import logger from '../services/logger.js';
import config from '../config/index.js';

export async function handleStart(ctx) {
  const userId = ctx.from.id;
  const lang = ctx.session?.language || 'en';
  analyticsService.trackStart(userId);
  logger.info('User started bot', { userId, username: ctx.from.username });

  const dbUser = getUser(userId);

  // If user already has language set, show main menu directly
  if (dbUser?.language && dbUser?.country) {
    ctx.session.language = dbUser.language;
    await showMainMenu(ctx);
    return;
  }

  // Show country selection
  await showCountrySelection(ctx, 0);
}

export async function showCountrySelection(ctx, page = 0) {
  const lang = ctx.session?.language || 'en';
  const kb = buildCountryKeyboard(lang, page);
  const text = t(lang, 'start.select_country');
  const opts = { reply_markup: kb, parse_mode: 'HTML' };

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
  } else {
    await ctx.reply(text, opts);
  }
}

export async function showMainMenu(ctx) {
  const lang = ctx.session?.language || 'en';
  const text = t(lang, 'main.welcome', { botName: config.botName });

  // Try WebApp button — fall back to URL button if Telegram rejects it
  async function send(kb) {
    const opts = { reply_markup: kb, parse_mode: 'HTML' };
    if (ctx.callbackQuery) {
      return ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
    }
    return ctx.reply(text, opts);
  }

  try {
    await send(buildMainMenuKeyboard(lang));
  } catch {
    await send(buildMainMenuKeyboardFallback(lang));
  }
}

// ─── Callback: country page navigation ───────────────────────────────────────

export async function handleCountryPage(ctx) {
  const page = parseInt(ctx.match[1], 10);
  await showCountrySelection(ctx, page);
  await ctx.answerCallbackQuery();
}

// ─── Callback: country search ─────────────────────────────────────────────────

export async function handleCountrySearchPrompt(ctx) {
  const lang = ctx.session?.language || 'en';
  await ctx.answerCallbackQuery();
  const sent = await ctx.reply(t(lang, 'start.search_prompt'));
  // Store message ID for cleanup
  ctx.session.awaitingSearch = true;
  ctx.session.searchPromptId = sent.message_id;
}

export async function handleCountrySearchText(ctx) {
  if (!ctx.session?.awaitingSearch) return;
  const lang = ctx.session?.language || 'en';
  const query = ctx.message.text.trim();

  ctx.session.awaitingSearch = false;

  if (!query || query.startsWith('/')) return;

  const results = searchCountries(query);
  if (results.length === 0) {
    await ctx.reply(t(lang, 'start.search_not_found', { query }));
    return;
  }

  const kb = buildSearchResultsKeyboard(lang, results);
  await ctx.reply(t(lang, 'start.search_results', { count: results.length }), { reply_markup: kb });
}

// ─── Callback: country selected ───────────────────────────────────────────────

export async function handleCountrySelected(ctx) {
  const countryCode = ctx.match[1];
  const userId = ctx.from.id;
  const country = findCountry(countryCode);

  if (!country) {
    await ctx.answerCallbackQuery();
    return;
  }

  const lang = country.lang;
  ctx.session.language = lang;
  ctx.session.awaitingSearch = false;

  // Persist to DB
  setUserLanguage(userId, lang);
  setUserCountry(userId, countryCode);

  // Invalidate language cache
  cacheService.del(cacheService.langKey(userId));

  analyticsService.trackCountrySet(userId, countryCode);
  analyticsService.trackLanguageSet(userId, lang);

  logger.info('User set country/language', { userId, countryCode, lang });

  await ctx.answerCallbackQuery();
  await showMainMenu(ctx);
}

// ─── noop callback ────────────────────────────────────────────────────────────

export async function handleNoop(ctx) {
  await ctx.answerCallbackQuery();
}
