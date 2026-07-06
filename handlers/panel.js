import { getStats, getDbSize, getAllUsers, getUser } from '../database/index.js';
import { cacheService } from '../services/cache.js';
import { t } from '../utils/i18n.js';
import {
  buildAdminPanelKeyboard,
  buildBackKeyboard,
  buildCancelKeyboard,
} from '../utils/keyboard.js';
import { getSystemInfo, formatBytes, formatDate, escapeHtml } from '../utils/helpers.js';
import { requireAdmin } from '../middlewares/auth.js';
import analyticsService from '../services/analytics.js';
import logger from '../services/logger.js';
import { reloadLocales } from '../utils/i18n.js';
import config from '../config/index.js';

export async function handlePanel(ctx) {
  const userId = ctx.from?.id;
  const lang = ctx.session?.language || 'en';
  analyticsService.trackPanel(userId);
  logger.info('Admin panel opened', { userId });

  const text = t(lang, 'admin.panel_title');
  const kb = buildAdminPanelKeyboard(lang);
  await ctx.reply(text, { reply_markup: kb, parse_mode: 'HTML' });
}

export async function handlePanelCallback(ctx) {
  const action = ctx.match[1];
  const lang = ctx.session?.language || 'en';
  const userId = ctx.from?.id;

  logger.info('Admin action', { userId, action });

  try {
    switch (action) {
      case 'panel':
        await ctx.editMessageText(t(lang, 'admin.panel_title'), {
          reply_markup: buildAdminPanelKeyboard(lang),
          parse_mode: 'HTML',
        });
        break;

      case 'stats':
        await handleStatsAction(ctx, lang);
        break;

      case 'analytics':
        await handleAnalyticsAction(ctx, lang);
        break;

      case 'users':
        ctx.session.userPage = 0;
        await handleUsersAction(ctx, lang, 0);
        break;

      case 'db':
        await handleDbAction(ctx, lang);
        break;

      case 'logs':
        await handleLogsAction(ctx, lang);
        break;

      case 'restart':
        await ctx.editMessageText(t(lang, 'admin.restart_notice'), {
          reply_markup: buildBackKeyboard(lang),
        });
        await ctx.answerCallbackQuery(t(lang, 'admin.restarting'));
        logger.info('Admin triggered restart', { userId });
        setTimeout(() => process.exit(0), 1000);
        break;

      case 'backup':
        await handleBackupAction(ctx, lang);
        break;

      case 'export':
        await handleExportAction(ctx, lang);
        break;

      case 'cache':
        cacheService.flush();
        reloadLocales();
        await ctx.editMessageText(t(lang, 'admin.cache_cleared'), {
          reply_markup: buildBackKeyboard(lang),
        });
        logger.info('Cache cleared by admin', { userId });
        break;

      case 'settings':
        await handleSettingsAction(ctx, lang);
        break;

      case 'mandatory':
        await ctx.editMessageText(t(lang, 'admin.mandatory_info'), {
          reply_markup: buildBackKeyboard(lang),
          parse_mode: 'HTML',
        });
        break;

      case 'ban':
        ctx.session.awaitingBanId = true;
        await ctx.editMessageText(t(lang, 'admin.ban_prompt'), {
          reply_markup: buildCancelKeyboard(lang, 'admin:panel'),
        });
        break;

      case 'unban':
        ctx.session.awaitingUnbanId = true;
        await ctx.editMessageText(t(lang, 'admin.unban_prompt'), {
          reply_markup: buildCancelKeyboard(lang, 'admin:panel'),
        });
        break;

      case 'search_user':
        ctx.session.awaitingUserSearch = true;
        await ctx.editMessageText(t(lang, 'admin.search_user_prompt'), {
          reply_markup: buildCancelKeyboard(lang, 'admin:panel'),
        });
        break;

      case 'send_msg':
        ctx.session.awaitingSendMsgId = true;
        await ctx.editMessageText(t(lang, 'admin.send_msg_prompt'), {
          reply_markup: buildCancelKeyboard(lang, 'admin:panel'),
        });
        break;

      case 'broadcast':
        ctx.session.awaitingBroadcast = true;
        await ctx.editMessageText(t(lang, 'admin.broadcast_prompt'), {
          reply_markup: buildCancelKeyboard(lang, 'broadcast:cancel'),
        });
        break;

      case 'close':
        await ctx.deleteMessage().catch(() => {});
        break;

      default:
        await ctx.answerCallbackQuery();
    }
  } catch (err) {
    logger.error('Panel callback error', { action, err: err.message });
  }

  await ctx.answerCallbackQuery().catch(() => {});
}

// ─── Sub-actions ──────────────────────────────────────────────────────────────

async function handleStatsAction(ctx, lang) {
  const stats = await cacheService.getOrSet(cacheService.statsKey(), () => getStats(), 30);
  const sys = getSystemInfo();
  const text = t(lang, 'admin.stats_text', {
    total: stats.total,
    today: stats.today,
    yesterday: stats.yesterday,
    weekly: stats.weekly,
    monthly: stats.monthly,
    activeToday: stats.activeToday,
    activeWeek: stats.activeWeek,
    activeMonth: stats.activeMonth,
    banned: stats.banned,
    premium: stats.premium,
    dbSize: sys.dbSize,
    uptime: sys.uptime,
    ram: sys.ram,
    cpu: sys.cpu,
    version: sys.version,
  });
  await ctx.editMessageText(text, {
    reply_markup: buildBackKeyboard(lang),
    parse_mode: 'HTML',
  });
}

async function handleAnalyticsAction(ctx, lang) {
  const stats = getStats();
  const text = t(lang, 'admin.analytics_text', {
    total: stats.total,
    premium: stats.premium,
    banned: stats.banned,
    activeToday: stats.activeToday,
    activeWeek: stats.activeWeek,
    activeMonth: stats.activeMonth,
  });
  await ctx.editMessageText(text, {
    reply_markup: buildBackKeyboard(lang),
    parse_mode: 'HTML',
  });
}

async function handleUsersAction(ctx, lang, page) {
  const pageSize = 10;
  const allUsers = getAllUsers();
  const total = allUsers.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const users = allUsers.slice(page * pageSize, (page + 1) * pageSize);

  const { InlineKeyboard } = await import('grammy');
  const kb = new InlineKeyboard();

  users.forEach((u) => {
    const name = escapeHtml([u.first_name, u.last_name].filter(Boolean).join(' ') || 'N/A');
    kb.row(InlineKeyboard.text(`${u.id} — ${name}`, `user_info:${u.id}`));
  });

  if (page > 0) kb.text('◀️', `admin_users_page:${page - 1}`);
  kb.text(`${page + 1}/${totalPages}`, 'noop');
  if (page < totalPages - 1) kb.text('▶️', `admin_users_page:${page + 1}`);
  kb.row(InlineKeyboard.text(t(lang, 'buttons.back'), 'admin:panel'));

  await ctx.editMessageText(t(lang, 'admin.users_list', { total }), {
    reply_markup: kb,
    parse_mode: 'HTML',
  });
}

async function handleDbAction(ctx, lang) {
  const sys = getSystemInfo();
  const text = t(lang, 'admin.db_info', { dbSize: sys.dbSize, version: sys.version });
  await ctx.editMessageText(text, {
    reply_markup: buildBackKeyboard(lang),
    parse_mode: 'HTML',
  });
}

async function handleLogsAction(ctx, lang) {
  const { getLogFiles } = await import('../utils/helpers.js');
  const files = await getLogFiles();
  const text = t(lang, 'admin.logs_info', { files: files.join('\n') || 'N/A' });
  await ctx.editMessageText(text, {
    reply_markup: buildBackKeyboard(lang),
    parse_mode: 'HTML',
  });
}

async function handleBackupAction(ctx, lang) {
  const { existsSync, statSync } = await import('fs');
  const dbExists = existsSync(config.dbPath);
  const size = dbExists ? formatBytes(statSync(config.dbPath).size) : 'N/A';
  const text = t(lang, 'admin.backup_info', { path: config.dbPath, size });
  await ctx.editMessageText(text, {
    reply_markup: buildBackKeyboard(lang),
    parse_mode: 'HTML',
  });
}

async function handleExportAction(ctx, lang) {
  const users = getAllUsers();
  const csv = [
    'id,username,first_name,last_name,language,country,is_premium,is_banned,join_date,last_seen',
    ...users.map((u) =>
      [u.id, u.username, u.first_name, u.last_name, u.language, u.country, u.is_premium, u.is_banned, u.join_date, u.last_seen]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    ),
  ].join('\n');

  const buf = Buffer.from(csv, 'utf8');
  await ctx.answerCallbackQuery().catch(() => {});
  await ctx.replyWithDocument(new Blob([buf], { type: 'text/csv' }), {
    filename: `users_${Date.now()}.csv`,
    caption: t(lang, 'admin.export_done', { count: users.length }),
  });
}

async function handleSettingsAction(ctx, lang) {
  const text = t(lang, 'admin.settings_info', {
    webAppUrl: config.webAppUrl,
    botName: config.botName,
    logLevel: config.logLevel,
    nodeEnv: config.nodeEnv,
  });
  await ctx.editMessageText(text, {
    reply_markup: buildBackKeyboard(lang),
    parse_mode: 'HTML',
  });
}

// ─── User info callback ───────────────────────────────────────────────────────

export async function handleUserInfoCallback(ctx) {
  const targetId = parseInt(ctx.match[1], 10);
  const lang = ctx.session?.language || 'en';
  const user = getUser(targetId);

  if (!user) {
    await ctx.answerCallbackQuery(t(lang, 'admin.user_not_found'));
    return;
  }

  const { InlineKeyboard } = await import('grammy');
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A';
  const text = t(lang, 'admin.user_info', {
    id: user.id,
    name: escapeHtml(name),
    username: user.username ? `@${user.username}` : 'N/A',
    language: user.language || 'N/A',
    country: user.country || 'N/A',
    joinDate: formatDate(user.join_date),
    lastSeen: formatDate(user.last_seen),
    banned: user.is_banned ? '🚫 Yes' : '✅ No',
    premium: user.is_premium ? '⭐ Yes' : 'No',
    actions: user.total_actions || 0,
  });

  const kb = new InlineKeyboard()
    .text(
      user.is_banned ? t(lang, 'admin.btn_unban') : t(lang, 'admin.btn_ban'),
      user.is_banned ? `do_unban:${user.id}` : `do_ban:${user.id}`,
    )
    .text(t(lang, 'admin.btn_send_msg'), `do_send:${user.id}`)
    .row()
    .text(t(lang, 'buttons.back'), 'admin:users');

  await ctx.editMessageText(text, { reply_markup: kb, parse_mode: 'HTML' });
  await ctx.answerCallbackQuery();
}

export async function handleAdminUsersPage(ctx) {
  const page = parseInt(ctx.match[1], 10);
  const lang = ctx.session?.language || 'en';
  await handleUsersAction(ctx, lang, page);
  await ctx.answerCallbackQuery();
}
