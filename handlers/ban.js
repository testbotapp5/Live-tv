import { banUser, unbanUser, isUserBanned } from '../database/index.js';
import { t } from '../utils/i18n.js';
import { buildAdminPanelKeyboard } from '../utils/keyboard.js';
import analyticsService from '../services/analytics.js';
import logger from '../services/logger.js';

export async function handleBanText(ctx) {
  if (!ctx.session?.awaitingBanId) return false;
  const lang = ctx.session?.language || 'en';
  if (!ctx.message?.text) {
    await ctx.reply(t(lang, 'admin.invalid_id'));
    return true;
  }
  const parts = ctx.message.text.trim().split(' ');
  const targetId = parseInt(parts[0], 10);
  const reason = parts.slice(1).join(' ') || null;

  if (isNaN(targetId)) {
    await ctx.reply(t(lang, 'admin.invalid_id'));
    return true;
  }

  ctx.session.awaitingBanId = false;
  const adminId = ctx.from.id;

  banUser(targetId, reason, adminId);
  analyticsService.trackBan(adminId, targetId);
  logger.info('User banned', { adminId, targetId, reason });

  const kb = buildAdminPanelKeyboard(lang);
  await ctx.reply(t(lang, 'admin.ban_success', { id: targetId }), {
    reply_markup: kb,
    parse_mode: 'HTML',
  });
  return true;
}

export async function handleUnbanText(ctx) {
  if (!ctx.session?.awaitingUnbanId) return false;
  const lang = ctx.session?.language || 'en';
  if (!ctx.message?.text) {
    await ctx.reply(t(lang, 'admin.invalid_id'));
    return true;
  }
  const targetId = parseInt(ctx.message.text.trim(), 10);

  if (isNaN(targetId)) {
    await ctx.reply(t(lang, 'admin.invalid_id'));
    return true;
  }

  ctx.session.awaitingUnbanId = false;
  const adminId = ctx.from.id;

  unbanUser(targetId);
  analyticsService.trackUnban(adminId, targetId);
  logger.info('User unbanned', { adminId, targetId });

  const kb = buildAdminPanelKeyboard(lang);
  await ctx.reply(t(lang, 'admin.unban_success', { id: targetId }), {
    reply_markup: kb,
    parse_mode: 'HTML',
  });
  return true;
}

export async function handleDoBanCallback(ctx) {
  const targetId = parseInt(ctx.match[1], 10);
  const lang = ctx.session?.language || 'en';
  const adminId = ctx.from.id;

  banUser(targetId, 'Admin action', adminId);
  analyticsService.trackBan(adminId, targetId);
  logger.info('User banned via callback', { adminId, targetId });

  await ctx.answerCallbackQuery(t(lang, 'admin.ban_success', { id: targetId }));
  await ctx.editMessageText(t(lang, 'admin.ban_success', { id: targetId }), {
    reply_markup: buildAdminPanelKeyboard(lang),
    parse_mode: 'HTML',
  });
}

export async function handleDoUnbanCallback(ctx) {
  const targetId = parseInt(ctx.match[1], 10);
  const lang = ctx.session?.language || 'en';
  const adminId = ctx.from.id;

  unbanUser(targetId);
  analyticsService.trackUnban(adminId, targetId);
  logger.info('User unbanned via callback', { adminId, targetId });

  await ctx.answerCallbackQuery(t(lang, 'admin.unban_success', { id: targetId }));
  await ctx.editMessageText(t(lang, 'admin.unban_success', { id: targetId }), {
    reply_markup: buildAdminPanelKeyboard(lang),
    parse_mode: 'HTML',
  });
}
