import { getUser, searchUsers } from '../database/index.js';
import { t } from '../utils/i18n.js';
import { buildAdminPanelKeyboard } from '../utils/keyboard.js';
import { escapeHtml, formatDate } from '../utils/helpers.js';
import logger from '../services/logger.js';

export async function handleUserSearchText(ctx) {
  if (!ctx.session?.awaitingUserSearch) return false;
  const lang = ctx.session?.language || 'en';
  if (!ctx.message?.text) {
    await ctx.reply(t(lang, 'admin.invalid_id'));
    return true;
  }
  ctx.session.awaitingUserSearch = false;
  const query = ctx.message.text.trim();

  const users = searchUsers(query);
  if (users.length === 0) {
    await ctx.reply(t(lang, 'admin.user_not_found'));
    return true;
  }

  for (const user of users.slice(0, 5)) {
    const name = escapeHtml([user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A');
    await ctx.reply(
      t(lang, 'admin.user_info', {
        id: user.id,
        name,
        username: user.username ? `@${user.username}` : 'N/A',
        language: user.language || 'N/A',
        country: user.country || 'N/A',
        joinDate: formatDate(user.join_date),
        lastSeen: formatDate(user.last_seen),
        banned: user.is_banned ? '🚫 Yes' : '✅ No',
        premium: user.is_premium ? '⭐ Yes' : 'No',
        actions: user.total_actions || 0,
      }),
      { parse_mode: 'HTML' },
    );
  }
  return true;
}

export async function handleSendMsgIdText(ctx) {
  if (!ctx.session?.awaitingSendMsgId) return false;
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

  ctx.session.awaitingSendMsgId = false;
  ctx.session.sendMsgTargetId = targetId;
  ctx.session.awaitingSendMsgContent = true;
  await ctx.reply(t(lang, 'admin.send_msg_content_prompt'));
  return true;
}

export async function handleSendMsgContent(ctx) {
  if (!ctx.session?.awaitingSendMsgContent) return false;
  const lang = ctx.session?.language || 'en';
  const targetId = ctx.session.sendMsgTargetId;

  ctx.session.awaitingSendMsgContent = false;
  ctx.session.sendMsgTargetId = null;

  try {
    await ctx.api.copyMessage(targetId, ctx.chat.id, ctx.message.message_id);
    await ctx.reply(t(lang, 'admin.send_msg_success', { id: targetId }));
    logger.info('Admin sent message to user', { adminId: ctx.from.id, targetId });
  } catch (err) {
    await ctx.reply(t(lang, 'admin.send_msg_failed', { id: targetId, error: err.message }));
    logger.warn('Admin failed to send message', { adminId: ctx.from.id, targetId, error: err.message });
  }
  return true;
}
