import 'dotenv/config';
import { Bot, session } from 'grammy';
import config from './config/index.js';
import logger from './services/logger.js';
import { startHealthServer } from './services/health.js';

// ─── Middlewares ───────────────────────────────────────────────────────────────
import { authMiddleware } from './middlewares/auth.js';
import { rateLimitMiddleware } from './middlewares/rateLimit.js';
import { languageMiddleware } from './middlewares/language.js';
import { errorHandler } from './middlewares/errorHandler.js';

// ─── Handlers ─────────────────────────────────────────────────────────────────
import {
  handleStart,
  showCountrySelection,
  handleCountryPage,
  handleCountrySearchPrompt,
  handleCountrySearchText,
  handleCountrySelected,
  handleNoop,
} from './handlers/start.js';
import { handleHelp } from './handlers/help.js';
import { handleAbout } from './handlers/about.js';
import { handleLanguageCommand, handleSetLanguageCallback } from './handlers/language.js';
import { handlePing } from './handlers/ping.js';
import {
  handlePanel,
  handlePanelCallback,
  handleUserInfoCallback,
  handleAdminUsersPage,
} from './handlers/panel.js';
import {
  handleBroadcastMessage,
  handleBroadcastConfirm,
  handleBroadcastCancel,
} from './handlers/broadcast.js';
import {
  handleUserSearchText,
  handleSendMsgIdText,
  handleSendMsgContent,
} from './handlers/users.js';
import {
  handleBanText,
  handleUnbanText,
  handleDoBanCallback,
  handleDoUnbanCallback,
} from './handlers/ban.js';
import { requireAdmin } from './middlewares/auth.js';

// ─── Bot initialization ────────────────────────────────────────────────────────

logger.info('Initializing bot...', { botName: config.botName, version: config.version });

const bot = new Bot(config.token);

// ─── Session ───────────────────────────────────────────────────────────────────

bot.use(
  session({
    initial: () => ({
      language: null,
      awaitingSearch: false,
      searchPromptId: null,
      awaitingBroadcast: false,
      awaitingBanId: false,
      awaitingUnbanId: false,
      awaitingUserSearch: false,
      awaitingSendMsgId: false,
      awaitingSendMsgContent: false,
      sendMsgTargetId: null,
      userPage: 0,
    }),
  }),
);

// ─── Global middlewares ────────────────────────────────────────────────────────

bot.use(authMiddleware);
bot.use(rateLimitMiddleware);
bot.use(languageMiddleware);

// ─── Commands ─────────────────────────────────────────────────────────────────

bot.command('start', handleStart);
bot.command('help', handleHelp);
bot.command('about', handleAbout);
bot.command('language', handleLanguageCommand);
bot.command('ping', handlePing);
bot.command('panel', requireAdmin, handlePanel);

// ─── Callback queries ──────────────────────────────────────────────────────────

// Country selection
bot.callbackQuery(/^country_page:(\d+)$/, handleCountryPage);
bot.callbackQuery('country_search', handleCountrySearchPrompt);
bot.callbackQuery(/^country:([A-Z]{2,3})$/, handleCountrySelected);
bot.callbackQuery('noop', handleNoop);

// Language
bot.callbackQuery(/^setlang:(\w+)$/, handleSetLanguageCallback);

// Admin panel
bot.callbackQuery(/^admin:(.+)$/, requireAdmin, handlePanelCallback);
bot.callbackQuery(/^user_info:(\d+)$/, requireAdmin, handleUserInfoCallback);
bot.callbackQuery(/^admin_users_page:(\d+)$/, requireAdmin, handleAdminUsersPage);

// Broadcast
bot.callbackQuery('broadcast:confirm', requireAdmin, handleBroadcastConfirm);
bot.callbackQuery('broadcast:cancel', requireAdmin, handleBroadcastCancel);

// Ban/Unban via callback
bot.callbackQuery(/^do_ban:(\d+)$/, requireAdmin, handleDoBanCallback);
bot.callbackQuery(/^do_unban:(\d+)$/, requireAdmin, handleDoUnbanCallback);

// ─── Text message router ───────────────────────────────────────────────────────

bot.on('message', async (ctx, next) => {
  const text = ctx.message?.text;

  // Skip commands
  if (text?.startsWith('/')) return next();

  // Admin session states take priority (admins may also be in user flows)
  if (ctx.session.awaitingBanId) {
    const handled = await handleBanText(ctx);
    if (handled) return;
  }
  if (ctx.session.awaitingUnbanId) {
    const handled = await handleUnbanText(ctx);
    if (handled) return;
  }
  if (ctx.session.awaitingUserSearch) {
    const handled = await handleUserSearchText(ctx);
    if (handled) return;
  }
  if (ctx.session.awaitingSendMsgId) {
    const handled = await handleSendMsgIdText(ctx);
    if (handled) return;
  }
  if (ctx.session.awaitingSendMsgContent) {
    const handled = await handleSendMsgContent(ctx);
    if (handled) return;
  }

  // Broadcast: admin sends message to broadcast
  if (ctx.session.awaitingBroadcast) {
    const handled = await handleBroadcastMessage(ctx);
    if (handled) return;
  }

  // Country search
  if (ctx.session.awaitingSearch) {
    await handleCountrySearchText(ctx);
    return;
  }

  return next();
});

// Catch-all for non-text messages in broadcast session
bot.on('message', async (ctx) => {
  if (ctx.session.awaitingBroadcast && !ctx.message?.text) {
    const handled = await handleBroadcastMessage(ctx);
    if (handled) return;
  }
});

// ─── Error handler ─────────────────────────────────────────────────────────────

bot.catch(errorHandler);

// ─── Bot commands menu ─────────────────────────────────────────────────────────

async function setCommands() {
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: '🚀 Start the bot' },
      { command: 'help', description: 'ℹ️ Help & instructions' },
      { command: 'about', description: '📺 About this bot' },
      { command: 'language', description: '🌐 Change language' },
      { command: 'ping', description: '🏓 Check bot status' },
    ]);
    logger.info('Bot commands set');
  } catch (err) {
    logger.error('Failed to set commands', { err: err.message });
  }
}

// ─── Graceful shutdown ─────────────────────────────────────────────────────────

function setupShutdown() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down...`);
      await bot.stop();
      process.exit(0);
    });
  }
}

// ─── Startup ───────────────────────────────────────────────────────────────────

async function main() {
  try {
    // Start health check server
    startHealthServer();

    // Set bot commands
    await setCommands();

    // Setup shutdown handlers
    setupShutdown();

    // Verify bot token
    const me = await bot.api.getMe();
    logger.info(`Bot started: @${me.username} (${me.id})`, {
      name: me.first_name,
      username: me.username,
      version: config.version,
      nodeEnv: config.nodeEnv,
      admins: config.adminIds,
    });

    // Start polling
    await bot.start({
      onStart: (botInfo) => {
        logger.info(`✅ @${botInfo.username} is running!`);
        logger.info(`🌐 Web App: ${config.webAppUrl}`);
        logger.info(`👮 Admins: ${config.adminIds.join(', ')}`);
        logger.info(`📊 Health: http://localhost:${config.port}/health`);
      },
      drop_pending_updates: true,
      allowed_updates: [
        'message',
        'callback_query',
        'inline_query',
        'chosen_inline_result',
        'my_chat_member',
        'chat_member',
      ],
    });
  } catch (err) {
    logger.error('Fatal startup error', { err: err.message, stack: err.stack });
    process.exit(1);
  }
}

main();
