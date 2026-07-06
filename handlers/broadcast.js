import { getAllUsers, createBroadcastLog, updateBroadcastLog } from '../database/index.js';
import { InlineKeyboard } from 'grammy';
import { t } from '../utils/i18n.js';
import { buildBroadcastConfirmKeyboard, buildBackKeyboard } from '../utils/keyboard.js';
import { sleep, buildProgressBar, chunk } from '../utils/helpers.js';
import analyticsService from '../services/analytics.js';
import logger from '../services/logger.js';

const pendingBroadcasts = new Map();

const SUPPORTED_TYPES = [
  'text', 'photo', 'video', 'audio', 'voice', 'animation',
  'sticker', 'document', 'contact', 'location', 'venue',
  'poll', 'invoice', 'story', 'forward',
];

export async function handleBroadcastMessage(ctx) {
  const adminId = ctx.from?.id;
  const lang = ctx.session?.language || 'en';

  if (!ctx.session?.awaitingBroadcast) return false;

  ctx.session.awaitingBroadcast = false;

  // Store broadcast message for confirmation
  pendingBroadcasts.set(adminId, {
    message: ctx.message,
    chat: ctx.chat,
  });

  const users = getAllUsers();
  const kb = buildBroadcastConfirmKeyboard(lang);

  await ctx.reply(
    t(lang, 'admin.broadcast_confirm', { total: users.length }),
    { reply_markup: kb, parse_mode: 'HTML' },
  );
  return true;
}

export async function handleBroadcastConfirm(ctx) {
  const adminId = ctx.from?.id;
  const lang = ctx.session?.language || 'en';

  await ctx.answerCallbackQuery();

  const pending = pendingBroadcasts.get(adminId);
  if (!pending) {
    await ctx.editMessageText(t(lang, 'admin.broadcast_expired'), {
      reply_markup: buildBackKeyboard(lang),
    });
    return;
  }

  pendingBroadcasts.delete(adminId);

  const users = getAllUsers();
  const total = users.length;
  const logId = createBroadcastLog(adminId, detectMessageType(pending.message), total);

  analyticsService.trackBroadcast(adminId, total);
  logger.info('Broadcast started', { adminId, total, logId });

  // Send progress message
  const progressMsg = await ctx.editMessageText(
    t(lang, 'admin.broadcast_started', { total }),
    { parse_mode: 'HTML' },
  );

  let success = 0;
  let failed = 0;
  const failedUsers = [];

  const batches = chunk(users, 25);
  let processed = 0;

  for (const batch of batches) {
    await Promise.allSettled(
      batch.map(async (user) => {
        try {
          await copyMessageToUser(ctx, pending.message, pending.chat, user.id);
          success++;
        } catch (err) {
          failed++;
          failedUsers.push({ id: user.id, error: err.message });
          logger.warn('Broadcast failed for user', { userId: user.id, error: err.message });
        }
      }),
    );

    processed += batch.length;

    // Update progress every batch
    try {
      const bar = buildProgressBar(processed, total);
      await ctx.api.editMessageText(
        progressMsg.chat.id,
        progressMsg.message_id,
        t(lang, 'admin.broadcast_progress', {
          done: processed,
          total,
          success,
          failed,
          bar,
        }),
        { parse_mode: 'HTML' },
      );
    } catch {
      // Ignore edit errors
    }

    // Rate limit: 25 per second
    await sleep(1000);
  }

  updateBroadcastLog(logId, success, failed);

  // Final report
  let report = t(lang, 'admin.broadcast_done', { total, success, failed });
  if (failedUsers.length > 0 && failedUsers.length <= 10) {
    const failList = failedUsers.map((u) => `• ${u.id}: ${u.error}`).join('\n');
    report += `\n\n<b>Failed:</b>\n${failList}`;
  }

  try {
    await ctx.api.editMessageText(
      progressMsg.chat.id,
      progressMsg.message_id,
      report,
      { reply_markup: buildBackKeyboard(lang), parse_mode: 'HTML' },
    );
  } catch {
    await ctx.reply(report, { reply_markup: buildBackKeyboard(lang), parse_mode: 'HTML' });
  }

  logger.info('Broadcast completed', { adminId, total, success, failed, logId });
}

export async function handleBroadcastCancel(ctx) {
  const adminId = ctx.from?.id;
  const lang = ctx.session?.language || 'en';

  pendingBroadcasts.delete(adminId);
  ctx.session.awaitingBroadcast = false;

  await ctx.editMessageText(t(lang, 'admin.broadcast_cancelled'), {
    reply_markup: buildBackKeyboard(lang),
  });
  await ctx.answerCallbackQuery();
}

// ─── Copy message to user ─────────────────────────────────────────────────────

async function copyMessageToUser(ctx, message, fromChat, toUserId) {
  const msgId = message.message_id;
  const fromChatId = fromChat.id;

  await ctx.api.copyMessage(toUserId, fromChatId, msgId);
}

function detectMessageType(message) {
  if (message.photo) return 'photo';
  if (message.video) return 'video';
  if (message.audio) return 'audio';
  if (message.voice) return 'voice';
  if (message.animation) return 'animation';
  if (message.sticker) return 'sticker';
  if (message.document) return 'document';
  if (message.contact) return 'contact';
  if (message.location) return 'location';
  if (message.venue) return 'venue';
  if (message.poll) return 'poll';
  if (message.invoice) return 'invoice';
  return 'text';
}
