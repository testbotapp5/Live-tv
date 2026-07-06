import { InlineKeyboard } from 'grammy';
import { getCountriesPage, getTotalPages } from './countries.js';
import { t } from './i18n.js';
import config from '../config/index.js';

// ─── Country selection keyboard ───────────────────────────────────────────────

export function buildCountryKeyboard(lang, page = 0) {
  const items = getCountriesPage(page);
  const total = getTotalPages();
  const kb = new InlineKeyboard();

  // Countries in 2-column grid — use .text() + .row() to avoid empty leading row
  for (let i = 0; i < items.length; i += 2) {
    kb.text(`${items[i].flag} ${items[i].name}`, `country:${items[i].code}`);
    if (items[i + 1]) {
      kb.text(`${items[i + 1].flag} ${items[i + 1].name}`, `country:${items[i + 1].code}`);
    }
    kb.row();
  }

  // Navigation row
  if (page > 0) kb.text('◀️', `country_page:${page - 1}`);
  kb.text(`${page + 1}/${total}`, 'noop');
  if (page < total - 1) kb.text('▶️', `country_page:${page + 1}`);
  kb.row();

  // Search button
  kb.text(t(lang, 'buttons.search'), 'country_search');

  return kb;
}

export function buildSearchResultsKeyboard(lang, results) {
  const kb = new InlineKeyboard();
  for (let i = 0; i < results.length; i += 2) {
    kb.text(`${results[i].flag} ${results[i].name}`, `country:${results[i].code}`);
    if (results[i + 1]) {
      kb.text(`${results[i + 1].flag} ${results[i + 1].name}`, `country:${results[i + 1].code}`);
    }
    kb.row();
  }
  kb.text(t(lang, 'buttons.back'), 'country_page:0');
  return kb;
}

// ─── Main menu keyboard ───────────────────────────────────────────────────────

export function buildMainMenuKeyboard(lang) {
  // .webApp() appends to the initial empty row — no leading empty row
  return new InlineKeyboard().webApp(t(lang, 'buttons.watch_tv'), config.webAppUrl);
}

export function buildMainMenuKeyboardFallback(lang) {
  return new InlineKeyboard().url(t(lang, 'buttons.watch_tv'), config.webAppUrl);
}

// ─── Language selection keyboard ──────────────────────────────────────────────

export const LANGUAGE_LIST = [
  { code: 'uz', flag: '🇺🇿', name: "O'zbek" },
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
  { code: 'fa', flag: '🇮🇷', name: 'فارسی' },
];

export function buildLanguageKeyboard(currentLang) {
  const kb = new InlineKeyboard();
  for (let i = 0; i < LANGUAGE_LIST.length; i += 2) {
    const a = LANGUAGE_LIST[i];
    const b = LANGUAGE_LIST[i + 1];
    kb.text(
      `${a.flag} ${a.name}${currentLang === a.code ? ' ✅' : ''}`,
      `setlang:${a.code}`,
    );
    if (b) {
      kb.text(
        `${b.flag} ${b.name}${currentLang === b.code ? ' ✅' : ''}`,
        `setlang:${b.code}`,
      );
    }
    // Start new row only if there are more items after this pair
    if (i + 2 < LANGUAGE_LIST.length) kb.row();
  }
  return kb;
}

// ─── Admin panel keyboard ─────────────────────────────────────────────────────

export function buildAdminPanelKeyboard(lang) {
  return new InlineKeyboard()
    .text(t(lang, 'admin.btn_stats'),           'admin:stats')
    .text(t(lang, 'admin.btn_broadcast'),        'admin:broadcast').row()
    .text(t(lang, 'admin.btn_users'),            'admin:users')
    .text(t(lang, 'admin.btn_analytics'),        'admin:analytics').row()
    .text(t(lang, 'admin.btn_ban'),              'admin:ban')
    .text(t(lang, 'admin.btn_unban'),            'admin:unban').row()
    .text(t(lang, 'admin.btn_search_user'),      'admin:search_user')
    .text(t(lang, 'admin.btn_send_msg'),         'admin:send_msg').row()
    .text(t(lang, 'admin.btn_mandatory_channel'),'admin:mandatory')
    .text(t(lang, 'admin.btn_settings'),         'admin:settings').row()
    .text(t(lang, 'admin.btn_db'),               'admin:db')
    .text(t(lang, 'admin.btn_logs'),             'admin:logs').row()
    .text(t(lang, 'admin.btn_restart'),          'admin:restart')
    .text(t(lang, 'admin.btn_backup'),           'admin:backup').row()
    .text(t(lang, 'admin.btn_export'),           'admin:export')
    .text(t(lang, 'admin.btn_cache'),            'admin:cache').row()
    .text(t(lang, 'admin.btn_close'),            'admin:close');
}

// ─── Broadcast confirm keyboard ───────────────────────────────────────────────

export function buildBroadcastConfirmKeyboard(lang) {
  return new InlineKeyboard()
    .text(t(lang, 'admin.btn_confirm_broadcast'), 'broadcast:confirm')
    .text(t(lang, 'buttons.cancel'),              'broadcast:cancel');
}

// ─── Cancel keyboard ──────────────────────────────────────────────────────────

export function buildCancelKeyboard(lang, callbackData = 'cancel') {
  return new InlineKeyboard().text(t(lang, 'buttons.cancel'), callbackData);
}

// ─── Back keyboard ────────────────────────────────────────────────────────────

export function buildBackKeyboard(lang, target = 'admin:panel') {
  return new InlineKeyboard().text(t(lang, 'buttons.back'), target);
}

export default {
  buildCountryKeyboard,
  buildSearchResultsKeyboard,
  buildMainMenuKeyboard,
  buildMainMenuKeyboardFallback,
  buildLanguageKeyboard,
  buildAdminPanelKeyboard,
  buildBroadcastConfirmKeyboard,
  buildCancelKeyboard,
  buildBackKeyboard,
};
