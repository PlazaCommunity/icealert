import Telegraf from 'telegraf';
import Extra from 'telegraf/extra.js';
import Markup from 'telegraf/markup.js';

const initialize = async (state) => {
  const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

  bot.use((ctx, next) => {
    if (ctx.updateType === 'message' && ctx.from) {
      ctx.from.is_admin = String(ctx.from.id) == process.env.TELEGRAM_ADMIN_ID;
    }
    return next();
  });

  bot.on('channel_post', (ctx) => {
    if (ctx.channelPost.text === '/chatid') {
      ctx.replyWithMarkdown(`🏷 Chat ID of this channel: *${ctx.chat.id}*`);
    }
  });

  bot.start((ctx) => {
    if (ctx.from.is_admin) {
      return ctx.replyWithMarkdown('✅ Welcome back!');
    }
    return ctx.replyWithMarkdown('⛔️ Unauthorized');
  });

  bot.command('status', (ctx) => {
    if (ctx.from.is_admin) {
      let status = '〽️*Status*\n\n';
      status += '👇👇👇\n\n';
      Object.keys(state.jobs).forEach((key) => {
        const operational = state.jobs[key].operational
          ? '✅ Ok'
          : '⛔️ Error...';
        const error = state.jobs[key].error;
        const lastExecution = state.jobs[key].lastExecution;

        status += `*${key.toLocaleUpperCase()}*\n`;
        status += `• status: ${operational}\n`;
        if (lastExecution) {
          status += `• last run: _${lastExecution}_\n`;
        } else {
          status += `• last run: _never_\n`;
        }
        if (error) {
          status += `• error message: \`${error}\`\n`;
        }
        status += '\n\n';
      });
      return ctx.replyWithMarkdown(status);
    }
  });

  bot.command('stop', (ctx) => {
    if (ctx.from.is_admin) {
      ctx
        .replyWithMarkdown('✅ *Shutting down* gracefully')
        .then(() => process.exit(0));
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const endpoint = Math.random().toString(36).substring(2, 15);
    bot.telegram.webhookReply = false;
    await bot.telegram.setWebhook(
      `https://icealert.filipporossi.dev/${endpoint}`
    );
    bot.startWebhook(`/${endpoint}`, null, process.env.PORT);
  } else {
    await bot.telegram.deleteWebhook();
    bot.startPolling();
  }
  return bot;
};

export default {
  initialize,
  Extra,
  Markup,
};
